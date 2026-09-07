import { contextBridge, ipcRenderer } from 'electron'

type CaptureSourceInfo = { id: string; name: string; type: 'screen' | 'window' }

contextBridge.exposeInMainWorld('studio', {
  version: '0.1.0',
  listCaptureSources: (): Promise<CaptureSourceInfo[]> => ipcRenderer.invoke('capture:list-sources'),
  selectCaptureSource: (sourceId: string): Promise<void> => ipcRenderer.invoke('capture:select-source', sourceId),
})