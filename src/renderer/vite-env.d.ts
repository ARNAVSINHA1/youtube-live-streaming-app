/// <reference types="vite/client" />

interface Window {
  studio: {
    version: string
    listCaptureSources: () => Promise<Array<{ id: string; name: string; type: 'screen' | 'window' }>>
    selectCaptureSource: (sourceId: string) => Promise<void>
    getFfmpegStatus: () => Promise<{ available: boolean; executable: string | null; version: string | null; reason: string | null }>
    getSystemMetrics: () => Promise<{ cpuPercent: number; memoryMb: number; gpuPercent: number | null }>
    getYouTubeAuthStatus: () => Promise<{ connected: boolean; channelTitle: string | null; channelId: string | null; reason: string | null }>
    connectYouTube: () => Promise<{ connected: boolean; channelTitle: string | null; channelId: string | null; reason: string | null }>
    disconnectYouTube: () => Promise<void>
    createBroadcast: (input: { title: string; description: string; privacyStatus: 'private' | 'public' | 'unlisted'; scheduledStartTime?: string }) => Promise<unknown>
    createStream: (name: string) => Promise<unknown>
    bindBroadcast: (broadcastId: string, streamId: string) => Promise<unknown>
    getIngestionInfo: (streamId: string) => Promise<unknown>
    transitionBroadcast: (broadcastId: string, transition: 'testing' | 'live' | 'complete') => Promise<unknown>
    stopBroadcast: (broadcastId: string) => Promise<unknown>
    prepareGoLive: (input: { title: string; description: string; privacyStatus: 'private' | 'public' | 'unlisted' }) => Promise<unknown>
    markGoLive: () => Promise<unknown>
    stopGoLive: () => Promise<unknown>
    getGoLiveMetrics: () => Promise<{ bytesWritten: number; bitrateKbps: number; transportStatus: string }>
    writeMediaChunk: (chunk: Uint8Array) => void
    onTransportStatus: (listener: (status: string) => void) => () => void
  }
}