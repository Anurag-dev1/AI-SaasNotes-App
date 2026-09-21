const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/saas_notes').then(async () => {
  const db = mongoose.connection.db;
  const result = await db.collection('users').updateOne(
    { email: 'admin@example.com' },
    { $set: { emailVerified: true } }
  );
  console.log('Modified:', result.modifiedCount);
  process.exit(0);
});
