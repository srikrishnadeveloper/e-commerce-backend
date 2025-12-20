const express = require('express');
const router = express.Router();
const {
  submitInquiry,
  getAllInquiries,
  getInquiry,
  updateInquiry,
  deleteInquiry,
  markAsRead
} = require('../controllers/contactController');

// Public route - submit contact form
router.post('/', submitInquiry);

// Admin routes (add auth middleware in production)
router.get('/', getAllInquiries);
router.get('/:id', getInquiry);
router.patch('/:id', updateInquiry);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteInquiry);

module.exports = router;
