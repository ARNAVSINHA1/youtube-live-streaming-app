import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron'
import { join } from 'node:path'
import { probeFfmpeg } from './media/ffmpeg-service'
import { connectYouTube, disconnectYouTube, getYouTubeAuthStatus } from './youtube/oauth-service'
import { bindBroadcast, createBroadcast, createStream, getIngestionInfo, stopBroadcast, transitionBroadcast } from './youtube/live-service'
import { getGoLiveMetrics, markGoLive, prepareGoLive, stopGoLive, writeMediaChunk } from './youtube/go-live-service'

type CaptureSourceInfo = { id: string; name: string; type: 'screen' | 'window' }

let selectedCaptureSourceId: string | undefined
let mainWindow: BrowserWindow | null = null

const listCaptureSources = async (): Promise<CaptureSourceInfo[]> => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.id.startsWith('window:') ? 'window' : 'screen',
  }))
}

const getSystemMetrics = async () => {
  const cpu = process.getCPUUsage()
  const memory = await process.getProcessMemoryInfo()
  return { cpuPercent: cpu.percentCPUUsage, memoryMb: Math.round(memory.private / 1024), gpuPercent: null }
}

const createWindow = (): void => {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#111417',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow = window

  window.once('ready-to-show', () => window.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('capture:list-sources', () => listCaptureSources())
  ipcMain.handle('capture:select-source', (_event, sourceId: string) => {
    selectedCaptureSourceId = sourceId
  })
  ipcMain.handle('media:ffmpeg-status', () => probeFfmpeg())
  ipcMain.handle('diagnostics:metrics', () => getSystemMetrics())
  ipcMain.handle('youtube:auth-status', () => getYouTubeAuthStatus())
  ipcMain.handle('youtube:connect', () => connectYouTube())
  ipcMain.handle('youtube:disconnect', () => disconnectYouTube())
  ipcMain.handle('youtube:broadcast-create', (_event, input) => createBroadcast(input))
  ipcMain.handle('youtube:stream-create', (_event, name: string) => createStream(name))
  ipcMain.handle('youtube:broadcast-bind', (_event, broadcastId: string, streamId: string) => bindBroadcast(broadcastId, streamId))
  ipcMain.handle('youtube:ingestion-info', (_event, streamId: string) => getIngestionInfo(streamId))
  ipcMain.handle('youtube:broadcast-transition', (_event, broadcastId: string, transition: 'testing' | 'live' | 'complete') => transitionBroadcast(broadcastId, transition))
  ipcMain.handle('youtube:broadcast-stop', (_event, broadcastId: string) => stopBroadcast(broadcastId))
  ipcMain.handle('youtube:go-live-prepare', (event, input) => prepareGoLive(input, (status) => event.sender.send('youtube:transport-status', status)))
  ipcMain.handle('youtube:go-live-mark-live', () => markGoLive())
  ipcMain.handle('youtube:go-live-stop', () => stopGoLive())
  ipcMain.handle('youtube:go-live-metrics', () => getGoLiveMetrics())
  ipcMain.on('media:chunk', (_event, chunk: Uint8Array) => {
    try {
      writeMediaChunk(chunk)
    } catch {
      // The renderer receives the lifecycle error through the next operation; media chunks are never logged.
    }
  })

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      const selectedSource = sources.find((source) => source.id === selectedCaptureSourceId) ?? sources.find((source) => source.id.startsWith('screen:'))
      if (!selectedSource) {
        callback({})
        return
      }
      callback({ video: selectedSource })
    }).catch(() => callback({}))
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})