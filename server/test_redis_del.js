require('dotenv').config({ path: '../.env' });
const { cacheClient } = require('./src/config/redis');

async function test() {
  const start = Date.now();
  try {
    await cacheClient.del('some-key');
  } catch (err) {
    console.log('Error caught:', err.message);
  }
  console.log('Time:', Date.now() - start);
  process.exit(0);
}
test();
