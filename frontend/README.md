# About this app

This is the front-end portion of the TrackEats app.  It was generated using the Vite boilerplate project generator as a Typescript/React project.

The purpose and internal design of the app itself can be explored by reading the design doc in the docs folder, but basically it is intended to help track the nutritional content of the user's daily diet.

# Installing and running the code

To run this app, you first need npm and nodeJS installed locally.  Then clone this Git repository to a local directory, and from the project's root directory execute:

npm install

This will download all the required JavaScript dependencies, including the React libraries.  Finally, to run the app, execute:

npm run dev

This will bundle up the app, deploy it to the Vite app server, and start it up.  Then you should be able to start up a browser and point it at localhost:5173 to see the app.  Voila!
The coolest thing is that if you keep the app running, as you make changes to the code, it is automatically compiled and deployed and you can see its effects in real time.  I recommend using VS Code as your editor and setting it to auto-save for even greater responsiveness.


The remaining text in this README was written by the Vite boilerplate generator.  I haven't tried wrapping my brain around it yet:

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
