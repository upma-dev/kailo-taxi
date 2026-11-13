import http from 'http';
import crypto from 'crypto';
import { exec } from 'child_process';

import app from './src/app.js';
import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { connectRedis, closeRedis } from './src/config/redis.js';
import { initSocket, initSocketEmitter } from './src/config/socket.js';
import { initializeQueues, closeBullMQConnection } from './src/queues/index.js';

import { logger } from './src/utils/logger.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
let server = null;

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    if (!server) {
        process.exit(0);
        return;
    }
    server.close(async () => {
        try {
            await disconnectDB();
            await closeRedis();
            await closeBullMQConnection();
            logger.info('Graceful shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error(`Shutdown error: ${err.message}`);
            process.exit(1);
        }
    });
    setTimeout(() => {
        logger.error('Shutdown timeout, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

const startServer = async () => {
    try {
        validateConfig();
        initializeFirebaseRealtime();

        // 1. Connect to Database (MongoDB)
        await connectDB();

        // Starter catalog data (vehicle pictures, a zone per service location, ride prices). Never blocks start-up.
        import('./src/modules/taxi/admin/services/adminService.js')
            .then((admin) => admin.ensureCatalogSeeded())
            .catch((err) => logger.error(`Catalog seed skipped: ${err.message}`));

        // 2. Create HTTP server from Express app
        const httpServer = http.createServer(app);

        // 3. Initialize Socket.IO with the HTTP server (Redis adapter when Redis enabled)
        if (config.socketStandalone) {
            // Socket.IO runs in its own process (socket.js); emit to it via Redis.
            const redisClient = config.redisEnabled ? await connectRedis() : null;
            if (!redisClient) {
                throw new Error('SOCKET_STANDALONE=true requires REDIS_ENABLED=true and a reachable Redis');
            }
            await initSocketEmitter(redisClient);
        } else {
            await initSocket(httpServer);
            if (config.redisEnabled) {
                await connectRedis();
            }
        }

        // 5. Conditionally initialize BullMQ queues.
        // BullMQ requires Redis; skip queue bootstrap when Redis is disabled.
        if (config.bullmqEnabled && config.redisEnabled) {
            try {
                initializeQueues();
            } catch (err) {
                logger.error(`BullMQ initialization error (server continues): ${err.message}`);
            }
        } else if (config.bullmqEnabled && !config.redisEnabled) {
            logger.warn('BullMQ is enabled but Redis is disabled. Queue initialization skipped.');
        }

        // GitHub deploy webhook. The secret comes from DEPLOY_WEBHOOK_SECRET (never from the code);
        // without it the endpoint is switched off.
        app.post('/api/deploy', (req, res) => {
            const secret = String(process.env.DEPLOY_WEBHOOK_SECRET || '').trim();
            if (!secret) {
                return res.status(404).send('Not found');
            }
            const signature = String(req.headers['x-hub-signature-256'] || '');

            const hash = 'sha256=' + crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            const given = Buffer.from(signature);
            const expected = Buffer.from(hash);
            if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
                return res.status(403).send('Unauthorized');
            }

            exec('cd ~ && ./deploy.sh', (err, stdout, stderr) => {
                if (err) {
                    console.error('Deploy failed:', err.message);
                    return res.status(500).send('Deploy failed');
                }

                console.log(stdout);
                res.send('Deploy success');
            });
        });

        // Hourly driver selfie check (takes a driver offline when the selfie runs out).
        import('./src/modules/taxi/services/selfieExpiryService.js')
            .then((job) => job.startSelfieExpiryJob())
            .catch((err) => logger.error(`Selfie check job not started: ${err.message}`));

        // Outstation Return Trip: ends it when the driver is back home or the time is over.
        import('./src/modules/taxi/services/returnTripService.js')
            .then((job) => job.startReturnTripJob())
            .catch((err) => logger.error(`Return trip job not started: ${err.message}`));

        // 6. Start the HTTP server

        server = httpServer.listen(config.port, config.host, () => {
            logger.info(`Server running in ${config.nodeEnv} mode on ${config.host}:${config.port}`);
            console.log(`🌐 [URL] http://localhost:${config.port}`);
        });

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle server errors (like EADDRINUSE)
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use. Please kill the process or use a different port.`);
            } else {
                logger.error(`Server Error: ${err.message}`);
            }
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                if (server) server.close(() => process.exit(1));
                else process.exit(1);
            }
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

