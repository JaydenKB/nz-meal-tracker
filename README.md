# NZ Meal Tracker

Personal calorie and recipe tracker for Auckland, NZ. Self-hosted on your desktop — access from your phone over the local network.

## Features

- Create recipes with ingredients and automatic macro calculation
- AI-generated food photos (OpenAI DALL·E 3)
- Health score (0–100) with breakdown
- Batch shopping lists grouped by store (Woolworths, New Market, etc.)
- PWA support — add to home screen on your phone

## Quick Start

```powershell
# If PowerShell blocks npm (execution policy), use npm.cmd instead:
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run start
```

```bash
# Install dependencies
npm install

# Copy environment file and add your OpenAI key (optional, for AI images)
copy .env.local.example .env.local

# Development
npm run dev

# Production (LAN access)
npm run build
npm run start
```

Open on your phone: `http://<your-desktop-ip>:3000` (shown on the dashboard).

## 24/7 Desktop Hosting

### 1. Build and test

```bash
npm run build
npm run start
```

The app binds to `0.0.0.0:3000` so other devices on your WiFi can reach it.

### 2. Windows Firewall (run once as Admin)

```powershell
.\scripts\setup-firewall.ps1
```

### 3. PM2 (auto-restart + boot)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Run the command PM2 prints to enable startup on boot.

### 4. Stable IP

Set a DHCP reservation for your desktop in your router so the LAN URL doesn't change.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Optional — for AI food image generation |
| `DATABASE_URL` | SQLite path (default: `file:./local.db`) |
| `PORT` | Server port (default: 3000) |

## Seed Data

On first visit to the dashboard, the app seeds Auckland stores, ingredients, and 2 sample recipes. You can also trigger manually:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Project Structure

- `src/lib/db/` — SQLite schema and connection
- `src/lib/nutrition/` — macro calculation, units, health score
- `src/lib/shopping/` — batch shopping list builder
- `src/app/` — pages and API routes
- `public/recipe-images/` — locally cached AI images
