require('dotenv').config();
const { sync } = require('../models_sql');

(async () => {
  try {
    console.log('Connecting and syncing SQL tables...');
    await sync({ force: false });
    console.log('✅ SQL tables created/synced (force:false).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  }
})();
