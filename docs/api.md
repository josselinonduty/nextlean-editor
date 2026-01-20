# NextLean API Documentation

This document describes all REST API endpoints and the WebSocket protocol for the NextLean application.

## Base URL

All API endpoints are relative to the base URL of the application (e.g., `http://localhost:3000` in development).

---

## Authentication

Currently, the API does not require authentication. Rate limiting is applied based on client IP address.

---

## REST API Endpoints

### Proofs

#### List All Proofs

Retrieve all saved proofs from the library.

**Endpoint:** `GET /api/proofs`

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Addition is commutative",
    "content": "theorem add_comm (a b : Nat) : a + b = b + a := by\n  omega",
    "tags": ["arithmetic", "basic"],
    "createdAt": 1737331200000,
    "updatedAt": 1737331200000
  }
]
```

**Status Codes:**

| Code | Description                    |
| ---- | ------------------------------ |
| 200  | Success                        |
| 500  | Database error or invalid data |

---

#### Get Proof by ID

Retrieve a specific proof by its unique identifier.

**Endpoint:** `GET /api/proofs/:id`

**Parameters:**

| Name | Type   | Location | Description                   |
| ---- | ------ | -------- | ----------------------------- |
| id   | string | path     | UUID of the proof to retrieve |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Addition is commutative",
  "content": "theorem add_comm (a b : Nat) : a + b = b + a := by\n  omega",
  "tags": ["arithmetic", "basic"],
  "createdAt": 1737331200000,
  "updatedAt": 1737331200000
}
```

**Status Codes:**

| Code | Description     |
| ---- | --------------- |
| 200  | Success         |
| 400  | ID is required  |
| 404  | Proof not found |

---

#### Create Proof

Create a new proof in the library.

**Endpoint:** `POST /api/proofs`

**Request Body:**

```json
{
  "title": "Addition is commutative",
  "content": "theorem add_comm (a b : Nat) : a + b = b + a := by\n  omega",
  "tags": ["arithmetic", "basic"]
}
```

| Field   | Type     | Required | Description             |
| ------- | -------- | -------- | ----------------------- |
| title   | string   | Yes      | Title of the proof      |
| content | string   | Yes      | Lean code content       |
| tags    | string[] | No       | Tags for categorization |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Addition is commutative",
  "content": "theorem add_comm (a b : Nat) : a + b = b + a := by\n  omega",
  "tags": ["arithmetic", "basic"],
  "createdAt": 1737331200000,
  "updatedAt": 1737331200000
}
```

**Status Codes:**

| Code | Description            |
| ---- | ---------------------- |
| 200  | Proof created          |
| 400  | Validation error       |
| 500  | Failed to create proof |

---

#### Update Proof

Update an existing proof.

**Endpoint:** `PUT /api/proofs/:id`

**Parameters:**

| Name | Type   | Location | Description                 |
| ---- | ------ | -------- | --------------------------- |
| id   | string | path     | UUID of the proof to update |

**Request Body:**

```json
{
  "title": "Updated title",
  "content": "Updated content",
  "tags": ["updated", "tags"]
}
```

| Field   | Type     | Required | Description                 |
| ------- | -------- | -------- | --------------------------- |
| title   | string   | No       | New title (if updating)     |
| content | string   | No       | New Lean code (if updating) |
| tags    | string[] | No       | New tags (if updating)      |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated title",
  "content": "Updated content",
  "tags": ["updated", "tags"],
  "createdAt": 1737331200000,
  "updatedAt": 1737417600000
}
```

**Status Codes:**

| Code | Description            |
| ---- | ---------------------- |
| 200  | Proof updated          |
| 400  | ID is required         |
| 404  | Proof not found        |
| 500  | Failed to update proof |

---

#### Delete Proof

Delete a proof from the library.

**Endpoint:** `DELETE /api/proofs/:id`

**Parameters:**

| Name | Type   | Location | Description                 |
| ---- | ------ | -------- | --------------------------- |
| id   | string | path     | UUID of the proof to delete |

**Response:**

```json
{
  "success": true
}
```

**Status Codes:**

| Code | Description     |
| ---- | --------------- |
| 200  | Proof deleted   |
| 400  | ID is required  |
| 404  | Proof not found |

---

### Chat

#### Chat with AI Assistant

Send messages to the AI assistant and receive responses.

**Endpoint:** `POST /api/chat`

