# NextLean

NextLean is a modern web application that integrates a Lean 4 editor with an intelligent LLM agent. It is designed to assist users in writing, understanding, and generating mathematical proofs using the Lean theorem prover.

## Description

NextLean bridges the gap between formal theorem proving and artificial intelligence. It provides a robust web-based editor for Lean 4, coupled with an AI assistant that can help with:

- Writing and editing Lean code.
- Explaining mathematical concepts and Lean syntax.
- Generating formal proofs based on natural language descriptions.
- Diagnosing errors and suggesting fixes.

## Installation and Build

### Prerequisites

- **Node.js**: Version 22 or higher.
- **pnpm**: Package manager.
- **Lean 4**: You need `elan` (the Lean version manager) installed and available in your path.

### Setup

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    pnpm install
    ```

3.  Initialize the Lean project (if not already done):
    The application expects a Lean project structure in `project/lean_project`. The server will attempt to spawn `lake` from this directory.

### Build

To build the application for production:

```bash
pnpm build
```

## Running

### Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Production Preview

To preview the production build locally:

```bash
pnpm preview
```

## Features & Tools

- **Lean Editor**: A fully functional code editor based on Monaco Editor, configured for Lean 4 syntax highlighting and interaction.
- **AI Assistant**: An integrated chat panel powered by LLMs (via OpenRouter/LangChain) that understands the context of your editor.
  - **Context Awareness**: The AI can read the current editor content and diagnostics.
  - **Active Editing**: The AI can directly modify the code in the editor to implement fixes or suggestions.
  - **Proof Library**: Access to a library of saved proofs and examples.
- **Lean Server Integration**:
  - Runs a real Lean language server backend (`lake serve`).
  - Provides real-time diagnostics (errors, warnings).
  - Supports `Mathlib` and other dependencies.
- **Proof Management**: Save, load, and organize your proofs.

## Development

### Project Structure

The project follows the Nuxt 4 directory structure:

- `app/`: Client-side application code.
  - `components/`: Vue components (e.g., `AssistantChatPanel`, editor components).
  - `pages/`: Application routes (`editor`, `chat`, `proofs`).
  - `composables/`: Shared state and logic (e.g., `useLeanServer`, `useProofs`).
- `server/`: Server-side logic.
  - `api/`: API endpoints and WebSocket handler (`ws.ts`) for the Lean server.
  - `utils/`: Server utilities, including the `LeanServerManager` and LangChain tools.
- `shared/`: Code shared between client and server (types, constants).
- `project/lean_project/`: The contained Lean 4 project environment.

### Technologies

- **Frontend**: Nuxt 4, Vue 3, Nuxt UI v4, Tailwind CSS.
- **Editor**: Monaco Editor.
- **Backend**: Nitro (Nuxt server), Node.js.
- **Lean Integration**: Custom WebSocket bridge to `lake serve` (Lean Language Server).
- **AI/LLM**: LangChain, OpenRouter.
- **Database**: SQLite (via `better-sqlite3`) for storing proofs.

### Lean Environment

The application runs a local instance of the Lean server. It is configured to work with `Mathlib`.

- **Lakefile**: Located at `project/lean_project/lakefile.lean`.
- **Mathlib**: The project is set up to require `mathlib` from git.
