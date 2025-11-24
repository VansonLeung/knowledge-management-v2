import { API_BASE_URL } from './http'

function parseSseEvent(rawEvent) {
  const lines = rawEvent.split('\n')
  let event = 'message'
  let dataPayload = ''

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (trimmed.startsWith('event:')) {
      event = trimmed.slice(6).trim() || 'message'
    } else if (trimmed.startsWith('data:')) {
      const chunk = trimmed.slice(5).trim()
      dataPayload += dataPayload ? `\n${chunk}` : chunk
    }
  })

  let data = null
  if (dataPayload) {
    try {
      data = JSON.parse(dataPayload)
    } catch (error) {
      data = dataPayload
    }
  }

  return { event, data }
}

function processBuffer(buffer, handleEvent) {
  let workingBuffer = buffer
  let shouldStop = false

  while (workingBuffer.includes('\n\n')) {
    const separatorIndex = workingBuffer.indexOf('\n\n')
    const rawEvent = workingBuffer.slice(0, separatorIndex)
    workingBuffer = workingBuffer.slice(separatorIndex + 2)

    if (!rawEvent.trim()) continue
    const parsed = parseSseEvent(rawEvent)
    if (parsed) {
      shouldStop = handleEvent(parsed) || shouldStop
      if (shouldStop) break
    }
  }

  return { buffer: workingBuffer, stop: shouldStop }
}

export async function streamAssistantResponse({ conversationId, token, payload, onEvent }) {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok || !response.body) {
    const message = await response.text()
    throw new Error(message || 'Unable to start streaming response')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let streamClosed = false

  const handleEvent = event => {
    if (!onEvent) return event.event === 'done'
    onEvent(event)
    return event.event === 'done' || event.event === 'error'
  }

  while (!streamClosed) {
    const { value, done } = await reader.read()
    if (done) {
      streamClosed = true
      const finalChunk = decoder.decode()
      const combined = buffer + finalChunk
      processBuffer(`${combined}\n\n`, handleEvent)
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const { buffer: nextBuffer, stop } = processBuffer(buffer, handleEvent)
    buffer = nextBuffer

    if (stop) {
      streamClosed = true
      await reader.cancel()
    }
  }
}
