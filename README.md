# NextLean

NextLean is a modern web application that integrates a Lean 4 editor with an intelligent LLM agent. It assists users in writing, understanding, and generating mathematical proofs using the Lean theorem prover.

## Features

- **Lean Editor**: Monaco-based code editor with Lean 4 syntax highlighting and real-time diagnostics
- **AI Assistant**: LLM-powered chat that understands your code, suggests fixes, and generates proofs
- **Proof Library**: Save, organize, and reuse your mathematical proofs
- **Mathlib Support**: Full integration with the Mathlib library

---

## Quick Start (Docker)

The easiest way to run NextLean is with Docker.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An [OpenRouter](https://openrouter.ai/) API key

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/josselinonduty/nextlean-editor.git
   cd nextlean-editor
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your OpenRouter API key:

   ```
   NUXT_OPEN_ROUTER_API_KEY="your-openrouter-api-key-here"
   ```

3. **Start the application**

   ```bash
   docker compose up -d
   ```

4. **Initialize the Lean project**

   The first time you run the application, you need to build the Lean project:

   ```bash
   docker compose exec app sh -c "cd lean_project && lake update && lake build"
   ```

   > [!NOTE]
   > You may encounter permission issues when running the above command.
   >
   > To run the command as yourself (not recommended), use:
   >
   > ```bash
   > UID=$(id -u) GID=$(id -g) docker compose up -d
   > ```
   >
   > For a quick and dirty fix, you can also run on host:
   >
   > ```bash
   > chmod -R 777 lean_project
   > ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Stopping the Application

```bash
docker compose down
```

### Viewing Logs

```bash
docker compose logs -f
```

---

## Advanced Setup (Source Build)

For development or when you need more control over the environment.

### Prerequisites

- **Node.js**: Version 22 or higher
- **pnpm**: Package manager (`corepack enable` to use)
- **elan**: Lean version manager ([installation guide](https://leanprover.github.io/lean4/doc/setup.html))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/josselinonduty/nextlean-editor.git
   cd nextlean-editor
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your OpenRouter API key:

   ```
   NUXT_OPEN_ROUTER_API_KEY="your-openrouter-api-key-here"
   ```

4. **Build the Lean project** (first time only, may take a while)

   ```bash
   cd lean_project
   lake build
   cd ..
   ```

### Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
pnpm build
```

To run the production build:

```bash
cp -r lean_project .output/
pnpm preview
```

---

## Environment Variables

| Variable                   | Required | Description                                  |
| -------------------------- | -------- | -------------------------------------------- |
| `NUXT_OPEN_ROUTER_API_KEY` | Yes      | Your OpenRouter API key for the AI assistant |

---

## Project Structure

```
nextlean/
├── app/                    # Client-side application
│   ├── components/         # Vue components
│   ├── composables/        # Shared state and logic
│   ├── layouts/            # Page layouts
│   └── pages/              # Application routes
├── server/                 # Server-side code
│   ├── api/                # REST API and WebSocket endpoints
│   ├── services/           # Business logic
│   └── utils/              # Server utilities
├── shared/                 # Shared client/server code
├── lean_project/           # Lean 4 project environment
└── docs/                   # Documentation
```

---

## Testing

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:coverage

# End-to-end tests
pnpm test:e2e
```

---

## Documentation

- [API Documentation](docs/api.md) - REST API and WebSocket protocol reference
- [Architecture](docs/architecture.md) - System design and component overview
- [Contributing](CONTRIBUTING.md) - Guidelines for contributors

---

## Technologies

| Layer    | Technologies                            |
| -------- | --------------------------------------- |
| Frontend | Nuxt 4, Vue 3, Nuxt UI v4, Tailwind CSS |
| Editor   | Monaco Editor                           |
| Backend  | Nitro, Node.js, SQLite                  |
| AI/LLM   | LangChain, OpenRouter                   |
| Lean     | Lean 4, Lake, Mathlib                   |

---

## License

See [LICENSE](LICENSE) for details.
