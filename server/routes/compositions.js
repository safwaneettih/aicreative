const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const multer = require('multer');
const { authenticateToken: auth } = require('../middleware/auth');
const db = require('../config/database');

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const logoDir = path.join(__dirname, '../../uploads/logos');
        await fs.mkdir(logoDir, { recursive: true });
        cb(null, logoDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `logo_${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for logos'));
        }
    }
});

// Upload logo endpoint
router.post('/upload-logo/:workspaceId', auth, logoUpload.single('logo'), async (req, res) => {
    try {
        const { workspaceId } = req.params;

        // Verify workspace ownership
        const workspaceCheck = await db.query(
            'SELECT id FROM workspaces WHERE id = $1 AND user_id = $2',
            [workspaceId, req.user.id]
        );

        if (workspaceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No logo file uploaded' });
        }

        const relativePath = path.relative(path.join(__dirname, '../..'), req.file.path);

        res.json({
            message: 'Logo uploaded successfully',
            logoPath: relativePath,
            originalName: req.file.originalname,
            size: req.file.size
        });

    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// Semaphore to limit concurrent FFmpeg processes
class Semaphore {
    constructor(permits) {
        this.permits = permits;
        this.waiting = [];
    }

    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.waiting.push(resolve);
        });
    }

    release() {
        this.permits++;
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            this.permits--;
            resolve();
        }
    }
}

// Limit to 2 concurrent FFmpeg processes to avoid resource exhaustion
const ffmpegSemaphore = new Semaphore(2);

// Get compositions by workspace
router.get('/workspace/:workspaceId', auth, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user.id;

        // Verify workspace ownership
        const workspaceCheck = await db.query(
            'SELECT id FROM workspaces WHERE id = $1 AND user_id = $2',
            [workspaceId, userId]
        );

        if (workspaceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const compositions = await db.query(`
      SELECT 
        c.*,
        s.title as script_title,
        v.voice_name,
        v.duration as voiceover_duration
      FROM video_compositions c
      LEFT JOIN voiceovers v ON c.voiceover_id = v.id
      LEFT JOIN scripts s ON v.script_id = s.id
      WHERE c.workspace_id = $1
      ORDER BY c.created_at DESC
    `, [workspaceId]);

        res.json(compositions.rows);
    } catch (error) {
        console.error('Error fetching compositions:', error);
        res.status(500).json({ error: 'Failed to fetch compositions' });
    }
});

// Get composition job status
router.get('/job/:jobId', auth, async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await db.query(`
      SELECT 
        cj.*,
        COUNT(c.id) as total_count,
        SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM composition_jobs cj
      LEFT JOIN video_compositions c ON cj.id = c.job_id
      WHERE cj.id = $1
      GROUP BY cj.id
    `, [jobId]);

        if (job.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const jobData = job.rows[0];

        // Update job status based on compositions
        let status = 'pending';
        if (jobData.total_count > 0) {
            if (jobData.completed_count === jobData.total_count) {
                status = 'completed';
            } else if (jobData.failed_count === jobData.total_count) {
                status = 'failed';
            } else if (jobData.completed_count > 0 || jobData.failed_count > 0) {
                status = 'processing';
            }
        }

        // Update job status in database
        await db.query(
            'UPDATE composition_jobs SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, jobId]
        );

        res.json({
            ...jobData,
            status,
            total_count: jobData.total_count || 0,
            completed_count: jobData.completed_count || 0,
            failed_count: jobData.failed_count || 0
        });
    } catch (error) {
        console.error('Error fetching job status:', error);
        res.status(500).json({ error: 'Failed to fetch job status' });
    }
});

// Generate combinations automatically
router.post('/workspace/:workspaceId/generate-combinations', auth, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { hook_clip_ids, body_clip_ids, cat_clip_ids, voiceover_ids, max_combinations = 20 } = req.body;
        const userId = req.user.id;

        // Verify workspace ownership
        const workspaceCheck = await db.query(
            'SELECT id FROM workspaces WHERE id = $1 AND user_id = $2',
            [workspaceId, userId]
        );

        if (workspaceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const combinations = [];
        let count = 0;

        // Generate all possible combinations
        for (const voiceoverId of voiceover_ids) {
            for (const hookId of hook_clip_ids.length > 0 ? hook_clip_ids : [null]) {
                for (const catId of cat_clip_ids.length > 0 ? cat_clip_ids : [null]) {
                    // For body clips, we can either use one or multiple
                    if (body_clip_ids.length > 0) {
                        // Use all body clips as one combination
                        combinations.push({
                            hook_clip_id: hookId,
                            body_clip_ids: body_clip_ids,
                            cat_clip_id: catId,
                            voiceover_id: voiceoverId
                        });
                        count++;

                        // Also create combinations with individual body clips
                        for (const bodyId of body_clip_ids) {
                            if (count >= max_combinations) break;
                            combinations.push({
                                hook_clip_id: hookId,
                                body_clip_ids: [bodyId],
                                cat_clip_id: catId,
                                voiceover_id: voiceoverId
                            });
                            count++;
                        }
                    } else {
                        // No body clips, just hook and/or cat
                        combinations.push({
                            hook_clip_id: hookId,
                            body_clip_ids: [],
                            cat_clip_id: catId,
                            voiceover_id: voiceoverId
                        });
                        count++;
                    }

                    if (count >= max_combinations) break;
                }
                if (count >= max_combinations) break;
            }
            if (count >= max_combinations) break;
        }

        res.json(combinations.slice(0, max_combinations));
    } catch (error) {
        console.error('Error generating combinations:', error);
        res.status(500).json({ error: 'Failed to generate combinations' });
    }
});

// Create video compositions
router.post('/workspace/:workspaceId', auth, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { name, combinations } = req.body;
        const userId = req.user.id;

        // Verify workspace ownership
        const workspaceCheck = await db.query(
            'SELECT id FROM workspaces WHERE id = $1 AND user_id = $2',
            [workspaceId, userId]
        );

        if (workspaceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Create job
        const jobId = uuidv4();
        await db.query(
            'INSERT INTO composition_jobs (id, workspace_id, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
            [jobId, workspaceId, 'pending']
        );

        // Create compositions
        const compositionPromises = combinations.map(async (combo, index) => {
            const result = await db.query(
                `INSERT INTO video_compositions 
         (workspace_id, name, hook_clip_id, body_clip_ids, cat_clip_id, voiceover_id, status, job_id, 
          logo_overlay_path, logo_position, logo_opacity, logo_size, enable_captions, caption_style, 
          created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()) RETURNING id`,
                [
                    workspaceId,
                    `${name} - ${index + 1}`,
                    combo.hook_clip_id || null,
                    JSON.stringify(combo.body_clip_ids || []),
                    combo.cat_clip_id || null,
                    combo.voiceover_id,
                    'pending',
                    jobId,
                    combo.logo_overlay_path || null,
                    combo.logo_position || 'bottom-right',
                    combo.logo_opacity || 0.8,
                    combo.logo_size || 'medium',
                    combo.enable_captions || false,
                    combo.caption_style || 'default'
                ]
            );

            const compositionId = result.rows[0].id;

            // Start processing this composition asynchronously
            processComposition(compositionId);

            return compositionId;
        });

        await Promise.all(compositionPromises);

        // Return job information
        const jobData = {
            id: jobId,
            status: 'pending',
            total_count: combinations.length,
            completed_count: 0,
            failed_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        res.json(jobData);
    } catch (error) {
        console.error('Error creating compositions:', error);
        res.status(500).json({ error: 'Failed to create compositions' });
    }
});

// Delete composition
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get composition with workspace check
        const composition = await db.query(`
      SELECT c.*, w.user_id 
      FROM video_compositions c
      JOIN workspaces w ON c.workspace_id = w.id
      WHERE c.id = $1 AND w.user_id = $2
    `, [id, userId]);

        if (composition.rows.length === 0) {
            return res.status(404).json({ error: 'Composition not found' });
        }

        const comp = composition.rows[0];

        // Delete file if exists
        if (comp.file_path) {
            try {
                await fs.unlink(path.join(__dirname, '../..', comp.file_path));
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }

        // Delete from database
        await db.query('DELETE FROM video_compositions WHERE id = $1', [id]);

        res.json({ message: 'Composition deleted successfully' });
    } catch (error) {
        console.error('Error deleting composition:', error);
        res.status(500).json({ error: 'Failed to delete composition' });
    }
});

// Bulk delete compositions
router.delete('/bulk/:workspaceId', auth, async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { compositionIds } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(compositionIds) || compositionIds.length === 0) {
            return res.status(400).json({ error: 'Invalid composition IDs' });
        }

        // Verify workspace ownership
        const workspaceCheck = await db.query(
            'SELECT id FROM workspaces WHERE id = $1 AND user_id = $2',
            [workspaceId, userId]
        );

        if (workspaceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Get compositions to delete (with ownership check)
        const placeholders = compositionIds.map((_, index) => `$${index + 2}`).join(',');
        const compositions = await db.query(`
            SELECT c.* 
            FROM video_compositions c
            JOIN workspaces w ON c.workspace_id = w.id
            WHERE c.workspace_id = $1 AND c.id IN (${placeholders}) AND w.user_id = ${userId}
        `, [workspaceId, ...compositionIds]);

        if (compositions.rows.length === 0) {
            return res.status(404).json({ error: 'No compositions found to delete' });
        }

        let deletedCount = 0;
        let errors = [];

        // Delete files and database records
        for (const comp of compositions.rows) {
            try {
                // Delete file if exists
                if (comp.file_path) {
                    try {
                        await fs.unlink(path.join(__dirname, '../..', comp.file_path));
                    } catch (error) {
                        console.error('Error deleting file:', error);
                        // Continue with database deletion even if file deletion fails
                    }
                }

                // Delete from database
                await db.query('DELETE FROM video_compositions WHERE id = $1', [comp.id]);
                deletedCount++;
            } catch (error) {
                console.error(`Error deleting composition ${comp.id}:`, error);
                errors.push(`Failed to delete composition ${comp.id}`);
            }
        }

        res.json({
            message: `Successfully deleted ${deletedCount} composition(s)`,
            deletedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error bulk deleting compositions:', error);
        res.status(500).json({ error: 'Failed to bulk delete compositions' });
    }
});

// Process a single composition
async function processComposition(compositionId) {
    let semaphoreAcquired = false;

    try {
        // Update status to processing
        await db.query(
            'UPDATE video_compositions SET status = $1, updated_at = NOW() WHERE id = $2',
            ['processing', compositionId]
        );

        console.log(`🎬 Acquiring semaphore for composition ${compositionId}...`);
        await ffmpegSemaphore.acquire();
        semaphoreAcquired = true;
        console.log(`🎬 Semaphore acquired for composition ${compositionId}`);

        // Get composition details
        const composition = await db.query(`
      SELECT 
        c.*,
        v.file_path as voiceover_path,
        v.duration as voiceover_duration,
        hc.file_path as hook_path,
        cc.file_path as cat_path
      FROM video_compositions c
      LEFT JOIN voiceovers v ON c.voiceover_id = v.id
      LEFT JOIN video_clips hc ON c.hook_clip_id = hc.id
      LEFT JOIN video_clips cc ON c.cat_clip_id = cc.id
      WHERE c.id = $1
    `, [compositionId]);

        if (composition.rows.length === 0) {
            throw new Error('Composition not found');
        }

        const comp = composition.rows[0];

        // Get body clips
        let bodyClipIds = [];
        try {
            bodyClipIds = JSON.parse(comp.body_clip_ids || '[]');
        } catch (e) {
            bodyClipIds = [];
        }

        const bodyClips = [];
        if (bodyClipIds.length > 0) {
            const placeholders = bodyClipIds.map((_, index) => `$${index + 1}`).join(',');
            const bodyClipResults = await db.query(
                `SELECT file_path, duration FROM video_clips WHERE id IN (${placeholders})`,
                bodyClipIds
            );
            bodyClips.push(...bodyClipResults.rows);
        }

        // Generate output filename with more unique timestamp and random component
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const outputDir = path.join(__dirname, '../../uploads/compositions');
        await fs.mkdir(outputDir, { recursive: true });
        const outputFilename = `composition_${compositionId}_${timestamp}_${randomId}.mp4`;
        const outputPath = path.join(outputDir, outputFilename);
        const relativePath = `uploads/compositions/${outputFilename}`;

        console.log(`🎬 Starting composition ${compositionId} processing...`);
        console.log(`🎬 Output file: ${outputFilename}`);

        // Build video using FFmpeg
        await buildVideo({
            hookPath: comp.hook_path,
            bodyPaths: bodyClips.map(clip => clip.file_path),
            catPath: comp.cat_path,
            voiceoverPath: comp.voiceover_path,
            logoOverlayPath: comp.logo_overlay_path,
            logoPosition: comp.logo_position || 'bottom-right',
            logoOpacity: comp.logo_opacity || 0.8,
            logoSize: comp.logo_size || 'medium',
            enableCaptions: comp.enable_captions || false,
            captionStyle: comp.caption_style || 'default',
            outputPath
        });

        // Calculate total duration - use voiceover duration as reference since that's what the final video will match
        let totalDuration = comp.voiceover_duration || 0;

        // If no voiceover, calculate from video clips
        if (!totalDuration) {
            if (comp.hook_path) totalDuration += await getVideoDuration(comp.hook_path);
            for (const bodyClip of bodyClips) {
                totalDuration += bodyClip.duration || 0;
            }
            if (comp.cat_path) totalDuration += await getVideoDuration(comp.cat_path);
        }

        console.log(`📊 Final composition duration: ${totalDuration.toFixed(2)}s (based on ${comp.voiceover_duration ? 'voiceover' : 'video clips'})`);

        // Update composition with success
        await db.query(
            'UPDATE video_compositions SET status = $1, file_path = $2, duration = $3, updated_at = NOW() WHERE id = $4',
            ['completed', relativePath, totalDuration, compositionId]
        );

        console.log(`✅ Composition ${compositionId} completed successfully`);
    } catch (error) {
        console.error(`❌ Error processing composition ${compositionId}:`, error);

        // Update status to failed
        await db.query(
            'UPDATE video_compositions SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
            ['failed', error.message, compositionId]
        );
    } finally {
        // Always release the semaphore
        if (semaphoreAcquired) {
            ffmpegSemaphore.release();
            console.log(`🎬 Semaphore released for composition ${compositionId}`);
        }
    }
}

// Build video using FFmpeg
function buildVideo({ hookPath, bodyPaths, catPath, voiceoverPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath }) {
    return new Promise(async (resolve, reject) => {
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            // Collect all video paths in order
            const videoPaths = [];
            if (hookPath) {
                const fullHookPath = path.join(__dirname, '../..', hookPath);
                console.log('🎬 Adding hook video:', fullHookPath);
                videoPaths.push(fullHookPath);
            }

            bodyPaths.forEach((bodyPath, index) => {
                if (bodyPath) {
                    const fullBodyPath = path.join(__dirname, '../..', bodyPath);
                    console.log(`🎬 Adding body video ${index + 1}:`, fullBodyPath);
                    videoPaths.push(fullBodyPath);
                }
            });

            if (catPath) {
                const fullCatPath = path.join(__dirname, '../..', catPath);
                console.log('🎬 Adding cat video:', fullCatPath);
                videoPaths.push(fullCatPath);
            }

            if (videoPaths.length === 0) {
                return reject(new Error('No video clips provided'));
            }

            console.log('🎬 Output path:', outputPath);
            console.log('🎬 Total video inputs:', videoPaths.length);

            // Create a temporary file for the concatenated video
            const tempVideoPath = outputPath.replace('.mp4', '_temp.mp4');

            // Step 1: Concatenate all video clips
            const concatCommand = ffmpeg();

            // Add all video inputs
            videoPaths.forEach(videoPath => {
                concatCommand.input(videoPath);
            });

            if (videoPaths.length === 1) {
                // Single video - copy video stream only (no audio)
                concatCommand
                    .outputOptions([
                        '-map', '0:v',  // Map only video stream, no audio
                        '-an'           // Remove audio completely
                    ])
                    .output(tempVideoPath)
                    .videoCodec('libx264')
                    .on('start', (commandLine) => {
                        console.log('🎬 Step 1 - Copying single video (no audio):', commandLine);
                    })
                    .on('end', () => {
                        console.log('✅ Step 1 - Single video copied without audio');
                        // Step 2: Add voiceover if needed
                        if (voiceoverPath) {
                            addVoiceoverToVideo(tempVideoPath, voiceoverPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, resolve, reject);
                        } else {
                            // No voiceover - apply logo and captions if needed, then finish
                            applyVideoEffects(tempVideoPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, resolve, reject);
                        }
                    })
                    .on('error', reject)
                    .run();
            } else {
                // Multiple videos - concatenate video streams only (no audio)
                const filterComplex = videoPaths.map((_, index) => `[${index}:v]`).join('') +
                    `concat=n=${videoPaths.length}:v=1:a=0[outv]`;

                concatCommand
                    .complexFilter(filterComplex)
                    .outputOptions([
                        '-map', '[outv]',
                        '-an'  // Remove audio completely
                    ])
                    .output(tempVideoPath)
                    .videoCodec('libx264')
                    .on('start', (commandLine) => {
                        console.log('🎬 Step 1 - Concatenating videos (no audio):', commandLine);
                    })
                    .on('end', () => {
                        console.log('✅ Step 1 - Video concatenation completed without audio');
                        // Step 2: Add voiceover if needed
                        if (voiceoverPath) {
                            addVoiceoverToVideo(tempVideoPath, voiceoverPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, resolve, reject);
                        } else {
                            // No voiceover - apply logo and captions if needed, then finish
                            applyVideoEffects(tempVideoPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, resolve, reject);
                        }
                    })
                    .on('error', reject)
                    .run();
            }

        } catch (error) {
            console.error('❌ Error setting up FFmpeg:', error);
            reject(error);
        }
    });
}

// Helper function to add voiceover to concatenated video with duration matching
async function addVoiceoverToVideo(videoPath, voiceoverPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, resolve, reject) {
    const fullVoiceoverPath = path.join(__dirname, '../..', voiceoverPath);
    console.log('🎬 Step 2 - Adding voiceover:', fullVoiceoverPath);

    try {
        // Get durations of both video and voiceover
        const videoDuration = await getVideoFileDuration(videoPath);
        const voiceoverDuration = await getVideoFileDuration(fullVoiceoverPath);

        console.log(`📊 Video duration: ${videoDuration.toFixed(2)}s`);
        console.log(`📊 Voiceover duration: ${voiceoverDuration.toFixed(2)}s`);

        // Calculate speed adjustment factor
        const speedFactor = videoDuration / voiceoverDuration;
        console.log(`🎛️ Speed adjustment factor: ${speedFactor.toFixed(3)}`);

        // Define thresholds for different strategies
        const SPEED_ADJUSTMENT_THRESHOLD = 0.2; // 20% difference
        const MAX_SPEED_FACTOR = 2.0;
        const MIN_SPEED_FACTOR = 0.5;

        let videoFilter = '';
        let strategy = '';

        if (Math.abs(speedFactor - 1) <= SPEED_ADJUSTMENT_THRESHOLD &&
            speedFactor >= MIN_SPEED_FACTOR &&
            speedFactor <= MAX_SPEED_FACTOR) {
            // Small difference - use speed adjustment
            videoFilter = `setpts=${(1 / speedFactor).toFixed(3)}*PTS`;
            strategy = 'speed_adjustment';
            console.log(`🎛️ Using speed adjustment strategy: ${speedFactor.toFixed(3)}x speed`);
        } else if (videoDuration > voiceoverDuration) {
            // Video is much longer - trim to match voiceover
            videoFilter = `trim=duration=${voiceoverDuration.toFixed(3)}`;
            strategy = 'trim_video';
            console.log(`✂️ Using video trimming strategy: trimming to ${voiceoverDuration.toFixed(2)}s`);
        } else {
            // Video is much shorter - loop video to match voiceover
            const loopCount = Math.ceil(voiceoverDuration / videoDuration);
            videoFilter = `loop=${loopCount - 1}:${Math.floor(videoDuration * 30)}:0,trim=duration=${voiceoverDuration.toFixed(3)}`;
            strategy = 'loop_video';
            console.log(`🔄 Using video looping strategy: ${loopCount} loops to reach ${voiceoverDuration.toFixed(2)}s`);
        }

        const voiceoverCommand = ffmpeg()
            .input(videoPath)
            .input(fullVoiceoverPath);

        if (videoFilter) {
            voiceoverCommand.outputOptions([
                '-filter:v', videoFilter,
                '-map', '0:v',
                '-map', '1:a',
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'medium',
                '-crf', '23'
            ]);
        } else {
            voiceoverCommand.outputOptions([
                '-map', '0:v',
                '-map', '1:a',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-shortest'
            ]);
        }

        voiceoverCommand
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log(`🎬 Step 2 - Adding voiceover with ${strategy}:`, commandLine);
            })
            .on('end', async () => {
                console.log('✅ Step 2 - Voiceover added successfully with duration matching');

                // Step 3: Apply logo overlay and captions if needed
                if (logoOverlayPath || enableCaptions) {
                    console.log('🎬 Step 3 - Applying logo overlay and/or captions...');
                    try {
                        await new Promise((effectsResolve, effectsReject) => {
                            applyVideoEffects(outputPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, effectsResolve, effectsReject);
                        });
                        console.log('✅ Video composition completed with logo and/or captions');

                        // Clean up temp file
                        try {
                            await fs.unlink(videoPath);
                        } catch (e) {
                            console.log('⚠️ Could not delete temp file:', e.message);
                        }
                        resolve();
                    } catch (error) {
                        console.error('❌ Error applying video effects:', error);
                        reject(error);
                    }
                } else {
                    // No additional effects needed
                    // Verify final duration
                    try {
                        const finalDuration = await getVideoFileDuration(outputPath);
                        console.log(`📊 Final video duration: ${finalDuration.toFixed(2)}s (target: ${voiceoverDuration.toFixed(2)}s)`);
                    } catch (e) {
                        console.log('⚠️ Could not verify final duration:', e.message);
                    }

                    // Clean up temp file
                    try {
                        await fs.unlink(videoPath);
                    } catch (e) {
                        console.log('⚠️ Could not delete temp file:', e.message);
                    }
                    console.log('✅ Video composition completed with perfect sync');
                    resolve();
                }
            })
            .on('error', async (err) => {
                console.error('❌ Error adding voiceover:', err);
                // Clean up temp file
                try {
                    await fs.unlink(videoPath);
                } catch (e) {
                    console.log('⚠️ Could not delete temp file:', e.message);
                }
                reject(err);
            })
            .run();

    } catch (error) {
        console.error('❌ Error in duration calculation:', error);
        reject(error);
    }
}

// Helper function to apply logo overlay and captions to video
async function applyVideoEffects(inputPath, logoOverlayPath, logoPosition, logoOpacity, logoSize, enableCaptions, captionStyle, outputPath, resolve, reject) {
    try {
        const tempEffectsPath = outputPath.replace('.mp4', '_effects_temp.mp4');

        let complexFilter = [];
        let inputCount = 1;

        // Build filter chain
        let videoInput = '[0:v]';

        // Add logo overlay if provided
        if (logoOverlayPath) {
            const fullLogoPath = path.join(__dirname, '../..', logoOverlayPath);

            // Verify logo file exists
            try {
                await fs.access(fullLogoPath);
            } catch (error) {
                console.error('❌ Logo file not found:', fullLogoPath);
                reject(new Error(`Logo file not found: ${logoOverlayPath}`));
                return;
            }

            // Calculate logo size based on setting
            const logoSizeFilter = logoSize === 'small' ? 'scale=iw*0.15:ih*0.15' :
                logoSize === 'large' ? 'scale=iw*0.35:ih*0.35' :
                    'scale=iw*0.25:ih*0.25'; // medium default

            // Calculate position
            const positionMap = {
                'top-left': '10:10',
                'top-right': 'W-w-10:10',
                'bottom-left': '10:H-h-10',
                'bottom-right': 'W-w-10:H-h-10',
                'center': '(W-w)/2:(H-h)/2'
            };
            const position = positionMap[logoPosition] || positionMap['bottom-right'];

            complexFilter.push(`[1:v]${logoSizeFilter},format=rgba,colorchannelmixer=aa=${logoOpacity}[logo]`);
            complexFilter.push(`${videoInput}[logo]overlay=${position}[video_with_logo]`);
            videoInput = '[video_with_logo]';
            inputCount = 2;
        }

        // Add captions if enabled
        if (enableCaptions) {
            // Try to get actual script content for captions
            let captionText = 'Generated Video'; // Default fallback

            try {
                // Get the composition to find the script content
                const voiceoverQuery = await db.query(`
                    SELECT s.content 
                    FROM video_compositions vc
                    LEFT JOIN voiceovers v ON vc.voiceover_id = v.id
                    LEFT JOIN scripts s ON v.script_id = s.id
                    WHERE vc.voiceover_id = v.id
                    LIMIT 1
                `);

                if (voiceoverQuery.rows.length > 0 && voiceoverQuery.rows[0].content) {
                    // Use first 60 characters of script as caption
                    const scriptContent = voiceoverQuery.rows[0].content;
                    captionText = scriptContent.length > 60 ?
                        scriptContent.substring(0, 57) + '...' :
                        scriptContent;
                    console.log('📝 Using script content for captions:', captionText.substring(0, 30) + '...');
                }
            } catch (error) {
                console.log('⚠️ Could not get script content, using default caption');
            }

            // Caption styles with proper escaping
            const captionStyles = {
                'default': "fontfile=/System/Library/Fonts/Arial.ttf:fontsize=24:fontcolor=white:borderw=2:bordercolor=black",
                'modern': "fontfile=/System/Library/Fonts/Arial.ttf:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.7:boxborderw=5",
                'bold': "fontfile=/System/Library/Fonts/Arial\\ Bold.ttf:fontsize=32:fontcolor=yellow:borderw=3:bordercolor=black",
                'minimal': "fontfile=/System/Library/Fonts/Arial.ttf:fontsize=20:fontcolor=white:alpha=0.8"
            };

            const style = captionStyles[captionStyle] || captionStyles['default'];
            // Escape special characters in caption text
            const escapedText = captionText.replace(/'/g, "\\'").replace(/:/g, "\\:");

            complexFilter.push(`${videoInput}drawtext=text='${escapedText}':${style}:x=(w-text_w)/2:y=h-text_h-40[video_with_captions]`);
            videoInput = '[video_with_captions]';
        }

        const effectsCommand = ffmpeg()
            .input(inputPath);

        // Add logo input if needed
        if (logoOverlayPath) {
            const fullLogoPath = path.join(__dirname, '../..', logoOverlayPath);
            effectsCommand.input(fullLogoPath);
        }

        if (complexFilter.length > 0) {
            const finalOutput = videoInput.replace('[', '').replace(']', '');
            effectsCommand
                .complexFilter(complexFilter)
                .outputOptions([
                    '-map', `[${finalOutput}]`,
                    '-map', '0:a', // Keep original audio
                    '-c:v', 'libx264',
                    '-c:a', 'copy',
                    '-preset', 'medium',
                    '-crf', '23'
                ]);
        } else {
            // No effects to apply, just copy
            effectsCommand.outputOptions([
                '-c', 'copy'
            ]);
        }

        effectsCommand
            .output(tempEffectsPath)
            .on('start', (commandLine) => {
                console.log('🎬 Step 3 - Applying video effects:', commandLine);
            })
            .on('end', async () => {
                console.log('✅ Step 3 - Video effects applied successfully');

                try {
                    // Verify temp file was created and has content
                    const tempStats = await fs.stat(tempEffectsPath);
                    if (tempStats.size === 0) {
                        throw new Error('Effects processing failed - temp file is empty');
                    }
                    console.log(`📊 Effects temp file size: ${(tempStats.size / 1024 / 1024).toFixed(2)}MB`);

                    // If input and output are the same, we need to replace the file
                    if (inputPath === outputPath) {
                        // Create backup of original
                        const backupPath = inputPath + '.backup';
                        await fs.rename(inputPath, backupPath);
                        console.log('💾 Original file backed up');

                        // Move temp file to final location
                        await fs.rename(tempEffectsPath, outputPath);
                        console.log('✅ Effects file moved to final location');

                        // Remove backup
                        try {
                            await fs.unlink(backupPath);
                            console.log('🗑️ Backup file cleaned up');
                        } catch (e) {
                            console.log('⚠️ Could not delete backup file:', e.message);
                        }
                    } else {
                        // Different paths, just move the temp file
                        await fs.rename(tempEffectsPath, outputPath);
                        console.log('✅ Effects file moved to output location');
                    }

                    console.log('✅ Video composition completed with logo and/or captions');
                    resolve();

                } catch (error) {
                    console.error('❌ Error in file operations:', error);

                    // Try to clean up any temp files
                    try {
                        await fs.unlink(tempEffectsPath);
                    } catch (e) {
                        // Ignore cleanup errors
                    }

                    reject(error);
                }
            })
            .on('error', async (err) => {
                console.error('❌ Error applying video effects:', err);

                // Clean up temp files
                try {
                    await fs.unlink(tempEffectsPath);
                } catch (e) {
                    console.log('⚠️ Could not delete temp effects file:', e.message);
                }

                reject(err);
            })
            .run();

    } catch (error) {
        console.error('❌ Error in video effects setup:', error);
        reject(error);
    }
}

// Get video duration helper
function getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path.join(__dirname, '../..', videoPath), (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
}

// Get video duration for any file (absolute path)
function getVideoFileDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
}

module.exports = router;
