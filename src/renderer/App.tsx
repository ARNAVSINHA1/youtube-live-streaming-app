import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  AudioLines,
  Camera,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Image,
  LayoutDashboard,
  Library,
  LockKeyhole,
  Menu,
  Mic2,
  Monitor,
  MoreHorizontal,
  Music2,
  Play,
  Plus,
  Radio,
  Settings,
  SlidersHorizontal,
  Square,
  Trash2,
  Tv2,
  Video,
  Volume2,
  Wifi,
} from 'lucide-react'
import { addScene, addSource, createDefaultSceneCollection, createSource, duplicateSource, moveSource, removeSource, renameScene, setSourceVisibility, updateSourceTransform, type SceneCollection } from '@youtube-live-studio/core'
import { audioChannels, type StreamStatus } from './studio-state'
import welcomeHorizontal from '../img/welcome_16x9.png'
import welcomeVertical from '../img/welcome_9x16.png'
import startingHorizontal from '../img/starting_soon_16x9.png'
import startingVertical from '../img/starting_soon_9x16.png'
import breakHorizontal from '../img/be_right_back_16x9.png'
import breakVertical from '../img/be_right_back_9x16.png'
import horizontalOverlay from '../img/horizontal_overlay.png'
import verticalOverlay from '../img/vertical_overlay.png'

const iconMap = { display: Monitor, window: Monitor, camera: Camera, image: Image, music: Music2, audio: Music2, text: Image, background: Image }
const streamFormats = {
  horizontal: { label: 'Horizontal Live', width: 1920, height: 1080 },
  vertical: { label: 'Shorts / Vertical', width: 1080, height: 1920 },
} as const

const sceneImages = {
  main: { horizontal: welcomeHorizontal, vertical: welcomeVertical },
  starting: { horizontal: startingHorizontal, vertical: startingVertical },
  break: { horizontal: breakHorizontal, vertical: breakVertical },
} as const
const sceneOverlays = { horizontal: horizontalOverlay, vertical: verticalOverlay } as const
const streamWindows = {
  horizontal: { x: 0.105, y: 0.215, width: 0.575, height: 0.55 },
  vertical: { x: 0.06, y: 0.238, width: 0.875, height: 0.3 },
} as const

const loadSceneCollection = (): SceneCollection => {
  try {
    const stored = window.localStorage.getItem('signal.scene-collection')
    return stored ? JSON.parse(stored) as SceneCollection : createDefaultSceneCollection()
  } catch {
    return createDefaultSceneCollection()
  }
}

