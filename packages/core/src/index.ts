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