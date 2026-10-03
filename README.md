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

## Project Structure

This project follows a standard layered architecture for Express applications, separating concerns into specific folders to maintain clean code and scalability.

```text
paatam_backend/
├── prisma/               # Database schemas and migrations
│   └── schema.prisma     # Defines the database models using Prisma ORM
├── src/                  # Application source code
│   ├── config/           # Configuration files
│   │                     # - Sets up third-party services (e.g., logger.ts for Pino)
│   │                     # - Instantiates and configures the Prisma database client (prisma.ts)
│   ├── controllers/      # HTTP request handlers
│   │                     # - Extracts data from the Request object (params, body, query)
│   │                     # - Calls the corresponding Service to handle business logic
│   │                     # - Sends back the HTTP Response (status code and JSON payload)
│   ├── exceptions/       # Custom application error classes
│   │                     # - Defines structured errors (e.g., AppError) with status codes
│   │                     # - Allows throwing specific errors from anywhere in the app
│   ├── middlewares/      # Express middleware functions
│   │                     # - Intercepts requests before they hit the controller
│   │                     # - Includes things like global error handlers (errorHandler.ts),
│   │                     #   authentication checks, and request body validation (validate.ts)
│   ├── routes/           # API Endpoint definitions
│   │                     # - Maps HTTP verbs (GET, POST, etc.) and URLs to specific controllers
│   │                     # - Should NOT contain business logic; acts purely as a routing table
│   ├── schemas/          # Data validation schemas
│   │                     # - Contains Zod schemas used to validate incoming request bodies,
│   │                     #   query parameters, and URL parameters before processing.
│   │                     # - Ensures data integrity and type safety at runtime
│   └── services/         # Core business logic
│                         # - The "brain" of the application
│                         # - Executes the actual business rules and validations
│                         # - Directly communicates with the database via Prisma client
├── .env                  # Environment variables (Database URL, secret keys, ports)
├── package.json          # Project dependencies and npm scripts
└── server.ts             # Application entry point
                          # - Initializes the Express app
                          # - Attaches global middlewares (JSON parsing, request logging)
                          # - Mounts the API routes
                          # - Starts the HTTP server
```
