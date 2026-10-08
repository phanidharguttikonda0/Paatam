# Paatam Backend

This repository contains the backend service for the Paatam application.

## Getting Started (Initial Setup)

When you clone this project for the first time, follow these steps to get your local development environment up and running:

1. **Install Dependencies:**
   Run `npm install` to download all the necessary Node.js packages.

2. **Set up the Database (Docker):**
   The project requires a PostgreSQL database. A `docker-compose.yml` file is provided for convenience.
   Run the following command to start the database container in the background:
   ```bash
   docker compose up -d
   ```

3. **Configure Environment Variables:**
   Ensure your `.env` file at the root of the project contains your database connection string and secret keys:
   ```env
   PORT=4545
   JWT_SECRET=your_super_secret_key_here
   DATABASE_URL="postgresql://admin:adminpassword@localhost:5432/paatam_dev?schema=public"
   ```

4. **Initialize the Database Schema (Prisma):**
   Push the Prisma schema to the database to create the required tables and generate the Prisma Client.
   ```bash
   npx prisma migrate dev
   ```

5. **Start the Development Server:**
   Launch the backend server with hot-reloading.
   ```bash
   npm run dev
   ```

### How the Database & ORM Initialization Works

To clarify exactly what the setup commands do:

- **`docker compose up -d`**: This **ONLY** downloads the PostgreSQL software and starts an empty database container. It does *not* read `migration.sql` or create any tables on its own.
- **`npx prisma migrate dev`**: This is the command that actually builds the database and configures your ORM. When you run it, Prisma does two things:
  - **Database Setup:** It connects to the running Docker database, reads the SQL files inside the `prisma/migrations/` folder, and executes them to build all your tables and columns.
  - **ORM Initialization:** It reads your `schema.prisma` file and generates the `@prisma/client` code inside your `node_modules`. This is what gives you autocomplete and type-safety in TypeScript when you write queries like `prisma.admin.findUnique(...)`.

So, in short:
- **Docker** just gives you an empty, running database.
- **`migration.sql`** builds the physical tables inside that database.
- **`schema.prisma`** acts as the blueprint to both generate those SQL migrations and generate your TypeScript ORM client.

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

## 📖 API Documentation

A comprehensive list of all endpoints, request bodies, response formats, tokens, and error states is maintained in the **[API_DOCS.md](./API_DOCS.md)** file. Please refer to it when integrating with the frontend.

## Decentralized ID Generation (Sonyflake)

To ensure maximum scalability and avoid database bottlenecks in our distributed ECS architecture, this application uses **Sonyflake** for ID generation instead of traditional PostgreSQL `autoincrement()`.

### The Problem with Auto-Increment and UUIDs
- **Auto-Increment (`1, 2, 3...`)**: Relies on a single database sequence. If the application scales to multiple database shards or requires extremely high write-throughput, the central database sequence becomes a massive bottleneck.
- **UUIDv4 (Random Strings)**: While decentralized, random UUIDs completely destroy database B-Tree index performance. Because they are not sequential, inserting them causes severe index fragmentation and page thrashing.

### The Sonyflake Solution
Sonyflake is a distributed unique ID generator inspired by Twitter's Snowflake. It generates a **64-bit integer** (`BigInt`) composed of three parts:
1. **Timestamp (39 bits)**: Ensures that IDs are sequentially sortable by time. This keeps the PostgreSQL B-Tree indexes highly optimized and lightning fast.
2. **Sequence (8 bits)**: Prevents collisions if a single server generates multiple IDs in the exact same 10-millisecond window.
3. **Machine ID (16 bits)**: Ensures that two different servers never generate the same ID.

### Handling Machine IDs in AWS ECS
In a containerized AWS ECS environment, hardcoding a "Worker ID" or "Machine ID" is impossible because containers scale up and down dynamically. 
To solve this, our Sonyflake implementation derives the 16-bit Machine ID directly from the **Private IP Address** of the ECS container (using the lower 16 bits of the IPv4 address). 
Since every active container in a VPC has a strictly unique Private IP, ID collisions across horizontally scaled ECS tasks are mathematically impossible without requiring a central Redis coordinator.

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

## Password Salt Hashing Strategy

For Branch Admins, Teachers, and Students, authentication relies on a secure password strategy instead of OTPs. To protect user credentials against data breaches and brute-force attacks, we utilize **Salt Hashing** via the `bcrypt` library.

### How it Works:
1. **Salting**: When a user is created, a unique, random string of characters (a "salt") is generated and appended to their plaintext password.
2. **Hashing**: The combined string (Password + Salt) is run through the bcrypt hashing algorithm multiple times (the "work factor" or "salt rounds", typically 10). This produces a long, fixed-size, irreversible string known as the `password_hash`.
3. **Storage**: Both the salt and the hash are safely stored in the database in a single string format (e.g., `$2b$10$abcdefg...`). The plaintext password is **never** saved.

### How Login Verification Happens:
1. When a user attempts to log in, they send their `identifier` (email or mobile) and their `plaintext password` to the backend.
2. The server fetches the stored `password_hash` for that user from the database.
3. The `bcrypt.compare(plainPassword, storedHash)` function is called.
4. Bcrypt extracts the unique salt from the stored hash, appends it to the incoming plaintext password, and hashes it using the exact same algorithm.
5. If the resulting new hash exactly matches the stored hash, the password is correct, and the server issues the Access and Refresh tokens.

