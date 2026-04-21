export class ClosepilotLogger {
  constructor(private readonly agentType: string) {}

  private getLogLevel(): number {
    const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
    switch (level) {
      case 'debug': return 0;
      case 'info': return 1;
      case 'warn': return 2;
      case 'error': return 3;
      default: return 1;
    }
  }

  private log(level: string, message: string, meta?: Record<string, any>) {
    const logEntry = {
      level,
      agentType: this.agentType,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, meta?: Record<string, any>) {
    if (this.getLogLevel() <= 0) {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>) {
    if (this.getLogLevel() <= 1) {
      this.log('info', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>) {
    if (this.getLogLevel() <= 2) {
      this.log('warn', message, meta);
    }
  }

  error(message: string, meta?: Record<string, any>) {
    if (this.getLogLevel() <= 3) {
      this.log('error', message, meta);
    }
  }
}

export function createLogger(agentType: string): ClosepilotLogger {
  return new ClosepilotLogger(agentType);
}
