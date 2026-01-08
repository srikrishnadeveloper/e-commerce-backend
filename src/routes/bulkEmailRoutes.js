const express = require('express');
const router = express.Router();
const bulkEmailController = require('../controllers/bulkEmailController');
const { protectAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

// Get available email templates
router.get('/templates', bulkEmailController.getTemplates);

// Get recipient groups/segments
router.get('/recipient-groups', bulkEmailController.getRecipientGroups);

// Preview email with template
router.post('/preview', bulkEmailController.previewEmail);

// Send bulk email
router.post('/send', bulkEmailController.sendBulkEmail);

// Get campaign history
router.get('/history', bulkEmailController.getCampaignHistory);

// Test email configuration
router.post('/test', bulkEmailController.testEmailConnection);

module.exports = router;
