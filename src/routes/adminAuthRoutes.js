const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  createAdmin,
  listAdmins,
  deactivateAdmin,
  logout
} = require('../controllers/adminAuthController');
const { protectAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

// Public routes
router.post('/login', login);

// Protected routes (all admins)
router.get('/me', protectAdmin, getMe);
router.post('/logout', protectAdmin, logout);

// Super admin only routes
router.post('/create', protectAdmin, requireSuperAdmin, createAdmin);
router.get('/list', protectAdmin, requireSuperAdmin, listAdmins);
router.put('/:id/deactivate', protectAdmin, requireSuperAdmin, deactivateAdmin);

module.exports = router;
