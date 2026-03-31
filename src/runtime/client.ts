import type { LogEntry, LogLevel, MihariLogger, TransportOptions } from './types'
import { MihariTransport } from './transport'

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

export interface CreateLoggerOptions {
  readonly transport: TransportOptions
  readonly minLevel: LogLevel
  readonly defaultMeta?: Readonly<Record<string, unknown>>
}

export function createLogger(options: CreateLoggerOptions): MihariLogger & { destroy: () => void } {
  const transport = new MihariTransport(options.transport)
  const minPriority = LOG_LEVEL_PRIORITY[options.minLevel]

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= minPriority
  }

  function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      dt: new Date().toISOString(),
      level,
      message,
      ...options.defaultMeta,
      ...meta,
    }

    transport.add(entry)
  }

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      log('debug', message, meta)
    },
    info(message: string, meta?: Record<string, unknown>) {
      log('info', message, meta)
    },
    warn(message: string, meta?: Record<string, unknown>) {
      log('warn', message, meta)
    },
    error(message: string, meta?: Record<string, unknown>) {
      log('error', message, meta)
    },
    fatal(message: string, meta?: Record<string, unknown>) {
      log('fatal', message, meta)
    },
    async flush() {
      await transport.flush()
    },
    destroy() {
      transport.destroy()
    },
  }
}
