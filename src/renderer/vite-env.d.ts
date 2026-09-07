/// <reference types="vite/client" />

interface Window {
  studio: {
    version: string
    listCaptureSources: () => Promise<Array<{ id: string; name: string; type: 'screen' | 'window' }>>
    selectCaptureSource: (sourceId: string) => Promise<void>
  }
}