import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { createLogger } from './client'
import type { MihariPublicConfig } from './types'

export default defineNuxtPlugin({
  name: 'mihari',
  enforce: 'pre',
  setup(nuxtApp) {
    const config = useRuntimeConfig()
    const publicConfig = config.public.mihari as MihariPublicConfig

    if (!publicConfig.enabled) {
      // Provide a no-op logger when disabled
      const noopLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        flush: async () => {},
      }
      nuxtApp.provide('mihari', noopLogger)
      return
    }

    // Resolve token: server-side from private config, client-side from public
    const token = import.meta.server
      ? (config as unknown as { mihariToken: string }).mihariToken
      : ''

    const defaultMeta: Record<string, unknown> = {}

    if (import.meta.server) {
      defaultMeta.runtime = 'server'
      defaultMeta.hostname = globalThis.process?.env?.HOSTNAME || 'unknown'
      defaultMeta.pid = globalThis.process?.pid
    }
    else {
      defaultMeta.runtime = 'client'
      defaultMeta.userAgent = globalThis.navigator?.userAgent
    }

    const logger = createLogger({
      transport: {
        endpoint: publicConfig.endpoint,
        token,
        batchSize: publicConfig.batchSize,
        flushInterval: publicConfig.flushInterval,
        maxRetries: publicConfig.maxRetries,
        retryDelay: publicConfig.retryDelay,
        gzip: publicConfig.gzip,
      },
      minLevel: publicConfig.logLevel,
      defaultMeta,
    })

    // Client-side: auto-capture unhandled errors
    if (import.meta.client && publicConfig.clientErrorCapture) {
      nuxtApp.hook('app:error', (err) => {
        logger.error('Unhandled app error', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        })
      })

      nuxtApp.hook('vue:error', (err, instance, info) => {
        logger.error('Vue error', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          component: instance?.$options?.name || 'unknown',
          info,
        })
      })
    }

    // Client-side: capture current route in logs
    if (import.meta.client) {
      nuxtApp.hook('page:finish', () => {
        const route = nuxtApp.$router?.currentRoute?.value
        if (route) {
          defaultMeta.route = route.fullPath
        }
      })
    }

    // Flush logs before the app closes
    if (import.meta.client) {
      globalThis.addEventListener?.('beforeunload', () => {
        void logger.flush()
      })
    }

    nuxtApp.provide('mihari', logger)
  },
})