## Pre-Registration OTP Verification Flow

Before creating a new Corporate entity or adding a new Corporate Admin, the system requires cryptographically verifying the user's email and mobile number. This is done using a decoupled "Verification Token" strategy.

### The Flow
1. **Requesting the OTP (`POST /api/auth/send-otp` or `POST /api/auth/corporate/login`)**
   - The frontend sends the target `email` and/or `mobile`.
   - The backend deletes any existing, unused OTP rows for this specific contact to prevent database bloat.
   - The backend generates a new 6-digit numeric OTP.
   - The backend stores this OTP in the database (`Otp` table) along with the email/mobile and an expiration time (**5 minutes from now**).
   - The backend dispatches the OTP to the user. *(See AWS SES/SNS details below).*

2. **Verifying the OTP (`POST /api/auth/verify-otp`)**
   - The frontend sends the `email`, `mobile`, and the user-entered `otp`.
   - The backend queries the database for an exact match that has **not expired** (`expires_at > now()`).
   - If a match is found, the OTP is deleted from the database so it cannot be reused.
   - The backend generates a temporary, short-lived **Verification Token** (a signed JWT valid for ~15 minutes). This token cryptographically proves that the server verified these specific contact details.
   - The Verification Token is returned to the frontend.

3. **Creating the Resource (`POST /api/corporate/create` or `/addAdmin`)**
   - The frontend makes the request to create the corporate/admin, passing the `name`, `email`, `mobile`, AND the newly acquired `verificationToken`.
   - The backend controller decodes the `verificationToken`.
   - It verifies the signature and checks that the `email` and `mobile` inside the token **exactly match** the data being submitted in the request body.
   - If they match, the backend safely inserts the new user into the database.

### Dispatching OTPs in Production (AWS SES & SNS)
Currently, in development mode, the OTPs are simply logged to the server console. For production, the system must integrate with **Amazon Web Services (AWS)** to handle actual delivery:

- **AWS SES (Simple Email Service):** Used for sending the OTP via Email.
- **AWS SNS (Simple Notification Service):** Used for sending the OTP via SMS to mobile devices.

#### Implementation Logic Outline for `otp.service.ts`
When moving to production, the `generateAndStoreOtp` function will be updated to include the AWS SDK logic:

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Initialize AWS Clients
const sesClient = new SESClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export class OtpService {
  public static async generateAndStoreOtp(email?: string, mobile?: string) {
    // 1. Generate & Store OTP in Database
    const otp = "..."; 
    
    // 2. Dispatch via AWS SES (Email)
    if (email) {
      const command = new SendEmailCommand({
        Destination: { ToAddresses: [email] },
        Message: {
          Body: { Text: { Data: `Your Paatam verification code is: ${otp}` } },
          Subject: { Data: "Your Verification Code" },
        },
        Source: process.env.AWS_SES_FROM_EMAIL,
      });
      await sesClient.send(command);
    }

    // 3. Dispatch via AWS SNS (SMS)
    if (mobile) {
      // Ensure mobile has country code (e.g., +91)
      const command = new PublishCommand({
        Message: `Your Paatam verification code is: ${otp}`,
        PhoneNumber: mobile, 
      });
      await snsClient.send(command);
    }
    
    return otp;
  }
}
```

## ☁️ AWS Infrastructure & Deployment

The entire infrastructure for this backend is codified using **Terraform** in the `/terraform` folder.

### Architecture Overview
- **Networking:** Custom VPC with Public subnets (for NAT/ALB) and fully Isolated Private Subnets (for RDS database).
- **Database:** AWS RDS PostgreSQL protected by **RDS Proxy** (for efficient serverless connection pooling).
- **Compute:** AWS ECS Fargate (Serverless Docker containers).
- **Security:** 
  - AWS WAF (Web Application Firewall) blocking SQL injection and DDoS attacks.
  - AWS Secrets Manager securely injects the `DATABASE_URL` directly into the Fargate containers at boot time.
- **Messaging:** AWS SES (Emails) and SNS (SMS OTPs).
- **Storage:** AWS S3 for profile picture and document uploads.

### How CI/CD Works
We use **GitHub Actions** (`.github/workflows/deploy.yml`) for automated deployments.
1. When you push to the `main` branch, GitHub Actions logs into AWS using your Repository Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
2. It builds the Docker image and pushes it to **AWS ECR (Elastic Container Registry)**.
3. It forces **AWS ECS** to deploy the new image.
4. ECS pulls the new image and spins up the new containers gracefully without downtime.

### How Prisma Migrations run in AWS
Because our database is completely isolated from the public internet (for maximum security), we cannot run `npx prisma migrate` from our local machines or GitHub Actions. 
Instead, the **Dockerfile** is configured to automatically run `npx prisma migrate deploy` **inside** the ECS container right before the Node server starts. 
- *Note: `migrate deploy` is completely safe. It does not wipe data. It simply applies any new SQL migration files that haven't been applied yet. If there are no new migrations, it gracefully skips!*
