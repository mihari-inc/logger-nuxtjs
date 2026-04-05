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
    if (!options.enabled) {
      console.info('[mihari] Module is disabled')
      return
    }

    if (!options.token) {
      console.warn('[mihari] No token configured. Set mihari.token in nuxt.config.ts or MIHARI_TOKEN env variable.')
    }

    if (!options.endpoint) {
      console.warn('[mihari] No endpoint configured. Set mihari.endpoint in nuxt.config.ts or MIHARI_ENDPOINT env variable.')
    }

    const resolver = createResolver(import.meta.url)

    // Inject runtime config
    const token = options.token || process.env.MIHARI_TOKEN || ''
    nuxt.options.runtimeConfig = defu(nuxt.options.runtimeConfig, {
      mihariToken: token,
    })

    nuxt.options.runtimeConfig.public = defu(nuxt.options.runtimeConfig.public, {
      mihari: {
        endpoint: options.endpoint || process.env.MIHARI_ENDPOINT || '',
        enabled: options.enabled ?? true,
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
