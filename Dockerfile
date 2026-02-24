# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
# We need to pass build-time env vars for Vite if any
ARG VITE_YOUTUBE_API_KEY
ENV VITE_YOUTUBE_API_KEY=$VITE_YOUTUBE_API_KEY

RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy production dependencies only
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directories for uploads if they don't exist
RUN mkdir -p dist/public/covers dist/public/songs

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
