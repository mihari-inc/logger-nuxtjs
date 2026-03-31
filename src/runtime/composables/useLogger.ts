import { useNuxtApp } from '#app'
import type { MihariLogger } from '../types'

/**
 * Composable to access the Mihari logger instance.
 *
 * Must be called within a Nuxt setup function or lifecycle hook.
 *
 * @example
 * ```vue
 * <script setup>
 * const logger = useLogger()
 * logger.info('Page loaded', { page: 'home' })
 * </script>
 * ```
 */
export function useLogger(): MihariLogger {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$mihari
}
