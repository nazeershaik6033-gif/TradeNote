# TradeNote

An open-source trading journal for traders who care about data privacy and simplicity.
Store, discover, and recollect your trade patterns to become a consistent and profitable trader.

---

## Features

- **Dashboard** — P&L overview, win rate, key trading stats and charts
- **Daily view** — Day-by-day trade breakdown with detailed analytics
- **Calendar** — Monthly trade calendar with color-coded P&L
- **Screenshots** — Annotate and store chart screenshots with your trades
- **Diary** — Journal entries to document your mindset and learnings
- **Playbook** — Document your trading setups and strategies
- **Excursions** — Track MFE/MAE to analyse your entries and exits
- **Imports** — CSV import from multiple brokers
- **Settings** — Timezone, broker config, user profile, API keys

---

## Quick Start (Docker Compose — Recommended)

### Requirements

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Run with pre-built image

```bash
# 1. Download the compose file
curl -O https://raw.githubusercontent.com/nazeershaik6033-gif/tradenote/main/docker-compose.yml

# 2. Start the app
docker compose up -d
```

Access at **http://localhost:8080** — register your first account at `/register`.

### Build from source

```bash
# 1. Clone the repo
git clone https://github.com/nazeershaik6033-gif/tradenote.git
cd tradenote

# 2. Build and start
docker compose -f docker-compose-local.yml up -d --build
```

Access at **http://localhost:8080**.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MONGO_URI` | Full MongoDB connection string | `mongodb://tradenote:tradenote@mongo:27017/tradenote?authSource=admin` |
| `TRADENOTE_DATABASE` | MongoDB database name | `tradenote` |
| `APP_ID` | Parse Server app ID (no spaces) | `tradenote` |
| `MASTER_KEY` | Parse Server master key (no spaces) — **change before going live** | `changeme` |
| `TRADENOTE_PORT` | Port to serve the app on | `8080` |
| `REGISTER_OFF` | Set to `true` to disable new user registration | _(unset)_ |
| `ANALYTICS_OFF` | Set to `true` to disable anonymous analytics | _(unset)_ |

> **Security note:** Change `APP_ID` and `MASTER_KEY` before deploying to any public server.

---

## Manual / Node.js Setup

### Requirements

- Node.js 18.x
- MongoDB (running instance)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Build the frontend
npm run build

# 3. Set environment variables and start
MONGO_URI=mongodb://... \
TRADENOTE_DATABASE=tradenote \
APP_ID=tradenote \
MASTER_KEY=changeme \
TRADENOTE_PORT=8080 \
npm start
```

---

## Broker Import

TradeNote supports CSV imports from multiple brokers. See the [`brokers/`](./brokers/) folder for:

- `Template.csv` — universal import template
- `conversionScripts.md` — per-broker conversion instructions
- `README.md` — broker-specific notes

---

## Backup MongoDB

A helper script is included for backing up your database:

```bash
bash backup-mongodb.sh
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB via Parse Server |
| Charts | Apache ECharts |
| Auth | Parse Server built-in |

---

## License

GNU GPL v3 — see [LICENSE](./LICENSE).

Original project by [Eleven Trading](https://github.com/Eleven-Trading/TradeNote).
