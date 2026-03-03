# 🦜 Polly

**Prediction market paper trading, powered by AI agents.**

Track, execute, and analyze simulated trades on [Polymarket](https://polymarket.com) — without risking a single cent.

[![Express](https://img.shields.io/badge/Express-5-000?logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## ✨ What Is Polly?

Polly is a self-hosted REST API that lets AI agents (or humans) **paper trade** on prediction markets. Every trade is recorded in a PostgreSQL database, and portfolio state — cash balance, PnL, open positions — is derived on-the-fly from the trade ledger. No fake balance tracking, no drift, just math.

### Key Features

- 🤖 **Agent-first API** — purpose-built for AI agents to open, close, and query trades
- 📊 **Live portfolio** — cash, realized PnL, and capital deployed, all calculated from trade history
- 🔐 **Dual API keys** — separate read-write and read-only keys for security
- 🐳 **One-command deploy** — Docker Compose spins up the API + PostgreSQL in seconds 
- 🖥️ **Built-in dashboard** — React frontend served from the same container

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone & Configure

```bash
cd polly-api
cp .env.example .env
```

Edit `.env` to set your credentials:

```env
# API Keys (REQUIRED — change these!)
API_KEY=my-secret-write-key
GET_API_KEY=my-secret-read-key

# Database (defaults work out of the box)
POSTGRES_USER=polly
POSTGRES_PASSWORD=polly
POSTGRES_DB=polly

# Ports
API_PORT=3000
```

### 2. Launch

```bash
docker compose up -d --build
```

That's it. Polly is live at `http://localhost:3000`.

| Endpoint          | Description            |
| ----------------- | ---------------------- |
| `/health`         | Healthcheck            |
| `/api/trades`     | Trade API (see below)  |
| `/`               | Dashboard UI           |

### 3. Verify

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

---

## 🔧 Local Development

If you want to hack on Polly without Docker:

```bash
npm install

# Start the database (you'll need a running PostgreSQL instance)
# Update DATABASE_URL in .env to point to it

npx prisma migrate dev     # Apply migrations
npx prisma generate        # Generate Prisma client

npm run dev                 # Start with hot reload (tsx watch)
```

| Script              | Description                     |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start dev server (hot reload)   |
| `npm run build`     | Compile TypeScript              |
| `npm start`         | Run compiled production build   |
| `npm run prisma:studio` | Open Prisma Studio GUI     |

---

## 📡 API Overview

All endpoints live under `/api` and require an `X-API-Key` header.

| Method  | Endpoint               | Key Required | Description              |
| ------- | ---------------------- | ------------ | ------------------------ |
| `POST`  | `/api/trades`          | Full         | Open a new paper trade   |
| `PATCH` | `/api/trades/:id/close`| Full         | Close an existing trade  |
| `GET`   | `/api/trades`          | Read-only    | List trades (filterable) |
| `GET`   | `/api/trades/:id`      | Read-only    | Get a specific trade     |
| `GET`   | `/api/trades/portfolio`| Read-only    | Portfolio summary        |

> 📖 **Full API reference:** See [`POLLY_API_GUIDE.md`](POLLY_API_GUIDE.md) for detailed request/response schemas, examples, and rules.

---

## 🤖 Using Polly with OpenClaw

To give an OpenClaw agent access to Polly, provide it with the following instruction:

> **Instruction for OpenClaw:**
>
> ```
> You have access to a paper trading API for Polymarket prediction markets.
> 
> Read the API guide at this path for full endpoint documentation,
> schemas, and rules: POLLY_API_GUIDE.md
>
> Configuration:
>   - Base URL: https://<your-domain>/api
>   - API Key Header: X-API-Key
>   - API Key: <your-api-key>
>
> Key rules:
>   1. All prices are floats between 0 and 1.
>   2. Direction must be "YES" or "NO".
>   3. Use POST /trades to open, PATCH /trades/:id/close to close.
>   4. Query GET /trades/portfolio to check your balance and PnL.
>   5. Never try to close a trade that is already CLOSED.
>   6. Always include Content-Type: application/json on POST/PATCH requests.
> ```

If OpenClaw has **file access** to this repository, simply point it at [`POLLY_API_GUIDE.md`](POLLY_API_GUIDE.md) — it contains the complete, agent-optimized API reference with all schemas, examples, and behavioral rules.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│              Docker Container            │
│                                          │
│  ┌──────────────┐    ┌───────────────┐   │
│  │  Express API  │    │  React SPA    │   │
│  │  /api/*       │    │  /            │   │
│  └──────┬───────┘    └───────────────┘   │
│         │                                │
│  ┌──────▼───────┐                        │
│  │  Prisma ORM  │                        │
│  └──────┬───────┘                        │
└─────────┼────────────────────────────────┘
          │
   ┌──────▼───────┐
   │  PostgreSQL   │
   │  (Container)  │
   └──────────────┘
```

| Layer      | Tech                                  |
| ---------- | ------------------------------------- |
| Runtime    | Node.js 22 (Alpine)                   |
| Framework  | Express 5                             |
| Language   | TypeScript 5                          |
| ORM        | Prisma 7 (with `@prisma/adapter-pg`)  |
| Validation | Zod                                   |
| Database   | PostgreSQL 17                         |
| Frontend   | React + Vite + Tailwind CSS           |
| Container  | Multi-stage Docker build              |

---

## 📄 License

ISC
]]>
