# Paatam Backend

This repository contains the backend service for the Paatam application.

## Package Breakdown & Roles

### 🚀 Production Dependencies (`npm install <package>`)
- **express**: The core routing and HTTP application framework.
- **@prisma/client**: Auto-generated, query-safe database client mapped directly to your database schema.
- **zod**: The schema-first object parser to runtime-validate payloads and incoming network strings.
- **pino**: The fastest asynchronous, structured-JSON logger for modern Node.js backends.
- **pino-http**: The dedicated Express middleware tool to automatically serialize HTTP request lifecycles without blocking the loop.

### 🛠️ Development Tools (`npm install --save-dev <package>`)
- **typescript & @types/...**: Type compilers and structural definition packages for node and express endpoints.
- **prisma**: The migration engine and CLI binary tool to shape your tables.
- **eslint & prettier**: Static code quality checks, styling consistency setups, and code-formatting engines.
- **eslint-config-prettier**: Turns off all ESLint style rules that might conflict with your Prettier specifications.
- **vitest**: A modern, blindingly fast TypeScript-first alternative to Jest. (It respects `tsconfig.json` paths instantly without requiring heavy setups like `ts-jest`).
- **supertest & @types/supertest**: An HTTP client agent assertion library used to easily mock network requests across your Express apps during test passes.
- **tsx**: A TypeScript execute tool used to run local `.ts` source code straight from the terminal instantly during local hot-reloaded development sessions.
