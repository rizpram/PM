# Hostinger Node.js Web App Hosting - Quick Deploy (PM Tracker)

## Upload
1) hPanel → Node.js Web App → Create Application
- Node.js: 20.x (atau 18.x)
- App root: pm-tracker (bebas)
- Startup file: server.js
- Domain/Subdomain: pilih

2) File Manager → masuk folder app root → upload zip ini → Extract

## Install & Build
Di panel Node.js Web App:
- Run NPM Install
- Run Build: `npm run build`

## Environment Variables (wajib)
Set:
- NEXT_PUBLIC_SUPABASE_URL=...
- NEXT_PUBLIC_SUPABASE_ANON_KEY=...
- NODE_ENV=production

Save → Restart App

## Start
Klik Start Application (startup file server.js)

## URLs
- /login
- /dashboard
- /projects
- /executive?token=TOKEN&days=30

## Notes
- Jangan pakai PM2 di Hostinger Node.js Web App (Hostinger sudah manage proses).
- Pakai PORT dari environment (sudah di server.js).
