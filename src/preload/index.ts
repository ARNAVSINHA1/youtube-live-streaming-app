import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('studio', {
  version: '0.1.0',
})