const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
    // Removed enum constraint to allow backup keys like 'backup_timestamp'
  },
  config: {
    type: mongoose.Schema.Types.Mixed, // Allows any JSON structure
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'siteconfigs'
});

// Indexes
SiteConfigSchema.index({ isActive: 1 });

module.exports = mongoose.model('SiteConfig', SiteConfigSchema);
