const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const videoProcessor = require('../utils/videoProcessor');
const geminiService = require('../utils/geminiService');

const router = express.Router();

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/videos');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, and WebM files are allowed.'));
    }
  }
});

// Upload raw video
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const { workspaceId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Verify workspace ownership
    const workspaceResult = await db.query(
      'SELECT * FROM workspaces WHERE id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const filePath = path.relative(path.join(__dirname, '../..'), req.file.path);

    // Get video metadata
    const videoInfo = await videoProcessor.getVideoInfo(req.file.path);

    // Save video to database
    const result = await db.query(
      'INSERT INTO raw_videos (workspace_id, filename, original_name, file_path, file_size, duration, format, resolution) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [workspaceId, req.file.filename, req.file.originalname, filePath, req.file.size, videoInfo.duration, videoInfo.format, videoInfo.resolution]
    );

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('Video upload error:', error);

    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Process video (analyze and split into clips)
router.post('/:videoId/process', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;

    // Get video and verify ownership
    const videoResult = await db.query(`
      SELECT rv.*, w.user_id 
      FROM raw_videos rv 
      JOIN workspaces w ON rv.workspace_id = w.id 
      WHERE rv.id = $1 AND w.user_id = $2
    `, [videoId, req.user.id]);

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    if (video.processed) {
      return res.status(400).json({ error: 'Video already processed' });
    }

    const videoPath = path.join(__dirname, '../..', video.file_path);

    // Get workspace info for analysis
    const workspaceResult = await db.query(
      'SELECT * FROM workspaces WHERE id = $1',
      [video.workspace_id]
    );

    const workspace = workspaceResult.rows[0];

    // Get video info for analysis
    const videoInfo = {
      duration: video.duration,
      format: video.format,
      resolution: video.resolution,
      originalName: video.original_name
    };

    // Analyze video with Gemini
    const suggestedClips = await geminiService.analyzeVideo(videoInfo, workspace);

    // Create clips directory
    const clipsDir = path.join(__dirname, '../../uploads/clips', video.filename.split('.')[0]);
    await fs.mkdir(clipsDir, { recursive: true });

    // Process each suggested clip
    const processedClips = [];

    for (let i = 0; i < suggestedClips.length; i++) {
      const clip = suggestedClips[i];
      const clipFilename = `clip_${i + 1}_${clip.category}.mp4`;
      const clipPath = path.join(clipsDir, clipFilename);

      try {
        // Cut the clip
        await videoProcessor.cutClip(videoPath, clipPath, clip.startTime, clip.endTime);

        const relativePath = path.relative(path.join(__dirname, '../..'), clipPath);

        // Save clip to database
        const clipResult = await db.query(
          'INSERT INTO video_clips (raw_video_id, name, category, start_time, end_time, file_path, duration) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [videoId, clip.name, clip.category, clip.startTime, clip.endTime, relativePath, clip.endTime - clip.startTime]
        );

        processedClips.push(clipResult.rows[0]);
      } catch (clipError) {
        console.error(`Failed to process clip ${i + 1}:`, clipError);
        // Continue processing other clips
      }
    }

    // Mark video as processed
    await db.query('UPDATE raw_videos SET processed = TRUE WHERE id = $1', [videoId]);

    res.json({
      message: 'Video processed successfully',
      clips: processedClips
    });
  } catch (error) {
    console.error('Video processing error:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

// Get videos for workspace
router.get('/workspace/:workspaceId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace ownership
    const workspaceResult = await db.query(
      'SELECT * FROM workspaces WHERE id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const videosResult = await db.query(
      'SELECT * FROM raw_videos WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    );

    res.json(videosResult.rows);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get clips for video
router.get('/:videoId/clips', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;

    // Verify video ownership
    const videoResult = await db.query(`
      SELECT rv.*, w.user_id 
      FROM raw_videos rv 
      JOIN workspaces w ON rv.workspace_id = w.id 
      WHERE rv.id = $1 AND w.user_id = $2
    `, [videoId, req.user.id]);

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const clipsResult = await db.query(
      'SELECT * FROM video_clips WHERE raw_video_id = $1 ORDER BY start_time',
      [videoId]
    );

    res.json(clipsResult.rows);
  } catch (error) {
    console.error('Get clips error:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

// Delete video
router.delete('/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;

    // Get video and verify ownership
    const videoResult = await db.query(`
      SELECT rv.*, w.user_id 
      FROM raw_videos rv 
      JOIN workspaces w ON rv.workspace_id = w.id 
      WHERE rv.id = $1 AND w.user_id = $2
    `, [videoId, req.user.id]);

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = videoResult.rows[0];

    // Delete video file
    try {
      const videoPath = path.join(__dirname, '../..', video.file_path);
      await fs.unlink(videoPath);
    } catch (fileError) {
      console.error('Failed to delete video file:', fileError);
    }

    // Delete clips files
    try {
      const clipsDir = path.join(__dirname, '../../uploads/clips', video.filename.split('.')[0]);
      await fs.rmdir(clipsDir, { recursive: true });
    } catch (clipsError) {
      console.error('Failed to delete clips directory:', clipsError);
    }

    // Delete from database (cascades to clips)
    await db.query('DELETE FROM raw_videos WHERE id = $1', [videoId]);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
