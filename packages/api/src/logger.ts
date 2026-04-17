export const logger = {
  info: (msg: string, meta: any = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
  error: (msg: string, meta: any = {}) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
  debug: (msg: string, meta: any = {}) => console.debug(JSON.stringify({ level: 'debug', msg, ...meta })),
  child: (childMeta: any) => ({
    info: (msg: string, meta: any = {}) => console.log(JSON.stringify({ level: 'info', msg, ...childMeta, ...meta })),
    error: (msg: string, meta: any = {}) => console.error(JSON.stringify({ level: 'error', msg, ...childMeta, ...meta })),
    debug: (msg: string, meta: any = {}) => console.debug(JSON.stringify({ level: 'debug', msg, ...childMeta, ...meta })),
    child: (grandChildMeta: any) => logger.child({ ...childMeta, ...grandChildMeta })
  })
};
