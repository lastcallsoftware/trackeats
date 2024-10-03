# Summary

This is the front-end portion of the TrackEats app.  It is a React app served by
an Nginx web server.  It was generated using the boilerplate project generator 
provided as part of the Vite development server.  The Typescript and SWC options
were chosen when the project was generated, thus the project supports 
Typescript, and uses the (very fast!) SWC compiler to compile and bundle the
app.<br>

The purpose and internal design of the app can be explored by reading the design
doc in the docs folder, but basically it is intended to help track the 
nutritional content of the user's daily diet.<br>

# Installing and running the code

To run this app, you first need npm and nodeJS installed locally.  Then clone 
this Git repository to a local directory, and from the project's root directory
execute:
```npm install```

This will download all the required JavaScript dependencies, including the React
libraries.  Finally, to run the app locally, execute:
```npm run dev```

This will bundle up the app, deploy it to the Vite app server, and start it up.
Then you should be able to start up a browser and point it at localhost to see 
the app.  Voila!<br>

The coolest thing is that if you keep the app running, as you make changes to 
the code it is automatically compiled and deployed and you can see the effects 
in real time.<br>

Note that the front end app does NOT run in the Vite dev server in production.
Instead it runs inside a Docker container and is served by the Nginx web server.
The Vite dev server is only a convenience for when you are developing the app
locally.<br> 

# Docker Interactions

To store or retrieve any container images from Docker Hub, you need to be logged 
in to Docker Hub.  To do that, you first need to get a personal access token 
from Docker Hub.  On the Docker Hub website, go to your Account Settings, then
the Personal Access Tokens page, and generate a new token.  Be sure to store 
the token somewhere because you can't see it again after it is generated.<br>

To run Docker commands in a WSL Linux VM (e.g., an Ubuntu 24.04 command prompt),
you must have the "Use the WSL 2 based engine" option enabled in the General
Settings of the Docker Desktop app for Windows.  (You may have to restart the app 
after enabling this setting.)  Also, you must have started Docker Desktop at some
point since your last reboot (presumably some background daemon is started when
you start the app).<br>

## Locally

Make sure you are in the frontend directory when you run any of these commands.<br>

Log on to Docker.  When prompted, provide your Docker Hub personal access token:<br>
```docker login -u <username>```

To build the Docker image (note the . on the end):<br>
```docker build -t lastcallsoftware/trackeats-frontend .```<br>
The -t switch specifies a tag (i.e., the image name)<br>

To run the Docker image locally:<br>
```docker run -it lastcallsoftware/trackeats-frontend```<br>
The -it switch is actually two switches, -i and -t, which together run the app
"interactively" (i.e., it returns control to the command prompt instead of 
waiting for the app to exit).<br>

To push the image to Docker Hub:<br>
```docker push lastcallsoftware/trackeats-frontend```

To see all images you have built:
```docker image ls -a```

To delete inactive images:
```docker image prune```

## On the Trackeats server

To deploy and execute the back end app on the Trackeats server, ssh onto the
server and follow these instructions:

To pull the image file from Docker Hub:<br>
```sudo docker pull lastcallsoftware/trackeats-frontend```

To run the Docker image on the server in a cotainer:<br>
```sudo docker run -it lastcallsoftware/trackeats-frontend```


# Boilerplate documemtation

The remaining text in this README was written by the Vite boilerplate code 
generator when the app was created.  I haven't tried wrapping my brain around 
it yet.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
