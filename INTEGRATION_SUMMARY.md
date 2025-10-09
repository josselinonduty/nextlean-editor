# Lean4Monaco WebSocket Integration - Implementation Summary

## Overview

This implementation adds full **lean4monaco** support with a custom WebSocket server for running Lean 4 LSP on the host machine. The architecture follows the approach used by [lean4web](https://github.com/leanprover-community/lean4web) and leverages the WebSocket configuration option provided by [lean4monaco](https://github.com/hhu-adam/lean4monaco).

## Architecture

```
┌─────────────────┐           ┌──────────────────┐           ┌─────────────┐
│   Browser       │  WebSocket │  WebSocket       │  Process  │   Lean LSP  │
│   lean4monaco   │◄──────────►│  Server          │◄─────────►│   Server    │
│   + Monaco      │   (JSON-RPC) │  (proxy)         │  (stdio)  │  (lake serve)│
│   + Infoview    │           │  Port 3001       │           │             │
└─────────────────┘           └──────────────────┘           └─────────────┘
```

## Components

### 1. WebSocket Server (`server/lean-websocket.ts`)

A standalone Node.js server that:
- Listens on port 3001 for WebSocket connections
- Spawns a Lean LSP server process using `lake serve`
- Bridges JSON-RPC messages between browser WebSocket and LSP server stdio
- Transforms file URIs between client and server formats
- Handles connection lifecycle and cleanup

**Key Features:**
- Uses `vscode-ws-jsonrpc` for WebSocket to JSON-RPC bridging
- Automatic process cleanup on disconnect
- URI transformation for proper file path handling
- Socket connection statistics logging

### 2. Lean Project (`lean-project/`)

A minimal Lean 4 project that serves as the workspace for the LSP server:

```
lean-project/
├── lean-toolchain      # Specifies Lean version
├── lakefile.lean       # Lake build configuration
├── LeanProject.lean    # Main Lean source file
└── .gitignore         # Ignores build artifacts
```

The LSP server operates within this project context, providing:
- Code completion
- Type information
- Diagnostics
- Goal state visualization

### 3. Vue Composable (`app/composables/useLean4Monaco.ts`)

A reusable Vue 3 composable that simplifies lean4monaco integration:

```typescript
const { 
  initializeEditor,  // Initialize editor with WebSocket
  dispose,          // Clean up resources
  isLoading,        // Loading state
  error,            // Error state
  leanVersion       // Version/status info
} = useLean4Monaco()
```

**Configuration:**
- Auto-detects WebSocket protocol (ws/wss)
- Connects to `ws://localhost:3001`
- Configures Monaco editor with Lean-friendly settings
- Sets up infoview integration

### 4. Test Page (`app/pages/lean4monaco-test.vue`)

A demonstration page showing:
- Full lean4monaco editor with LSP support
- Live infoview panel
- Connection status indicators
- Example Lean code

## Installation & Setup

### Prerequisites

1. **Lean 4 & Lake:**
   ```bash
   curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
   ```

2. **Node.js 22+** (specified in package.json)

### Setup Steps

1. **Install dependencies:**
   ```bash
   cd project
   pnpm install
   ```

2. **Initialize Lean project:**
   ```bash
   cd lean-project
   lake update
   cd ..
   ```

3. **Run both servers:**
   ```bash
   pnpm dev:all
   ```
   
   This starts:
   - Nuxt dev server on port 3000
   - Lean WebSocket server on port 3001

### Alternative: Run Separately

```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm dev:lean
```

## Usage

### Using the Test Page

Visit `http://localhost:3000/lean4monaco-test` to see:
- Live Lean editor with full LSP support
- Real-time infoview showing goals and types
- Connection status
- Example theorems and proofs

### Integrating in Your Pages

```vue
<script setup lang="ts">
const editorContainer = ref<HTMLElement>()
const infoviewContainer = ref<HTMLElement>()
const { initializeEditor, dispose } = useLean4Monaco()

onMounted(async () => {
  if (editorContainer.value) {
    await initializeEditor(
      editorContainer.value,
      infoviewContainer.value,
      '/project/main.lean',
      'def hello := "world"\n'
    )
  }
})

onUnmounted(() => {
  dispose()
})
</script>

<template>
  <div class="flex h-screen">
    <div ref="editorContainer" class="flex-1" />
    <div ref="infoviewContainer" class="w-1/3" />
  </div>
</template>
```

## Technical Details

### Dependencies Added

**Production:**
- `ws` - WebSocket server
- `vscode-ws-jsonrpc` - JSON-RPC over WebSocket

**Development:**
- `tsx` - TypeScript execution
- `concurrently` - Run multiple commands
- `@types/ws` - TypeScript definitions

### Nuxt Configuration

Updated `nuxt.config.ts` to:
1. Copy lean4monaco infoview assets to public directory
2. Include webview.js for infoview
3. Copy codicon.ttf font for infoview icons

### File Paths

The LSP server requires file paths to start with `/project/` (not root `/`). This is a quirk of the Monaco editor integration that the lean4monaco package works around.

## Comparison with lean4web

| Feature | lean4web | This Implementation |
|---------|----------|-------------------|
| WebSocket Server | Express + ws | Standalone ws server |
| Project Structure | Multiple projects | Single project |
| Sandboxing | Bubblewrap | None (dev mode) |
| Frontend | React | Vue 3 / Nuxt |
| URI Transformation | ✅ | ✅ |
| Process Management | ✅ | ✅ |

## Troubleshooting

### WebSocket Connection Fails

**Symptom:** Editor loads but shows "disconnected" status

**Solutions:**
- Ensure Lean WebSocket server is running (`pnpm dev:lean`)
- Check that port 3001 is not in use
- Verify Lean and lake are in PATH

### LSP Server Not Starting

**Symptom:** WebSocket connects but no LSP features work

**Solutions:**
- Run `lake update` in `lean-project/`
- Check `lean-project/lean-toolchain` is valid
- Verify Lean installation: `lean --version`
- Check server logs for errors

### Infoview Not Displaying

**Symptom:** Editor works but infoview is blank

**Solutions:**
- Check browser console for asset loading errors
- Verify infoview assets were copied correctly (check `.output/public/infoview/`)
- Ensure infoview container ref is passed to `initializeEditor`

### Build Fails with Heap Error

**Symptom:** `pnpm build` runs out of memory

**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

## Future Enhancements

Potential improvements:
1. **Multiple Projects:** Support switching between different Lean projects
2. **Sandboxing:** Add bubblewrap or similar for production security
3. **Project Management:** UI for creating/opening Lean projects
4. **Collaborative Editing:** Multiple users editing same project
5. **Cloud Deployment:** Deploy with proper LSP server isolation

## References

- [lean4monaco](https://github.com/hhu-adam/lean4monaco) - Monaco editor for Lean 4
- [lean4web](https://github.com/leanprover-community/lean4web) - Web IDE for Lean 4
- [Lean 4](https://leanprover.github.io/) - Lean theorem prover
- [vscode-ws-jsonrpc](https://github.com/microsoft/vscode-ws-jsonrpc) - WebSocket JSON-RPC library

## License

Same as the main project.
