import { google, youtube_v3 } from 'googleapis'
import { getAuthenticatedYouTubeClient } from './oauth-service'

export type BroadcastInput = {
  title: string
  description: string
  privacyStatus: 'private' | 'public' | 'unlisted'
  scheduledStartTime?: string
}

export type IngestionInfo = {
  streamId: string
  ingestionAddress: string
  streamName: string
}

export type IngestionHealth = 'active' | 'ready' | 'noData' | 'unknown'

const youtube = () => google.youtube('v3')

const requireId = (value: string | null | undefined, label: string): string => {
  if (!value) throw new Error(`YouTube returned no ${label}.`)
  return value
}

export const createBroadcast = async (input: BroadcastInput): Promise<youtube_v3.Schema$LiveBroadcast> => {
  const auth = getAuthenticatedYouTubeClient()
  const response = await youtube().liveBroadcasts.insert({
    auth,
    part: ['snippet', 'status', 'contentDetails'],
    requestBody: {
      snippet: {
        title: input.title,
        description: input.description,
        scheduledStartTime: input.scheduledStartTime ?? new Date(Date.now() + 60_000).toISOString(),
      },
      status: { privacyStatus: input.privacyStatus, selfDeclaredMadeForKids: false },
      contentDetails: { enableAutoStart: false, enableAutoStop: false },
    },
  })
  return response.data
}

export const createStream = async (name: string): Promise<youtube_v3.Schema$LiveStream> => {
  const auth = getAuthenticatedYouTubeClient()
  const response = await youtube().liveStreams.insert({
    auth,
    part: ['snippet', 'cdn', 'contentDetails'],
    requestBody: {
      snippet: { title: name },
      cdn: { frameRate: 'variable', ingestionType: 'rtmp', resolution: 'variable' },
    },
  })
  return response.data
}

export const bindBroadcast = async (broadcastId: string, streamId: string): Promise<youtube_v3.Schema$LiveBroadcast> => {
  const auth = getAuthenticatedYouTubeClient()
  const response = await youtube().liveBroadcasts.bind({ auth, id: broadcastId, part: ['id', 'snippet', 'status', 'contentDetails'], streamId })
  return response.data
}

export const getIngestionInfo = async (streamId: string): Promise<IngestionInfo> => {
  const auth = getAuthenticatedYouTubeClient()
  const response = await youtube().liveStreams.list({ auth, id: [streamId], part: ['cdn'] })
  const stream = response.data.items?.[0]
  const ingestionInfo = stream?.cdn?.ingestionInfo
  return {
    streamId: requireId(stream?.id, 'stream id'),
    ingestionAddress: requireId(ingestionInfo?.ingestionAddress, 'ingestion address'),
    streamName: requireId(ingestionInfo?.streamName, 'stream name'),
  }
}

export const getIngestionHealth = async (streamId: string): Promise<IngestionHealth> => {
  const auth = getAuthenticatedYouTubeClient()
  const response = await youtube().liveStreams.list({ auth, id: [streamId], part: ['status'] })
  const status = response.data.items?.[0]?.status?.streamStatus
  if (status === 'active') return 'active'
  if (status === 'ready') return 'ready'
  if (status === 'noData') return 'noData'
  return 'unknown'
}

export const waitForIngestion = async (streamId: string, attempts = 5, delayMs = 2_000): Promise<IngestionHealth> => {
  let health: IngestionHealth = 'unknown'
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    health = await getIngestionHealth(streamId)
    if (health === 'active') return health
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return health
}

export const transitionBroadcast = async (broadcastId: string, transition: 'testing' | 'live' | 'complete'): Promise<youtube_v3.Schema$LiveBroadcast> => {
  const auth = getAuthenticatedYouTubeClient()
  const response = await youtube().liveBroadcasts.transition({ auth, id: broadcastId, part: ['id', 'snippet', 'status', 'contentDetails'], broadcastStatus: transition })
  return response.data
}

export const stopBroadcast = (broadcastId: string) => transitionBroadcast(broadcastId, 'complete')