# ☁️ Personal Cloud Storage

A self-hosted, private cloud storage you can access from anywhere.

## Features
- 📁 File upload & download (up to 10 GB per file, drag & drop)
- 🗂 Folder organization with nested folders
- 🔐 Password-protected login (single user, personal use)
- 🖼️ Inline preview for images, videos, and audio
- 🐳 Docker-ready — deploy anywhere in one command

---

## Quick Start (Docker)

```bash
# 1. Clone / copy this folder to your server
# 2. Generate a secret and set it
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# 3. Build and run
docker compose up --build -d

# 4. Open http://localhost in your browser
#    On first visit you'll be prompted to create your account
```

That's it. Your files are stored in a Docker volume called `cloud-data` which persists across restarts.

---

## Access From Anywhere

### Option A — Cloudflare Tunnel (Recommended, Free)
1. Install `cloudflared` on the machine running this app
2. `cloudflared tunnel --url http://localhost` → you get a public `*.trycloudflare.com` URL
3. For a permanent domain, create a named tunnel in the Cloudflare dashboard

### Option B — Port Forward
1. In your router, forward external port 80 → this machine's IP port 80
2. Find your public IP at https://whatismyip.com
3. Access via `http://<your-public-ip>`

### Option C — VPS
Upload the project to any VPS (DigitalOcean, Hetzner, etc.) and run `docker compose up -d`.

---

## Development (without Docker)

```bash
# Backend
cd backend
npm install
node server.js        # runs on http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev           # runs on http://localhost:5173
```

---

## Security Tips
- Set a strong `JWT_SECRET` in `.env` before exposing to the internet
- Use Cloudflare Tunnel or a reverse proxy with HTTPS for remote access
- The setup endpoint locks itself after the first account is created
