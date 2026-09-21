require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const NoteRepository = require('./src/repositories/note.repository');
const { queueClient } = require('./src/config/redis');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/saas_notes');
  
  const req = {
    tenantId: '6ab14b1fedd8b88dd8443aa5',
    user: { id: '6ab14b1fedd8b88dd8443aa7', role: 'Admin' },
    params: { id: '6ab15904f31cd766aebf392b' },
    body: { title: 'Newer Title', content: 'Newer Content', tags: ['two'] }
  };

  const start = Date.now();
  console.log('Start:', start);

  const repo = new NoteRepository(req.tenantId);
  const existing = await repo.findById(req.params.id, req.user.id, req.user.role);
  console.log('FindById:', Date.now() - start);

  const updateData = { ...req.body };
  updateData.aiStatus = 'pending';

  const note = await repo.updateById(req.params.id, updateData, req.user.role === 'Admin' ? null : req.user.id);
  console.log('UpdateById:', Date.now() - start);

  if (queueClient.status !== 'ready') {
    console.log('Queue offline');
  } else {
    console.log('Queue ready');
  }
  
  process.exit(0);
}
test();
