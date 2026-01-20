# Contributing to NextLean

Thank you for your interest in contributing to NextLean! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 22 or higher
- **pnpm**: Package manager (install with `npm install -g pnpm`)
- **elan**: Lean version manager (see [Lean installation guide](https://leanprover.github.io/lean4/doc/setup.html))

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/nextlean-editor.git
   cd nextlean-editor
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenRouter API key:

   ```
   NUXT_OPENROUTER_API_KEY=your_api_key_here
   ```

4. **Build the Lean project**

   ```bash
   cd lean_project
   lake build
   cd ..
   ```

   Note: Building Mathlib may take significant time on first run.

5. **Start the development server**

   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000`.

---

## Coding Standards

### General Guidelines

- Write clear, self-documenting code
- Avoid unnecessary comments - code should be readable on its own
- Follow existing patterns in the codebase
- Keep functions small and focused

### TypeScript

- Use strict TypeScript throughout
- Define explicit types for function parameters and return values
- Use interfaces for object shapes
- Prefer `type` for unions and simple aliases

```typescript
interface SavedProof {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

type ProofStatus = "draft" | "verified" | "published";
```

### Vue Components

- Place `<script setup lang="ts">` at the top of the file, before `<template>`
- Use `defineProps` and `defineEmits` with TypeScript types
- Follow the Composition API pattern

```vue
<script setup lang="ts">
interface Props {
  title: string;
  isActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
});

const emit = defineEmits<{
  close: [];
  save: [content: string];
}>();
</script>

<template>
  <div>
    <!-- Component template -->
  </div>
</template>
```

### Nuxt Conventions

Follow Nuxt 4 directory structure:

- `app/` - Client-side code (pages, components, composables, layouts)
- `server/` - Server-side code (API routes, services, utilities)
- `shared/` - Code shared between client and server (types, utils, constants)

### Icons

Use Tabler icons with the `tabler:` prefix:

```vue
<UIcon name="tabler:check" />
```

---

## Testing

### Running Tests

```bash
# Run unit tests
pnpm test

# Run unit tests with UI
pnpm test:ui

# Run unit tests with coverage
pnpm test:coverage

# Run end-to-end tests
pnpm test:e2e

# Run e2e tests in headed mode
pnpm test:e2e:headed
```

### Writing Tests

#### Unit Tests

Unit tests are located in `tests/unit/` and use Vitest:

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("MyFunction", () => {
  beforeEach(() => {
    // Setup code
  });

  it("should do something", () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

#### API Tests

API tests are in `tests/api/`:

```typescript
import { describe, it, expect } from "vitest";

describe("GET /api/proofs", () => {
  it("returns a list of proofs", async () => {
    const response = await $fetch("/api/proofs");
    expect(Array.isArray(response)).toBe(true);
  });
});
```

#### E2E Tests

End-to-end tests use Playwright and are in `tests/e2e/`:

```typescript
import { test, expect } from "@playwright/test";

test("editor loads correctly", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.locator(".monaco-editor")).toBeVisible();
});
```

### Test Coverage

Aim for good test coverage, especially for:

- Business logic in services
- API endpoint handlers
- Composable state management
- Critical user flows

---

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**

   ```bash
   pnpm test:run
   pnpm test:e2e
   ```

2. **Check for type errors**

   ```bash
   pnpm nuxt typecheck
   ```

3. **Verify the build succeeds**

   ```bash
   pnpm build
   ```

### Creating a Pull Request

1. Create a feature branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes with clear, descriptive commits

3. Push your branch and open a pull request

4. Fill out the PR template with:
   - Description of changes
   - Related issue(s)
   - Testing performed
   - Screenshots (if UI changes)

### PR Title Convention

Use conventional commit format for PR titles:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add tests`
- `chore: maintenance tasks`

### Review Process

- PRs require at least one approval before merging
- Address all review comments
- Keep the PR focused on a single concern
- Rebase and squash commits if needed

---

## Issue Guidelines

### Reporting Bugs

When reporting a bug, include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Node.js version, browser
6. **Screenshots/Logs**: If applicable

### Feature Requests

For feature requests, include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: Your suggested approach
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Any relevant information

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation updates
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority:high` - Critical issues
- `priority:medium` - Important issues
- `priority:low` - Nice-to-have improvements

---

## Project Structure Reference

```
nextlean/
├── app/
│   ├── components/
│   │   ├── assistant/      # AI chat components
│   │   └── editor/         # Editor components
│   ├── composables/        # Vue composables
│   ├── layouts/            # Page layouts
│   ├── pages/              # Route pages
│   └── assets/css/         # Stylesheets
├── server/
│   ├── api/                # API endpoints
│   │   ├── proofs/         # Proofs CRUD
│   │   ├── chat.post.ts    # AI chat
│   │   └── ws.ts           # WebSocket
│   ├── services/           # Business logic
│   ├── schemas/            # Zod schemas
│   └── utils/              # Server utilities
├── shared/
│   ├── types/              # TypeScript types
│   ├── constants/          # Shared constants
│   └── utils/              # Shared utilities
├── lean_project/           # Lean 4 project
├── tests/
│   ├── api/                # API tests
│   ├── e2e/                # E2E tests
│   └── unit/               # Unit tests
└── docs/                   # Documentation
```

---

## Getting Help

If you have questions or need help:

1. Check the existing documentation in `/docs`
2. Search existing issues for similar questions
3. Open a new issue with the `question` label

---

## License

By contributing to NextLean, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to NextLean!
