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

# Compile TypeScript to JavaScript (Assuming a tsconfig.json is present)
# Note: Since tsconfig.json is missing, we will create one before building.
RUN npx tsc

# Stage 2: Production Stage
FROM node:24.12.0-alpine

# Set node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (reduces image size significantly)
RUN npm ci --only=production

# Install Prisma CLI so we can run database migrations
RUN npm install prisma

# Copy generated Prisma Client
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma

# Copy built JavaScript files from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# The default port your Express app binds to
EXPOSE 4545

# Start the application by first running database migrations, then starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
