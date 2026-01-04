const Admin = require('../models/Admin');
const { generateAdminToken } = require('../middleware/adminAuth');

// @route   POST /api/admin-auth/login
// @desc    Admin login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find admin with password field
    const admin = await Admin.findOne({ username }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Check password
    const isPasswordCorrect = await admin.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate token
    const token = generateAdminToken(admin._id);

    // Remove password from output
    admin.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        priority: admin.priority,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @route   GET /api/admin-auth/me
// @desc    Get current admin info
// @access  Private (Admin)
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        priority: admin.priority,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route   POST /api/admin-auth/create
// @desc    Create new admin (Priority 1 only)
// @access  Private (Super Admin)
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, name, email, priority } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Ensure new admins cannot have priority 1
    const adminPriority = priority && priority > 1 ? priority : 2;

    // Create admin
    const newAdmin = await Admin.create({
      username,
      password,
      name,
      email,
      priority: adminPriority,
      createdBy: req.admin.id
    });

    // Remove password from output
    newAdmin.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
        email: newAdmin.email,
        priority: newAdmin.priority
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating admin'
    });
  }
};

// @route   GET /api/admin-auth/list
// @desc    Get all admins (Priority 1 only)
// @access  Private (Super Admin)
exports.listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .populate('createdBy', 'username')
      .sort({ priority: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: admins.length,
      admins: admins.map(admin => ({
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        priority: admin.priority,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdBy: admin.createdBy,
        createdAt: admin.createdAt
      }))
    });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admins'
    });
  }
};

// @route   PUT /api/admin-auth/:id/deactivate
// @desc    Deactivate admin (Priority 1 only)
// @access  Private (Super Admin)
exports.deactivateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Cannot deactivate priority 1 admin
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.priority === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate super admin'
      });
    }

    admin.isActive = false;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route   POST /api/admin-auth/logout
// @desc    Logout admin
// @access  Private (Admin)
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
