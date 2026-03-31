import type { MihariLogger } from '../types'
import { createLogger } from '../client'
import { useRuntimeConfig } from '#imports'

let _serverLogger: (MihariLogger & { destroy: () => void }) | null = null

export function getServerLogger(): MihariLogger {
  if (_serverLogger) {
    return _serverLogger
  }

  const config = useRuntimeConfig()
  const publicConfig = config.public.mihari

  if (!publicConfig.enabled) {
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      fatal: () => {},
      flush: async () => {},
    }
  }

  _serverLogger = createLogger({
    transport: {
      endpoint: publicConfig.endpoint,
      token: config.mihariToken,
      batchSize: publicConfig.batchSize,
      flushInterval: publicConfig.flushInterval,
      maxRetries: publicConfig.maxRetries,
      retryDelay: publicConfig.retryDelay,
      gzip: publicConfig.gzip,
    },
    minLevel: publicConfig.logLevel,
    defaultMeta: {
      runtime: 'server',
      hostname: process.env.HOSTNAME || 'unknown',
      pid: process.pid,
    },
  })

  return _serverLogger
}
