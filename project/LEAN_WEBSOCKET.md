# Lean Language Server WebSocket Integration

This implementation provides a WebSocket-based connection to the Lean 4 language server, allowing each user session to have its own isolated Lean server process on the host machine.

## Architecture

### Server-Side Components

1. **WebSocket Handler** (`server/api/lean-server.ws.ts`)
   - Handles WebSocket connections from clients
   - Creates and manages per-session Lean server processes
   - Forwards JSON-RPC messages between client and Lean server

2. **Session Management** (`server/utils/leanServer.ts`)
   - Creates unique session IDs for each connection
   - Spawns Lean server processes (`lake serve` or `lean --server`)
   - Tracks active sessions and their activity
   - Provides cleanup for inactive sessions

3. **Cleanup Plugin** (`server/plugins/cleanup.ts`)
   - Automatically cleans up inactive sessions (default: 30 minutes)
   - Runs every 5 minutes to check for stale sessions

4. **Session API** (`server/api/lean-sessions.get.ts`)
   - REST endpoint to query active sessions
   - Returns session count and details

### Client-Side Components

1. **WebSocket Composable** (`app/composables/useLeanWebSocket.ts`)
   - Manages WebSocket connection lifecycle
   - Handles JSON-RPC request/response pairs
   - Provides connection status and error handling

2. **Lean Editor Composable** (`app/composables/useLeanEditor.ts`)
   - Integrates Monaco Editor with WebSocket connection
   - Initializes Lean language server via JSON-RPC
   - Supports both WebSocket and simple (non-connected) modes

3. **Editor Pages**
   - `app/pages/editor-ws.vue` - WebSocket-enabled editor
   - `app/pages/debug/websocket.vue` - WebSocket connection test page

## Usage

### Basic WebSocket Connection

```typescript
const { connect, disconnect, sendRPCRequest, isConnected, sessionId, error } = useLeanWebSocket()

connect()

await sendRPCRequest('initialize', {
  processId: null,
  rootUri: 'file:///project',
  capabilities: {}
})
```

### Using the Lean Editor with WebSocket

```typescript
const { 
  editorInstance, 
  isLoading, 
  initializeEditor,
  isConnected 
} = useLeanEditor()

await initializeEditor(
  editorContainer,
  infoviewContainer,
  '/project/main.lean',
  'def hello := "world"',
  true  // enable WebSocket
)
```

## Configuration

### Environment Variables

- `LEAN_PATH` - Path to lean executable (default: `lean`)
- `LAKE_PATH` - Path to lake executable (default: `lake`)

### Session Timeouts

Default timeout for inactive sessions is 30 minutes. This can be adjusted in `server/plugins/cleanup.ts`.

## Security Considerations

The current implementation spawns Lean server processes directly on the host. For production use, consider:

1. **Process Isolation**: Use bubblewrap or similar sandboxing (see `lean4docker/bubblewrap.sh`)
2. **Resource Limits**: Set CPU and memory limits using cgroups
3. **Network Isolation**: Run Lean servers in network namespaces
4. **File System Restrictions**: Use read-only mounts for system files

### Example with Bubblewrap

See `lean4docker/bubblewrap.sh` for an example of running Lean server with:
- Read-only bind mounts
- Temporary filesystem
- Process isolation
- Network isolation
- Resource limits

## Testing

Visit `/debug/websocket` to test the WebSocket connection without the full editor.

## API Endpoints

- `WS /api/lean-server` - WebSocket endpoint for Lean server communication
- `GET /api/lean-sessions` - Get active session information
- `GET /api/health` - Health check endpoint

## Message Protocol

### Session Messages

```json
{
  "type": "session",
  "data": {
    "sessionId": "uuid",
    "status": "connected"
  }
}
```

### RPC Messages

```json
{
  "type": "rpc",
  "data": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "textDocument/didOpen",
    "params": {...}
  }
}
```

### Error Messages

```json
{
  "type": "error",
  "data": {
    "message": "Error description"
  }
}
```

## Troubleshooting

### Lean Server Not Starting

1. Check if `lean` or `lake` is installed and in PATH
2. Verify environment variables are set correctly
3. Check server logs for error messages

### WebSocket Connection Failed

1. Ensure `nitro.experimental.websocket` is enabled in `nuxt.config.ts`
2. Check that the WebSocket URL uses correct protocol (`ws://` or `wss://`)
3. Verify no firewall or proxy is blocking WebSocket connections

### Session Cleanup Too Aggressive

Adjust timeout in `server/plugins/cleanup.ts`:

```typescript
cleanupInactiveSessions(60 * 60 * 1000); // 60 minutes
```
