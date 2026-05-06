import pino from 'pino';

// Defensive check for production mode
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test';

// Only attempt to use pino-pretty in development and if NOT compiled.
// Bun's --compile mode doesn't play well with pino's worker-based transports.
const usePretty = !isProduction && !process.env.BUN_BINARY_TARGET;

export const logger = pino({
    level: isProduction ? 'info' : 'debug',
    transport: usePretty
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
    },
});
