import { defineEventHandler, getRequestURL, getRequestHeader, getResponseStatus } from 'h3'
import { getServerLogger } from './logger'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const logger = getServerLogger()
  const url = getRequestURL(event)
  const method = event.method
  const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
  const requestId = getRequestHeader(event, 'x-request-id') || crypto.randomUUID()

  // Log after response is sent
  event.node.res.on('finish', () => {
    const duration = Date.now() - startTime
    const statusCode = getResponseStatus(event)

    const meta: Record<string, unknown> = {
      type: 'http_request',
      method,
      path: url.pathname,
      query: url.search || undefined,
      statusCode,
      duration,
      userAgent,
      requestId,
    }

    if (statusCode >= 500) {
      logger.error(`${method} ${url.pathname} ${statusCode}`, meta)
    }
    else if (statusCode >= 400) {
      logger.warn(`${method} ${url.pathname} ${statusCode}`, meta)
    }
    else {
      logger.info(`${method} ${url.pathname} ${statusCode}`, meta)
    }
  })
})