**Request Body:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain how to prove that addition is commutative"
    }
  ],
  "editorContent": "theorem add_comm (a b : Nat) : a + b = b + a := by\n  sorry",
  "diagnostics": [
    {
      "range": {
        "start": { "line": 1, "character": 2 },
        "end": { "line": 1, "character": 7 }
      },
      "severity": 1,
      "message": "unsolved goals\n⊢ a + b = b + a"
    }
  ]
}
```

| Field         | Type         | Required | Description                                  |
| ------------- | ------------ | -------- | -------------------------------------------- |
| messages      | Message[]    | Yes      | Array of chat messages                       |
| editorContent | string       | No       | Current content of the Lean editor           |
| diagnostics   | Diagnostic[] | No       | Current LSP diagnostics from the Lean server |

**Message Object:**

| Field   | Type   | Description                           |
| ------- | ------ | ------------------------------------- |
| role    | string | One of: "user", "assistant", "system" |
| content | string | The message text                      |

**Response:**

Returns the AI assistant's response as a string.

**Status Codes:**

| Code | Description                        |
| ---- | ---------------------------------- |
| 200  | Success                            |
| 400  | Invalid message payload            |
| 429  | Rate limit exceeded                |
| 500  | API key not configured or AI error |

**Rate Limiting:**

- Rate limits are enforced per IP address
- When rate limited, a `Retry-After` header is included with the number of seconds to wait

**AI Tools:**

The AI assistant has access to the following tools:

| Tool              | Description                                       |
| ----------------- | ------------------------------------------------- |
| `list_proofs`     | List proofs from the library, optionally filtered |
| `get_proof`       | Get the full content of a specific proof          |
| `read_editor`     | Read the current editor content                   |
| `edit_editor`     | Edit the editor content (applied client-side)     |
| `add_dependency`  | Add a Lean dependency to the lakefile             |
| `get_diagnostics` | Get the current LSP diagnostics                   |

---

## WebSocket Protocol

The WebSocket endpoint provides a bridge to the Lean Language Server Protocol (LSP).

### Connection

**Endpoint:** `WS /api/ws`

Upon successful connection, the server will:

1. Start a new Lean server session for the client
2. Send a `$/serverReady` notification when ready

### Session Limits

- Maximum concurrent sessions: 5
- Session timeout: 30 minutes of inactivity
- If the server is at capacity, connections are rejected with code 1013

### Message Format

All messages follow the JSON-RPC 2.0 specification.

#### Request Message

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/hover",
  "params": {
    "textDocument": { "uri": "file:///path/to/file.lean" },
    "position": { "line": 10, "character": 5 }
  }
}
```

#### Response Message

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "contents": { "kind": "markdown", "value": "Type information here" }
  }
}
```

#### Notification Message

```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/didOpen",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.lean",
      "languageId": "lean4",
      "version": 1,
      "text": "-- Lean code here"
    }
  }
}
```

### Server Notifications

The server sends the following custom notifications:

#### `$/serverReady`

Sent when the Lean server has successfully initialized.

```json
{
  "jsonrpc": "2.0",
  "method": "$/serverReady",
  "params": {
    "rootUri": "file:///path/to/lean_project"
  }
}
```

#### `$/serverError`

Sent when a server error occurs.

```json
{
  "jsonrpc": "2.0",
  "method": "$/serverError",
  "params": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Supported LSP Methods

The WebSocket bridge supports all standard LSP methods, including:

| Method                        | Description                       |
| ----------------------------- | --------------------------------- |
| `initialize`                  | Initialize the language server    |
| `textDocument/didOpen`        | Notify that a document was opened |
| `textDocument/didChange`      | Notify that a document changed    |
| `textDocument/didClose`       | Notify that a document was closed |
| `textDocument/hover`          | Get hover information             |
| `textDocument/completion`     | Get completion suggestions        |
| `textDocument/definition`     | Go to definition                  |
| `textDocument/references`     | Find all references               |
| `textDocument/documentSymbol` | Get document symbols              |
| `textDocument/diagnostic`     | Get diagnostics                   |

### Error Handling

WebSocket errors are returned as JSON-RPC error responses:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32603,
    "message": "Internal error description"
  }
}
```

**Error Codes:**

| Code   | Description      |
| ------ | ---------------- |
| -32700 | Parse error      |
| -32600 | Invalid request  |
| -32601 | Method not found |
| -32602 | Invalid params   |
| -32603 | Internal error   |

### Connection Close Codes

| Code | Description                  |
| ---- | ---------------------------- |
| 1011 | Server initialization failed |
| 1013 | Maximum sessions reached     |

---

## Data Types

### SavedProof

```typescript
interface SavedProof {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
```

### CreateProofRequest

```typescript
interface CreateProofRequest {
  title: string;
  content: string;
  tags?: string[];
}
```

### UpdateProofRequest

```typescript
interface UpdateProofRequest {
  title?: string;
  content?: string;
  tags?: string[];
}
```

### Diagnostic (LSP)

```typescript
interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number;
  message: string;
  source?: string;
}
```

---

## Error Response Format

All API errors follow this format:

```json
{
  "statusCode": 404,
  "statusMessage": "Proof not found"
}
```

| Field         | Type   | Description            |
| ------------- | ------ | ---------------------- |
| statusCode    | number | HTTP status code       |
| statusMessage | string | Human-readable message |
