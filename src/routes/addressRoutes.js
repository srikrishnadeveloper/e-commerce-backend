const express = require('express');
const {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress
} = require('../controllers/addressController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all addresses / Add new address
router.route('/')
  .get(getAddresses)
  .post(addAddress);

// Get default address
router.get('/default', getDefaultAddress);

// Update / Delete specific address
router.route('/:addressId')
  .patch(updateAddress)
  .delete(deleteAddress);

// Set address as default
router.patch('/:addressId/default', setDefaultAddress);

module.exports = router;
