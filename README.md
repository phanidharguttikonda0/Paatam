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

## Authorization Logic (JWT + Opaque Refresh Token)

This application uses a highly secure **Dual-Token Architecture** to handle authentication and authorization. It utilizes a short-lived **JWT Access Token** paired with a long-lived **Opaque Refresh Token**.

### Why is the JWT Short-Lived?
JSON Web Tokens (JWT) are **stateless**. This means that once the backend signs and issues a JWT, it does not check the database to verify if the user is still valid on subsequent requests. It only checks the cryptographic signature. 
* If a JWT were valid for 24 hours, and a user's permissions were revoked (or they were fired), they would still have full access for 24 hours until the token expired.
* By keeping the JWT short-lived (e.g., 10-15 minutes), we minimize the security window. If a user's permissions are revoked, they will lose access as soon as the token expires in a few minutes, because they will be denied a new one during the refresh process.

### The Authentication & Authorization Flow

1. **Initial Login:**
   - The user logs in via OTP (Corporate Admins) or Password (Branch Admins, Teachers, Students).
   - Once verified, the API generates two tokens:
     - **Access Token:** A JWT containing the `userId` and `role`, valid for ~15 minutes.
     - **Refresh Token:** A cryptographically random, opaque string (not a JWT) valid for ~30 days. This is saved to the database.
   - The API sends the **Access Token** in the JSON response body.
   - The API sends the **Refresh Token** in an `httpOnly` cookie.

2. **Accessing Protected Routes:**
   - The frontend stores the Access Token in memory (not localStorage).
   - On every request, it attaches the token: `Authorization: Bearer <accessToken>`.
   - The backend `auth.middleware.ts` verifies the signature and checks the user's role without touching the database.

3. **When the Access Token Expires (The Refresh Flow):**
   - After ~15 minutes, the frontend makes an API request and receives a `401 Unauthorized` response.
   - The frontend catches this error and automatically sends a request to `POST /api/auth/refresh`.
   - The browser automatically attaches the `httpOnly` cookie containing the Refresh Token.
   - The backend checks the database to see if the Refresh Token is valid and not expired.
   - If valid: A new JWT Access Token is generated and sent back to the frontend. The frontend retries the failed request.
   - If expired/invalid: The API returns an error (e.g., "Refresh token expired"). The frontend clears its state and redirects the user to the login page to authenticate again.

### Why the Refresh Token Cannot Be Stolen Easily
You might wonder: *If an attacker steals the refresh token, can't they generate access tokens for 30 days?*
Yes, but we make stealing it exceptionally difficult by using **`httpOnly` cookies**.

- **XSS Protection:** If a hacker injects malicious JavaScript into your website (Cross-Site Scripting), they can read variables, read `localStorage`, and read normal cookies. However, they **cannot** read `httpOnly` cookies. The browser completely hides `httpOnly` cookies from JavaScript.
- Because the frontend JS can't even see the Refresh Token, a hacker's script cannot steal it and send it to their own servers. The browser only attaches it automatically when making requests to your specific backend domain. 
- While it is potentially vulnerable to Cross-Site Request Forgery (CSRF), a CSRF attack on the `/refresh` endpoint only causes the server to issue a new Access Token in the response body—which the attacker's script still cannot read due to CORS policies.
