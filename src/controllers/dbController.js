const mongoose = require('mongoose');

// GET /api/admin/db/overview
// Returns collection names, counts, and small samples for key collections. Read-only.
const getDbOverview = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'DB not connected' });

    const cols = await db.listCollections().toArray();
    const names = cols.map(c => c.name);

    const results = {};
    // Count documents for each collection
    await Promise.all(names.map(async (name) => {
      try {
        const count = await db.collection(name).countDocuments();
        results[name] = { count };
      } catch (e) {
        results[name] = { count: null, error: e.message };
      }
    }));

    // Sample key collections
    const samples = {};
    if (names.includes('users')) {
      const users = await db.collection('users').find({}, { projection: { password: 0, passwordConfirm: 0 } }).limit(5).toArray();
      samples.users = users;
    }
    if (names.includes('products')) {
      samples.products = await db.collection('products').find({}).limit(5).toArray();
    }
    if (names.includes('categories')) {
      samples.categories = await db.collection('categories').find({}).limit(5).toArray();
    }

    res.json({ success: true, data: { collections: names, counts: results, samples } });
  } catch (err) {
    console.error('DB overview error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = { getDbOverview };
