# Use Node.js 20 as the base image
FROM node:20 AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN tsc

# Use MongoDB as the base image for the database
FROM mongo:latest AS mongo-base

# Copy the compiled user creation script to the initialization directory
COPY --from=build /usr/src/app/dist/user-service/createUser.js /docker-entrypoint-initdb.d/

# Final stage to run both Node.js and MongoDB
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy the built application code from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the application as a non-root user
USER node

# Command to run the application
CMD ["node", "dist/server.js"]