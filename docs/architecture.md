# NextLean Architecture Documentation

This document describes the architecture of NextLean, a web application that integrates a Lean 4 editor with an intelligent LLM agent for writing and generating mathematical proofs.

## Overview

NextLean is built with a modern full-stack architecture using Nuxt 4 as the foundation. The application consists of three main layers:

1. **Client Layer** - Vue 3 components with Monaco Editor integration
2. **Server Layer** - Nitro server handling API requests and WebSocket connections
3. **External Services** - Lean Language Server and LLM providers

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Monaco    │  │   Chat      │  │    Proof Library        │  │
│  │   Editor    │  │   Panel     │  │    Management           │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│  ┌──────▼────────────────▼─────────────────────▼─────────────┐  │
│  │                    Composables                            │  │
│  │  useLeanServer │ useChat │ useProofs │ useEditorState     │  │
│  └──────┬────────────────┬─────────────────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          │ WebSocket      │ HTTP                │ HTTP
          │                │                     │
┌─────────▼────────────────▼─────────────────────▼────────────────┐
│                         Server Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   WS /ws    │  │  POST /chat │  │   /api/proofs/*         │  │
│  │   Handler   │  │   Endpoint  │  │   Endpoints             │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌───────────▼─────────────┐  │
│  │    Lean     │  │  LangChain  │  │    ProofsService        │  │
│  │   Server    │  │   Tools     │  │    (SQLite)             │  │
│  │   Manager   │  │             │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘  │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
          │                │
┌─────────▼────────┐  ┌────▼───────────────────────────────────┐
│   Lean Server    │  │            OpenRouter API              │
│   (lake serve)   │  │           (LLM Provider)               │
└──────────────────┘  └────────────────────────────────────────┘
```

---

## Directory Structure

The project follows the Nuxt 4 directory convention:

```
nextlean/
├── app/                    # Client-side application
│   ├── components/         # Vue components
│   │   ├── assistant/      # AI chat components
│   │   └── editor/         # Editor-related components
│   ├── composables/        # Shared state and logic
│   ├── layouts/            # Page layouts
│   ├── pages/              # Application routes
│   └── assets/             # CSS and static assets
├── server/                 # Server-side code
│   ├── api/                # API endpoints
│   │   ├── proofs/         # Proofs CRUD endpoints
│   │   ├── chat.post.ts    # AI chat endpoint
│   │   └── ws.ts           # WebSocket handler
│   ├── services/           # Business logic services
│   ├── schemas/            # Zod validation schemas
│   └── utils/              # Server utilities
├── shared/                 # Shared client/server code
│   ├── types/              # TypeScript types
│   ├── constants/          # Shared constants
│   └── utils/              # Shared utilities
└── lean_project/           # Lean 4 project environment
```

---

## Component Architecture

### Client Components

#### Monaco Editor (`app/components/editor/MonacoEditor.vue`)

The main code editor component built on Monaco Editor. It provides:

- Lean 4 syntax highlighting
- Integration with the Lean Language Server via WebSocket
- Real-time diagnostics display
- Hover information and completions

#### Infoview Panel (`app/components/editor/InfoviewPanel.vue`)

Displays Lean-specific information:

- Current goal state
- Type information
- Tactic suggestions

#### Assistant Chat Panel (`app/components/assistant/AssistantChatPanel.vue`)

The AI assistant interface:

- Chat message display with markdown rendering
- Context-aware responses based on editor content
- Tool execution feedback (proof lookups, editor modifications)

#### Proof Library Slideover (`app/components/editor/ProofLibrarySlideover.vue`)

Manages saved proofs:

- List and search proofs
- Load proofs into editor
- Save current editor content

### Composables

#### `useLeanServer`

Manages the WebSocket connection to the Lean Language Server:

- Connection lifecycle management
- LSP message routing
- Server status tracking

```typescript
const { connect, disconnect, sendRequest, sendNotification, status } =
  useLeanServer();
```

#### `useLeanLsp`

Higher-level LSP operations:

- Document synchronization
- Hover requests
- Diagnostics handling

#### `useEditorState`

Manages the editor state:

- Current content
- Cursor position
- Diagnostics

```typescript
const { content, diagnostics, updateContent, cursorPosition } =
  useEditorState();
```

#### `useChat`

Handles AI assistant interactions:

- Message history
- Streaming responses
- Tool call handling

```typescript
const { messages, sendMessage, isLoading, error } = useChat();
```

#### `useProofs`

Manages the proof library:

- CRUD operations
- Filtering and search

```typescript
const { proofs, fetchProofs, createProof, updateProof, deleteProof } =
  useProofs();
```

---

## Server Architecture

### API Endpoints

| Endpoint          | Method | Description                   |
| ----------------- | ------ | ----------------------------- |
| `/api/proofs`     | GET    | List all proofs               |
| `/api/proofs`     | POST   | Create a new proof            |
| `/api/proofs/:id` | GET    | Get proof by ID               |
| `/api/proofs/:id` | PUT    | Update a proof                |
| `/api/proofs/:id` | DELETE | Delete a proof                |
| `/api/chat`       | POST   | Chat with AI assistant        |
| `/api/ws`         | WS     | Lean LSP WebSocket connection |

### Services

#### ProofsService

Handles all proof-related business logic:

- Database operations via better-sqlite3
- Input validation with Zod schemas
- Tag normalization

### Lean Server Manager

Manages Lean language server instances:

- Spawns `lake serve` process
- Routes JSON-RPC messages
- Handles process lifecycle

### LangChain Integration

The AI chat endpoint uses LangChain with custom tools:

| Tool              | Description                         |
| ----------------- | ----------------------------------- |
| `list_proofs`     | Query the proof library             |
| `get_proof`       | Retrieve full proof content         |
| `read_editor`     | Read current editor content         |
| `edit_editor`     | Modify editor content (client-side) |
| `add_dependency`  | Add Lean dependencies               |
| `get_diagnostics` | Get current LSP diagnostics         |

---

## Data Flow

### Editor to Lean Server

```
User types → Monaco Editor → useLeanLsp → WebSocket → ws.ts → LeanServerManager → lake serve
                                                          ↓
User sees ← Monaco Editor ← useLeanLsp ← WebSocket ← ws.ts ← LeanServerManager ← lake serve
```

### AI Chat Flow

```
User message → useChat → POST /api/chat → LangChain → OpenRouter API
                                              ↓
                                         Tool calls
                                              ↓
                                    (list_proofs, read_editor, etc.)
                                              ↓
User sees ← useChat ← POST /api/chat ← LangChain response with tool results
```

### Proof Management

```
User action → useProofs → REST API → ProofsService → SQLite Database
                                          ↓
UI updates ← useProofs ← REST API ← ProofsService ← SQLite Database
```

---

## Database

NextLean uses SQLite (via better-sqlite3) for persistent storage.

### Schema

```sql
CREATE TABLE proofs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### Validation

Zod schemas are used for runtime validation:

- `ProofRowSchema` - Database row validation
- `CreateProofRequest` - Creation input validation
- `UpdateProofRequest` - Update input validation

---

## Lean Integration

### Project Structure

The `lean_project/` directory contains a complete Lean 4 project:

- `lakefile.lean` - Project configuration
- `lean-toolchain` - Lean version specification
- `Nextlean/` - Source files

### Language Server

The application spawns `lake serve` for each WebSocket connection:

- Maximum 5 concurrent sessions
- 30-minute session timeout
- Automatic cleanup of stale sessions

### Mathlib Support

The Lean project is configured to use Mathlib:

```lean
require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git"
```

---

## Security Considerations

### Rate Limiting

The chat endpoint implements IP-based rate limiting to prevent abuse.

### Session Management

WebSocket sessions are:

- Limited to 5 concurrent connections
- Automatically expired after 30 minutes of inactivity
- Properly cleaned up on disconnect

### Input Validation

All API inputs are validated:

- Request body validation with Zod
- Path parameter validation
- Sanitization of user content

---

## Technology Stack

### Frontend

- **Nuxt 4** - Full-stack Vue framework
- **Vue 3** - Reactive UI framework
- **Nuxt UI v4** - Component library
- **Monaco Editor** - Code editor
- **Tailwind CSS** - Styling

### Backend

- **Nitro** - Server engine
- **better-sqlite3** - SQLite database
- **LangChain** - AI orchestration
- **crossws** - WebSocket handling

### External Services

- **OpenRouter** - LLM API provider
- **Lean 4 / lake** - Theorem prover

---

## Deployment Considerations

### Environment Variables

| Variable             | Description                        |
| -------------------- | ---------------------------------- |
| `OPENROUTER_API_KEY` | API key for OpenRouter LLM service |

### Requirements

- Node.js 22+
- Lean 4 (via elan)
- Sufficient memory for Mathlib compilation

### Build Process

```bash
pnpm build
cp -r lean_project .output/
```

The Lean project must be copied to the output directory for production deployment.
