# BUILD STAGE
# -----------
FROM node:lts-alpine AS build

# Specify production environment (yes this is necessary).
ENV NODE_ENV=production
ENV REACT_APP_BACKEND_BASE_URL=http://trackeats.com:5000

# Set container's working directory.
WORKDIR /app

# Copy package.json and package-lock.json into container.
COPY package*.json ./

# Install dependencies listed in package.json.
#RUN npm install --production --silent 
RUN npm install

# "serve" is a development-level web server.  We shouldn't use it in production.
#RUN npm install -g serve

# Copy all other app files into the container.
COPY . .

# Do the build.
RUN npm run build


# EXECUTION STAGE
# ---------------
FROM nginx:alpine

# Not sure I want to specify this here -- running in a container does not not 
# necessarily running in production!  I'll revisit this at some point when I
# sort out the proper way to do separate Docker builds for dev and production.
# TODO: Change this!
ENV NODE_ENV=production

# Copy nginx config into the container.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy React app build files (from the directory where the VITE compiler puts them)
# into the container (to the directory where NGINX looks for content to serve).
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the port for the app's front end.
EXPOSE 8080
EXPOSE 8443
EXPOSE 5443

# Serve the app using Vite's built-in app server.  This is definitely for 
# development builds only.
#CMD ["npm", "run", "build"]

# Serve the app using "serve", which is at least a separate product but is
# still only development-quality.
#CMD ["serve", "-s", "dist", "-l", "80"]

# Serve the app using NGINX, which is production-quality.
CMD ["nginx", "-g", "daemon off;"]
