export default defineNuxtConfig({
  modules: ['../src/module'],
  mihari: {
    token: process.env.MIHARI_TOKEN || 'playground-test-token',
    endpoint: process.env.MIHARI_ENDPOINT || 'https://api.mihari.io/v1/logs',
    enabled: true,
    batchSize: 5,
    flushInterval: 3000,
    logLevel: 'debug',
  },
  devtools: { enabled: true },
})
