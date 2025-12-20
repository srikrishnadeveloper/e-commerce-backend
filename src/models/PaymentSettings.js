const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema(
	{
		paymentMode: {
			type: String,
			enum: ['razorpay', 'manual_upi'],
			default: 'razorpay'
		},
		upiSettings: {
			qrCodeImage: {
				type: String,
				default: ''
			},
			upiId: {
				type: String,
				default: ''
			},
			merchantName: {
				type: String,
				default: 'TechCart Store'
			},
			instructions: {
				type: String,
				default: 'Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, etc.) to make payment.'
			}
		},
		razorpayConfigured: {
			type: Boolean,
			default: false
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	{
		timestamps: true
	}
);

// Singleton helper to ensure settings document always exists
paymentSettingsSchema.statics.getSettings = async function () {
	let settings = await this.findOne();

	if (!settings) {
		settings = await this.create({
			paymentMode: 'razorpay',
			upiSettings: {
				qrCodeImage: '',
				upiId: '',
				merchantName: 'TechCart Store',
				instructions: 'Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, etc.) to make payment.'
			},
			razorpayConfigured: false
		});
	}

	return settings;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
