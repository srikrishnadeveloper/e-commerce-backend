const express = require('express');
const {
  getSiteConfig,
  upsertSiteConfig,
  deleteSiteConfig
} = require('../controllers/siteConfigController');

const router = express.Router();

// @route   GET /api/siteconfig
// @desc    Get all site configurations
// @access  Public
router.get('/', getSiteConfig);

// @route   GET /api/siteconfig/:key
// @desc    Get specific site configuration by key
// @access  Public
router.get('/:key', getSiteConfig);

// @route   POST /api/siteconfig/:key
// @desc    Create or update site configuration
// @access  Private (TODO: add authentication middleware)
router.post('/:key', upsertSiteConfig);

// @route   PUT /api/siteconfig/:key
// @desc    Update site configuration
// @access  Private (TODO: add authentication middleware)
router.put('/:key', upsertSiteConfig);

// @route   DELETE /api/siteconfig/:key
// @desc    Delete site configuration
// @access  Private (TODO: add authentication middleware)
router.delete('/:key', deleteSiteConfig);

module.exports = router;
