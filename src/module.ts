import { defineNuxtModule, addPlugin, addServerHandler, createResolver, addImports } from '@nuxt/kit'
import { defu } from 'defu'
import type { MihariModuleOptions } from './runtime/types'

export default defineNuxtModule<MihariModuleOptions>({
  meta: {
    name: '@mihari/logger-nuxtjs',
    configKey: 'mihari',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    token: '',
    endpoint: '',
    enabled: true,
    batchSize: 10,
    flushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    gzip: true,
    logLevel: 'debug',
    serverLogging: true,
    clientErrorCapture: true,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    const token = options.token || process.env.MIHARI_TOKEN || ''
    const endpoint = options.endpoint || process.env.MIHARI_ENDPOINT || ''

    // Auto-disable when the module is not fully configured.
    // The runtime plugin and server logger no-op when `enabled === false`,
    // so the module becomes silently transparent (no transport, no timers,
    // no failed flush errors) — useful for CI builds without ingestion endpoint.
    const enabled = (options.enabled ?? true) && Boolean(token) && Boolean(endpoint)

    if (!enabled) {
      nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
        mihariToken: '',
      })
      nuxt.options.runtimeConfig.public = defu(nuxt.options.runtimeConfig.public, {
        mihari: {
          endpoint: '',
          enabled: false,
          batchSize: 0,
          flushInterval: 0,
          maxRetries: 0,
          retryDelay: 0,
          gzip: false,
          logLevel: 'debug',
          clientErrorCapture: false,
        },
      })
      // Still register the plugin so `useLogger()` returns a no-op logger
      // instead of throwing when the module is auto-disabled.
      addImports({
        name: 'useLogger',
        as: 'useLogger',
        from: resolver.resolve('./runtime/composables/useLogger'),
      })
      addPlugin({
        src: resolver.resolve('./runtime/plugin'),
        mode: 'all',
      })
      return
    }

    nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
      mihariToken: token,
    })

    nuxt.options.runtimeConfig.public = defu(nuxt.options.runtimeConfig.public, {
      mihari: {
        endpoint,
        enabled: true,
        batchSize: options.batchSize ?? 10,
        flushInterval: options.flushInterval ?? 5000,
        maxRetries: options.maxRetries ?? 3,
        retryDelay: options.retryDelay ?? 1000,
        gzip: options.gzip ?? true,
        logLevel: options.logLevel ?? 'debug',
        clientErrorCapture: options.clientErrorCapture ?? true,
      },
    })

    // Register auto-imported composable
    addImports({
      name: 'useLogger',
      as: 'useLogger',
      from: resolver.resolve('./runtime/composables/useLogger'),
    })

    // Register plugin
    addPlugin({
      src: resolver.resolve('./runtime/plugin'),
      mode: 'all',
    })

    // Register server proxy route for client-side log ingestion
    addServerHandler({
      route: '/api/_mihari/logs',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/logs.post'),
    })

    // Register server middleware for request logging
    if (options.serverLogging) {
      addServerHandler({
        handler: resolver.resolve('./runtime/server/middleware'),
        middleware: true,
      })
    }
  },
})
