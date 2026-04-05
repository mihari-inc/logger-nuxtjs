import { defineEventHandler, readBody, createError } from 'h3'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const publicConfig = config.public.mihari
  const token = config.mihariToken

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: '[mihari] No token configured on server',
    })
  }

  if (!publicConfig.endpoint) {
    throw createError({
      statusCode: 500,
      statusMessage: '[mihari] No endpoint configured on server',
    })
  }

  const body = await readBody(event)

  const response = await fetch(publicConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown error')
    throw createError({
      statusCode: response.status,
      statusMessage: `[mihari] Upstream returned ${response.status}: ${errorText}`,
    })
  }

  return await response.json()
})
