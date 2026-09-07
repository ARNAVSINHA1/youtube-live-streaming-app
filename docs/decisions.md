# Technical Decisions

## ADR-001: Electron with React and TypeScript

Decision: use Electron for the Windows desktop shell, React for the renderer UI, and TypeScript across application and service contracts.

Reason: this matches the requested direction and gives a mature desktop window, IPC, permissions, and packaging model while keeping the UI separate from privileged media work.

Consequence: Electron security defaults, version upgrades, native module compatibility, and renderer/main IPC contracts become release concerns.

## ADR-009: shared desktop and mobile clients

Decision: retain Electron for the Windows studio and add a React Native/Expo client for Android and iOS. Share platform-neutral TypeScript contracts through `packages/core`.

Reason: Electron does not target Android or iOS, while React Native provides native mobile packaging and access to platform capabilities. Shared contracts prevent scene and stream state from diverging between clients.

Consequence: native media implementations remain platform-specific. Mobile background execution, screen capture permissions, App Store policies, and device testing are release blockers for mobile streaming.

## ADR-010: mobile media is a native integration boundary

Decision: do not run desktop FFmpeg processes or assume desktop capture APIs on mobile. Evaluate maintained native libraries and OS APIs for camera, microphone, screen capture, hardware encoding, and RTMPS.

Reason: Android and iOS impose different permissions, lifecycle, background execution, and distribution constraints. A desktop subprocess design cannot be copied safely to mobile.

Consequence: the first mobile phases provide UI and contracts only. Real mobile streaming requires separate Android/iOS spikes and physical-device tests before claiming support.

## ADR-011: temporary client persistence for Phase 2

Decision: use `localStorage` in the desktop renderer and AsyncStorage on mobile for the initial scene editor, behind client-local persistence calls.

Reason: this phase needs restart persistence before the main-process SQLite service and native mobile database adapter are implemented.

Consequence: this is not the final persistence architecture. Scene schema versioning, migrations, and SQLite/native storage replacement must happen before production profile and multi-device features.

## ADR-012: Windows display capture through Electron media APIs

Decision: use Electron's `desktopCapturer` request handler together with the browser `getDisplayMedia` API for the first Windows display-capture implementation.

Reason: this uses maintained Electron/Chromium and Windows capture plumbing instead of inventing a frame protocol or native capture implementation. The stream lifecycle remains explicit and can later feed the media-engine facade.

Consequence: the current phase supports selected display/window preview but not composition, camera/audio sources, frame-latency measurement, packaged permission validation, or mobile capture. Those require separate validation and implementation.

## ADR-013: camera and microphone capture through Web Media APIs

Decision: use `navigator.mediaDevices.getUserMedia` for the first Windows camera/microphone implementation and Web Audio `AnalyserNode` for a diagnostic microphone meter.

Reason: Electron exposes Chromium's maintained device permission and media-capture path, avoiding a custom camera or audio protocol while the media engine is still being established.

Consequence: the current implementation previews camera frames, measures input activity, and applies mute/gain to the diagnostic audio path but does not yet encode or route audio to a stream. System audio and packaged permission validation remain required.

## ADR-014: FFmpeg capability and process boundary

Decision: keep FFmpeg discovery, probing, process creation, diagnostics, and shutdown in the Electron main process. Accept an explicit configured path or a validated packaged/vendor binary; do not require a global install for production.

Reason: the renderer must not launch arbitrary executables, and the application must distinguish an available encoder from a merely configured UI state.

Consequence: development now provisions and probes a pinned FFmpeg 6.1.1 binary through `ffmpeg-static`. The final installer must include the binary, preserve its license files, and verify its packaged path before encoding or streaming can be enabled.

## ADR-015: YouTube OAuth loopback and encrypted token storage

Decision: use Google OAuth 2.0 authorization-code flow through a loopback callback on `127.0.0.1`, and encrypt the resulting token JSON with Electron `safeStorage` in the app user-data directory.

Reason: the system browser handles Google sign-in and consent, while the loopback redirect avoids embedding credentials in the renderer. Windows-backed encryption protects refresh tokens at rest.

Consequence: local OAuth client configuration is required, redirect-port conflicts must be surfaced, and authorization/revocation must remain separate from encoder and broadcast state.

## ADR-016: YouTube Live API service boundary

Decision: keep all YouTube Live Streaming API calls in a main-process service and expose only typed operation endpoints through preload.

Reason: broadcast lifecycle and ingestion data are external side effects and must not be controlled directly by renderer code. The service can redact errors and preserve broadcast state independently from encoder state.

Consequence: OAuth must be connected before operations can succeed, API responses must be validated, and no stream key or ingestion URL may enter normal diagnostics.

## ADR-017: FFmpeg stdin transport for initial RTMPS path

Decision: accept a WebM media byte stream on the main-process FFmpeg stdin, encode H.264/AAC, mux FLV, and send to the exact ingestion URL returned by YouTube.

Reason: this provides a replaceable transport boundary without implementing RTMP/TLS or codecs from scratch. The API remains the source of truth for the destination.

Consequence: the compositor and MediaRecorder/encoder adapter must provide correctly timed WebM chunks before this transport can be used. A transport process alone does not constitute a live stream.

