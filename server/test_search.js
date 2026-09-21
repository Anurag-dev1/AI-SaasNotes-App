require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const NoteRepository = require('./src/repositories/note.repository');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/saas_notes');
  const repo = new NoteRepository('6ab14b1fedd8b88dd8443aa5'); 
  const result = await repo.keywordSearch('marketing', { ownerId: '6ab14b1fedd8b88dd8443aa7', role: 'Admin' });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
test();
