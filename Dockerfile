# NatFun SPA — static hosting only (C-03: no backend, no DB)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback
RUN printf 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }\n' \
    > /etc/nginx/conf.d/default.conf
EXPOSE 80
