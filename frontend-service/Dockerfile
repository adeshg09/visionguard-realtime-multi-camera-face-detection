FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy all files
COPY . .

# Declare build-time arguments
ARG VITE_APP_API_BASE_URL
ARG VITE_APP_ACCESS_TOKEN_KEY

# Set them as environment variables for the build
ENV VITE_APP_API_BASE_URL=$VITE_APP_API_BASE_URL
ENV VITE_APP_ACCESS_TOKEN_KEY=$VITE_APP_ACCESS_TOKEN_KEY

# Build the app (env vars will be embedded)
RUN npm run build

# Install a lightweight web server
RUN npm install -g serve

# Expose port
EXPOSE 5173

# Start the app
CMD ["serve", "-s", "dist", "-l", "5173"]