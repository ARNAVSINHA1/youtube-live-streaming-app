import { describe, expect, it } from 'vitest'
import { initialStudioSnapshot, streamStatuses } from './index'

describe('shared studio contracts', () => {
  it('starts disconnected without claiming native media readiness', () => {
    expect(initialStudioSnapshot.streamStatus).toBe('Disconnected')
    expect(initialStudioSnapshot.captureAvailable).toBe(false)
    expect(initialStudioSnapshot.audioAvailable).toBe(false)
  })

  it('defines the complete user-visible stream lifecycle', () => {
    expect(streamStatuses).toEqual([
      'Disconnected',
      'Preparing',
      'Connecting',
      'Streaming',
      'Reconnecting',
      'Stopped',
      'Error',
    ])
  })
})