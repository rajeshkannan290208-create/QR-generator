# QR Studio

A responsive, browser-only QR code generator made with React, Vite, and `qrcode`.

## Run locally

```bash
npm install
npm run dev
```

## Verify and build

```bash
npm test
npm run build
```

## Deploy

This is a static Vite app. Import this folder into Vercel or Netlify, with build command `npm run build` and output directory `dist`.

All QR content and recent codes are handled in the user's browser. Recent downloads are saved under local storage and survive refreshes.
