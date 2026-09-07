import { contextBridge, ipcRenderer } from 'electron'

type CaptureSourceInfo = { id: string; name: string; type: 'screen' | 'window' }
type FfmpegStatus = { available: boolean; executable: string | null; version: string | null; reason: string | null }
type YouTubeAuthStatus = { connected: boolean; channelTitle: string | null; channelId: string | null; reason: string | null }
type BroadcastInput = { title: string; description: string; privacyStatus: 'private' | 'public' | 'unlisted'; scheduledStartTime?: string }

contextBridge.exposeInMainWorld('studio', {
  version: '0.1.0',
  listCaptureSources: (): Promise<CaptureSourceInfo[]> => ipcRenderer.invoke('capture:list-sources'),
  selectCaptureSource: (sourceId: string): Promise<void> => ipcRenderer.invoke('capture:select-source', sourceId),
  getFfmpegStatus: (): Promise<FfmpegStatus> => ipcRenderer.invoke('media:ffmpeg-status'),
  getSystemMetrics: (): Promise<{ cpuPercent: number; memoryMb: number; gpuPercent: number | null }> => ipcRenderer.invoke('diagnostics:metrics'),
  getYouTubeAuthStatus: (): Promise<YouTubeAuthStatus> => ipcRenderer.invoke('youtube:auth-status'),
  connectYouTube: (): Promise<YouTubeAuthStatus> => ipcRenderer.invoke('youtube:connect'),
  disconnectYouTube: (): Promise<void> => ipcRenderer.invoke('youtube:disconnect'),
  createBroadcast: (input: BroadcastInput): Promise<unknown> => ipcRenderer.invoke('youtube:broadcast-create', input),
  createStream: (name: string): Promise<unknown> => ipcRenderer.invoke('youtube:stream-create', name),
  bindBroadcast: (broadcastId: string, streamId: string): Promise<unknown> => ipcRenderer.invoke('youtube:broadcast-bind', broadcastId, streamId),
  getIngestionInfo: (streamId: string): Promise<unknown> => ipcRenderer.invoke('youtube:ingestion-info', streamId),
  transitionBroadcast: (broadcastId: string, transition: 'testing' | 'live' | 'complete'): Promise<unknown> => ipcRenderer.invoke('youtube:broadcast-transition', broadcastId, transition),
  stopBroadcast: (broadcastId: string): Promise<unknown> => ipcRenderer.invoke('youtube:broadcast-stop', broadcastId),
  prepareGoLive: (input: { title: string; description: string; privacyStatus: 'private' | 'public' | 'unlisted' }): Promise<unknown> => ipcRenderer.invoke('youtube:go-live-prepare', input),
  markGoLive: (): Promise<unknown> => ipcRenderer.invoke('youtube:go-live-mark-live'),
  stopGoLive: (): Promise<unknown> => ipcRenderer.invoke('youtube:go-live-stop'),
  getGoLiveMetrics: (): Promise<{ bytesWritten: number; bitrateKbps: number; transportStatus: string }> => ipcRenderer.invoke('youtube:go-live-metrics'),
  writeMediaChunk: (chunk: Uint8Array): void => ipcRenderer.send('media:chunk', chunk),
  onTransportStatus: (listener: (status: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: string) => listener(status)
    ipcRenderer.on('youtube:transport-status', handler)
    return () => ipcRenderer.removeListener('youtube:transport-status', handler)
  },
})