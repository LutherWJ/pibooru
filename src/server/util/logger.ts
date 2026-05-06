import pino from 'pino';

// Enforce standard JSON logging for all environments to ensure 
// compatibility with Bun's compiled binaries and production.
export const logger = pino({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
    },
});
