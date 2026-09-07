# Implementation Plan

## Phase 0: repository and architecture

Status: complete for this repository.

Completed in this phase:

- Confirmed the workspace has no source code, package manifest, dependency graph, or existing build configuration.
- Confirmed Node.js 24.17.0 and npm 11.13.0 are available.
- Confirmed FFmpeg is not installed globally or available on `PATH`.
- Documented architecture, technical decisions, constraints, and risks.

Exit criteria:

- Architecture boundaries are documented.
- Major technology choices and unresolved spikes are recorded.
- No advanced media, OAuth, or streaming implementation has been started.

## Phase 1: desktop shell

Status: complete for this repository.

Create the Electron/React/TypeScript application skeleton with a secure main/preload/renderer split. Add the sidebar, preview area, scenes panel, sources panel, audio mixer, stream controls, and settings views using local typed state only. Add a production build and a smoke test that launches the shell without runtime errors.

Exit criteria: packaged or development application launches cleanly, renderer has no privileged imports, and shell tests pass. The production bundles and automated smoke test pass; a full manual Electron launch remains pending the first-time Electron binary download in this environment.

## Phase 1A: shared contracts and mobile shell

Status: complete for the shell milestone.

Add a platform-neutral core package and a React Native/Expo client for Android and iOS. The mobile shell includes a compact preview/status view, scene selection, source summary, audio summary, destination state, and safe stream controls. It clearly shows that native capture and YouTube connection are unavailable until their later phases; it does not simulate a live stream.

Exit criteria: shared package tests pass, desktop still builds, mobile TypeScript checks pass, and Android/iOS Expo bundles export successfully. Native simulator/device capture, permissions, and streaming remain unimplemented and are gated behind later platform-specific phases.

## Phase 2: scene system

Status: complete for the shared model and client configuration editors.

Define versioned scene and source schemas. Implement persistence, source ordering, add/remove/duplicate/rename, visibility, and transforms. Start with display, window, camera, image, text, and background source records; source adapters may remain unavailable until their later phases.

Exit criteria: scene edits survive restart, ordering and transforms are deterministic, and invalid records are rejected with diagnostics. The current shell uses browser storage on desktop and AsyncStorage on mobile as a temporary Phase 2 persistence adapter; migration to the planned SQLite/native persistence layer remains part of the media/application-services work.

## Phase 3: Windows capture

Status: in progress.

Run a focused spike comparing Electron-supported capture with Windows Graphics Capture/native integration for latency, frame format, packaging, and stability. Implement display capture first, then window capture, feeding real frames to the preview pipeline.

Current implementation: the Electron desktop client lists available screens and windows through a typed preload bridge, requests a real selected-source MediaStream through `getDisplayMedia`, and renders visible preview frames. The flow includes denial/error handling, track-ended cleanup, and explicit stop capture.

Remaining exit criteria: validate frame latency and clean stop behavior on supported Windows hardware, verify packaged-app permissions, and feed selected frames into the scene compositor. No capture is claimed for mobile yet.

## Phase 4: camera and audio

Status: in progress.

Add webcam, microphone, and supported desktop-audio adapters. Add mixer controls for volume, mute, and meters. Verify device loss and permission failures are visible and recoverable.

Current implementation: the Electron renderer enumerates camera and microphone devices, requests selected webcam and microphone tracks through `getUserMedia`, previews the camera, reports permission/device errors, stops tracks cleanly, and displays a microphone activity meter from a live Web Audio analyser. Microphone volume and mute affect the live Web Audio diagnostic path. Desktop/system audio capture and encoder routing are not implemented yet.

Remaining exit criteria: validate device loss on Windows hardware, add supported desktop/system audio capture, and route captured audio into the media pipeline.

## Phase 5: media pipeline

Status: in progress.

Select and package a real media backend. Prove capture to composition to H.264/AAC encode and RTMP-compatible muxing against a local/test destination before any YouTube integration. Add metrics and clean process shutdown.

Current implementation: the Electron main process has a real FFmpeg capability probe and process service behind the preload boundary. It validates an explicit, packaged, vendor, or `ffmpeg-static` executable, checks `-version`, reports safe diagnostic status, and supports clean process termination. The repository now provisions a Windows FFmpeg 6.1.1 binary through `ffmpeg-static` and verifies it with an automated test.

