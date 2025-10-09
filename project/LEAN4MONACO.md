# Lean4Monaco Integration

This project integrates lean4monaco with a custom WebSocket server for running Lean LSP on the host machine.

## Architecture

The integration consists of three main parts:

1. **WebSocket Server** (`server/lean-websocket.ts`): Bridges between browser WebSocket and Lean LSP server
2. **Lean Project** (`lean-project/`): A basic Lean 4 project that the LSP server operates on
3. **Frontend Integration** (`app/composables/useLean4Monaco.ts`): Vue composable for easy integration

## Prerequisites

1. **Lean 4**: Install elan and Lean 4
   ```bash
   curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
   ```

2. **Lake**: Lean's build tool (comes with Lean 4)

## Setup

1. Install dependencies:
   ```bash
   cd project
   pnpm install
   ```

2. Initialize Lean project:
   ```bash
   cd lean-project
   lake update
   ```

## Running

You have two options:

### Option 1: Run both servers together (recommended)
```bash
cd project
pnpm dev:all
```

This runs both the Nuxt dev server (port 3000) and the Lean WebSocket server (port 3001).

### Option 2: Run separately
```bash
# Terminal 1 - Nuxt dev server
cd project
pnpm dev

# Terminal 2 - Lean WebSocket server
cd project
pnpm dev:lean
```

## Usage

Visit the test page at http://localhost:3000/lean4monaco-test to see the integration in action.

To use lean4monaco in your own pages:

```vue
<script setup lang="ts">
const editorContainer = ref<HTMLElement>()
const infoviewContainer = ref<HTMLElement>()
const { initializeEditor, dispose, isLoading, error } = useLean4Monaco()

onMounted(async () => {
  if (editorContainer.value) {
    await initializeEditor(
      editorContainer.value,
      infoviewContainer.value,
      '/project/main.lean',
      'def hello := "world"\n\n#eval hello'
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

## How It Works

1. The WebSocket server (`server/lean-websocket.ts`) starts a Lean LSP server using `lake serve`
2. It proxies JSON-RPC messages between the browser WebSocket and the LSP server
3. The frontend connects to `ws://localhost:3001` and uses lean4monaco's custom WebSocket option
4. lean4monaco handles all LSP communication and provides Monaco editor integration and infoview

## References

- [lean4monaco](https://github.com/hhu-adam/lean4monaco) - Monaco editor integration for Lean 4
- [lean4web](https://github.com/leanprover-community/lean4web) - Reference implementation for WebSocket server
- [Lean 4](https://leanprover.github.io/) - Lean theorem prover

## Troubleshooting

### WebSocket connection fails
- Ensure the Lean WebSocket server is running on port 3001
- Check that Lean 4 and lake are installed and in your PATH

### Lean server not starting
- Verify `lean-project/` has been initialized with `lake update`
- Check that `lean-toolchain` exists and specifies a valid Lean version
- Look at server logs for detailed error messages

### Infoview not showing
- Ensure infoview assets are copied correctly (check nuxt.config.ts)
- Verify that `infoviewContainer` is passed to `initializeEditor`
