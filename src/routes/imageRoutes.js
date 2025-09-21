const express = require('express');
const router = express.Router();
const { getAllImages } = require('../controllers/imageController');

// Route: GET /api/images
// @desc    Get list of all available images
// @access  Public (for admin interface)
router.get('/', getAllImages);

module.exports = router;
