const SiteConfig = require('../models/SiteConfig');

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
      if (consolidated) {
        const section = consolidated.config?.[key.toLowerCase()];
        if (section === undefined) {
          return res.status(404).json({ success: false, message: `Site configuration '${key}' not found` });
        }
        return res.status(200).json({ success: true, data: section, version: consolidated.version, lastUpdated: consolidated.updatedAt });
      }

      // Legacy per-key documents fallback
      const config = await SiteConfig.findOne({ key: key.toLowerCase(), isActive: true });
      if (!config) {
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

module.exports = {
  getSiteConfig,
  upsertSiteConfig,
  deleteSiteConfig
};
