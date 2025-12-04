const express = require('express');
const router = express.Router();
const { getAllImages, uploadImages, deleteImage, upload } = require('../controllers/imageController');

// Route: GET /api/images
// @desc    Get list of all available images
// @access  Public (for admin interface)
router.get('/', getAllImages);

// Route: POST /api/images/upload
// @desc    Upload images to the images directory
// @access  Public (for admin interface)
router.post('/upload', upload.array('images', 10), uploadImages);

// Route: DELETE /api/images/:filename
// @desc    Delete an image from the images directory
// @access  Public (for admin interface)
router.delete('/:filename', deleteImage);

module.exports = router;
