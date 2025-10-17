FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Install a lightweight web server to serve the build output
RUN npm install -g serve

# Expose port 5173
EXPOSE 5173

# Start the app (serves from dist folder)
CMD ["serve", "-s", "dist", "-l", "5173"]
