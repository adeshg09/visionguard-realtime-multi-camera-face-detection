FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src/

# Copy TypeScript config
COPY tsconfig.json ./

# Copy swagger.json 
COPY swagger.json ./

# Build TypeScript project
RUN npm run build

# Remove source files to reduce image size
RUN rm -rf src tsconfig.json

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]