const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all workspaces for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM workspaces WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Get workspace by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM workspaces WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Create workspace
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('product_category').optional().trim(),
  body('target_market').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, product_category, target_market } = req.body;

    const result = await db.query(
      'INSERT INTO workspaces (user_id, name, description, product_category, target_market) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, description, product_category, target_market]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Update workspace
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('product_category').optional().trim(),
  body('target_market').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, product_category, target_market } = req.body;

    const result = await db.query(
      'UPDATE workspaces SET name = COALESCE($1, name), description = COALESCE($2, description), product_category = COALESCE($3, product_category), target_market = COALESCE($4, target_market), updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [name, description, product_category, target_market, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// Delete workspace
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM workspaces WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

// Get workspace analytics
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify workspace ownership
    const workspaceResult = await db.query(
      'SELECT * FROM workspaces WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Get analytics data
    const [videosResult, clipsResult, scriptsResult, voiceoversResult, finalVideosResult] = await Promise.all([
      db.query('SELECT COUNT(*) FROM raw_videos WHERE workspace_id = $1', [id]),
      db.query('SELECT COUNT(*), category FROM video_clips vc JOIN raw_videos rv ON vc.raw_video_id = rv.id WHERE rv.workspace_id = $1 GROUP BY category', [id]),
      db.query('SELECT COUNT(*) FROM scripts WHERE workspace_id = $1', [id]),
      db.query('SELECT COUNT(*) FROM voiceovers v JOIN scripts s ON v.script_id = s.id WHERE s.workspace_id = $1', [id]),
      db.query('SELECT COUNT(*) FROM final_videos WHERE workspace_id = $1', [id])
    ]);

    const analytics = {
      raw_videos: parseInt(videosResult.rows[0].count),
      clips: clipsResult.rows.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {}),
      scripts: parseInt(scriptsResult.rows[0].count),
      voiceovers: parseInt(voiceoversResult.rows[0].count),
      final_videos: parseInt(finalVideosResult.rows[0].count)
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get workspace analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
