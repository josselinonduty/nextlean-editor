# NextLean

## Description

NextLean is an app (user interface) that integrates a Lean (v4) editor and a LLM agent to assist users in writing and generating mathematical proofs using Lean.

## Functionalities

- **Lean Editor Integration**: Provides a seamless interface for writing and editing Lean code.
- **LLM Assistance**: Leverages a large language model to offer suggestions, explanations, and code snippets.
- **Proof Generation**: Assists users in generating formal proofs in Lean based on natural language input.
- **Real-time Collaboration**: Enables multiple users to collaborate on Lean projects in real-time.
- **Interactive Tutorials**: Offers guided tutorials for learning Lean and formal proof techniques.

## Technologies

- TypeScript
- Nuxt
- NuxtUI Pro v4
- Lean v4
- Python (if needed)

## Constraints

Everything must be written in project/ directory.
Follow Nuxt v4 guidelines:

- app/ directory for client-side stuff (pages, components, composables, layouts, middleware, plugins, etc.)
- server/ directory for server-side stuff (API routes, server middleware, etc.)
- shared/ directory for code shared between client and server (e.g., types, utils, constants, etc.)

Use `tabler:$icon` for icons.

Never add comments UNLESS I explicitly ask for it.

Always put `<script setup lang="ts">` at the top of the file, even before `<template>`, and even if there is no script code.
