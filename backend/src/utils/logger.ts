type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  error?: any;
  [key: string]: any;
}

export const logger = {
  info: (message: string, meta?: Partial<StructuredLog>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...meta,
      })
    );
  },
  warn: (message: string, meta?: Partial<StructuredLog>) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        ...meta,
      })
    );
  },
  error: (message: string, error?: any, meta?: Partial<StructuredLog>) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        ...meta,
      })
    );
  },
  debug: (message: string, meta?: Partial<StructuredLog>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          message,
          ...meta,
        })
      );
    }
  },
};
