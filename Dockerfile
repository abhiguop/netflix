# Stage 1: Build
FROM node:16.17.0-alpine as builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build arguments for API
ARG TMDB_V3_API_KEY
ENV VITE_APP_TMDB_V3_API_KEY=${TMDB_V3_API_KEY}
ENV VITE_APP_API_ENDPOINT_URL="https://api.themoviedb.org/3"

# Build the project
RUN npx tsc && npx vite build

# Stage 2: Production
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Remove default Nginx content
RUN rm -rf ./*

# Copy build output
COPY --from=builder /app/dist .

# Expose port
EXPOSE 80

# Start Nginx
ENTRYPOINT ["nginx", "-g", "daemon off;"]
