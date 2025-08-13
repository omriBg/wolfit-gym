# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["cd", "backend", "&&", "npm", "start"]
