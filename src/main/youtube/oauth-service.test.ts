import { describe, expect, it } from 'vitest'
import { getYouTubeAuthStatus } from './oauth-service'

describe('YouTube OAuth service', () => {
  it('reports missing configuration without exposing or inventing credentials', async () => {
    const clientId = process.env.YOUTUBE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
    delete process.env.YOUTUBE_CLIENT_ID
    delete process.env.YOUTUBE_CLIENT_SECRET

    try {
      const status = await getYouTubeAuthStatus()
      expect(status.connected).toBe(false)
      expect(status.reason).toContain('YOUTUBE_CLIENT_ID')
    } finally {
      if (clientId) process.env.YOUTUBE_CLIENT_ID = clientId
      if (clientSecret) process.env.YOUTUBE_CLIENT_SECRET = clientSecret
    }
  })
})