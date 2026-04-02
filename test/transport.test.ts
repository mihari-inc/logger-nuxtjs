import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MihariTransport } from '../src/runtime/transport'

const BASE_OPTIONS = {
  endpoint: 'https://api.test.com/ingest',
  token: 'test-token',
  batchSize: 10,
  flushInterval: 0,
  maxRetries: 3,
  retryDelay: 100,
  gzip: false,
}

function makeEntry(overrides = {}) {
  return {
    dt: '2026-01-01T00:00:00.000Z',
    level: 'info' as const,
    message: 'test',
    ...overrides,
  }
}

function mockFetchOk() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 202,
    json: vi.fn().mockResolvedValue({ status: 'accepted', count: 1 }),
  })
}

describe('MihariTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should add entries to buffer', () => {
    const transport = new MihariTransport(BASE_OPTIONS)
    transport.add(makeEntry())
    transport.add(makeEntry())
    // No way to read buffer size directly, but flush should send them
    transport.destroy()
  })

  it('should flush entries via POST with auth header', async () => {
    const fetchMock = mockFetchOk()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const transport = new MihariTransport(BASE_OPTIONS)
    transport.add(makeEntry({ message: 'hello' }))

    await transport.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test.com/ingest')
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer test-token')
    expect(options.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body).toHaveLength(1)
    expect(body[0].message).toBe('hello')
    transport.destroy()
  })

  it('should not flush when buffer is empty', async () => {
    const fetchMock = mockFetchOk()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const transport = new MihariTransport(BASE_OPTIONS)
    await transport.flush()

    expect(fetchMock).not.toHaveBeenCalled()
    transport.destroy()
  })

  it('should auto-flush when batchSize is reached', async () => {
    const fetchMock = mockFetchOk()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const transport = new MihariTransport({ ...BASE_OPTIONS, batchSize: 2 })
    transport.add(makeEntry())
    transport.add(makeEntry())

    // flush is called async via void, let microtasks run
    await vi.advanceTimersByTimeAsync(0)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    transport.destroy()
  })

  it('should re-add entries on failure', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: vi.fn().mockResolvedValue({ status: 'accepted', count: 1 }),
      })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const transport = new MihariTransport({ ...BASE_OPTIONS, maxRetries: 1 })
    transport.add(makeEntry({ message: 'retry-me' }))

    await transport.flush()
    expect(consoleSpy).toHaveBeenCalled()

    // Entries should be back in buffer, second flush should succeed
    await transport.flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    transport.destroy()
  })

  it('should not retry on 4xx errors (except 429)', async () => {
    vi.useRealTimers()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('bad request'),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const transport = new MihariTransport(BASE_OPTIONS)
    transport.add(makeEntry())

    await transport.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalled()
    transport.destroy()
  })

  it('should clear interval on destroy', () => {
    const transport = new MihariTransport({ ...BASE_OPTIONS, flushInterval: 5000 })
    // Should not throw
    transport.destroy()
    transport.destroy() // idempotent
  })

  it('should flush on interval', async () => {
    const fetchMock = mockFetchOk()
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const transport = new MihariTransport({ ...BASE_OPTIONS, flushInterval: 1000 })
    transport.add(makeEntry())

    await vi.advanceTimersByTimeAsync(1000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    transport.destroy()
  })
})
