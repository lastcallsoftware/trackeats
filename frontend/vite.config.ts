import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// NOTE: For some reason Ubuntu has a policy that port numbers under 1000 are
// prohibited for non-root users, so if you want to run the app using 
// "npm run dev" (as you normlly would when developing!), you CANNOT use
// the usual HTTP port 80.  So instead I'm specifying port 5000, which is
// commonly used for dev purposes.
// In production, it will be port 80.  (Or 443, if I ever get the SSL 
// certificate sorted out.)

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  preview: {
    port: 5000,
    strictPort: true,
  },
  server: {
    port: 5000,
    strictPort: true,
    host: true,
  //  origin: "http://0.0.0.0:80",
  }
})
 