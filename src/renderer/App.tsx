import { useState } from 'react'
import {
  Activity,
  AudioLines,
  Camera,
  ChevronDown,
  CircleHelp,
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
  Tv2,
  Video,
  Volume2,
  Wifi,
} from 'lucide-react'
import { audioChannels, scenes, sources, type StreamStatus } from './studio-state'

const iconMap = { monitor: Monitor, camera: Camera, image: Image, music: Music2 }

export function App() {
  const [activeScene, setActiveScene] = useState('main')
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('Disconnected')
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(sources.map((source) => [source.id, source.enabled])),
  )
  const isLive = streamStatus === 'Streaming'

  const toggleSource = (sourceId: string) => {
    setSourceVisibility((current) => ({ ...current, [sourceId]: !current[sourceId] }))
  }

  const toggleStream = () => {
    setStreamStatus((current) => (current === 'Streaming' ? 'Stopped' : 'Error'))
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Radio size={20} strokeWidth={2.5} /></div>
          <div><strong>Signal</strong><span>LIVE STUDIO</span></div>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className="nav-item active"><LayoutDashboard size={18} /> <span>Studio</span></button>
          <button className="nav-item"><Library size={18} /> <span>Scene library</span></button>
          <button className="nav-item"><Activity size={18} /> <span>Analytics</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="connection-card">
          <div className="connection-heading"><span className="status-dot" /> YouTube account</div>
          <strong>Not connected</strong>
          <button className="text-button">Connect account <ChevronDown size={14} /></button>
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
            <div className="panel-header"><div><span className="eyebrow">Preview</span><h2>{scenes.find((scene) => scene.id === activeScene)?.name}</h2></div><div className="preview-meta"><span className="preview-live-dot" /> LIVE PREVIEW <button className="icon-button compact" aria-label="Preview options"><MoreHorizontal size={18} /></button></div></div>
            <div className="preview-canvas">
              <div className="canvas-grid" />
              <div className="empty-preview"><div className="preview-icon"><Monitor size={28} /></div><strong>Preview ready</strong><span>Add a capture source to see your scene here.</span></div>
              <div className="canvas-label"><span>1920 x 1080</span><span>30 FPS</span></div>
              <div className="camera-placeholder"><Camera size={16} /><span>Face Camera</span></div>
            </div>
            <div className="preview-controls"><button className="control-button"><Play size={16} fill="currentColor" /> Play preview</button><span className="control-hint">Preview is local only until you connect a source.</span><button className="icon-button" aria-label="Preview performance"><Gauge size={17} /></button></div>
          </section>

          <section className="scene-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Production</span><h2>Scenes</h2></div><button className="icon-button accent" aria-label="Add scene"><Plus size={18} /></button></div>
            <div className="scene-list">{scenes.map((scene) => <button key={scene.id} className={`scene-row ${activeScene === scene.id ? 'selected' : ''}`} onClick={() => setActiveScene(scene.id)}><span className="scene-thumbnail"><Tv2 size={17} /></span><span className="scene-details"><strong>{scene.name}</strong><small>{scene.sourceCount} sources</small></span>{activeScene === scene.id && <span className="active-mark" />}</button>)}</div>
            <button className="outline-button"><Plus size={16} /> New scene</button>
          </section>

          <section className="sources-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Composition</span><h2>Sources</h2></div><button className="icon-button accent" aria-label="Add source"><Plus size={18} /></button></div>
            <div className="source-list">{sources.map((source) => { const SourceIcon = iconMap[source.icon as keyof typeof iconMap]; const visible = sourceVisibility[source.id]; return <div className={`source-row ${visible ? '' : 'muted-row'}`} key={source.id}><button className="visibility-button" onClick={() => toggleSource(source.id)} aria-label={`${visible ? 'Hide' : 'Show'} ${source.name}`}>{visible ? <Eye size={16} /> : <EyeOff size={16} />}</button><span className="source-icon"><SourceIcon size={16} /></span><span className="source-details"><strong>{source.name}</strong><small>{source.kind}</small></span><button className="icon-button compact" aria-label={`${source.name} options`}><MoreHorizontal size={16} /></button></div> })}</div>
            <button className="outline-button"><Plus size={16} /> Add source</button>
          </section>

          <section className="mixer-panel panel">
            <div className="panel-header"><div><span className="eyebrow">Audio</span><h2>Mixer</h2></div><button className="icon-button" aria-label="Audio mixer settings"><SlidersHorizontal size={17} /></button></div>
            <div className="mixer-list">{audioChannels.map((channel) => <div className="mixer-row" key={channel.name}><div className="mixer-label"><span className="channel-color" style={{ background: channel.color }} /><strong>{channel.name}</strong><span className="meter-value">{channel.level}%</span></div><div className="meter"><span className="meter-fill" style={{ width: `${channel.level}%`, background: channel.color }} /><span className="meter-peak" style={{ left: `${channel.peak}%` }} /></div><button className={`mute-button ${channel.muted ? 'is-muted' : ''}`} aria-label={`${channel.muted ? 'Unmute' : 'Mute'} ${channel.name}`}>{channel.muted ? <Mic2 size={15} /> : <Volume2 size={15} />}</button></div>)}</div>
          </section>
        </div>
      </section>

      <aside className="stream-rail">
        <div className="rail-header"><div><span className="eyebrow">Broadcast</span><h2>Go live</h2></div><div className={`stream-status ${streamStatus.toLowerCase()}`}><span /> {streamStatus}</div></div>
        <div className="destination-box"><div className="destination-icon"><Video size={19} /></div><div><span className="eyebrow">Destination</span><strong>YouTube Live</strong><small>Connect an account to continue</small></div><LockKeyhole size={16} className="locked-icon" /></div>
        <button className="go-live-button" onClick={toggleStream} disabled={streamStatus === 'Preparing'}>{isLive ? <><Square size={16} fill="currentColor" /> Stop stream</> : <><Video size={17} /> Start stream</>}</button>
        <div className="rail-section"><div className="rail-section-heading"><span>Stream health</span><Wifi size={16} /></div><div className="health-empty"><Activity size={19} /><span>Health data appears<br />when you are live.</span></div></div>
        <div className="rail-section details-section"><div className="rail-section-heading"><span>Session details</span><MoreHorizontal size={16} /></div><dl><div><dt>Resolution</dt><dd>1920 x 1080</dd></div><div><dt>Frame rate</dt><dd>30 FPS</dd></div><div><dt>Bitrate</dt><dd>6,000 Kbps</dd></div><div><dt>Encoder</dt><dd>Not active</dd></div></dl></div>
        <div className="rail-footer"><AudioLines size={15} /> Audio input ready <span className="ready-dot" /></div>
      </aside>
    </main>
  )
}