import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path";

// This file configures how the app runs in Vite's built-in dev server.
//
// For some reason Ubuntu has a policy that port numbers under 1000 are
// prohibited for non-root users, so if you want to run the app using 
// "npm run dev" (as you normlly would when developing), you CANNOT use
// the usual HTTP port 80.  So instead I'm specifying port 8080, which is
// commonly used for dev purposes.
// In production, we'll use Docker to redirect incoming requests on the
// usual port 80 (or 443) to port 8080 in the Vite dev server or NGINX 
// web server, so there's no need to change it here.
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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendBaseUrl = env.VITE_BACKEND_BASE_URL?.trim()
  const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY_PUBLIC?.trim()

  if (!backendBaseUrl) {
    throw new Error('VITE_BACKEND_BASE_URL must be set for the frontend build and dev server')
  }

  if (!turnstileSiteKey) {
    throw new Error('VITE_TURNSTILE_SITE_KEY_PUBLIC must be set for the frontend build and dev server')
  }

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: "/",
    plugins: [
      react(),
      {
        name: 'portfolio-backend-url',
        transformIndexHtml(html) {
          return html
            .replaceAll('__BACKEND_BASE_URL__', backendBaseUrl)
            .replaceAll('__TURNSTILE_SITE_KEY__', turnstileSiteKey)
        },
      },
    ],
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
    // Bundle MUI as a separate chunk.  This greatly reduces the app's max 
    // chunk size.  This shuts up the compiler warning about big chunks and it
    // does has some real benefits:
    // - modern browsers load an app's chunks in parallel
    // - on subsequent visits after an app update, the MUI bundle will be 
    //   cached and the user won't have to download it again
    // I also tried bundling React separately but that had no effect.
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            mui: ['@mui/material', '@mui/icons-material'],
            icons: ['react-icons/md'],
            table: ['@tanstack/react-table'],        }
        }
      }
    }
  }
})
 