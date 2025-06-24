const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const geminiService = require('../utils/geminiService');

const router = express.Router();

// Generate script for workspace
router.post('/generate', authenticateToken, [
  body('workspaceId').isInt(),
  body('title').trim().isLength({ min: 1 }),
  body('style').optional().trim(),
  body('tone').optional().trim(),
  body('target_audience').optional().trim(),
  body('prompt').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { workspaceId, title, style, tone, target_audience, prompt } = req.body;

    // Verify workspace ownership
    const workspaceResult = await db.query(
      'SELECT * FROM workspaces WHERE id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = workspaceResult.rows[0];

    // Generate script using Gemini
    const scriptData = await geminiService.generateScript(workspace, prompt);

    // Save script to database
    const result = await db.query(
      'INSERT INTO scripts (workspace_id, title, content, style, tone, target_audience) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [workspaceId, scriptData.title || title, scriptData.content, scriptData.style || style, scriptData.tone || tone, scriptData.target_audience || target_audience]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).json({ error: 'Failed to generate script' });
  }
});

// Get scripts for workspace
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

    const scriptsResult = await db.query(
      'SELECT * FROM scripts WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    );

    res.json(scriptsResult.rows);
  } catch (error) {
    console.error('Get scripts error:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// Get script by ID
router.get('/:scriptId', authenticateToken, async (req, res) => {
  try {
    const { scriptId } = req.params;

    const result = await db.query(`
      SELECT s.*, w.user_id 
      FROM scripts s 
      JOIN workspaces w ON s.workspace_id = w.id 
      WHERE s.id = $1 AND w.user_id = $2
    `, [scriptId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get script error:', error);
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

// Update script
router.put('/:scriptId', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('style').optional().trim(),
  body('tone').optional().trim(),
  body('target_audience').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scriptId } = req.params;
    const { title, content, style, tone, target_audience } = req.body;

    const result = await db.query(`
      UPDATE scripts SET 
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        style = COALESCE($3, style),
        tone = COALESCE($4, tone),
        target_audience = COALESCE($5, target_audience),
        updated_at = CURRENT_TIMESTAMP
      FROM workspaces w 
      WHERE scripts.id = $6 AND scripts.workspace_id = w.id AND w.user_id = $7 
      RETURNING scripts.*
    `, [title, content, style, tone, target_audience, scriptId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update script error:', error);
    res.status(500).json({ error: 'Failed to update script' });
  }
});

// Delete script
router.delete('/:scriptId', authenticateToken, async (req, res) => {
  try {
    const { scriptId } = req.params;

    const result = await db.query(`
      DELETE FROM scripts 
      USING workspaces w 
      WHERE scripts.id = $1 AND scripts.workspace_id = w.id AND w.user_id = $2 
      RETURNING scripts.*
    `, [scriptId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Delete script error:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// Duplicate script
router.post('/:scriptId/duplicate', authenticateToken, async (req, res) => {
  try {
    const { scriptId } = req.params;

    // Get original script
    const originalResult = await db.query(`
      SELECT s.*, w.user_id 
      FROM scripts s 
      JOIN workspaces w ON s.workspace_id = w.id 
      WHERE s.id = $1 AND w.user_id = $2
    `, [scriptId, req.user.id]);

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }

    const original = originalResult.rows[0];

    // Create duplicate
    const result = await db.query(
      'INSERT INTO scripts (workspace_id, title, content, style, tone, target_audience) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        original.workspace_id,
        `${original.title} (Copy)`,
        original.content,
        original.style,
        original.tone,
        original.target_audience
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Duplicate script error:', error);
    res.status(500).json({ error: 'Failed to duplicate script' });
  }
});

module.exports = router;
