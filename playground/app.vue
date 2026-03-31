<template>
  <div style="max-width: 600px; margin: 2rem auto; font-family: system-ui, sans-serif;">
    <h1>Mihari Nuxt Module Playground</h1>

    <section style="margin-top: 2rem;">
      <h2>Log Controls</h2>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
        <button @click="logDebug">Debug</button>
        <button @click="logInfo">Info</button>
        <button @click="logWarn">Warn</button>
        <button @click="logError">Error</button>
        <button @click="logFatal">Fatal</button>
        <button @click="flushLogs">Flush</button>
      </div>
    </section>

    <section style="margin-top: 2rem;">
      <h2>Log Output</h2>
      <pre style="background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow: auto; max-height: 300px;">{{ logMessages }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const logger = useLogger()
const logMessages = ref<string[]>([])

function addMessage(level: string, message: string) {
  logMessages.value = [
    ...logMessages.value,
    `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`,
  ]
}

function logDebug() {
  const msg = 'Debug message from playground'
  logger.debug(msg, { source: 'playground' })
  addMessage('debug', msg)
}

function logInfo() {
  const msg = 'Info message from playground'
  logger.info(msg, { source: 'playground' })
  addMessage('info', msg)
}

function logWarn() {
  const msg = 'Warning message from playground'
  logger.warn(msg, { source: 'playground' })
  addMessage('warn', msg)
}

function logError() {
  const msg = 'Error message from playground'
  logger.error(msg, { source: 'playground', code: 'PLAYGROUND_ERROR' })
  addMessage('error', msg)
}

function logFatal() {
  const msg = 'Fatal message from playground'
  logger.fatal(msg, { source: 'playground', critical: true })
  addMessage('fatal', msg)
}

async function flushLogs() {
  await logger.flush()
  addMessage('system', 'Logs flushed')
}
</script>
