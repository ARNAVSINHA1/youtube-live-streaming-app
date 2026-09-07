import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron'
import { join } from 'node:path'

type CaptureSourceInfo = { id: string; name: string; type: 'screen' | 'window' }

let selectedCaptureSourceId: string | undefined

const listCaptureSources = async (): Promise<CaptureSourceInfo[]> => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    type: source.id.startsWith('window:') ? 'window' : 'screen',
  }))
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