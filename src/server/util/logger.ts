import pino from 'pino';

// Default to info level, only debug in explicit development mode
const isDev = process.env.NODE_ENV === 'development';
// BUN_BINARY_TARGET is set by Bun when compiling
const isBinary = !!process.env.BUN_BINARY_TARGET;

const loggerOptions: pino.LoggerOptions = {
    level: isDev ? 'debug' : 'info',
    serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
    },
};

// ONLY use pino-pretty if explicitly requested via NODE_ENV=development 
// AND we are not running from a compiled binary.
// This prevents crashes if NODE_ENV is missing/not-yet-loaded.
if (isDev && !isBinary) {
    loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        },
    };
}

export const logger = pino(loggerOptions);
