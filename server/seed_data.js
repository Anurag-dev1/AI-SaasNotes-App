const mongoose = require('mongoose');

async function seed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/saas_notes');
    const db = mongoose.connection.db;
    
    // Find the admin user
    const user = await db.collection('users').findOne({ email: 'admin@example.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    const tenantId = user.tenantId;
    const ownerId = user._id;

    // Sample notes
    const sampleNotes = [
      {
        title: 'Q3 Marketing Strategy',
        content: 'Our primary goal for Q3 is to increase organic traffic by 25%. We will achieve this by focusing on SEO optimization, regular blog posts, and launching our new podcast series. Key deliverables include 3 whitepapers and 12 case studies.',
        tags: ['marketing', 'planning', 'q3'],
        tenantId: tenantId,
        ownerId: ownerId,
        aiStatus: 'completed',
        aiSummary: 'Q3 marketing plan focusing on SEO, content creation, and a new podcast to drive a 25% increase in organic traffic.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        title: 'Weekly Engineering Sync',
        content: '- Discussed the upcoming migration to Node 20.\n- Redis caching layer is causing some latency spikes during peak hours; assigned to Sarah for investigation.\n- Reminder: Code freeze for v2.4 is next Wednesday.',
        tags: ['engineering', 'meeting-notes'],
        tenantId: tenantId,
        ownerId: ownerId,
        aiStatus: 'completed',
        aiSummary: 'Engineering meeting notes covering Node 20 migration, Redis latency issues, and the upcoming v2.4 code freeze.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      },
      {
        title: 'Customer Feedback: ACME Corp',
        content: 'Had a call with the CTO of ACME Corp. They love the new reporting features but are struggling with the API rate limits. We should consider offering them a custom enterprise tier with higher limits to prevent churn.',
        tags: ['customer-success', 'feedback', 'enterprise'],
        tenantId: tenantId,
        ownerId: ownerId,
        aiStatus: 'completed',
        aiSummary: 'ACME Corp feedback highlights satisfaction with reporting but frustration with API rate limits; recommends proposing a custom enterprise tier.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5)
      },
      {
        title: 'Product Roadmap 2026',
        content: 'Key initiatives for the year:\n1. AI-powered search enhancements\n2. Real-time collaboration features\n3. Mobile app revamp (React Native)\n4. SOC2 Compliance certification\nTimeline to be finalized by end of month.',
        tags: ['product', 'roadmap', '2026'],
        tenantId: tenantId,
        ownerId: ownerId,
        aiStatus: 'completed',
        aiSummary: '2026 Product roadmap outlines key initiatives including AI search, real-time collaboration, a mobile app revamp, and SOC2 compliance.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
      },
      {
        title: 'Onboarding Checklist - New Hires',
        content: '1. Setup Google Workspace account\n2. Provision GitHub access\n3. Add to Slack channels (#general, #engineering, #random)\n4. Schedule 1:1 with department head\n5. Order laptop and peripherals',
        tags: ['hr', 'onboarding'],
        tenantId: tenantId,
        ownerId: ownerId,
        aiStatus: 'completed',
        aiSummary: 'Standard 5-step onboarding checklist for new hires covering account setup, access provisioning, and equipment ordering.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
      }
    ];

    await db.collection('notes').insertMany(sampleNotes);
    console.log('Successfully seeded 5 notes!');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
