# Use the official Node.js runtime as the base image docker
# Using Alpine Linux for smaller image size
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001
    
RUN apk add --no-cache curl

# Copy package.json and package-lock.json (if available) first
# This allows Docker to cache the npm install step if dependencies haven't changed
COPY package*.json ./

## Install dependencies
# Using npm ci for faster, reliable, reproducible builds
RUN npm install && \
    npm cache clean --force

# Copy the rest of the application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/public && \
    chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose the port the app runs on
EXPOSE 8000

# Use node instead of nodemon for production
CMD ["node", "src/server.js"]
