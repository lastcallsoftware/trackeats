import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from "vite-tsconfig-paths"

// This file configures how the app runs in Vite's built-in dev server.
//
// For some reason Ubuntu has a policy that port numbers under 1000 are
// prohibited for non-root users, so if you want to run the app using 
// "npm run dev" (as you normlly would when developing), you CANNOT use
// the usual HTTP port 80.  So instead I'm specifying port 8080, which is
// commonly used for dev purposes.
// In production, we'll use Docker to redirect incoming requests on the
// usual port 80 (or 443, if I ever get the SSL certificate sorted out)
// to port 8080 in the Vite dev server or NGINX web server, so there's no
// need to change it here.
//
// In addition to the port numbers, I had to add the strictPort and host
// properties.  I just scraped that out of a post somewhere I can't remember
// and really have no idea what they do.  The app runs fine locally without
// those peoperties, but not on the lastcallsw.com server.
// WHY?  No f-ing idea.
//
// The origin property was recommended in that same post but it was causing
// problems so I commented it out.  Again, that was based purely on results...
// I have no idea what it actully does.

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), tsconfigPaths()],
  preview: {
    port: 8080,
    strictPort: true,
  },
  server: {
    port: 8080,
    strictPort: true,
    host: true,
  //  origin: "http://0.0.0.0:80",
  },
  build: {
    chunkSizeWarningLimit: 650
  }
})
 