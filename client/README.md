# Orbit client

This is the video-only React client for the app. It includes account creation, sign-in and sign-out, dark and light themes, camera and microphone controls, random matching, and WebRTC video signaling.

## Run locally

1. Start MongoDB and set `MONGODB_URI` plus the token secrets in `server/.env` using `server/.env.example` as a guide. Keep `.env` private.
2. In `server`, run `npm install` once and then `npm run dev`.
3. In `client`, copy `.env.example` to `.env`, run `npm install` once, then run `npm run dev`.
4. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

The client expects the API at `http://localhost:3000/api/v1` and Socket.IO at `http://localhost:3000` by default. Set `VITE_API_URL` and `VITE_SOCKET_URL` in `client/.env` if the server uses different addresses. The server’s `CORS_ORIGIN` must include the client origin.

Camera and microphone access works on `localhost` or on an HTTPS deployment. The current WebRTC setup uses a public STUN server; production deployments that need calls across restrictive networks should also configure a TURN service.
