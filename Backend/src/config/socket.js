import { Server } from 'socket.io';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let io = null;

/**
 * Normalize Mongo ObjectId / populated refs into a stable room id string.
 * Populated documents stringify to "{ ... }" and would target the wrong room.
 */
export function resolveRoomOwnerId(value) {
    if (value == null || value === '') return null;

    if (typeof value === 'object' && typeof value.toHexString === 'function') {
        return value.toHexString();
    }

    if (typeof value === 'object' && value._id != null && value._id !== value) {
        return resolveRoomOwnerId(value._id);
    }

    const normalized = String(value).trim();
    if (!normalized || normalized === '[object Object]' || normalized.startsWith('{')) {
        return null;
    }

    return normalized;
}

/**
 * Initializes Socket.IO with the provided HTTP server.
 * When REDIS_ENABLED=true and REDIS_URL is set, attaches Redis adapter for horizontal scaling.
 * @param {import('http').Server} server
 * @returns {Promise<Server>}
 */
export const initSocket = async (server) => {
    const socketOrigins = String(config.socketCorsOrigin || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const socketCorsOrigin =
        socketOrigins.length === 0
            ? '*'
            : socketOrigins.length === 1
                ? socketOrigins[0]
                : socketOrigins;

    io = new Server(server, {
        cors: {
            origin: socketCorsOrigin,
            methods: ['GET', 'POST'],
            credentials: true,
        }
    });

    if (config.redisEnabled && config.redisUrl) {
        try {
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const { createClient } = await import('redis');
            const pubClient = createClient({ url: config.redisUrl });
            const subClient = pubClient.duplicate();
            pubClient.on('error', (err) => logger.error(`Socket.IO Redis pub client: ${err.message}`));
            subClient.on('error', (err) => logger.error(`Socket.IO Redis sub client: ${err.message}`));
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.IO Redis adapter attached for horizontal scaling');
        } catch (err) {
            logger.warn(`Socket.IO Redis adapter skipped (using in-memory): ${err.message}`);
        }
    }

    io.on('connection', (socket) => {
        logger.info(`Socket client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            logger.info(`Socket client disconnected: ${socket.id}`);
        });
    });

    try {
        const { registerTaxiSocketIntegration } = await import('../modules/taxi/socket/index.js');
        const { restoreScheduledDispatches } = await import('../modules/taxi/services/dispatchService.js');
        registerTaxiSocketIntegration(io);
        restoreScheduledDispatches().catch((err) => {
            logger.error(`Taxi scheduled dispatch restore failed: ${err.message}`);
        });
        logger.info('Taxi Socket.IO handlers registered');
    } catch (err) {
        logger.error(`Taxi Socket.IO integration failed: ${err.message}`);
    }

    logger.info('Socket.IO infrastructure initialized');
    return io;
};

/**
 * Returns the initialized Socket.IO instance.
 * @returns {Server | null}
 */
export const getIO = () => {
    if (!io && socketEmitter) {
        return socketEmitter;
    }
    if (!io) {
        logger.warn('Socket.IO not initialized');
    }
    return io;
};

let socketEmitter = null;

/**
 * API-process side of the standalone socket setup (SOCKET_STANDALONE=true).
 * Returns an emitter exposing io.to(room).emit(...) that publishes through Redis
 * to the Socket.IO server running in Backend/socket.js. Requires a connected Redis client.
 * @param {import('redis').RedisClientType} redisClient
 */
export const initSocketEmitter = async (redisClient) => {
    const { Emitter } = await import('@socket.io/redis-emitter');
    socketEmitter = new Emitter(redisClient);
    logger.info('Socket.IO Redis emitter initialized (standalone socket mode)');
    return socketEmitter;
};