## ADR-018: guarded go-live transition

Decision: prepare the YouTube broadcast and transport first, feed real MediaRecorder chunks, and transition the broadcast to `live` only after the first chunk is accepted by the transport.

Reason: UI state must not claim LIVE while OAuth, broadcast creation, encoding, or media input has failed.

Consequence: the current workflow uses display video plus microphone audio as the initial media input. Scene composition, transport-failure events, ingestion-health verification, and reconnect remain required before production streaming claims.

## ADR-019: bounded transport reconnect

Decision: retry the existing FFmpeg transport up to three times with a two-second delay, reusing the same YouTube broadcast and ingestion information.

Reason: temporary transport failures should not create duplicate broadcasts or mutate YouTube lifecycle state unexpectedly.

Consequence: retry exhaustion reports an error to the renderer. Ingestion-health verification, backoff configuration, and network interruption tests remain required before production reliability claims.

## ADR-020: ingestion health before LIVE

Decision: poll the YouTube Live Stream status and transition the broadcast to `live` only when YouTube reports `active` ingestion.

Reason: a connected encoder process and an accepted socket do not prove YouTube is receiving the stream.

Consequence: go-live can remain connecting or fail when API health does not become active. The polling delay and attempt count must be tuned with real YouTube tests.

## ADR-021: Windows NSIS packaging

Decision: use electron-builder with an NSIS target for the first Windows installer, including optional desktop/start-menu shortcuts and the provisioned FFmpeg binary/license resources.

Reason: electron-builder provides a maintained Windows packaging path and supports the native/resource layout required by the media backend.

Consequence: the current installer uses Electron's default icon and is unsigned in this development environment. Code signing, migration tests, crash diagnostics, and release-channel configuration remain deployment work.

## ADR-002: secure three-process boundary

Decision: keep UI in the renderer, privileged orchestration in the main process, and expose only a typed preload bridge.

Reason: FFmpeg, credentials, SQLite, and YouTube clients must not be reachable from arbitrary renderer code.

Consequence: features require explicit commands, events, validation, and state serialization instead of direct imports.

## ADR-003: Vite-based development and Electron packaging

Decision: use a Vite-based React TypeScript build for renderer development, with an Electron packaging tool selected during Phase 1 after checking native-module and Windows installer requirements. Prefer a maintained Electron Forge or electron-builder workflow rather than a custom installer.

Reason: fast iteration and a conventional split build are valuable, but native capture/media dependencies must determine the final packaging choice.

Consequence: the package layout and native dependency rules will be fixed before capture implementation begins.

## ADR-004: media backend behind interfaces

Decision: place capture, composition, encoding, and transport behind application-owned interfaces. Use mature Windows capture APIs/libraries and FFmpeg or another maintained media backend; do not implement codecs, RTMP, TLS, or Windows capture protocols from scratch.

Reason: these areas have high correctness, performance, and security risk, and the repository currently contains no media implementation to constrain the choice.

Consequence: Phase 3 and Phase 5 include focused technology spikes. A dependency is not considered production-ready until packaging, licensing, process failure, latency, and shutdown behavior are verified.

## ADR-005: SQLite for metadata, OS storage for secrets

Decision: use SQLite for scenes, settings, profiles, and migration-managed metadata. Store OAuth tokens, client secrets, and stream keys only in secure OS-backed credential storage.

Reason: SQLite is appropriate for local structured state, while secrets need access control and encryption provided by Windows credential facilities.

Consequence: database backups and diagnostics must exclude secret material, and credential availability must be treated as a recoverable runtime condition.

## ADR-006: API-provided ingestion information

Decision: obtain YouTube RTMPS ingestion details from the YouTube Live Streaming API for the authorized broadcast/stream. Do not hard-code YouTube endpoints or infer stream keys.

Reason: the API is the source of truth and this avoids brittle assumptions about ingestion configuration.

Consequence: broadcast preparation must complete before transport can connect, and API errors must block the go-live transition with useful diagnostics.

## ADR-007: explicit independent state machines

Decision: model YouTube broadcast state, encoder state, and transport/connection state independently, then coordinate them through a go-live workflow.

Reason: an API broadcast can exist while an encoder is stopped, and a transport failure must not silently mutate broadcast state or create duplicates.

Consequence: reconnect and cleanup are idempotent requirements, and the UI receives a combined status view rather than one overloaded boolean.

## ADR-008: no global FFmpeg dependency

Decision: do not require users to install FFmpeg globally. The packaged application must ship or otherwise provision a validated media backend before streaming is called production-ready.

Reason: the current Windows environment has no FFmpeg on `PATH`, and a production desktop app cannot assume an unmanaged executable.

Consequence: packaging, version pinning, executable integrity, licenses, and update strategy must be addressed before Phase 5 exits.

## Open decisions to resolve with spikes

- Windows capture implementation and frame-transfer path.
- FFmpeg process versus embedded/native media backend.
- Electron Forge versus electron-builder after native packaging tests.
- SQLite driver compatible with the chosen Electron/Node ABI.
- Exact OAuth redirect UX and credential-store library.
- Hardware encoder discovery and fallback policy.
