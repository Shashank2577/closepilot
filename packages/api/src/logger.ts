type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/**
 * Redact sensitive fields from log records
 */
function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = /authorization|api[_-]?key|password|token|secret|cookie/i;
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in redacted) {
    if (sensitiveKeys.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redact(redacted[key]);
    }
  }
  
  return redacted;
}

function emit(level: LogLevel, fields: LogFields | undefined, message: string) {
  if (levelOrder[level] < levelOrder[configuredLevel]) {
    return;
  }

  const redactedFields = fields ? redact(fields) : undefined;

  const record = {
    level,
    service: 'closepilot-api',
    ts: new Date().toISOString(),
    ...redactedFields,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    const details = redactedFields && Object.keys(redactedFields).length > 0 ? ` ${JSON.stringify(redactedFields)}` : '';
    const line = `${record.ts} [${level}] ${message}${details}`;

    if (level === 'error' || level === 'warn') {
      console.error(line);
    } else {
      console.log(line);
    }
    return;
  }

  const line = JSON.stringify(record);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(fields: LogFields | undefined, message: string) {
    emit('debug', fields, message);
  },
  info(fields: LogFields | undefined, message: string) {
    emit('info', fields, message);
  },
  warn(fields: LogFields | undefined, message: string) {
    emit('warn', fields, message);
  },
  error(fields: LogFields | undefined, message: string) {
    emit('error', fields, message);
  },
};
