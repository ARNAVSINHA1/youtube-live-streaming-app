import { google, youtube_v3 } from 'googleapis'
import { safeStorage, shell } from 'electron'
import { createServer, type Server } from 'node:http'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { app } from 'electron'

const redirectPort = 42813
const redirectPath = '/oauth2/callback'
const scopes = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube']

export type YouTubeAuthStatus = {
  connected: boolean
  channelTitle: string | null
  channelId: string | null
  reason: string | null
}

type StoredToken = { access_token?: string | null; refresh_token?: string | null; scope?: string; token_type?: string | null; expiry_date?: number | null; id_token?: string | null }

type OAuthClient = InstanceType<typeof google.auth.OAuth2>

let oauthClient: OAuthClient | null = null
let callbackServer: Server | null = null

const tokenPath = () => join(app.getPath('userData'), 'youtube-oauth.bin')

const createClient = () => {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('YouTube OAuth is not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.')
  return new google.auth.OAuth2(clientId, clientSecret, `http://127.0.0.1:${redirectPort}${redirectPath}`)
}

const loadStoredToken = (): StoredToken | null => {
  if (!existsSync(tokenPath())) return null
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows secure credential storage is unavailable.')
  return JSON.parse(safeStorage.decryptString(readFileSync(tokenPath()))) as StoredToken
}

const saveToken = (token: StoredToken) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows secure credential storage is unavailable.')
  writeFileSync(tokenPath(), safeStorage.encryptString(JSON.stringify(token)), { mode: 0o600 })
}

const getClient = (): OAuthClient => {
  if (oauthClient) return oauthClient
  oauthClient = createClient()
  const token = loadStoredToken()
  if (token) oauthClient.setCredentials(token)
  oauthClient.on('tokens', (tokens: StoredToken) => {
    const current = oauthClient?.credentials ?? {}
    try {
      saveToken({ ...current, ...tokens })
    } catch {
      // The request still succeeds; the next session will require authorization again.
    }
  })
  return oauthClient
}

const getChannel = async (auth: OAuthClient): Promise<youtube_v3.Schema$Channel | null> => {
  const response = await google.youtube('v3').channels.list({ auth, part: ['snippet'], mine: true })
  return response.data.items?.[0] ?? null
}

export const getYouTubeAuthStatus = async (): Promise<YouTubeAuthStatus> => {
  try {
    const auth = getClient()
    if (!auth.credentials.refresh_token && !auth.credentials.access_token) return { connected: false, channelTitle: null, channelId: null, reason: null }
    const channel = await getChannel(auth)
    return { connected: Boolean(channel), channelTitle: channel?.snippet?.title ?? null, channelId: channel?.id ?? null, reason: channel ? null : 'The authorized account has no accessible YouTube channel.' }
  } catch (error) {
    return { connected: false, channelTitle: null, channelId: null, reason: error instanceof Error ? error.message : 'YouTube authorization status is unavailable.' }
  }
}

export const connectYouTube = async (): Promise<YouTubeAuthStatus> => {
  const auth = getClient()
  const state = randomUUID()
  const url = auth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes, state })

  if (callbackServer) callbackServer.close()
  const code = await new Promise<string>((resolve, reject) => {
    callbackServer = createServer((request, response) => {
      try {
        const callbackUrl = new URL(request.url ?? '/', `http://127.0.0.1:${redirectPort}`)
        if (callbackUrl.pathname !== redirectPath || callbackUrl.searchParams.get('state') !== state) {
          response.writeHead(400).end('Invalid OAuth callback.')
          reject(new Error('YouTube OAuth state validation failed.'))
          return
        }
        const error = callbackUrl.searchParams.get('error')
        if (error) {
          response.writeHead(400).end('YouTube authorization was not completed.')
          reject(new Error(`YouTube authorization failed: ${error}`))
          return
        }
        const authorizationCode = callbackUrl.searchParams.get('code')
        if (!authorizationCode) {
          response.writeHead(400).end('Missing authorization code.')
          reject(new Error('YouTube authorization returned no code.'))
          return
        }
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h2>Signal Live Studio connected</h2><p>You can close this window.</p>')
        resolve(authorizationCode)
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid OAuth callback.'))
      } finally {
        callbackServer?.close()
        callbackServer = null
      }
    })
    callbackServer.once('error', (error) => reject(new Error(`OAuth callback server could not start: ${error.message}`)))
    callbackServer.listen(redirectPort, '127.0.0.1', () => void shell.openExternal(url))
  })

  const { tokens } = await auth.getToken(code)
  auth.setCredentials(tokens)
  saveToken({ ...auth.credentials, ...tokens })
  const channel = await getChannel(auth)
  return { connected: Boolean(channel), channelTitle: channel?.snippet?.title ?? null, channelId: channel?.id ?? null, reason: channel ? null : 'The authorized account has no accessible YouTube channel.' }
}

export const disconnectYouTube = () => {
  oauthClient = null
  if (existsSync(tokenPath())) {
    rmSync(tokenPath(), { force: true })
  }
}

export const getAuthenticatedYouTubeClient = (): OAuthClient => getClient()