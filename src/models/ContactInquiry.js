const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  repliedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
contactInquirySchema.index({ status: 1, createdAt: -1 });
contactInquirySchema.index({ email: 1 });

const ContactInquiry = mongoose.model('ContactInquiry', contactInquirySchema);

module.exports = ContactInquiry;
