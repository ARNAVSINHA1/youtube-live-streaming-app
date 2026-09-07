import { describe, expect, it } from 'vitest'
import { addScene, createDefaultSceneCollection, duplicateSource, initialStudioSnapshot, moveSource, removeSource, renameScene, setSourceVisibility, streamStatuses, updateSourceTransform } from './index'

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

  it('updates scene and source records without mutating the original collection', () => {
    const original = createDefaultSceneCollection()
    const renamed = renameScene(original, 'main', 'Live Main')
    const hidden = setSourceVisibility(renamed, 'main', 'display', false)
    const transformed = updateSourceTransform(hidden, 'main', 'display', { x: 80, opacity: 0.7 })
    const duplicated = duplicateSource(transformed, 'main', 'display', 'display-copy')
    const moved = moveSource(duplicated, 'main', 'display-copy', 'up')
    const withScene = addScene(moved, { id: 'new', name: 'New Scene', sources: [] })
    const removed = removeSource(withScene, 'main', 'display-copy')

    expect(original.scenes[0].name).toBe('Main Stage')
    expect(removed.scenes).toHaveLength(4)
    expect(removed.scenes.find((scene) => scene.id === 'new')?.name).toBe('New Scene')
    expect(removed.scenes[0].sources[0].transform.visible).toBe(false)
    expect(removed.scenes[0].sources[0].transform.x).toBe(80)
    expect(removed.scenes[0].sources[0].transform.opacity).toBe(0.7)
  })
})