import { describe, expect, it } from 'vitest'
import { buildIngestionUrl, redactTransportUrl } from './rtmps-service'

describe('RTMPS transport boundary', () => {
  it('builds a destination only from API-provided ingestion data', () => {
    expect(buildIngestionUrl('rtmps://a.rtmp.youtube.com/live2', 'secret-key')).toBe('rtmps://a.rtmp.youtube.com/live2/secret-key')
  })

  it('rejects unsupported or incomplete destinations', () => {
    expect(() => buildIngestionUrl('https://example.com/live', 'key')).toThrow('unsupported ingestion protocol')
    expect(() => buildIngestionUrl('rtmps://example.com/live', '')).toThrow('incomplete ingestion information')
  })

  it('redacts stream keys from diagnostics', () => {
    expect(redactTransportUrl('rtmps://example.com/live/secret-key')).toBe('rtmps://example.com/live/[redacted]')
  })
})