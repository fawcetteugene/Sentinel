import type { OperationalEvent } from '@/types'

export function createOperationsSocket(onEvent: (event: OperationalEvent) => void) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws/operations`)
  socket.addEventListener('message', (event) => {
    try {
      onEvent(JSON.parse(event.data) as OperationalEvent)
    } catch {
      // Ignore malformed operational messages.
    }
  })
  return socket
}

