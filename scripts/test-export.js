const mongoose = require('mongoose');
const User = require('../src/models/User');

mongoose.connect('mongodb://localhost:28000/ecommerce').then(async () => {
  console.log('Connected to DB');
  
  // Test: Check user creation dates
  const users = await User.find({ role: { $ne: 'admin' } }).select('name email createdAt').lean();
  console.log(`Found ${users.length} non-admin users:`);
  users.forEach(u => console.log(`  - ${u.name} - created: ${u.createdAt}`));
  
  // Test the export query with date filter
  const startDate = new Date('2025-11-22');
  const endDate = new Date('2025-12-22');
  console.log(`\nDate range: ${startDate} to ${endDate}`);
  
  const filteredUsers = await User.find({
    role: { $ne: 'admin' },
    createdAt: { $gte: startDate, $lte: endDate }
  }).lean();
  console.log(`Users in date range: ${filteredUsers.length}`);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