Remaining exit criteria: connect captured video/audio to a compositor and encoder, prove H.264/AAC output against a local test destination, and add process metrics/failure tests. The binary still needs to be included and license-documented in the final Windows installer.

## Phase 6: YouTube OAuth

Status: in progress.

Implement Google OAuth 2.0 with secure token storage, redacted diagnostics, revocation handling, and authorized-channel lookup. Use test credentials only through local configuration; never commit them.

Current implementation: the Electron main process uses `googleapis` for YouTube OAuth 2.0, starts a loopback callback server with state validation, opens the system browser, encrypts tokens with Electron `safeStorage`, refreshes and persists tokens, and retrieves the authorized channel title/id. Configure `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` locally; they are never stored in source or renderer state.

Remaining exit criteria: test authorization with a developer-owned Google Cloud project, handle revoked/expired credentials in the UI, add secure configuration guidance, and cover the authenticated service with boundary mocks.

## Phase 7: broadcast management

Status: in progress.

Implement create stream, create broadcast, bind, ingestion lookup, metadata updates, transitions, and stop/end operations. Keep API broadcast state separate from encoder state and add mocked service tests only at the service boundary.

Current implementation: the main process now exposes real YouTube Live Streaming API operations for create broadcast, create stream, bind, ingestion lookup, testing/live/complete transitions, and stop. Ingestion address and stream key values are returned only by the API service and are not logged or hard-coded.

Remaining exit criteria: add validated request DTOs and boundary mocks, persist separate broadcast/encoder state, add metadata updates, and connect these operations to the go-live workflow.

## Phase 8: RTMPS and go-live workflow

Status: in progress.

Connect the real encoder output to API-provided RTMPS ingestion information. Implement preparing, connecting, streaming, reconnecting, stopped, and error states. The go-live workflow must validate configuration, prepare YouTube, prepare the encoder, connect, verify ingestion, transition the broadcast, and expose LIVE only after the required checks pass.

Current implementation: a main-process transport boundary accepts WebM media bytes, encodes H.264/AAC with FFmpeg, and sends FLV output to an API-provided RTMP/RTMPS ingestion URL. The go-live service creates and binds the YouTube broadcast/stream, starts transport, accepts real `MediaRecorder` chunks from display video plus microphone audio, transitions YouTube only after the first chunk, and completes both transport and broadcast during stop. It validates protocols, redacts stream keys from diagnostics, and supports clean transport state transitions.

Remaining exit criteria: add reconnect tests around process/network interruption and validate the composed output on Windows hardware. The current workflow now uses the scene compositor output, verifies YouTube ingestion health before transition, propagates transport failures, reports live byte-derived bitrate, and retries the same transport up to three times without creating a duplicate broadcast. A real YouTube run still requires configured OAuth credentials and network/device validation.

## Phase 9: monitoring and reconnect

Status: in progress.

Expose resolution, FPS, bitrate, dropped frames, encoder/connection state, CPU, and available GPU metrics. Add bounded retry count and delay, idempotent cleanup, duplicate-broadcast protection, and deliberate network interruption tests.

Current implementation: transport process state reaches the renderer, unexpected exits trigger three reconnect attempts with a two-second delay while retaining the same broadcast session, and the desktop rail displays live byte-derived bitrate. CPU/GPU metrics, frame-drop counters, and deliberate network interruption tests remain.

The desktop rail now also displays capture FPS, dropped playback frames, Electron CPU usage, private memory, and explicit GPU availability. The Windows packaging command produces an NSIS installer with desktop/start-menu shortcut options and packaged FFmpeg resources.

## Later phases

Overlays and browser sources, scene switching and transitions, YouTube chat, recording, hardware encoders, channel profiles, and extended reliability testing follow only after the first live-stream milestone is stable. Windows installer packaging is now available through `npm run package:win`, but signing, installation migration, crash diagnostics, and release testing remain.

## Milestone gates

Every phase requires:

1. A successful build on the supported Windows environment.
2. Automated tests appropriate to the changed boundary.
3. Manual verification of the user-visible behavior.
4. Updated documentation and diagnostics.
5. No unresolved blocker carried into the next phase.
