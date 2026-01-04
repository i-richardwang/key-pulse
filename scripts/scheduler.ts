import 'dotenv/config';
import { scheduler } from '../lib/scheduler';

async function main() {
  console.log('='.repeat(50));
  console.log('Key-Pulse Scheduler');
  console.log('='.repeat(50));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    await scheduler.init();
    console.log('');
    console.log(`Active jobs: ${scheduler.getActiveJobCount()}`);
    console.log('Scheduler is running. Press Ctrl+C to stop.');
    console.log('');
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('');
    console.log('Received shutdown signal...');
    scheduler.shutdown();
    console.log(`Stopped at: ${new Date().toISOString()}`);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the process running
  setInterval(() => {
    // Heartbeat - keep process alive
  }, 60000);
}

main();
