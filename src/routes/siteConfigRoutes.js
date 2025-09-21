const express = require('express');
const {
  getSiteConfig,
  upsertSiteConfig,
  deleteSiteConfig,
  createBackup,
  getBackups,
  restoreFromBackup,
  validateSiteConfig,
  getConfigHistory
} = require('../controllers/siteConfigController');

const router = express.Router();

// @route   POST /api/siteconfig/backup
// @desc    Create backup of current site configuration
// @access  Private (TODO: add authentication middleware)
router.post('/backup', createBackup);

// @route   GET /api/siteconfig/backups
// @desc    Get all backups
// @access  Private (TODO: add authentication middleware)
router.get('/backups', getBackups);

// @route   POST /api/siteconfig/restore/:backupKey
// @desc    Restore from backup
// @access  Private (TODO: add authentication middleware)
router.post('/restore/:backupKey', restoreFromBackup);

// @route   POST /api/siteconfig/validate
// @desc    Validate site configuration data
// @access  Private (TODO: add authentication middleware)
router.post('/validate', validateSiteConfig);

// @route   GET /api/siteconfig/history
// @desc    Get configuration history/versions
// @access  Private (TODO: add authentication middleware)
router.get('/history', getConfigHistory);

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
