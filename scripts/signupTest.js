const axios = require('axios');

async function main() {
  const ts = Math.floor(Math.random() * 1e9);
  const payload = {
    name: 'CLI Test',
    email: `cli${ts}@example.com`,
    password: 'Password123',
    passwordConfirm: 'Password123'
  };
  console.log('POST /api/auth/signup ->', payload.email);
  const { data } = await axios.post('http://localhost:5001/api/auth/signup', payload);
  console.log('Response:', data);
}

main().catch((err) => {
  if (err.response) {
    console.error('HTTP', err.response.status, err.response.data);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
