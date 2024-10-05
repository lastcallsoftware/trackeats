# BUILD STAGE
# -----------
FROM node:lts-alpine AS build

# specify production environment (yes this is necessary)
ENV NODE_ENV=production

# set container's working directory
WORKDIR /app

# Copy package.json and package-lock.json into container
COPY package*.json ./

# install dependencies listed in package.json
#RUN npm install --production --silent 
RUN npm install

# I had early issues with the build not finding typescript files but that seems to work now.
#RUN npm install -g typescript 

# "serve" is a development-level web server.  We shouldn't use it in production.
#RUN npm install -g serve

# copy the package library up one level (WHY???)
#RUN mv node_modules ../

# copy all other app files into the container
COPY . .

# do the build
RUN npm run build


# EXECUTION STAGE
# ---------------
FROM nginx:alpine

# copy nginx config into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy React app build files into the container
COPY --from=build /app/dist /usr/share/nginx/html

# expose the port for the app's front end
EXPOSE 8080

# this runs the app using Vite's built-in app server
#CMD ["npm", "run", "build"]

# this runs the app using "serve"... which is at least an external product but is still only development-quality
#CMD ["serve", "-s", "dist", "-l", "80"]

# run the app in NGINX
CMD ["nginx", "-g", "daemon off;"]
