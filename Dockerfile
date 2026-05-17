FROM node:22-alpine as frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ ./

ENV VITE_API_URL=/api

RUN npm run build

FROM node:22-alpine as backend-build

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./

# Install ALL dependencies first (including dev) so that the TypeScript
# runtime (tsx) is available for prisma.config.ts when generating the client.
RUN npm ci

COPY backend/ ./

# Generate the Prisma client BEFORE pruning dev deps.
# prisma.config.ts is a TypeScript file — it needs tsx (a devDependency) to run.
# If we ran npm ci --omit=dev first, this step would fail silently
# and the generated client would land in the wrong location.
RUN npx prisma generate

# Now prune dev dependencies. The generated client in src/generated/ is already
# on disk and will be copied to the production stage below.
RUN npm prune --omit=dev

FROM node:22-alpine as production

RUN apk add --no-cache nginx

RUN mkdir -p /run/nginx

COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

COPY --from=backend-build /app/backend /app/backend

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["./entrypoint.sh"]