export const streamStatuses = [
  'Disconnected',
  'Preparing',
  'Connecting',
  'Streaming',
  'Reconnecting',
  'Stopped',
  'Error',
] as const

export type StreamStatus = (typeof streamStatuses)[number]

export type SourceKind = 'display' | 'window' | 'camera' | 'image' | 'text' | 'background' | 'audio'

export type SourceTransform = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  zIndex: number
}

export type SceneSource = {
  id: string
  name: string
  kind: SourceKind
  transform: SourceTransform
}

export type Scene = {
  id: string
  name: string
  sources: SceneSource[]
}

export type StudioSnapshot = {
  activeSceneId: string | null
  streamStatus: StreamStatus
  destination: 'youtube' | null
  captureAvailable: boolean
  audioAvailable: boolean
}

export const initialStudioSnapshot: StudioSnapshot = {
  activeSceneId: null,
  streamStatus: 'Disconnected',
  destination: 'youtube',
  captureAvailable: false,
  audioAvailable: false,
}

export type SceneCollection = {
  scenes: Scene[]
  activeSceneId: string
}

const defaultTransform = (zIndex: number): SourceTransform => ({
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  rotation: 0,
  opacity: 1,
  visible: true,
  zIndex,
})

export const createSource = (id: string, name: string, kind: SourceKind, zIndex = 0): SceneSource => ({
  id,
  name,
  kind,
  transform: defaultTransform(zIndex),
})

export const createDefaultSceneCollection = (): SceneCollection => ({
  activeSceneId: 'main',
  scenes: [
    {
      id: 'main',
      name: 'Main Stage',
      sources: [
        createSource('display', 'Desktop Capture', 'display', 0),
        createSource('camera', 'Face Camera', 'camera', 1),
        createSource('welcome', 'Welcome Overlay', 'image', 2),
        createSource('music', 'Background Music', 'audio', 3),
      ],
    },
    { id: 'starting', name: 'Starting Soon', sources: [createSource('starting-background', 'Starting Background', 'background', 0), createSource('starting-text', 'Starting Text', 'text', 1)] },
    { id: 'break', name: 'Be Right Back', sources: [createSource('break-background', 'Break Background', 'background', 0), createSource('break-text', 'Break Text', 'text', 1)] },
  ],
})

const updateScene = (collection: SceneCollection, sceneId: string, update: (scene: Scene) => Scene): SceneCollection => ({
  ...collection,
  scenes: collection.scenes.map((scene) => (scene.id === sceneId ? update(scene) : scene)),
})

export const addScene = (collection: SceneCollection, scene: Scene): SceneCollection => ({
  ...collection,
  scenes: [...collection.scenes, scene],
})

export const renameScene = (collection: SceneCollection, sceneId: string, name: string): SceneCollection => updateScene(collection, sceneId, (scene) => ({ ...scene, name }))

export const addSource = (collection: SceneCollection, sceneId: string, source: SceneSource): SceneCollection => updateScene(collection, sceneId, (scene) => ({ ...scene, sources: [...scene.sources, source] }))

export const removeSource = (collection: SceneCollection, sceneId: string, sourceId: string): SceneCollection => updateScene(collection, sceneId, (scene) => ({ ...scene, sources: scene.sources.filter((source) => source.id !== sourceId) }))

export const duplicateSource = (collection: SceneCollection, sceneId: string, sourceId: string, duplicateId: string): SceneCollection => updateScene(collection, sceneId, (scene) => {
  const source = scene.sources.find((item) => item.id === sourceId)
  return source ? { ...scene, sources: [...scene.sources, { ...source, id: duplicateId, name: `${source.name} copy` }] } : scene
})

export const setSourceVisibility = (collection: SceneCollection, sceneId: string, sourceId: string, visible: boolean): SceneCollection => updateScene(collection, sceneId, (scene) => ({ ...scene, sources: scene.sources.map((source) => source.id === sourceId ? { ...source, transform: { ...source.transform, visible } } : source) }))

export const updateSourceTransform = (collection: SceneCollection, sceneId: string, sourceId: string, transform: Partial<SourceTransform>): SceneCollection => updateScene(collection, sceneId, (scene) => ({ ...scene, sources: scene.sources.map((source) => source.id === sourceId ? { ...source, transform: { ...source.transform, ...transform } } : source) }))

export const moveSource = (collection: SceneCollection, sceneId: string, sourceId: string, direction: 'up' | 'down'): SceneCollection => updateScene(collection, sceneId, (scene) => {
  const index = scene.sources.findIndex((source) => source.id === sourceId)
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || nextIndex < 0 || nextIndex >= scene.sources.length) return scene
  const sources = [...scene.sources]
  const [source] = sources.splice(index, 1)
  sources.splice(nextIndex, 0, source)
  return { ...scene, sources: sources.map((item, itemIndex) => ({ ...item, transform: { ...item.transform, zIndex: itemIndex } })) }
})