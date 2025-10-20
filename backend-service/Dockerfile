FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and migrations FIRST
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src/

# Copy TypeScript config
COPY tsconfig.json ./

# Copy swagger.json 
COPY swagger.json ./

# Build app (tsc will compile, tsc-alias will resolve path aliases)
RUN npm run build

# Remove source files to reduce image size
RUN rm -rf src tsconfig.json

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]