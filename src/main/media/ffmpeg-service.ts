import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export type FfmpegStatus = {
  available: boolean
  executable: string | null
  version: string | null
  reason: string | null
}

export type FfmpegProcess = {
  process: ChildProcess
  stop: () => Promise<void>
}

const pathCandidates = (): string[] => {
  const executable = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const resourcesPath = process.resourcesPath || process.cwd()
  return [
    process.env.SIGNAL_FFMPEG_PATH,
    process.env.FFMPEG_PATH,
    join(resourcesPath, 'ffmpeg', executable),
    join(process.cwd(), 'vendor', 'ffmpeg', executable),
    join(process.cwd(), 'node_modules', 'ffmpeg-static', executable),
  ].filter((candidate): candidate is string => Boolean(candidate))
}

const findOnPath = (): string | null => {
  try {
    const command = process.platform === 'win32' ? 'where.exe' : 'which'
    return execFileSync(command, ['ffmpeg'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/)[0] || null
  } catch {
    return null
  }
}

export const resolveFfmpegExecutable = (): string | null => {
  const explicitPath = pathCandidates().find((candidate) => existsSync(candidate))
  return explicitPath ?? findOnPath()
}

export const probeFfmpeg = (): FfmpegStatus => {
  const executable = resolveFfmpegExecutable()
  if (!executable) return { available: false, executable: null, version: null, reason: 'FFmpeg was not found. Install or package a validated FFmpeg binary.' }

  try {
    const output = execFileSync(executable, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const version = output.split(/\r?\n/)[0] ?? null
    return { available: true, executable, version, reason: null }
  } catch {
    return { available: false, executable, version: null, reason: 'The configured FFmpeg executable could not be started.' }
  }
}

export const startFfmpeg = (args: string[], onDiagnostic: (message: string) => void): FfmpegProcess => {
  const status = probeFfmpeg()
  if (!status.available || !status.executable) throw new Error(status.reason ?? 'FFmpeg is unavailable.')

  const child = spawn(status.executable, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (message: string) => onDiagnostic(message.trim()))
  child.on('error', (error) => onDiagnostic(`FFmpeg process error: ${error.message}`))

  return {
    process: child,
    stop: () => new Promise((resolve) => {
      if (child.exitCode !== null) {
        resolve()
        return
      }
      child.once('close', () => resolve())
      child.kill('SIGTERM')
    }),
  }
}