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
