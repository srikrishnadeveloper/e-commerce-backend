const express = require('express');
const router = express.Router();
const SiteConfig = require('../models/SiteConfig');

// GET - Fetch AboutUs content from SiteConfig (public)
router.get('/', async (req, res) => {
  try {
    const aboutUsConfig = await SiteConfig.findOne({ key: 'aboutUs', isActive: true });
    if (!aboutUsConfig) {
      return res.status(404).json({ success: false, message: 'About Us content not found' });
    }
    res.json({ success: true, data: aboutUsConfig.config });
  } catch (error) {
    console.error('Error fetching AboutUs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch about us content' });
  }
});

// PUT - Update AboutUs content in SiteConfig (admin)
router.put('/', async (req, res) => {
  try {
    let aboutUsConfig = await SiteConfig.findOne({ key: 'aboutUs' });
    
    if (!aboutUsConfig) {
      // Create new if doesn't exist
      aboutUsConfig = new SiteConfig({
        key: 'aboutUs',
        config: req.body,
        isActive: true
      });
    } else {
      // Update existing
      aboutUsConfig.config = req.body;
    }
    
    await aboutUsConfig.save();
    res.json({ success: true, data: aboutUsConfig.config, message: 'About Us updated successfully' });
  } catch (error) {
    console.error('Error updating AboutUs:', error);
    res.status(500).json({ success: false, message: 'Failed to update about us content' });
  }
});

module.exports = router;
