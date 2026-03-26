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

RUN npm ci --omit=dev

COPY backend/ ./

RUN npx prisma generate

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