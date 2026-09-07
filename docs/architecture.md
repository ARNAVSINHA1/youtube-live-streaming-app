# YouTube Live Studio Architecture

## Scope

This document describes the target architecture for Windows desktop and Android/iOS mobile clients. The first working milestone remains incremental: shell and shared contracts come before native media, OAuth, or streaming workflows.

## Runtime boundaries

The repository contains two clients over shared domain contracts. The Windows client uses Electron with a sandboxed React renderer and a privileged main process. The Android/iOS client uses React Native with Expo and platform-native modules. Neither UI may own FFmpeg processes, OAuth secrets, filesystem credentials, or YouTube API clients.

```text
Desktop React renderer       Mobile React Native client
    | typed IPC commands/events
Electron main process
    | application services
    +-- Scene and application state
    +-- YouTube service
    +-- Media engine facade
    |      +-- Capture adapters
    |      +-- Scene compositor
    |      +-- Encoder
    |      +-- Stream transport
    +-- Persistence
    +-- Secure credentials
    +-- Diagnostics
Shared TypeScript domain package
    +-- Scene/source schemas
    +-- Stream state machine types
    +-- Validation and platform-neutral services
Native/media infrastructure (per platform)
    +-- Windows capture APIs
    +-- FFmpeg or selected media backend
    +-- OS credential store
```

## Components

### Renderer UI

React and TypeScript provide the desktop shell. React Native provides the Android/iOS shell with shared view-model contracts. Desktop receives immutable view models over a narrow preload API; mobile receives them through platform service adapters. Neither UI imports Node.js modules or calls YouTube, FFmpeg, SQLite, or native capture APIs directly.

### Shared domain package

`packages/core` contains platform-neutral scene/source models, stream status values, validation, and application service contracts. It has no React, Electron, Expo, Node, or native module dependency and is testable in isolation.

### Preload and IPC

The preload script exposes an allowlisted, typed API. Commands are request/response or subscription based, with validation at the main-process boundary. IPC events carry status snapshots and diagnostic-safe errors. No arbitrary channel names, filesystem paths, or executable arguments are accepted from the renderer.

### Application state

The main process owns application state transitions. Broadcast state and encoder/transport state remain separate so a YouTube API operation cannot be mistaken for a healthy media connection. State changes are serialized and published as snapshots to the renderer.

### Media engine

The media engine is an interface with replaceable adapters:

- `CaptureSource`: display, window, camera, microphone, and system audio sources.
- `SceneComposer`: orders visible sources and applies transforms.
- `Encoder`: produces H.264 video and AAC audio according to a validated profile.
- `StreamTransport`: sends an encoded output to an API-provided RTMPS destination.
- `MediaEngine`: coordinates lifecycle, metrics, and clean shutdown.

The first implementation should use mature, maintained components. Windows capture should be evaluated around Windows Graphics Capture and Electron's supported capture APIs before choosing a native addon. Android/iOS capture must use platform-supported screen-recording, camera, microphone, and background-execution APIs through maintained React Native modules or native bridges. FFmpeg should be treated as a subprocess or managed backend behind the desktop media facade; mobile encoding/transport may require native SDKs because arbitrary FFmpeg processes are not a viable mobile lifecycle model. Codec, RTMP, TLS, and capture protocols will not be implemented from scratch.

### YouTube service

The service owns Google OAuth 2.0, channel lookup, live broadcast/stream creation, binding, metadata updates, ingestion information, and lifecycle transitions. Tokens and client secrets never enter renderer state or normal logs. OAuth token storage will use an OS-backed credential mechanism, with a small SQLite metadata store only for non-secret application data.

### Persistence

SQLite is reserved for durable application data such as scene collections, source configuration, settings, channel-profile metadata, and diagnostic indexes. Schema migrations are required before persistent features ship. Secret material is stored separately through secure OS-backed storage.

### Diagnostics

Structured logs are emitted by the main process and services. Secrets, authorization codes, tokens, stream keys, and full ingestion URLs must be redacted. User-facing errors should include an actionable category and correlation identifier while retaining detailed internal diagnostics.

## Security model

- Enable `contextIsolation` and sandboxing where compatible with the selected Electron version.
- Disable renderer Node integration.
- Use a narrowly scoped preload bridge with runtime validation.
- Use a restrictive Content Security Policy.
- Keep OAuth redirect handling in the main process.
- Treat stream keys and ingestion details as secrets.
- Validate all external API responses and process exit states.
- Do not log credentials or include them in crash reports.

## State and lifecycle

The stream workflow is an explicit state machine:

`disconnected -> preparing -> connecting -> streaming -> reconnecting -> stopped`

Any state may enter `error`, with a controlled cleanup path back to `stopped` or `disconnected`. YouTube broadcast lifecycle and encoder lifecycle are modeled independently and coordinated by an application-level workflow service.

## Target platforms

The targets are 64-bit Windows 10/11, Android, and iOS. The development machine reports Windows 10 Home Single Language, build 26200, Node.js 24.17.0, npm 11.13.0, and no `ffmpeg` executable on `PATH`. Android and iOS builds require their respective SDK/toolchain and physical-device validation. Native capture and encoding dependencies must be pinned and validated in CI and in packaged applications rather than assumed to exist globally.
