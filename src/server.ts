import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/environment';

const startServer = async () => {
  console.log('===================================================================');
  console.log('  CST LAN CHALLENGE 2026 - BACKEND API SERVER');
  console.log('  Computer Science and Technology Degree Programme');
  console.log('  Uva Wellassa University of Sri Lanka');
  console.log('===================================================================');

  // Connect to database
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`\n>>> Server running in [${env.NODE_ENV}] mode on port: ${env.PORT}`);
    console.log(`>>> Health check available at: http://localhost:${env.PORT}/health`);
    console.log(`>>> API endpoints mounted at: http://localhost:${env.PORT}/api\n`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('unhandledRejection', (err: any) => {
    console.error('Unhandled Promise Rejection:', err);
  });

  process.on('uncaughtException', (err: any) => {
    console.error('Uncaught Exception:', err);
  });
};

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});

