# Stage 1: Build Stage
FROM node:24.12.0-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies like typescript)
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy all source files
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc

# Generate Frontend Documentation
RUN node scripts/generate_frontend_docs.js

# Stage 2: Production Stage
FROM node:24.12.0-alpine

# Set node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (reduces image size significantly)
RUN npm ci --only=production

# Install Prisma CLI so we can run database migrations (pinned to v6 to match client)
RUN npm install prisma@^6.4.1 --save-prod

# Copy generated Prisma Client
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema and migrations for "migrate deploy"
COPY --from=builder /usr/src/app/prisma /usr/src/app/prisma

# Copy built JavaScript files from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy generated frontend API documentation HTML
COPY --from=builder /usr/src/app/API_DOCUMENTATION_FOR_FRONTEND.html ./API_DOCUMENTATION_FOR_FRONTEND.html

# The default port your Express app binds to
EXPOSE 4545

# Start the application by first running database migrations, then starting the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=/usr/src/app/prisma/schema.prisma && node dist/server.js"]
