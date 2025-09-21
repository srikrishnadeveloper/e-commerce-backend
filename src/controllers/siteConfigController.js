const SiteConfig = require('../models/SiteConfig');

// Minimal safe defaults for known sections to keep UI functional
const DEFAULT_SECTIONS = {
  navigation: {
    mainMenu: [
      { name: 'Home', link: '/' },
      { name: 'Shop', link: '/shop' },
      { name: 'Contact', link: '/contact' }
    ],
    footerNav: []
  },
  hero: { slides: [] }
};

// @desc    Get all site configuration or specific config by key
// @route   GET /api/siteconfig
// @route   GET /api/siteconfig/:key
// @access  Public
const getSiteConfig = async (req, res) => {
  try {
    const { key } = req.params;

    // Prefer consolidated document under key 'all' if available
    const consolidated = await SiteConfig.findOne({ key: 'all', isActive: true });

    if (key) {
      const keyLower = key.toLowerCase();
      if (consolidated) {
        const section = consolidated.config?.[keyLower];
        if (section === undefined) {
          // Return minimal defaults for known sections instead of 404
          const defaults = DEFAULT_SECTIONS[keyLower];
          if (defaults) {
            return res.status(200).json({ success: true, data: defaults, version: consolidated.version, lastUpdated: consolidated.updatedAt });
          }
          return res.status(404).json({ success: false, message: `Site configuration '${key}' not found` });
        }
        return res.status(200).json({ success: true, data: section, version: consolidated.version, lastUpdated: consolidated.updatedAt });
      }

      // Legacy per-key documents fallback
      const config = await SiteConfig.findOne({ key: keyLower, isActive: true });
      if (!config) {
        // Return minimal defaults for known sections instead of 404 (no version info)
        const defaults = DEFAULT_SECTIONS[keyLower];
        if (defaults) {
          return res.status(200).json({ success: true, data: defaults });
        }
        return res.status(404).json({ success: false, message: `Site configuration '${key}' not found` });
      }
      return res.status(200).json({ success: true, data: config.config, version: config.version, lastUpdated: config.updatedAt });
    }

    if (consolidated) {
      return res.status(200).json({ success: true, data: consolidated.config, version: consolidated.version, lastUpdated: consolidated.updatedAt });
    }

    // Build map from multiple docs (legacy mode)
    const configs = await SiteConfig.find({ isActive: true }).select('key config version updatedAt').sort({ key: 1 });
    const configMap = {};
    configs.forEach((c) => {
      configMap[c.key] = c.config;
    });
    return res.status(200).json({ success: true, data: configMap, count: configs.length });
  } catch (error) {
    console.error('Error fetching site configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create or update site configuration
// @route   POST /api/siteconfig
// @route   PUT /api/siteconfig/:key
// @access  Private (Admin only - TODO: add authentication)
const upsertSiteConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { config, version } = req.body;
    
    if (!key || !config) {
      return res.status(400).json({ success: false, message: 'Key and config data are required' });
    }
    
    const configKey = key.toLowerCase();
    // Allow 'all' consolidated key and legacy keys
    
    const updatedConfig = await SiteConfig.findOneAndUpdate(
      { key: configKey },
      { key: configKey, config, version: version || 1, isActive: true },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: { key: updatedConfig.key, config: updatedConfig.config, version: updatedConfig.version, lastUpdated: updatedConfig.updatedAt },
      message: 'Site configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating site configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete site configuration
// @route   DELETE /api/siteconfig/:key
// @access  Private (Admin only - TODO: add authentication)
const deleteSiteConfig = async (req, res) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Configuration key is required'
      });
    }

    // Soft delete by setting isActive to false
    const config = await SiteConfig.findOneAndUpdate(
      { key: key.toLowerCase() },
      { isActive: false },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Site configuration '${key}' not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Site configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting site configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create backup of current site configuration
// @route   POST /api/siteconfig/backup
// @access  Private (Admin only)
const createBackup = async (req, res) => {
  try {
    const currentConfig = await SiteConfig.findOne({ key: 'all', isActive: true });

    if (!currentConfig) {
      return res.status(404).json({
        success: false,
        message: 'No active site configuration found to backup'
      });
    }

    // Create backup with timestamp
    const backupKey = `backup_${Date.now()}`;
    const backup = new SiteConfig({
      key: backupKey,
      config: currentConfig.config,
      version: currentConfig.version,
      isActive: false // Backups are inactive by default
    });

    await backup.save();

    res.status(201).json({
      success: true,
      data: {
        backupKey,
        timestamp: backup.createdAt,
        version: backup.version
      },
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all backups
// @route   GET /api/siteconfig/backups
// @access  Private (Admin only)
const getBackups = async (req, res) => {
  try {
    const backups = await SiteConfig.find({
      key: { $regex: /^backup_/ },
      isActive: false
    })
    .select('key version createdAt updatedAt')
    .sort({ createdAt: -1 });

    const formattedBackups = backups.map(backup => ({
      id: backup._id,
      key: backup.key,
      timestamp: backup.createdAt,
      version: backup.version,
      date: backup.createdAt.toISOString().split('T')[0],
      time: backup.createdAt.toTimeString().split(' ')[0]
    }));

    res.status(200).json({
      success: true,
      data: formattedBackups,
      count: formattedBackups.length
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Restore from backup
// @route   POST /api/siteconfig/restore/:backupKey
// @access  Private (Admin only)
const restoreFromBackup = async (req, res) => {
  try {
    const { backupKey } = req.params;

    // Find the backup
    const backup = await SiteConfig.findOne({ key: backupKey, isActive: false });

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
    }

    // Create backup of current config before restoring
    await createBackupInternal();

    // Update the main config with backup data
    const restoredConfig = await SiteConfig.findOneAndUpdate(
      { key: 'all' },
      {
        config: backup.config,
        version: backup.version + 1,
        isActive: true
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: {
        config: restoredConfig.config,
        version: restoredConfig.version,
        restoredFrom: backupKey,
        timestamp: restoredConfig.updatedAt
      },
      message: 'Configuration restored successfully'
    });
  } catch (error) {
    console.error('Error restoring from backup:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Internal function to create backup
const createBackupInternal = async () => {
  const currentConfig = await SiteConfig.findOne({ key: 'all', isActive: true });
  if (currentConfig) {
    const backupKey = `backup_${Date.now()}`;
    const backup = new SiteConfig({
      key: backupKey,
      config: currentConfig.config,
      version: currentConfig.version,
      isActive: false
    });
    await backup.save();
    return backup;
  }
  return null;
};

// @desc    Validate site configuration data
// @route   POST /api/siteconfig/validate
// @access  Private (Admin only)
const validateSiteConfig = async (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuration data is required'
      });
    }

    const errors = [];
    const warnings = [];

    // Validate branding section
    if (config.branding) {
      if (config.branding.colors) {
        const colorFields = ['primary', 'secondary', 'accent', 'neutral'];
        colorFields.forEach(field => {
          if (config.branding.colors[field] && !isValidHexColor(config.branding.colors[field])) {
            errors.push(`Invalid hex color for branding.colors.${field}: ${config.branding.colors[field]}`);
          }
        });
      }

      if (config.branding.logo) {
        if (!config.branding.logo.light || !config.branding.logo.dark) {
          warnings.push('Both light and dark logo variants should be provided');
        }
      }
    }

    // Validate navigation section
    if (config.navigation) {
      if (config.navigation.mainMenu && Array.isArray(config.navigation.mainMenu)) {
        config.navigation.mainMenu.forEach((item, index) => {
          if (!item.name || !item.link) {
            errors.push(`Navigation menu item ${index + 1} must have both name and link`);
          }
        });
      }
    }

    // Validate hero section
    if (config.hero && config.hero.slides) {
      if (!Array.isArray(config.hero.slides) || config.hero.slides.length === 0) {
        warnings.push('Hero section should have at least one slide');
      } else {
        config.hero.slides.forEach((slide, index) => {
          if (!slide.heading || !slide.subheading || !slide.image) {
            errors.push(`Hero slide ${index + 1} must have heading, subheading, and image`);
          }
        });
      }
    }

    // Validate announcement bar
    if (config.announcementbar) {
      if (config.announcementbar.backgroundColor && !isValidHexColor(config.announcementbar.backgroundColor)) {
        errors.push(`Invalid hex color for announcement bar background: ${config.announcementbar.backgroundColor}`);
      }
      if (config.announcementbar.textColor && !isValidHexColor(config.announcementbar.textColor)) {
        errors.push(`Invalid hex color for announcement bar text: ${config.announcementbar.textColor}`);
      }
    }

    const isValid = errors.length === 0;

    res.status(200).json({
      success: true,
      data: {
        isValid,
        errors,
        warnings,
        errorCount: errors.length,
        warningCount: warnings.length
      },
      message: isValid ? 'Configuration is valid' : 'Configuration has validation errors'
    });
  } catch (error) {
    console.error('Error validating site configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to validate hex colors
const isValidHexColor = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

// @desc    Get configuration history/versions
// @route   GET /api/siteconfig/history
// @access  Private (Admin only)
const getConfigHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const history = await SiteConfig.find({
      $or: [
        { key: 'all' },
        { key: { $regex: /^backup_/ } }
      ]
    })
    .select('key version createdAt updatedAt isActive')
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit));

    const formattedHistory = history.map(item => ({
      id: item._id,
      key: item.key,
      version: item.version,
      type: item.key === 'all' ? 'current' : 'backup',
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      timestamp: item.updatedAt.toISOString()
    }));

    res.status(200).json({
      success: true,
      data: formattedHistory,
      count: formattedHistory.length
    });
  } catch (error) {
    console.error('Error fetching configuration history:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSiteConfig,
  upsertSiteConfig,
  deleteSiteConfig,
  createBackup,
  getBackups,
  restoreFromBackup,
  validateSiteConfig,
  getConfigHistory
};
