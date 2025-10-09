import { WebSocketServer } from 'ws'
import * as cp from 'child_process'
import * as rpc from 'vscode-ws-jsonrpc'
import * as jsonrpcserver from 'vscode-ws-jsonrpc/server'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let socketCounter = 0

function logStats() {
  console.log(`[${new Date()}] Number of open sockets - ${socketCounter}`)
}

function startLeanServer(projectPath: string) {
  console.log(`Starting Lean server for project: ${projectPath}`)
  
  const serverProcess = cp.spawn('lake', ['serve', '--'], {
    cwd: projectPath,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  serverProcess.stderr.on('data', (data) => {
    console.error(`Lean Server stderr: ${data}`)
  })

  serverProcess.on('error', (error) => {
    console.error(`Launching Lean Server failed: ${error}`)
  })

  serverProcess.on('close', (code) => {
    console.log(`Lean server exited with code ${code}`)
  })

  return serverProcess
}

function urisToFilenames(prefix: string, obj: any): any {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key === 'uri') {
        obj[key] = obj[key].replace('file://', `file://${prefix}`)
      } else if (key === 'rootUri') {
        obj[key] = obj[key].replace('file://', `file://${prefix}`)
      } else if (key === 'rootPath') {
        obj[key] = path.join(prefix, obj[key])
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        urisToFilenames(prefix, obj[key])
      }
    }
  }
  return obj
}

function filenamesToUri(prefix: string, obj: any): any {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key === 'uri') {
        obj[key] = obj[key].replace(prefix, '')
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        filenamesToUri(prefix, obj[key])
      }
    }
  }
  return obj
}

const PORT = process.env.LEAN_WS_PORT || 3001

const wss = new WebSocketServer({ port: PORT as number })

console.log(`Lean WebSocket server started on port ${PORT}`)

wss.on('connection', (ws) => {
  console.log('WebSocket connection established')
  socketCounter++
  logStats()

  const projectPath = path.resolve(process.cwd(), 'lean-project')
  
  const leanProcess = startLeanServer(projectPath)

  const socket = {
    onMessage: (cb: any) => { ws.on('message', cb) },
    onError: (cb: any) => { ws.on('error', cb) },
    onClose: (cb: any) => { ws.on('close', cb) },
    send: (data: any, cb: any) => { ws.send(data, cb) }
  }

  const reader = new rpc.WebSocketMessageReader(socket)
  const writer = new rpc.WebSocketMessageWriter(socket)
  const socketConnection = jsonrpcserver.createConnection(reader, writer, () => ws.close())
  const serverConnection = jsonrpcserver.createProcessStreamConnection(leanProcess)

  socketConnection.forward(serverConnection, (message) => {
    const prefix = projectPath
    if (message.method !== 'textDocument/definition') {
      urisToFilenames(prefix, message)
    }
    return message
  })

  serverConnection.forward(socketConnection, (message) => {
    const prefix = projectPath
    filenamesToUri(prefix, message)
    return message
  })

  ws.on('close', () => {
    socketCounter--
    console.log('WebSocket connection closed')
    logStats()
    leanProcess.kill()
  })

  socketConnection.onClose(() => {
    serverConnection.dispose()
    leanProcess.kill()
  })
  serverConnection.onClose(() => {
    socketConnection.dispose()
    leanProcess.kill()
  })
})

process.on('SIGINT', () => {
  console.log('Shutting down Lean WebSocket server...')
  wss.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('Shutting down Lean WebSocket server...')
  wss.close()
  process.exit(0)
})
