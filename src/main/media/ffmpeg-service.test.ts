import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { probeFfmpeg, resolveFfmpegExecutable } from './ffmpeg-service'

describe('FFmpeg service', () => {
  it('resolves and probes the packaged development binary', () => {
    const executable = resolveFfmpegExecutable()
    const status = probeFfmpeg()

    expect(executable).toBeTruthy()
    expect(status.available).toBe(true)
    expect(status.executable).toBe(executable)
    expect(status.version).toMatch(/^ffmpeg version /)
  })

  it('encodes a short H.264/AAC MP4 locally', () => {
    const executable = resolveFfmpegExecutable()
    if (!executable) throw new Error('FFmpeg is required for this test.')
    const directory = mkdtempSync(join(tmpdir(), 'signal-ffmpeg-'))
    const output = join(directory, 'sample.mp4')

    try {
      execFileSync(executable, [
        '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30',
        '-f', 'lavfi', '-i', 'sine=frequency=1000:sample_rate=48000',
        '-t', '0.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-shortest', '-y', output,
      ], { stdio: 'pipe' })
      expect(existsSync(output)).toBe(true)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})