export function App() {
  const [sceneCollection, setSceneCollection] = useState<SceneCollection>(loadSceneCollection)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('Disconnected')
  const [streamFormat, setStreamFormat] = useState<keyof typeof streamFormats>('horizontal')
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [captureSources, setCaptureSources] = useState<Array<{ id: string; name: string; type: 'screen' | 'window' }>>([])
  const [selectedCaptureSource, setSelectedCaptureSource] = useState('')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('')
  const [microphoneMuted, setMicrophoneMuted] = useState(false)
  const [microphoneVolume, setMicrophoneVolume] = useState(100)
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false)
  const [youtubeAuth, setYoutubeAuth] = useState<{ connected: boolean; channelTitle: string | null; channelId: string | null; reason: string | null }>({ connected: false, channelTitle: null, channelId: null, reason: null })
  const [youtubeAuthBusy, setYoutubeAuthBusy] = useState(false)
  const [goLiveError, setGoLiveError] = useState<string | null>(null)
  const [goLiveBusy, setGoLiveBusy] = useState(false)
  const [streamMetrics, setStreamMetrics] = useState({ bitrateKbps: 0, bytesWritten: 0, transportStatus: 'stopped' })
  const [systemMetrics, setSystemMetrics] = useState({ cpuPercent: 0, memoryMb: 0, gpuPercent: null as number | null })
  const [captureMetrics, setCaptureMetrics] = useState({ fps: 0, droppedFrames: 0 })
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const compositorCanvasRef = useRef<HTMLCanvasElement>(null)
  const compositorStreamRef = useRef<MediaStream | null>(null)
  const compositorFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioGainRef = useRef<GainNode | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const activeScene = sceneCollection.activeSceneId
  const activeSceneRecord = sceneCollection.scenes.find((scene) => scene.id === activeScene) ?? sceneCollection.scenes[0]
  const sources = activeSceneRecord?.sources ?? []
  const isLive = streamStatus === 'Streaming'
  const output = streamFormats[streamFormat]
  const sceneImage = sceneImages[activeScene as keyof typeof sceneImages]?.[streamFormat]
  const sceneOverlay = activeScene === 'main' ? sceneOverlays[streamFormat] : null
  const streamWindow = streamWindows[streamFormat]

  useEffect(() => {
    window.localStorage.setItem('signal.scene-collection', JSON.stringify(sceneCollection))
  }, [sceneCollection])

  useEffect(() => {
    window.studio.listCaptureSources().then((availableSources) => {
      setCaptureSources(availableSources)
      setSelectedCaptureSource((current) => current || availableSources[0]?.id || '')
    }).catch(() => setCaptureError('Capture sources could not be listed.'))
  }, [])

  useEffect(() => {
    window.studio.getFfmpegStatus().then((status) => setFfmpegAvailable(status.available)).catch(() => setFfmpegAvailable(false))
  }, [])

  useEffect(() => {
    window.studio.getYouTubeAuthStatus().then(setYoutubeAuth).catch((error) => setYoutubeAuth({ connected: false, channelTitle: null, channelId: null, reason: error instanceof Error ? error.message : 'YouTube status is unavailable.' }))
  }, [])

  useEffect(() => window.studio.onTransportStatus((status) => {
    if (status === 'reconnecting') {
      setStreamStatus('Reconnecting')
      setGoLiveError('Network transport interrupted. Reconnecting...')
    }
    if (status === 'error') {
      setStreamStatus('Error')
      setGoLiveError('The media transport stopped unexpectedly.')
      setGoLiveBusy(false)
      recorderRef.current = null
    }
    if (status === 'streaming' && streamStatus === 'Reconnecting') setStreamStatus('Connecting')
    if (status === 'stopped' && (streamStatus === 'Streaming' || streamStatus === 'Reconnecting')) setStreamStatus('Stopped')
  }), [streamStatus])

  useEffect(() => {
    if (streamStatus !== 'Streaming' && streamStatus !== 'Reconnecting' && streamStatus !== 'Connecting') return
    const refreshMetrics = () => {
      void window.studio.getGoLiveMetrics().then(setStreamMetrics)
      void window.studio.getSystemMetrics().then(setSystemMetrics)
      const track = captureStream?.getVideoTracks()[0]
      const quality = previewVideoRef.current?.getVideoPlaybackQuality?.()
      setCaptureMetrics({ fps: track?.getSettings().frameRate ?? 0, droppedFrames: quality?.droppedVideoFrames ?? 0 })
    }
    refreshMetrics()
    const timer = window.setInterval(refreshMetrics, 1000)
    return () => window.clearInterval(timer)
  }, [captureStream, streamStatus])

  const refreshMediaDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === 'videoinput')
    const microphones = devices.filter((device) => device.kind === 'audioinput')
    setCameraDevices(cameras)
    setMicrophoneDevices(microphones)
    setSelectedCameraId((current) => current || cameras[0]?.deviceId || '')
    setSelectedMicrophoneId((current) => current || microphones[0]?.deviceId || '')
  }

  useEffect(() => {
    void refreshMediaDevices().catch(() => setCameraError('Camera and microphone devices could not be listed.'))
    const handleDeviceChange = () => void refreshMediaDevices()
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [])

  useEffect(() => {
    if (previewVideoRef.current) previewVideoRef.current.srcObject = captureStream
    return () => {
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null
    }
  }, [captureStream])

  useEffect(() => {
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = cameraStream
    return () => {
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null
    }
  }, [cameraStream])

  useEffect(() => {
    const canvas = compositorCanvasRef.current
    if (!canvas) return
    canvas.width = output.width
    canvas.height = output.height
    const context = canvas.getContext('2d')
    if (!context) return
    const image = sceneImage ? new window.Image() : null
    if (image && sceneImage) image.src = sceneImage
    const overlay = sceneOverlay ? new window.Image() : null
    if (overlay && sceneOverlay) overlay.src = sceneOverlay
    const draw = () => {
      context.fillStyle = '#111417'
      context.fillRect(0, 0, canvas.width, canvas.height)
      if (overlay?.complete && overlay.naturalWidth) {
        context.drawImage(overlay, 0, 0, canvas.width, canvas.height)
        if (previewVideoRef.current?.readyState && captureStream) {
          const x = canvas.width * streamWindow.x
          const y = canvas.height * streamWindow.y
          const width = canvas.width * streamWindow.width
          const height = canvas.height * streamWindow.height
          context.save()
          context.beginPath()
          context.rect(x, y, width, height)
          context.clip()
          context.drawImage(previewVideoRef.current, x, y, width, height)
          context.restore()
        }
      } else if (image?.complete && image.naturalWidth) {
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
      } else if (previewVideoRef.current?.readyState && captureStream) {
        context.drawImage(previewVideoRef.current, 0, 0, canvas.width, canvas.height)
      }
      if (cameraVideoRef.current?.readyState && cameraStream) {
        const cameraWidth = 420
        const cameraHeight = 260
        context.save()
        context.translate(canvas.width - 44, 44)
        context.scale(-1, 1)
        context.drawImage(cameraVideoRef.current, 0, 0, cameraWidth, cameraHeight)
        context.restore()
      }
      context.save()
      context.font = '700 54px Space Grotesk, sans-serif'
      context.textAlign = 'right'
      context.textBaseline = 'bottom'
      context.shadowColor = 'rgba(0, 0, 0, .75)'
      context.shadowBlur = 12
      context.fillStyle = '#ffffff'
      context.fillText('TARANG LIVE', canvas.width - 42, canvas.height - 38)
      context.restore()
      compositorFrameRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      if (compositorFrameRef.current !== null) cancelAnimationFrame(compositorFrameRef.current)
      compositorFrameRef.current = null
    }
  }, [activeScene, cameraStream, captureStream, output.height, output.width, sceneImage, sceneOverlay, streamWindow.height, streamWindow.width, streamWindow.x, streamWindow.y])

  useEffect(() => () => {
    captureStream?.getTracks().forEach((track) => track.stop())
    cameraStream?.getTracks().forEach((track) => track.stop())
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current)
    if (compositorFrameRef.current !== null) cancelAnimationFrame(compositorFrameRef.current)
    compositorStreamRef.current?.getTracks().forEach((track) => track.stop())
    void audioContextRef.current?.close()
  }, [cameraStream, captureStream])

  const updateCollection = (next: SceneCollection) => setSceneCollection(next)
  const selectScene = (sceneId: string) => updateCollection({ ...sceneCollection, activeSceneId: sceneId })
  const toggleSource = (sourceId: string) => {
    const source = sources.find((item) => item.id === sourceId)
    if (source) updateCollection(setSourceVisibility(sceneCollection, activeScene, sourceId, !source.transform.visible))
  }
  const addNewScene = () => {
    const id = `scene-${Date.now()}`
    updateCollection({ ...addScene(sceneCollection, { id, name: 'New Scene', sources: [] }), activeSceneId: id })
  }
  const renameActiveScene = () => {
    const name = window.prompt('Scene name', activeSceneRecord?.name ?? 'New Scene')?.trim()
    if (name) updateCollection(renameScene(sceneCollection, activeScene, name))
  }
  const addNewSource = () => updateCollection(addSource(sceneCollection, activeScene, createSource(`source-${Date.now()}`, 'New Image', 'image', sources.length)))
  const renameSource = (sourceId: string, currentName: string) => {
    const name = window.prompt('Source name', currentName)?.trim()
    if (name) updateCollection({ ...sceneCollection, scenes: sceneCollection.scenes.map((scene) => scene.id === activeScene ? { ...scene, sources: scene.sources.map((source) => source.id === sourceId ? { ...source, name } : source) } : scene) })
  }
  const nudgeSource = (sourceId: string) => {
    const source = sources.find((item) => item.id === sourceId)
    if (source) updateCollection(updateSourceTransform(sceneCollection, activeScene, sourceId, { x: source.transform.x + 10, y: source.transform.y + 10, opacity: Math.max(0.2, source.transform.opacity - 0.05) }))
  }

  const startDisplayCapture = async () => {
    setCaptureError(null)
    try {
      if (!selectedCaptureSource) {
        setCaptureError('Select a display or window before starting capture.')
        return
      }
      await window.studio.selectCaptureSource(selectedCaptureSource)
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false })
      stream.getVideoTracks()[0]?.addEventListener('ended', () => setCaptureStream(null), { once: true })
      setCaptureStream(stream)
    } catch (error) {
      setCaptureError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Display capture was cancelled or denied.' : 'Display capture could not be started.')
    }
  }

  const stopDisplayCapture = () => {
    captureStream?.getTracks().forEach((track) => track.stop())
    setCaptureStream(null)
  }

  const startCameraAndMicrophone = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { ...(selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : {}), echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      stream.getTracks().forEach((track) => track.addEventListener('ended', stopCameraAndMicrophone, { once: true }))
      setCameraStream(stream)
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const gain = audioContext.createGain()
        analyser.fftSize = 256
        gain.gain.value = microphoneVolume / 100
        audioContext.createMediaStreamSource(new MediaStream([audioTrack])).connect(gain).connect(analyser)
        const samples = new Uint8Array(analyser.fftSize)
        const updateMeter = () => {
          analyser.getByteTimeDomainData(samples)
          const peak = samples.reduce((highest, sample) => Math.max(highest, Math.abs(sample - 128)), 0)
          setAudioLevel(Math.min(100, Math.round((peak / 128) * 100)))
          meterFrameRef.current = requestAnimationFrame(updateMeter)
        }
        audioContextRef.current = audioContext
        audioGainRef.current = gain
        updateMeter()
      }
      await refreshMediaDevices()
    } catch (error) {
      setCameraError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Camera or microphone permission was denied.' : 'Camera or microphone could not be started.')
    }
  }

  const stopCameraAndMicrophone = () => {
    cameraStream?.getTracks().forEach((track) => track.stop())
    setCameraStream(null)
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current)
    meterFrameRef.current = null
    setAudioLevel(0)
    void audioContextRef.current?.close()
    audioContextRef.current = null
    audioGainRef.current = null
  }

  const setMicrophoneMute = (muted: boolean) => {
    cameraStream?.getAudioTracks().forEach((track) => { track.enabled = !muted })
    setMicrophoneMuted(muted)
  }

  const setMicrophoneLevel = (volume: number) => {
    setMicrophoneVolume(volume)
    if (audioGainRef.current) audioGainRef.current.gain.value = volume / 100
  }

  const toggleStream = async () => {
    setGoLiveError(null)
    if (streamStatus === 'Streaming' || streamStatus === 'Connecting') {
      recorderRef.current?.stop()
      recorderRef.current = null
      setGoLiveBusy(true)
      try {
        await window.studio.stopGoLive()
        setStreamStatus('Stopped')
      } catch (error) {
        setStreamStatus('Error')
        setGoLiveError(error instanceof Error ? error.message : 'The broadcast could not be stopped cleanly.')
      } finally {
        setGoLiveBusy(false)
      }
      return
    }

    if (!captureStream) {
      setStreamStatus('Error')
      setGoLiveError('Start display capture before going live.')
      return
    }
    if (!cameraStream?.getAudioTracks().length) {
      setStreamStatus('Error')
      setGoLiveError('Start camera and microphone capture before going live.')
      return
    }
    if (!youtubeAuth.connected) {
      setStreamStatus('Error')
      setGoLiveError('Connect a YouTube account before going live.')
      return
    }
    if (!ffmpegAvailable) {
      setStreamStatus('Error')
      setGoLiveError('FFmpeg is unavailable. The encoder cannot start.')
      return
    }

    const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm'].find((candidate) => MediaRecorder.isTypeSupported(candidate))
    if (!mimeType) {
      setStreamStatus('Error')
      setGoLiveError('This runtime does not provide a supported WebM recorder.')
      return
    }

    setGoLiveBusy(true)
    setStreamStatus('Preparing')
    try {
      await window.studio.prepareGoLive({ title: 'Morning Broadcast', description: 'Tarang broadcast', privacyStatus: 'private' })
      const canvas = compositorCanvasRef.current
      if (!canvas) throw new Error('Scene compositor is unavailable.')
      const composedVideo = canvas.captureStream(30)
      compositorStreamRef.current = composedVideo
      const media = new MediaStream([...composedVideo.getVideoTracks(), ...cameraStream.getAudioTracks()])
      const recorder = new MediaRecorder(media, { mimeType, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 })
      let liveMarked = false
      recorder.ondataavailable = async (event) => {
        if (!event.data.size) return
        try {
          window.studio.writeMediaChunk(new Uint8Array(await event.data.arrayBuffer()))
          if (!liveMarked) {
            liveMarked = true
            await window.studio.markGoLive()
            setStreamStatus('Streaming')
            setGoLiveBusy(false)
          }
        } catch (error) {
          setStreamStatus('Error')
          setGoLiveError(error instanceof Error ? error.message : 'Media transport failed.')
        }
      }
      recorder.onerror = () => {
        setStreamStatus('Error')
        setGoLiveError('Media recording failed.')
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setStreamStatus('Connecting')
    } catch (error) {
      setStreamStatus('Error')
      setGoLiveError(error instanceof Error ? error.message : 'The YouTube broadcast could not be prepared.')
      setGoLiveBusy(false)
    }
  }

  const connectYouTube = async () => {
    setYoutubeAuthBusy(true)
    try {
      setYoutubeAuth(await window.studio.connectYouTube())
    } catch (error) {
      setYoutubeAuth({ connected: false, channelTitle: null, channelId: null, reason: error instanceof Error ? error.message : 'YouTube authorization failed.' })
    } finally {
      setYoutubeAuthBusy(false)
    }
  }

  const disconnectYouTube = async () => {
    await window.studio.disconnectYouTube()
    setYoutubeAuth({ connected: false, channelTitle: null, channelId: null, reason: null })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Radio size={20} strokeWidth={2.5} /></div>
          <div><strong>Tarang</strong><span>LIVE. CREATE. CONNECT,</span></div>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className="nav-item active"><LayoutDashboard size={18} /> <span>Studio</span></button>
          <button className="nav-item"><Library size={18} /> <span>Scene library</span></button>
          <button className="nav-item"><Activity size={18} /> <span>Analytics</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="connection-card">
          <div className="connection-heading"><span className="status-dot" /> YouTube account</div>
          <strong>{youtubeAuth.connected ? youtubeAuth.channelTitle : 'Not connected'}</strong>
          {youtubeAuth.connected ? <button className="text-button" onClick={disconnectYouTube}>Disconnect account <ChevronDown size={14} /></button> : <button className="text-button" onClick={connectYouTube} disabled={youtubeAuthBusy}>{youtubeAuthBusy ? 'Opening Google...' : 'Connect account'} <ChevronDown size={14} /></button>}
          {youtubeAuth.reason && <small className="connection-error">{youtubeAuth.reason}</small>}
        </div>
        <button className="nav-item"><Settings size={18} /> <span>Settings</span></button>
        <div className="sidebar-footer"><CircleHelp size={15} /> Help center <span>v{window.studio.version}</span></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="workspace-title"><button className="icon-button menu-button" aria-label="Open menu"><Menu size={19} /></button><div><span className="eyebrow">Workspace</span><h1>Morning Broadcast</h1></div></div>
          <div className="topbar-actions"><span className="save-status"><span className="saved-dot" /> All changes saved</span><button className="icon-button" aria-label="Audio settings"><SlidersHorizontal size={18} /></button><button className="avatar" aria-label="Account menu">A</button></div>
        </header>

        <div className="studio-grid">
          <section className="preview-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Preview</span><h2>{activeSceneRecord?.name}</h2></div><div className="preview-meta"><span className="preview-live-dot" /> LIVE PREVIEW <button className="icon-button compact" aria-label="Preview options"><MoreHorizontal size={18} /></button></div></div>
            <div className={`preview-canvas ${streamFormat === 'vertical' ? 'vertical' : ''} ${captureStream ? 'has-capture' : ''}`}>
              {captureStream && <video className="preview-video" ref={previewVideoRef} autoPlay muted playsInline />}
              {(sceneOverlay || sceneImage) && <img className={`scene-preview-image ${sceneOverlay ? 'has-overlay' : ''}`} src={sceneOverlay ?? sceneImage} alt={`${activeSceneRecord?.name ?? 'Scene'} preview`} />}
              {!captureStream && <><div className="canvas-grid" /><div className="empty-preview"><div className="preview-icon"><Monitor size={28} /></div><strong>Preview ready</strong><span>Add a capture source to see your scene here.</span></div></>}
              <div className="canvas-label"><span>{output.width} x {output.height}</span><span>30 FPS</span></div>
              {captureStream && <div className="capture-label"><Monitor size={14} /><span>Desktop Capture</span></div>}
              {cameraStream && <div className="camera-tile"><video ref={cameraVideoRef} autoPlay muted playsInline /><span><Camera size={12} /> Camera</span></div>}
              <canvas ref={compositorCanvasRef} className="compositor-canvas" aria-hidden="true" />
            </div>
            <div className="preview-controls"><select className="capture-source-select" value={streamFormat} onChange={(event) => setStreamFormat(event.target.value as keyof typeof streamFormats)} disabled={isLive} aria-label="Stream format"><option value="horizontal">Horizontal Live · 16:9</option><option value="vertical">Shorts / Vertical · 9:16</option></select><select className="capture-source-select" value={selectedCaptureSource} onChange={(event) => setSelectedCaptureSource(event.target.value)} disabled={Boolean(captureStream)} aria-label="Capture source"><option value="">Select capture source</option>{captureSources.map((source) => <option key={source.id} value={source.id}>{source.type === 'screen' ? 'Display' : 'Window'}: {source.name}</option>)}</select><button className="control-button" onClick={captureStream ? stopDisplayCapture : startDisplayCapture}>{captureStream ? <><Square size={16} fill="currentColor" /> Stop capture</> : <><Monitor size={16} /> Start capture</>}</button><span className={`control-hint ${captureError ? 'capture-error' : ''}`}>{captureError ?? (captureStream ? 'Real Windows display frames are in the preview.' : 'Select a display or window to preview it.')}</span><button className="icon-button" aria-label="Preview performance"><Gauge size={17} /></button></div>
          </section>

          <section className="scene-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Production</span><h2>Scenes</h2></div><div className="panel-actions"><button className="icon-button compact" onClick={renameActiveScene} aria-label="Rename active scene"><Settings size={16} /></button><button className="icon-button accent" onClick={addNewScene} aria-label="Add scene"><Plus size={18} /></button></div></div>
            <div className="scene-list">{sceneCollection.scenes.map((scene) => <button key={scene.id} className={`scene-row ${activeScene === scene.id ? 'selected' : ''}`} onClick={() => selectScene(scene.id)}><span className="scene-thumbnail"><Tv2 size={17} /></span><span className="scene-details"><strong>{scene.name}</strong><small>{scene.sources.length} sources</small></span>{activeScene === scene.id && <span className="active-mark" />}</button>)}</div>
            <button className="outline-button" onClick={addNewScene}><Plus size={16} /> New scene</button>
          </section>

          <section className="sources-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Composition</span><h2>Sources</h2></div><button className="icon-button accent" onClick={addNewSource} aria-label="Add source"><Plus size={18} /></button></div>
            <div className="source-list">{sources.map((source) => { const SourceIcon = iconMap[source.kind]; const visible = source.transform.visible; return <div className={`source-row ${visible ? '' : 'muted-row'}`} key={source.id}><button className="visibility-button" onClick={() => toggleSource(source.id)} aria-label={`${visible ? 'Hide' : 'Show'} ${source.name}`}>{visible ? <Eye size={16} /> : <EyeOff size={16} />}</button><span className="source-icon"><SourceIcon size={16} /></span><span className="source-details"><strong>{source.name}</strong><small>{source.kind} · x {source.transform.x} · y {source.transform.y}</small></span><button className="icon-button compact" onClick={() => updateCollection(moveSource(sceneCollection, activeScene, source.id, 'up'))} aria-label={`Move ${source.name} up`}><ChevronUp size={14} /></button><button className="icon-button compact" onClick={() => updateCollection(moveSource(sceneCollection, activeScene, source.id, 'down'))} aria-label={`Move ${source.name} down`}><ChevronDown size={14} /></button><button className="icon-button compact" onClick={() => updateCollection(duplicateSource(sceneCollection, activeScene, source.id, `${source.id}-copy-${Date.now()}`))} aria-label={`Duplicate ${source.name}`}><Copy size={14} /></button><button className="icon-button compact" onClick={() => nudgeSource(source.id)} aria-label={`Transform ${source.name}`}><SlidersHorizontal size={14} /></button><button className="icon-button compact" onClick={() => renameSource(source.id, source.name)} aria-label={`Rename ${source.name}`}><Settings size={14} /></button><button className="icon-button compact" onClick={() => updateCollection(removeSource(sceneCollection, activeScene, source.id))} aria-label={`Remove ${source.name}`}><Trash2 size={14} /></button></div> })}</div>
            <button className="outline-button" onClick={addNewSource}><Plus size={16} /> Add source</button>
          </section>

          <section className="mixer-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Audio</span><h2>Mixer</h2></div><div className="panel-actions"><button className="icon-button" onClick={cameraStream ? stopCameraAndMicrophone : startCameraAndMicrophone} aria-label={cameraStream ? 'Stop camera and microphone' : 'Start camera and microphone'}>{cameraStream ? <Square size={16} /> : <Camera size={17} />}</button><button className="icon-button" aria-label="Audio mixer settings"><SlidersHorizontal size={17} /></button></div></div>
            {cameraError && <div className="device-error">{cameraError}</div>}
            <div className="device-selectors"><label>Camera<select value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)} disabled={Boolean(cameraStream)}><option value="">Default camera</option>{cameraDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Camera device'}</option>)}</select></label><label>Microphone<select value={selectedMicrophoneId} onChange={(event) => setSelectedMicrophoneId(event.target.value)} disabled={Boolean(cameraStream)}><option value="">Default microphone</option>{microphoneDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Microphone device'}</option>)}</select></label></div>
            <div className="mixer-list">{audioChannels.map((channel) => <div className="mixer-row" key={channel.name}><div className="mixer-label"><span className="channel-color" style={{ background: channel.color }} /><strong>{channel.name}</strong><span className="meter-value">{channel.name === 'Mic / Aux' && cameraStream ? `${audioLevel}%` : `${channel.level}%`}</span></div><div className="meter"><span className="meter-fill" style={{ width: `${channel.name === 'Mic / Aux' && cameraStream ? audioLevel : channel.level}%`, background: channel.color }} /><span className="meter-peak" style={{ left: `${channel.peak}%` }} /></div>{channel.name === 'Mic / Aux' ? <><input className="volume-slider" type="range" min="0" max="100" value={microphoneVolume} onChange={(event) => setMicrophoneLevel(Number(event.target.value))} aria-label="Microphone volume" /><button className={`mute-button ${microphoneMuted ? 'is-muted' : ''}`} onClick={() => setMicrophoneMute(!microphoneMuted)} aria-label={`${microphoneMuted ? 'Unmute' : 'Mute'} microphone`}>{microphoneMuted ? <Mic2 size={15} /> : <Volume2 size={15} />}</button></> : <button className={`mute-button ${channel.muted ? 'is-muted' : ''}`} aria-label={`${channel.muted ? 'Unmute' : 'Mute'} ${channel.name}`}>{channel.muted ? <Mic2 size={15} /> : <Volume2 size={15} />}</button>}</div>)}</div>
          </section>
        </div>
      </section>

      <aside className="stream-rail">
        <div className="rail-header"><div><span className="eyebrow">Broadcast</span><h2>Go live</h2></div><div className={`stream-status ${streamStatus.toLowerCase()}`}><span /> {streamStatus}</div></div>
        <div className="destination-box"><div className="destination-icon"><Video size={19} /></div><div><span className="eyebrow">Destination</span><strong>YouTube Live</strong><small>Connect an account to continue</small></div><LockKeyhole size={16} className="locked-icon" /></div>
        {goLiveError && <div className="go-live-error">{goLiveError}</div>}
        <button className="go-live-button" onClick={() => void toggleStream()} disabled={goLiveBusy || streamStatus === 'Preparing'}>{isLive || streamStatus === 'Connecting' ? <><Square size={16} fill="currentColor" /> Stop stream</> : <><Video size={17} /> Start stream</>}</button>
        <div className="rail-section"><div className="rail-section-heading"><span>Stream health</span><Wifi size={16} /></div><div className="health-empty"><Activity size={19} /><span>Health data appears<br />when you are live.</span></div></div>
          <div className="rail-section details-section"><div className="rail-section-heading"><span>Session details</span><MoreHorizontal size={16} /></div><dl><div><dt>Format</dt><dd>{output.label}</dd></div><div><dt>Resolution</dt><dd>{output.width} x {output.height}</dd></div><div><dt>Frame rate</dt><dd>{captureMetrics.fps ? `${Math.round(captureMetrics.fps)} FPS` : '0 FPS'}</dd></div><div><dt>Bitrate</dt><dd>{streamMetrics.bitrateKbps || 0} Kbps</dd></div><div><dt>Dropped frames</dt><dd>{captureMetrics.droppedFrames}</dd></div><div><dt>CPU / memory</dt><dd>{systemMetrics.cpuPercent.toFixed(1)}% / {systemMetrics.memoryMb} MB</dd></div><div><dt>GPU</dt><dd>{systemMetrics.gpuPercent === null ? 'Unavailable' : `${systemMetrics.gpuPercent.toFixed(1)}%`}</dd></div><div><dt>Encoder</dt><dd>{ffmpegAvailable ? 'FFmpeg available' : 'FFmpeg unavailable'}</dd></div></dl></div>
        <div className="rail-footer"><AudioLines size={15} /> Audio input ready <span className="ready-dot" /></div>
      </aside>
    </main>
  )
}