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

Current implementation: the Electron desktop client requests a real primary-display MediaStream through `getDisplayMedia`, with a main-process `desktopCapturer` handler, visible preview frames, denial/error handling, track-ended cleanup, and explicit stop capture.

Remaining exit criteria: validate frame latency and clean stop behavior on supported Windows hardware, add user-selectable display/window sources, and verify packaged-app permissions. No capture is claimed for mobile yet.

## Phase 4: camera and audio

Add webcam, microphone, and supported desktop-audio adapters. Add mixer controls for volume, mute, and meters. Verify device loss and permission failures are visible and recoverable.

## Phase 5: media pipeline

Select and package a real media backend. Prove capture to composition to H.264/AAC encode and RTMP-compatible muxing against a local/test destination before any YouTube integration. Add metrics and clean process shutdown.

## Phase 6: YouTube OAuth

Implement Google OAuth 2.0 with secure token storage, redacted diagnostics, revocation handling, and authorized-channel lookup. Use test credentials only through local configuration; never commit them.

## Phase 7: broadcast management

Implement create stream, create broadcast, bind, ingestion lookup, metadata updates, transitions, and stop/end operations. Keep API broadcast state separate from encoder state and add mocked service tests only at the service boundary.

## Phase 8: RTMPS and go-live workflow

Connect the real encoder output to API-provided RTMPS ingestion information. Implement preparing, connecting, streaming, reconnecting, stopped, and error states. The go-live workflow must validate configuration, prepare YouTube, prepare the encoder, connect, verify ingestion, transition the broadcast, and expose LIVE only after the required checks pass.

## Phase 9: monitoring and reconnect

Expose resolution, FPS, bitrate, dropped frames, encoder/connection state, CPU, and available GPU metrics. Add bounded retry count and delay, idempotent cleanup, duplicate-broadcast protection, and deliberate network interruption tests.

## Later phases

Overlays and browser sources, scene switching and transitions, YouTube chat, recording, hardware encoders, channel profiles, extended reliability testing, and Windows packaging follow only after the first live-stream milestone is stable.

## Milestone gates

Every phase requires:

1. A successful build on the supported Windows environment.
2. Automated tests appropriate to the changed boundary.
3. Manual verification of the user-visible behavior.
4. Updated documentation and diagnostics.
5. No unresolved blocker carried into the next phase.
