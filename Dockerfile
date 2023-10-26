# Build stage
FROM node:16 AS build

WORKDIR /app

# Install dependencies and build
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Production stage
FROM caddy:2 AS production

# Copy the build output to replace the default Caddyfile and serve with Caddy
COPY --from=build /app/build /usr/share/caddy

# Optional: If you have a custom Caddyfile, you can copy it here
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80