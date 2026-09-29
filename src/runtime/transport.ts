import type { BufferedEntry, LogEntry, TransportOptions, TransportResponse } from './types'

const MAX_FLUSH_ATTEMPTS = 3

export class MihariTransport {
  private readonly options: TransportOptions
  private buffer: readonly BufferedEntry[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private isFlushing = false

  constructor(options: TransportOptions) {
    this.options = options
    this.startFlushTimer()
  }

  add(entry: LogEntry): void {
    this.buffer = [...this.buffer, { entry, flushAttempts: 0 }]

    if (this.buffer.length >= this.options.batchSize) {
      void this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return
    }

    this.isFlushing = true
    const buffered = this.buffer
    this.buffer = []

    const entries = buffered.map(b => b.entry)

    try {
      await this.send(entries)
    }
    catch (err) {
      const retryable = buffered
        .map(b => ({ ...b, flushAttempts: b.flushAttempts + 1 }))
        .filter(b => b.flushAttempts < MAX_FLUSH_ATTEMPTS)

      const dropped = buffered.length - retryable.length
      if (dropped > 0) {
        console.warn(`[mihari] Dropped ${dropped} log(s) after ${MAX_FLUSH_ATTEMPTS} flush attempts`)
      }

      this.buffer = [...retryable, ...this.buffer]
      console.error('[mihari] Failed to flush logs:', err)
    }
    finally {
      this.isFlushing = false
    }
  }

  destroy(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  private startFlushTimer(): void {
    if (this.options.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        void this.flush()
      }, this.options.flushInterval)
    }
  }

  private async send(entries: readonly LogEntry[]): Promise<TransportResponse> {
    const body = JSON.stringify(entries)
    let attempt = 0

    while (attempt < this.options.maxRetries) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        if (this.options.token) {
          headers['Authorization'] = `Bearer ${this.options.token}`
        }

        const fetchOptions: RequestInit = {
          method: 'POST',
          headers,
          body,
        }

        const response = await fetch(this.options.endpoint, fetchOptions)

        if (response.ok) {
          return (await response.json()) as TransportResponse
        }

        // Do not retry client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const errorText = await response.text().catch(() => 'unknown error')
          throw new Error(`[mihari] Server returned ${response.status}: ${errorText}`)
        }

        // Retry on 5xx or 429
        attempt++
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
      catch (err) {
        if (err instanceof Error && err.message.startsWith('[mihari]')) {
          throw err
        }

        attempt++
        if (attempt >= this.options.maxRetries) {
          throw new Error(`[mihari] Failed after ${this.options.maxRetries} attempts: ${err}`)
        }

        const delay = this.options.retryDelay * Math.pow(2, attempt - 1)
        await this.sleep(delay)
      }
    }

    throw new Error(`[mihari] Failed after ${this.options.maxRetries} attempts`)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
