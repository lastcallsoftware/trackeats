# BUILD STAGE
FROM node:24-alpine3.24.1 AS build

ARG VITE_BACKEND_BASE_URL
ARG VITE_PORTFOLIO_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FACEBOOK_APP_ID
ARG VITE_TURNSTILE_SITE_KEY_PUBLIC

ENV VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL}
ENV VITE_PORTFOLIO_URL=${VITE_PORTFOLIO_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_FACEBOOK_APP_ID=${VITE_FACEBOOK_APP_ID}
ENV VITE_TURNSTILE_SITE_KEY_PUBLIC=${VITE_TURNSTILE_SITE_KEY_PUBLIC}

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build


# EXECUTION STAGE
FROM nginx:alpine

ENV NODE_ENV=production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080 || exit 1
  
CMD ["nginx", "-g", "daemon off;"]
