import type { StreamStatus } from '@youtube-live-studio/core'

export type { StreamStatus } from '@youtube-live-studio/core'

export type Scene = {
  id: string
  name: string
  sourceCount: number
  active: boolean
}

export type Source = {
  id: string
  name: string
  kind: string
  enabled: boolean
  icon: string
}

export type AudioChannel = {
  name: string
  level: number
  peak: number
  muted: boolean
  color: string
}

export const scenes: Scene[] = [
  { id: 'main', name: 'Main Stage', sourceCount: 4, active: true },
  { id: 'starting', name: 'Starting Soon', sourceCount: 2, active: false },
  { id: 'break', name: 'Be Right Back', sourceCount: 3, active: false },
]

export const sources: Source[] = [
  { id: 'display', name: 'Desktop Capture', kind: 'Display', enabled: true, icon: 'monitor' },
  { id: 'camera', name: 'Face Camera', kind: 'Camera', enabled: true, icon: 'camera' },
  { id: 'welcome', name: 'Welcome Overlay', kind: 'Image', enabled: true, icon: 'image' },
  { id: 'music', name: 'Background Music', kind: 'Audio', enabled: false, icon: 'music' },
]

export const audioChannels: AudioChannel[] = [
  { name: 'Mic / Aux', level: 64, peak: 74, muted: false, color: '#f28f6b' },
  { name: 'Desktop Audio', level: 42, peak: 56, muted: false, color: '#5bc7b0' },
  { name: 'Background Music', level: 18, peak: 28, muted: true, color: '#7d8da6' },
]