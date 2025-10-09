# Quick Start Guide: WebSocket Lean Language Server

This guide will help you get started with the WebSocket-based Lean language server integration.

## Prerequisites

Before using the WebSocket-enabled editor, you need to have Lean 4 installed on your server:

```bash
curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
source ~/.elan/env
```

## Using the WebSocket Editor

### 1. Start the Development Server

```bash
cd project
npm install
npm run dev
```

### 2. Access the WebSocket-Enabled Editor

Open your browser and navigate to:
- **Editor**: http://localhost:3000/editor-ws
- **WebSocket Test**: http://localhost:3000/debug/websocket

### 3. Test the Connection

On the WebSocket test page:
1. Click the "Connect" button
2. You should see "Connected" status with a green indicator
3. Click "Test RPC" to send a test message to the server

### 4. Use the Editor

On the editor page:
1. The WebSocket connection is automatically established
2. Write Lean code in the Monaco editor
3. The Lean server will provide diagnostics and completions
4. View results in the infoview panel on the right

## Environment Variables

You can customize the Lean installation path:

```bash
export LEAN_PATH=/path/to/lean
export LAKE_PATH=/path/to/lake
npm run dev
```

## Production Deployment

For production, consider using process isolation:

```bash
apt-get install bubblewrap

export USE_BUBBLEWRAP=true
npm run build
npm run preview
```

See `lean4docker/bubblewrap.sh` for an example of sandboxed execution.

## Troubleshooting

### WebSocket Connection Fails

1. Check that Nuxt is running: `npm run dev`
2. Verify WebSocket is enabled in `nuxt.config.ts`
3. Check browser console for error messages

### Lean Server Not Starting

1. Verify Lean is installed: `lean --version`
2. Check server logs for error messages
3. Ensure `LEAN_PATH` and `LAKE_PATH` are set correctly

### Session Timeout

If your session times out frequently, adjust the timeout in `server/plugins/cleanup.ts`:

```typescript
cleanupInactiveSessions(60 * 60 * 1000); // 60 minutes instead of 30
```

## API Reference

### WebSocket Endpoint

- **URL**: `ws://localhost:3000/api/lean-server`
- **Protocol**: JSON-RPC 2.0
- **Messages**: See `shared/types/index.ts` for message types

### REST Endpoints

- `GET /api/lean-sessions` - Get active sessions
- `GET /api/health` - Health check

## Code Examples

### Client-Side: Connect to WebSocket

```typescript
const { connect, sendRPCRequest, isConnected } = useLeanWebSocket()

connect()

const response = await sendRPCRequest('initialize', {
  processId: null,
  rootUri: 'file:///project',
  capabilities: {}
})
```

### Server-Side: Access Session Info

```typescript
import { getAllActiveSessions } from '../utils/leanServer'

export default defineEventHandler(async (event) => {
  const sessions = getAllActiveSessions()
  return { sessions, count: sessions.length }
})
```

## Additional Resources

- [Lean 4 Documentation](https://lean-lang.org/lean4/doc/)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [lean4web Reference](https://github.com/leanprover-community/lean4web)
- [Full Documentation](./LEAN_WEBSOCKET.md)
