const axios = require('axios');

const API_URL = 'http://localhost:5001/api';
const ADMIN_EMAIL = 'admin@ecommerce.com';
const ADMIN_PASSWORD = 'AdminPassword123!';

const testBulkEmail = async () => {
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const token = loginRes.data.token;
    console.log('✅ Login successful. Token received.');

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    console.log('\n2. Fetching templates...');
    const templatesRes = await axios.get(`${API_URL}/admin/emails/templates`, config);
    console.log(`✅ Templates fetched: ${templatesRes.data.data.length} templates found.`);

    console.log('\n3. Fetching recipient groups...');
    const groupsRes = await axios.get(`${API_URL}/admin/emails/recipient-groups`, config);
    console.log(`✅ Recipient groups fetched: ${groupsRes.data.data.length} groups found.`);

    console.log('\n4. Testing email preview...');
    const previewRes = await axios.post(`${API_URL}/admin/emails/preview`, {
      templateId: 'promotional',
      title: 'Test Title',
      subject: 'Test Subject',
      content: '<p>This is a test content</p>'
    }, config);
    console.log('✅ Preview generated successfully.');

    console.log('\n5. Sending test email...');
    // We'll send to the admin email itself for safety
    const sendRes = await axios.post(`${API_URL}/admin/emails/send`, {
      templateId: 'promotional',
      customEmails: [ADMIN_EMAIL],
      subject: 'Test Bulk Email Script',
      title: 'Test Title',
      content: '<p>This is a test email from the script.</p>'
    }, config);
    console.log(`✅ Test email sent. Sent: ${sendRes.data.data.sent}, Failed: ${sendRes.data.data.failed}`);

    console.log('\n🎉 All backend tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 401) {
        console.error('Auth error details:', error.response.headers);
    }
  }
};

testBulkEmail();
