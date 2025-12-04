const express = require('express');
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  getMyReviews,
  canReviewProduct
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes
router.get('/my-reviews', protect, getMyReviews);
router.get('/can-review/:productId', protect, canReviewProduct);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', protect, markHelpful);
router.post('/:id/report', protect, reportReview);

module.exports = router;
