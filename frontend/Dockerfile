# BUILD STAGE
FROM node:lts-alpine AS build

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build


# EXECUTION STAGE
FROM nginx:alpine

ENV NODE_ENV=production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY portfolio/ /usr/share/nginx/portfolio/
COPY lastcallsw/ /usr/share/nginx/lastcallsw/
COPY certs/ /etc/ssl/certs/

EXPOSE 8080 8443 5443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080 || exit 1
  
CMD ["nginx", "-g", "daemon off;"]
