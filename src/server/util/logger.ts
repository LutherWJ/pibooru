type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    domain: string;
    message: string;
    data?: any;
    error?: {
        message: string;
        stack?: string;
        [key: string]: any;
    };
}

class Logger {
    private format(level: LogLevel, domain: string, message: string, data?: any): string {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            domain: domain.toUpperCase(),
            message,
        };

        if (data) {
            if (data instanceof Error) {
                entry.error = {
                    message: data.message,
                    stack: data.stack,
                };
            } else if (typeof data === 'object') {
                // If it's an object with an error property that is an Error
                if (data.error instanceof Error) {
                    entry.error = {
                        message: data.error.message,
                        stack: data.error.stack,
                        ...data
                    };
                    delete (entry.error as any).error; // Clean up redundant error object
                } else {
                    entry.data = data;
                }
            } else {
                entry.data = data;
            }
        }

        return JSON.stringify(entry);
    }

    info(domain: string, message: string, data?: any) {
        console.log(this.format('INFO', domain, message, data));
    }

    warn(domain: string, message: string, data?: any) {
        console.warn(this.format('WARN', domain, message, data));
    }

    error(domain: string, message: string, data?: any) {
        console.error(this.format('ERROR', domain, message, data));
    }

    debug(domain: string, message: string, data?: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(this.format('DEBUG', domain, message, data));
        }
    }
}

export const logger = new Logger();
