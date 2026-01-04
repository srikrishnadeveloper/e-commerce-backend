const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Basic email sending function using SendGrid
const sendEmail = async options => {
  try {
    const msg = {
      to: options.email,
      from: {
        email: process.env.EMAIL_FROM || 'srikrishnawebdeveloper@gmail.com',
        name: process.env.EMAIL_FROM_NAME || 'E-Commerce Store'
      },
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    const response = await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid:', response[0].statusCode);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error) {
    console.error('SendGrid email sending failed:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail
};