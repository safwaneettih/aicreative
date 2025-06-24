const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
    res.json({ message: 'Compositions route works!' });
});

module.exports = router;
