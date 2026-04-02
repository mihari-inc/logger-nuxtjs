import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from '../src/runtime/client'

// Mock the transport
vi.mock('../src/runtime/transport', () => ({
  MihariTransport: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  })),
}))

import { MihariTransport } from '../src/runtime/transport'

const BASE_OPTIONS = {
  transport: {
    endpoint: 'https://api.test.com/ingest',
    token: 'test-token',
    batchSize: 10,
    flushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    gzip: false,
  },
  minLevel: 'debug' as const,
}

describe('createLogger', () => {
  let transportInstance: { add: ReturnType<typeof vi.fn>; flush: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    transportInstance = {
      add: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
    }
    vi.mocked(MihariTransport).mockImplementation(() => transportInstance as any)
  })

  it('should create a logger with all log methods', () => {
    const logger = createLogger(BASE_OPTIONS)
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.fatal).toBe('function')
    expect(typeof logger.flush).toBe('function')
    expect(typeof logger.destroy).toBe('function')
  })

  it('should log entries with correct level and message', () => {
    const logger = createLogger(BASE_OPTIONS)
    logger.info('test message')

    expect(transportInstance.add).toHaveBeenCalledTimes(1)
    const entry = transportInstance.add.mock.calls[0][0]
    expect(entry.level).toBe('info')
    expect(entry.message).toBe('test message')
    expect(entry.dt).toBeDefined()
  })

  it('should include metadata in log entries', () => {
    const logger = createLogger(BASE_OPTIONS)
    logger.error('oops', { userId: 42, path: '/api/test' })

    const entry = transportInstance.add.mock.calls[0][0]
    expect(entry.userId).toBe(42)
    expect(entry.path).toBe('/api/test')
  })

  it('should include default metadata', () => {
    const logger = createLogger({
      ...BASE_OPTIONS,
      defaultMeta: { service: 'web', env: 'test' },
    })
    logger.info('hello')

    const entry = transportInstance.add.mock.calls[0][0]
    expect(entry.service).toBe('web')
    expect(entry.env).toBe('test')
  })

  it('should override default metadata with per-call metadata', () => {
    const logger = createLogger({
      ...BASE_OPTIONS,
      defaultMeta: { env: 'prod' },
    })
    logger.info('hello', { env: 'staging' })

    const entry = transportInstance.add.mock.calls[0][0]
    expect(entry.env).toBe('staging')
  })

  it('should filter by min log level', () => {
    const logger = createLogger({ ...BASE_OPTIONS, minLevel: 'warn' })

    logger.debug('should skip')
    logger.info('should skip')
    logger.warn('should log')
    logger.error('should log')

    expect(transportInstance.add).toHaveBeenCalledTimes(2)
  })

  it('should call each log level correctly', () => {
    const logger = createLogger(BASE_OPTIONS)

    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')
    logger.fatal('f')

    expect(transportInstance.add).toHaveBeenCalledTimes(5)
    const levels = transportInstance.add.mock.calls.map((c: any) => c[0].level)
    expect(levels).toEqual(['debug', 'info', 'warn', 'error', 'fatal'])
  })

  it('should flush via transport', async () => {
    const logger = createLogger(BASE_OPTIONS)
    await logger.flush()
    expect(transportInstance.flush).toHaveBeenCalledTimes(1)
  })

  it('should destroy transport', () => {
    const logger = createLogger(BASE_OPTIONS)
    logger.destroy()
    expect(transportInstance.destroy).toHaveBeenCalledTimes(1)
  })

  it('should generate ISO 8601 timestamps', () => {
    const logger = createLogger(BASE_OPTIONS)
    logger.info('time test')

    const entry = transportInstance.add.mock.calls[0][0]
    expect(entry.dt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
