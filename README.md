# About this app

This project was generated using the Vite boilerplate project generator.  It's the first time I'm using Vite, which is a local app server/package bundler for running JavaScript/Typescript apps in a development enviroinment.  My JS and React courses used an older tool called Webpack.  Vite is much faster and generates much smaller deployment bundles, but it is also said to be not quite as robust and compatible with other code and products.  Still, it seems very popular and I am already loving the performance bump.  Besides, Webpack's project generator has been deprecated and the libraries it uses are years out of date.  So we'll have to see if we run into any trouble with Vite, but I doubt it.

Another first for this project is Typescript compatibility.  Of interest is that both Typescript and React's language (JSX) are supersets of JavaScript.  Neither knows about the other, but they are both "transpiled" into native JavaScript before the code executes.  Vite's code generator let me select both Typescript and React for its generated code, and its boilerplate logo screen even has the React logo on it, so that seems like a pretty good sign that they should all be compatible.  Again, we'll see!

# Installing and running the code

To run this app, you first need npm and nodeJS installed locally.  I'll let you figure out that part yourself.  Then clone this Git repository to a local directory, and from the project's root directory execute:

npm install

This will download all the required JavaScript dependencies, including the React libraries.  Finally, to run the app, execute:

npm run dev

This will bundle up the app, deploy it to the Vite app server, and start it up.  Then you should be able to start up a browser and point it at localhost:5173 to see the app.  Voila!
The coolest thing is that as you make changes to the code, it is automatically compiled and deployed and you can see its effects in real time.  I recommend using VS Code as your editor and setting it to auto-save for even greater responsiveness.


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
