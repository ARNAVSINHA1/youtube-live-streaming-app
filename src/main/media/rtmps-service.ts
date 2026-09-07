import { startFfmpeg, type FfmpegProcess } from './ffmpeg-service'

export type TransportStatus = 'disconnected' | 'connecting' | 'streaming' | 'error' | 'stopped'

export type RtmpsTransport = {
  status: TransportStatus
  write: (chunk: Uint8Array) => void
  stop: () => Promise<void>
}

const supportedProtocols = new Set(['rtmp:', 'rtmps:'])

export const buildIngestionUrl = (ingestionAddress: string, streamName: string): string => {
  const address = new URL(ingestionAddress)
  if (!supportedProtocols.has(address.protocol)) throw new Error('YouTube returned an unsupported ingestion protocol.')
  if (!address.hostname || !streamName.trim()) throw new Error('YouTube returned incomplete ingestion information.')
  const basePath = address.pathname.endsWith('/') ? address.pathname : `${address.pathname}/`
  address.pathname = `${basePath}${encodeURIComponent(streamName.trim())}`
  return address.toString()
}

export const redactTransportUrl = (url: string): string => {
  try {
    const parsed = new URL(url)
    parsed.pathname = parsed.pathname.split('/').map((part, index, parts) => index === parts.length - 1 ? '[redacted]' : part).join('/')
    return parsed.toString()
  } catch {
    return '[redacted]'
  }
}

export const startRtmpsTransport = (ingestionAddress: string, streamName: string, onDiagnostic: (message: string) => void, onState?: (status: TransportStatus) => void): RtmpsTransport => {
  const destination = buildIngestionUrl(ingestionAddress, streamName)
  let status: TransportStatus = 'connecting'
  const process: FfmpegProcess = startFfmpeg([
    '-hide_banner',
    '-loglevel', 'warning',
    '-f', 'webm',
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '128k',
    '-f', 'flv',
    destination,
  ], (message) => onDiagnostic(`FFmpeg transport (${redactTransportUrl(destination)}): ${message}`))
  const input = process.process.stdin
  if (!input) {
    void process.stop()
    throw new Error('FFmpeg transport did not provide an input pipe.')
  }

  status = 'streaming'
  onState?.(status)
  process.process.once('close', (code) => {
    status = code === 0 ? 'stopped' : 'error'
    onState?.(status)
  })

  return {
    get status() { return status },
    write: (chunk) => {
      if (status !== 'streaming' || !input.writable) throw new Error('RTMPS transport is not accepting media data.')
      input.write(Buffer.from(chunk))
    },
    stop: async () => {
      status = 'stopped'
      onState?.(status)
      await process.stop()
    },
  }
}