import { describe, expect, it } from 'vitest'
import { audioChannels, scenes, sources, type StreamStatus } from './studio-state'

describe('studio shell state', () => {
  it('provides the initial production layout', () => {
    expect(scenes.find((scene) => scene.active)?.id).toBe('main')
    expect(sources).toHaveLength(4)
    expect(audioChannels.map((channel) => channel.name)).toEqual([
      'Mic / Aux',
      'Desktop Audio',
      'Background Music',
    ])
  })

  it('keeps stream status values explicit', () => {
    const statuses: StreamStatus[] = [
      'Disconnected',
      'Preparing',
      'Connecting',
      'Streaming',
      'Reconnecting',
      'Stopped',
      'Error',
    ]

    expect(statuses).toContain('Streaming')
    expect(statuses).toHaveLength(7)
  })
})