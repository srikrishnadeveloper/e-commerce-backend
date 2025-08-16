const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createOrderFromCart,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
} = require('../controllers/orderController');

const router = express.Router();

router.use(protect);

// Create order from the current cart
router.post('/', createOrderFromCart);

// Get my orders
router.get('/', getMyOrders);

// Get specific order by id
router.get('/:id', getOrderById);

// Cancel my order (if pending)
router.patch('/:id/cancel', cancelMyOrder);

module.exports = router;







