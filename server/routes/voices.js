const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const elevenLabsService = require('../utils/elevenLabsService');
const ffmpeg = require('fluent-ffmpeg');

const router = express.Router();

// Helper function to get actual audio duration
function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        resolve(Math.round(duration * 10) / 10); // Round to 1 decimal place
      }
    });
  });
}

// Get available voices
router.get('/available', authenticateToken, (req, res) => {
  const voices = elevenLabsService.getVoices();
  res.json(voices);
});

// Generate voiceover for script
router.post('/generate', authenticateToken, [
  body('scriptId').isInt(),
  body('voiceId').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scriptId, voiceId } = req.body;

    // Get script and verify ownership
    const scriptResult = await db.query(`
      SELECT s.*, w.user_id 
      FROM scripts s 
      JOIN workspaces w ON s.workspace_id = w.id 
      WHERE s.id = $1 AND w.user_id = $2
    `, [scriptId, req.user.id]);

    if (scriptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const script = scriptResult.rows[0];
    const voiceInfo = elevenLabsService.getVoiceById(voiceId);

    if (!voiceInfo) {
      return res.status(400).json({ error: 'Invalid voice ID' });
    }

    // Create voiceovers directory
    const voiceoversDir = path.join(__dirname, '../../uploads/voiceovers');
    await fs.mkdir(voiceoversDir, { recursive: true });

    // Generate unique filename
    const filename = `voiceover_${uuidv4()}.mp3`;
    const filePath = path.join(voiceoversDir, filename);

    // Generate speech
    const speechResult = await elevenLabsService.generateSpeech(script.content, voiceId, filePath);

    const relativePath = path.relative(path.join(__dirname, '../..'), filePath);

    // Save voiceover to database
    const result = await db.query(
      'INSERT INTO voiceovers (script_id, voice_name, voice_id, file_path, duration) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [scriptId, voiceInfo.name, voiceId, relativePath, speechResult.duration]
    );

    res.status(201).json({
      ...result.rows[0],
      voice_info: voiceInfo
    });
  } catch (error) {
    console.error('Voiceover generation error:', error);
    res.status(500).json({ error: 'Failed to generate voiceover' });
  }
});

// Get voiceovers for script
router.get('/script/:scriptId', authenticateToken, async (req, res) => {
  try {
    const { scriptId } = req.params;

    // Verify script ownership
    const scriptResult = await db.query(`
      SELECT s.*, w.user_id 
      FROM scripts s 
      JOIN workspaces w ON s.workspace_id = w.id 
      WHERE s.id = $1 AND w.user_id = $2
    `, [scriptId, req.user.id]);

    if (scriptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const voiceoversResult = await db.query(
      'SELECT * FROM voiceovers WHERE script_id = $1 ORDER BY created_at DESC',
      [scriptId]
    );

    // Add voice info to each voiceover
    const voiceovers = voiceoversResult.rows.map(voiceover => ({
      ...voiceover,
      voice_info: elevenLabsService.getVoiceById(voiceover.voice_id)
    }));

    res.json(voiceovers);
  } catch (error) {
    console.error('Get voiceovers error:', error);
    res.status(500).json({ error: 'Failed to fetch voiceovers' });
  }
});

// Get voiceovers for workspace
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

    const voiceoversResult = await db.query(`
      SELECT v.*, s.title as script_title
      FROM voiceovers v 
      JOIN scripts s ON v.script_id = s.id 
      WHERE s.workspace_id = $1 
      ORDER BY v.created_at DESC
    `, [workspaceId]);

    // Add voice info to each voiceover
    const voiceovers = voiceoversResult.rows.map(voiceover => ({
      ...voiceover,
      voice_info: elevenLabsService.getVoiceById(voiceover.voice_id)
    }));

    res.json(voiceovers);
  } catch (error) {
    console.error('Get workspace voiceovers error:', error);
    res.status(500).json({ error: 'Failed to fetch voiceovers' });
  }
});

// Delete voiceover
router.delete('/:voiceoverId', authenticateToken, async (req, res) => {
  try {
    const { voiceoverId } = req.params;

    // Get voiceover and verify ownership
    const voiceoverResult = await db.query(`
      SELECT v.*, w.user_id 
      FROM voiceovers v 
      JOIN scripts s ON v.script_id = s.id 
      JOIN workspaces w ON s.workspace_id = w.id 
      WHERE v.id = $1 AND w.user_id = $2
    `, [voiceoverId, req.user.id]);

    if (voiceoverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voiceover not found' });
    }

    const voiceover = voiceoverResult.rows[0];

    // Delete audio file
    try {
      const audioPath = path.join(__dirname, '../..', voiceover.file_path);
      await fs.unlink(audioPath);
    } catch (fileError) {
      console.error('Failed to delete audio file:', fileError);
    }

    // Delete from database
    await db.query('DELETE FROM voiceovers WHERE id = $1', [voiceoverId]);

    res.json({ message: 'Voiceover deleted successfully' });
  } catch (error) {
    console.error('Delete voiceover error:', error);
    res.status(500).json({ error: 'Failed to delete voiceover' });
  }
});

// Get voiceover by ID
router.get('/:voiceoverId', authenticateToken, async (req, res) => {
  try {
    const { voiceoverId } = req.params;

    const result = await db.query(`
      SELECT v.*, w.user_id, s.title as script_title
      FROM voiceovers v 
      JOIN scripts s ON v.script_id = s.id 
      JOIN workspaces w ON s.workspace_id = w.id 
      WHERE v.id = $1 AND w.user_id = $2
    `, [voiceoverId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voiceover not found' });
    }

    const voiceover = result.rows[0];
    voiceover.voice_info = elevenLabsService.getVoiceById(voiceover.voice_id);

    res.json(voiceover);
  } catch (error) {
    console.error('Get voiceover error:', error);
    res.status(500).json({ error: 'Failed to fetch voiceover' });
  }
});

// Fix voiceover durations endpoint
router.post('/fix-durations/:workspaceId', authenticateToken, async (req, res) => {
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

    // Get all voiceovers for this workspace
    const voiceoversResult = await db.query(`
      SELECT v.* FROM voiceovers v
      JOIN scripts s ON v.script_id = s.id
      WHERE s.workspace_id = $1
    `, [workspaceId]);

    const results = [];
    let fixedCount = 0;
    let errorCount = 0;

    for (const voiceover of voiceoversResult.rows) {
      try {
        const fullPath = path.join(__dirname, '../..', voiceover.file_path);
        const actualDuration = await getAudioDuration(fullPath);

        // Update duration in database
        await db.query(
          'UPDATE voiceovers SET duration = $1 WHERE id = $2',
          [actualDuration, voiceover.id]
        );

        results.push({
          id: voiceover.id,
          oldDuration: voiceover.duration,
          newDuration: actualDuration,
          status: 'fixed'
        });

        fixedCount++;
        console.log(`✅ Fixed voiceover ${voiceover.id}: ${voiceover.duration}s → ${actualDuration}s`);
      } catch (error) {
        console.error(`❌ Error fixing voiceover ${voiceover.id}:`, error.message);
        results.push({
          id: voiceover.id,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    res.json({
      message: `Duration fix completed: ${fixedCount} fixed, ${errorCount} errors`,
      fixedCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error fixing voiceover durations:', error);
    res.status(500).json({ error: 'Failed to fix voiceover durations' });
  }
});

module.exports = router;
