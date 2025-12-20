const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Address sub-schema
const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    default: 'Home',
    enum: ['Home', 'Work', 'Other']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  addressLine1: {
    type: String,
    required: [true, 'Address is required']
  },
  addressLine2: String,
  city: {
    type: String,
    required: [true, 'City is required']
  },
  state: {
    type: String,
    required: [true, 'State is required']
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required']
  },
  country: {
    type: String,
    default: 'United States'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: Date,
  verificationOTP: String,
  verificationOTPExpires: Date,
  phone: {
    type: String,
    trim: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerifiedAt: Date,
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  addresses: [addressSchema],
  cart: [{
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      default: 1
    },
    selectedColor: {
      type: String,
      default: ''
    },
    selectedSize: {
      type: String,
      default: ''
    }
  }],
  wishlist: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Product'
  }],
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// Index for faster cart item lookups/updates by product
userSchema.index({ 'cart.product': 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate 6-digit OTP for email verification
userSchema.methods.createVerificationOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store hashed OTP
  this.verificationOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
  
  // OTP expires in 10 minutes
  this.verificationOTPExpires = Date.now() + 10 * 60 * 1000;
  
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(candidateOTP) {
  const hashedOTP = crypto
    .createHash('sha256')
    .update(candidateOTP)
    .digest('hex');
  
  return this.verificationOTP === hashedOTP && 
         this.verificationOTPExpires > Date.now();
};

const User = mongoose.model('User', userSchema);

module.exports = User;