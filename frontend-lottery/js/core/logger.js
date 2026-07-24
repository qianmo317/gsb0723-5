const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

export const Logger = {
    level: LogLevel.DEBUG,
    logs: [],
    maxLogs: 500,

    setLevel(level) {
        this.level = level;
    },

    _timestamp() {
        return new Date().toISOString();
    },

    _log(level, levelName, message, data = null) {
        if (level < this.level) return;

        const logEntry = {
            timestamp: this._timestamp(),
            level: levelName,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null
        };

        this.logs.push(logEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        const consoleMethod = level === LogLevel.ERROR ? 'error' :
                             level === LogLevel.WARN ? 'warn' :
                             level === LogLevel.DEBUG ? 'debug' : 'log';

        const prefix = `[${logEntry.timestamp}] [${levelName}]`;
        if (data) {
            console[consoleMethod](prefix, message, data);
        } else {
            console[consoleMethod](prefix, message);
        }

        return logEntry;
    },

    debug(message, data = null) {
        return this._log(LogLevel.DEBUG, 'DEBUG', message, data);
    },

    info(message, data = null) {
        return this._log(LogLevel.INFO, 'INFO', message, data);
    },

    warn(message, data = null) {
        return this._log(LogLevel.WARN, 'WARN', message, data);
    },

    error(message, data = null) {
        return this._log(LogLevel.ERROR, 'ERROR', message, data);
    },

    action(actionName, details = {}) {
        return this.info(`[ACTION] ${actionName}`, details);
    },

    getLogs(level = null) {
        if (level === null) return [...this.logs];
        const levelName = Object.keys(LogLevel).find(k => LogLevel[k] === level);
        return this.logs.filter(log => log.level === levelName);
    },

    clear() {
        this.logs = [];
        console.clear();
    },

    export() {
        return JSON.stringify(this.logs, null, 2);
    }
};

export const ErrorHandler = {
    init() {
        window.onerror = (message, source, lineno, colno, error) => {
            Logger.error('Uncaught Error', {
                message,
                source,
                lineno,
                colno,
                stack: error?.stack
            });
            return false;
        };

        window.onunhandledrejection = (event) => {
            Logger.error('Unhandled Promise Rejection', {
                reason: event.reason?.message || event.reason,
                stack: event.reason?.stack
            });
        };

        Logger.info('ErrorHandler initialized');
    },

    wrap(fn, context = 'Unknown') {
        return function(...args) {
            try {
                const result = fn.apply(this, args);
                if (result instanceof Promise) {
                    return result.catch(error => {
                        Logger.error(`Error in ${context}`, {
                            error: error.message,
                            stack: error.stack,
                            args
                        });
                        throw error;
                    });
                }
                return result;
            } catch (error) {
                Logger.error(`Error in ${context}`, {
                    error: error.message,
                    stack: error.stack,
                    args
                });
                throw error;
            }
        };
    },

    safeExecute(fn, fallback = null, context = 'Unknown') {
        try {
            return fn();
        } catch (error) {
            Logger.error(`Safe execution failed in ${context}`, {
                error: error.message,
                stack: error.stack
            });
            return fallback;
        }
    }
};

ErrorHandler.init();
