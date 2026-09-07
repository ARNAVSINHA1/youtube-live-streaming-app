import { bindBroadcast, createBroadcast, createStream, getIngestionInfo, stopBroadcast, transitionBroadcast, waitForIngestion } from './live-service'
import { startRtmpsTransport, type RtmpsTransport } from '../media/rtmps-service'

export type GoLiveInput = {
  title: string
  description: string
  privacyStatus: 'private' | 'public' | 'unlisted'
}

export type GoLiveStatus = 'preparing' | 'connecting' | 'streaming' | 'stopped' | 'error'

export type GoLiveSnapshot = {
  status: GoLiveStatus
  broadcastId: string | null
  streamId: string | null
  reason: string | null
}

let activeSession: { broadcastId: string; streamId: string; transport: RtmpsTransport; bytesWritten: number; startedAt: number } | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const maxReconnectAttempts = 3
const reconnectDelayMs = 2_000

export const getGoLiveStatus = (): GoLiveSnapshot => ({
  status: activeSession ? activeSession.transport.status === 'streaming' ? 'connecting' : 'error' : 'stopped',
  broadcastId: activeSession?.broadcastId ?? null,
  streamId: activeSession?.streamId ?? null,
  reason: null,
})

export const prepareGoLive = async (input: GoLiveInput, onTransportState?: (status: string) => void): Promise<GoLiveSnapshot> => {
  if (activeSession) throw new Error('A broadcast session is already active.')
  const broadcast = await createBroadcast(input)
  const broadcastId = broadcast.id
  if (!broadcastId) throw new Error('YouTube returned no broadcast id.')

  try {
    const stream = await createStream(`${input.title} stream`)
    const streamId = stream.id
    if (!streamId) throw new Error('YouTube returned no stream id.')
    await bindBroadcast(broadcastId, streamId)
    const ingestion = await getIngestionInfo(streamId)
    const startTransport = (): RtmpsTransport => startRtmpsTransport(ingestion.ingestionAddress, ingestion.streamName, () => undefined, (status) => {
      if (status !== 'error' || !activeSession) {
        onTransportState?.(status)
        return
      }
      if (reconnectAttempts >= maxReconnectAttempts) {
        onTransportState?.('error')
        return
      }
      reconnectAttempts += 1
      onTransportState?.('reconnecting')
      reconnectTimer = setTimeout(() => {
        if (!activeSession) return
        try {
          activeSession.transport = startTransport()
        } catch {
          onTransportState?.('error')
        }
      }, reconnectDelayMs)
    })
    reconnectAttempts = 0
    const transport = startTransport()
    activeSession = { broadcastId, streamId, transport, bytesWritten: 0, startedAt: Date.now() }
    return { status: 'connecting', broadcastId, streamId, reason: null }
  } catch (error) {
    await stopBroadcast(broadcastId).catch(() => undefined)
    throw error
  }
}

export const writeMediaChunk = (chunk: Uint8Array) => {
  if (!activeSession) throw new Error('No active broadcast session.')
  activeSession.transport.write(chunk)
  activeSession.bytesWritten += chunk.byteLength
}

export const getGoLiveMetrics = () => {
  if (!activeSession) return { bytesWritten: 0, bitrateKbps: 0, transportStatus: 'stopped' as const }
  const elapsedSeconds = Math.max(1, (Date.now() - activeSession.startedAt) / 1000)
  return { bytesWritten: activeSession.bytesWritten, bitrateKbps: Math.round((activeSession.bytesWritten * 8) / elapsedSeconds / 1000), transportStatus: activeSession.transport.status }
}

export const markGoLive = async (): Promise<GoLiveSnapshot> => {
  if (!activeSession) throw new Error('No active broadcast session.')
  const ingestionHealth = await waitForIngestion(activeSession.streamId)
  if (ingestionHealth !== 'active') throw new Error(`YouTube ingestion was not verified: ${ingestionHealth}.`)
  await transitionBroadcast(activeSession.broadcastId, 'live')
  return { status: 'streaming', broadcastId: activeSession.broadcastId, streamId: activeSession.streamId, reason: null }
}

export const stopGoLive = async (): Promise<GoLiveSnapshot> => {
  if (!activeSession) return { status: 'stopped', broadcastId: null, streamId: null, reason: null }
  const session = activeSession
  activeSession = null
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  reconnectAttempts = 0
  await session.transport.stop()
  await stopBroadcast(session.broadcastId)
  return { status: 'stopped', broadcastId: session.broadcastId, streamId: session.streamId, reason: null }
}