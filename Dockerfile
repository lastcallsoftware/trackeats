FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent 
# RUN npm install -g typescript 
RUN npm install -g serve
RUN mv node_modules ../
COPY . .
EXPOSE 80
RUN chown -R node /usr/src/app
USER node
RUN npm run build
#CMD ["npm", "run", "build"]
CMD ["serve", "-s", "dist", "-l", "80"]
