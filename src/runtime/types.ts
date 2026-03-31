export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  readonly dt: string
  readonly level: LogLevel
  readonly message: string
  readonly [key: string]: unknown
}

export interface MihariModuleOptions {
  /** Bearer token for API authentication */
  readonly token: string
  /** API endpoint URL for log ingestion */
  readonly endpoint: string
  /** Enable or disable logging (default: true) */
  readonly enabled?: boolean
  /** Maximum number of logs to batch before flushing (default: 10) */
  readonly batchSize?: number
  /** Flush interval in milliseconds (default: 5000) */
  readonly flushInterval?: number
  /** Maximum number of retry attempts (default: 3) */
  readonly maxRetries?: number
  /** Base delay for exponential backoff in ms (default: 1000) */
  readonly retryDelay?: number
  /** Enable gzip compression (default: true) */
  readonly gzip?: boolean
  /** Minimum log level to capture (default: 'debug') */
  readonly logLevel?: LogLevel
  /** Enable server request/response logging (default: true) */
  readonly serverLogging?: boolean
  /** Enable client error auto-capture (default: true) */
  readonly clientErrorCapture?: boolean
}

export interface MihariPublicConfig {
  readonly endpoint: string
  readonly enabled: boolean
  readonly batchSize: number
  readonly flushInterval: number
  readonly maxRetries: number
  readonly retryDelay: number
  readonly gzip: boolean
  readonly logLevel: LogLevel
  readonly clientErrorCapture: boolean
}

export interface MihariPrivateConfig {
  readonly token: string
}

export interface TransportOptions {
  readonly endpoint: string
  readonly token: string
  readonly batchSize: number
  readonly flushInterval: number
  readonly maxRetries: number
  readonly retryDelay: number
  readonly gzip: boolean
}

export interface TransportResponse {
  readonly status: 'accepted'
  readonly count: number
}

export interface MihariLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
  fatal(message: string, meta?: Record<string, unknown>): void
  flush(): Promise<void>
}

declare module '#app' {
  interface NuxtApp {
    $mihari: MihariLogger
  }
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    mihari: MihariPublicConfig
  }
  interface RuntimeConfig {
    mihariToken: string
  }
}

export {}
