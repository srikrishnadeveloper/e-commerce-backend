const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const SiteConfig = require('./src/models/SiteConfig');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5177',
    'http://localhost:5174'
  ],
  credentials: true
}));
app.use(express.json());

// Test endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running!' });
});

// Site config endpoint
app.get('/api/siteconfig/:key', async (req, res) => {
  try {
    const { key } = req.params;
    console.log(`[API] Fetching config for key: ${key}`);
    
    // Find the consolidated config
    const consolidated = await SiteConfig.findOne({ key: 'all', isActive: true });
    
    if (!consolidated) {
      console.log('[API] No consolidated config found');
      return res.status(404).json({ success: false, message: 'Site configuration not found' });
    }
    
    console.log('[API] Found consolidated config');
    
    if (key === 'all') {
      return res.status(200).json({ 
        success: true, 
        data: consolidated.config,
        version: consolidated.version,
        lastUpdated: consolidated.updatedAt 
      });
    }
    
    const keyLower = key.toLowerCase();
    const section = consolidated.config?.[keyLower];
    
    if (section === undefined) {
      console.log(`[API] Section '${keyLower}' not found in config`);
      return res.status(404).json({ success: false, message: `Site configuration '${key}' not found` });
    }
    
    console.log(`[API] Returning section '${keyLower}'`);
    return res.status(200).json({ 
      success: true, 
      data: section,
      version: consolidated.version,
      lastUpdated: consolidated.updatedAt 
    });
    
  } catch (error) {
    console.error('[API] Error fetching config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:28000/ecommerce');
    console.log('✅ Connected to MongoDB');
    
    const port = 5001;
    app.listen(port, () => {
      console.log(`🚀 Test server running on port ${port}`);
      console.log(`📡 API available at http://localhost:${port}/api`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
