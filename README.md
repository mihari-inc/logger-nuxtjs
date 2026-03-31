# @mihari/logger-nuxtjs

Open-source log collection module for Nuxt 3 applications. Captures server-side request logs, client-side errors, and provides a composable logger for structured log ingestion.

## Features

- **Auto-imported `useLogger()` composable** for structured logging in components and setup functions
- **Server middleware** for automatic HTTP request/response logging via Nitro
- **Client error capture** with Vue error handler and unhandled error hooks
- **Batched transport** with configurable batch size, flush interval, and exponential-backoff retry
- **Runtime config** integration for secure token management
- **Auto-enrichment** of log entries with server metadata (hostname, pid) and client metadata (userAgent, route)
- **TypeScript** support with full type definitions

## Quick Start

### 1. Install

```bash
npm install @mihari/logger-nuxtjs
# or
pnpm add @mihari/logger-nuxtjs
# or
yarn add @mihari/logger-nuxtjs
```

### 2. Configure

Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@mihari/logger-nuxtjs'],
  mihari: {
    token: process.env.MIHARI_TOKEN,
    endpoint: 'https://api.mihari.io/v1/logs',
  },
})
```

That's it. The module auto-registers the plugin, composable, and server middleware.

### 3. Use the Logger

```vue
<script setup>
const logger = useLogger()

logger.info('User clicked checkout', {
  userId: '123',
  cartTotal: 59.99,
})
</script>
```

## Configuration

All options can be set in `nuxt.config.ts` under the `mihari` key:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `token` | `string` | `''` | Bearer token for API authentication. Also reads `MIHARI_TOKEN` env var. |
| `endpoint` | `string` | `''` | API endpoint URL. Also reads `MIHARI_ENDPOINT` env var. |
| `enabled` | `boolean` | `true` | Enable or disable the module |
| `batchSize` | `number` | `10` | Number of log entries to batch before flushing |
| `flushInterval` | `number` | `5000` | Flush interval in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts for failed requests |
| `retryDelay` | `number` | `1000` | Base delay (ms) for exponential backoff |
| `gzip` | `boolean` | `true` | Enable gzip compression |
| `logLevel` | `string` | `'debug'` | Minimum log level: `debug`, `info`, `warn`, `error`, `fatal` |
| `serverLogging` | `boolean` | `true` | Enable automatic server request/response logging |
| `clientErrorCapture` | `boolean` | `true` | Auto-capture client-side Vue and app errors |

### Environment Variables

The module reads these environment variables as fallbacks:

- `MIHARI_TOKEN` - Bearer token for authentication
- `MIHARI_ENDPOINT` - API endpoint URL

### Example: Full Configuration

```ts
export default defineNuxtConfig({
  modules: ['@mihari/logger-nuxtjs'],
  mihari: {
    token: process.env.MIHARI_TOKEN,
    endpoint: 'https://api.mihari.io/v1/logs',
    enabled: process.env.NODE_ENV === 'production',
    batchSize: 20,
    flushInterval: 10000,
    maxRetries: 5,
    retryDelay: 2000,
    logLevel: 'info',
    serverLogging: true,
    clientErrorCapture: true,
  },
})
```

## API

### `useLogger()`

Auto-imported composable. Returns a `MihariLogger` instance.

```ts
const logger = useLogger()

logger.debug('Debugging info', { key: 'value' })
logger.info('User action', { action: 'click', target: 'button' })
logger.warn('Deprecation notice', { feature: 'oldApi' })
logger.error('Operation failed', { code: 'TIMEOUT', retries: 3 })
logger.fatal('Critical failure', { service: 'payment' })

// Force flush pending logs
await logger.flush()
```

### `$mihari`

The logger is also available as `$mihari` on the Nuxt app instance:

```ts
// In a plugin
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$mihari.info('Plugin initialized')
})
```

### Log Entry Format

Each log entry sent to the API follows this structure:

```json
{
  "dt": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User logged in",
  "runtime": "client",
  "userAgent": "Mozilla/5.0 ...",
  "route": "/dashboard",
  "userId": "abc123"
}
```

Server-side entries include `hostname` and `pid`. Client-side entries include `userAgent` and `route`.

## Server Middleware

When `serverLogging` is enabled (default), all HTTP requests are automatically logged with:

- HTTP method and path
- Status code
- Response duration (ms)
- User agent
- Request ID (`x-request-id` header or auto-generated UUID)

Server logs are categorized by status code:
- `2xx/3xx` -> `info` level
- `4xx` -> `warn` level
- `5xx` -> `error` level

## Transport

The transport layer batches log entries and sends them via HTTP POST:

- **Batching**: Logs are buffered and sent when the batch size is reached or the flush interval fires
- **Retry**: Failed requests are retried with exponential backoff (base delay doubles each attempt)
- **Error handling**: 4xx errors (except 429) are not retried; 5xx and 429 errors trigger retries
- **Flush on unload**: Client-side logs are flushed on `beforeunload`

### API Contract

**Request**:
- `POST` to configured endpoint
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- Body: array of log entries

**Response** (202):
```json
{
  "status": "accepted",
  "count": 10
}
```

## Development

```bash
# Install dependencies
npm install

# Prepare module for development
npm run dev:prepare

# Run playground
npm run dev

# Build the module
npm run build

# Run tests
npm run test
```

## License

[MIT](./LICENSE)
