# ReachInbox Full-Stack Email Job Scheduler

Production-grade email scheduling platform built for scale, reliability, rate limiting, and restart persistence. Built for the **ReachInbox.ai / Outbox Labs** hiring assignment.

---

## 🚀 Overview

The **ReachInbox Full-Stack Email Job Scheduler** allows authenticated users to schedule cold email outreach campaigns, parse lead CSVs, configure custom delays and hourly rate limits, monitor jobs via a live BullMQ board, search indexed emails using Elasticsearch, and receive real-time Slack alerts when hourly provider limits are reached.

---

## 🏗 System Architecture

```
                  +-----------------------------------+
                  |           React Frontend          |
                  |  (Vite, Tailwind, React Query)    |
                  +-----------------+-----------------+
                                    |
                                    | REST API & Google/Slack OAuth
                                    v
                  +-----------------+-----------------+
                  |          Express Backend          |
                  |            (TypeScript)           |
                  +--------+----------------+---------+
                           |                |
           +---------------+                +---------------+
           |                                                |
           v                                                v
 +---------+---------+                            +---------+---------+
 | PostgreSQL (DB)   |                            |   Redis (Cache &  |
 | Prisma ORM        |                            |  BullMQ Store)    |
 +---------+---------+                            +---------+---------+
           |                                                |
           |                                                v
           |                                      +---------+---------+
           |                                      |   Email Worker    |
           |                                      | (BullMQ Queue)    |
           |                                      +----+----+----+----+
           |                                           |    |    |
           +--------------------+----------------------+    |    +---------------+
                                |                           |                    |
                                v                           v                    v
                       +--------+--------+         +--------+--------+  +--------+--------+
                       |  Ethereal SMTP  |         | Elasticsearch   |  |   Slack Web     |
                       |  (Fake Email)   |         | (Email Search)  |  |  (OAuth & Alert)|
                       +-----------------+         +-----------------+  +-----------------+
```

---

## 🛠 Tech Stack

### Backend
- **Language / Runtime:** TypeScript, Node.js (v24+)
- **Framework:** Express.js
- **Database & ORM:** PostgreSQL 16, Prisma ORM (v5)
- **Queue System:** BullMQ (backed by Redis 7)
- **Rate Limiting & Caching:** Redis atomic counters & Lua scripts
- **Email Delivery:** Nodemailer + Ethereal Email SMTP
- **Search Engine:** Elasticsearch 8.11
- **Queue Dashboard:** Bull Board (`/admin/queues`)
- **Authentication:** Real Google OAuth 2.0 + JWT session cookies
- **Integrations:** Real Slack OAuth 2.0 + Slack Chat API
- **Validation:** Zod

### Frontend
- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS (Modern dark glassmorphism aesthetic)
- **Icons:** Lucide React
- **State & Data Fetching:** TanStack React Query v5
- **Forms & CSV:** React Hook Form, Zod, PapaParse

### Infrastructure
- **Docker Compose:** PostgreSQL, Redis, Elasticsearch

---

## 📁 Repository Structure

```
reachinbox-email-scheduler/
├── backend/
│   ├── src/
│   │   ├── auth/          # JWT utilities & auth handling
│   │   ├── config/        # Environment configurations
│   │   ├── controllers/   # Auth, Email, and Slack controllers
│   │   ├── middleware/    # Auth verification middleware
│   │   ├── queues/        # BullMQ queue setup & scheduling helper
│   │   ├── routes/        # Express route definitions
│   │   ├── services/      # Email, Rate Limiter, Slack, Elasticsearch services
│   │   ├── utils/         # Prisma, Redis, Logger & Validators
│   │   ├── workers/       # BullMQ Email Worker process
│   │   ├── app.ts         # Express App setup & Bull Board routing
│   │   └── server.ts      # Server entry point & restart recovery sync
│   ├── prisma/
│   │   └── schema.prisma  # PostgreSQL schema (User, Sender, Email)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # Header, ComposeModal, ScheduledTable, SentTable
│   │   ├── pages/         # LoginPage, DashboardPage
│   │   ├── services/      # Axios API client
│   │   ├── types/         # TypeScript model definitions
│   │   ├── App.tsx        # React Root
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docker/
│   └── docker-compose.yml # Postgres, Redis, Elasticsearch compose
└── README.md
```

---

## ⚡ Quick Start & Setup Guide

### 1. Prerequisites
- **Node.js:** `>= 18.0.0`
- **Docker & Docker Compose**

### 2. Start Infrastructure
Start PostgreSQL, Redis, and Elasticsearch containers:
```bash
cd docker
docker compose up -d
```

Verify containers are running:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Elasticsearch on `localhost:9200`

### 3. Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run build
npm run dev
```
Backend will start on `http://localhost:5000`.
Bull Board queue dashboard will be live at `http://localhost:5000/admin/queues`.

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend dashboard will start on `http://localhost:5173`.

---

## 🔑 Environment Variables

See `backend/.env.example` for reference:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgrespassword@localhost:5432/reachinbox` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ELASTICSEARCH_URL` | Elasticsearch host URL | `http://localhost:9200` |
| `WORKER_CONCURRENCY` | Number of concurrent jobs per worker | `5` |
| `MIN_EMAIL_DELAY_MS` | Minimum throttle delay between email sends | `2000` |
| `MAX_EMAILS_PER_HOUR` | Default hourly send cap per sender | `200` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your_google_client_id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your_google_client_secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback redirect URL | `http://localhost:5000/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack OAuth App Client ID | `your_slack_client_id` |
| `SLACK_CLIENT_SECRET` | Slack OAuth App Client Secret | `your_slack_client_secret` |
| `SLACK_REDIRECT_URI` | Slack OAuth callback URL | `http://localhost:5000/auth/slack/callback` |
| `JWT_SECRET` | Secret key for JWT signing | `super-secret-jwt-key-reachinbox-2026` |
| `ETHEREAL_USER` | Ethereal SMTP user (Auto-generated if empty) | `` |
| `ETHEREAL_PASSWORD` | Ethereal SMTP password | `` |
| `FRONTEND_URL` | Frontend URL for CORS & OAuth redirects | `http://localhost:5173` |

---

## 🧠 Deep Dives & Architectural Guarantees

### 1. Hourly Rate Limiting Algorithm
- **Mechanism:** Redis-backed atomic counters keyed by window: `email-rate:{senderId}:{YYYY-MM-DD-HH}`.
- **Atomic Operations:** Uses Redis `INCR` with a 3600-second TTL set on window creation.
- **Rescheduling:** If `INCR` exceeds `maxEmailsPerHour`:
  1. The job is **not dropped** or permanently failed.
  2. The next available hour window top (e.g., `12:00:00`) is computed via `calculateNextAvailableTime()`.
  3. The PostgreSQL email record status is reset to `scheduled` with `scheduledAt = nextAvailableTime`.
  4. A new BullMQ delayed job is added targeting the new window.
  5. Order is preserved.

### 2. Idempotency & State Machine
- **State Machine:** `scheduled` -> `processing` -> `sent` (or `failed`).
- **Atomic Transition:**
  ```sql
  UPDATE "Email"
  SET status = 'processing'
  WHERE id = $emailId AND status IN ('scheduled', 'failed')
  ```
- If two worker threads receive the same job ID simultaneously, `updateMany` returns `count = 0` for the second thread, immediately terminating execution before SMTP invocation.
- If `email.status === 'sent'` is detected, worker immediately returns.

### 3. Server Restart Persistence
- **State Storage:** Email metadata is persisted in PostgreSQL. BullMQ delayed job payloads reside in Redis.
- **Startup Sync (`server.ts`):** Upon backend boot:
  1. Queries all `scheduled` emails from PostgreSQL.
  2. Checks if the corresponding job (`email-${id}`) exists in Redis.
  3. Re-injects missing delayed jobs into BullMQ without duplicating existing jobs.

### 4. 1000+ Email Load Handling
- Bulk email schedules create individual database rows and lightweight BullMQ delayed jobs with deterministic job IDs (`email-${id}`).
- Memory consumption remains low because BullMQ pulls jobs from Redis dynamically based on worker `WORKER_CONCURRENCY` (default 5).

---

## 🔔 Slack OAuth & Rate Limit Alerts

1. User clicks **"Connect Slack"** in the header to execute real Slack OAuth 2.0.
2. Token is stored against the User in PostgreSQL (`slackAccessToken`, `slackTeamId`).
3. When a sender reaches the hourly limit:
   - Worker checks deduplication key in Redis: `slack-alert:{senderId}:{hourWindow}`.
   - If not alert-locked, calls Slack `chat.postMessage` API notifying the team channel.
   - Sets a 1-hour Redis TTL to prevent alert spamming.

---

## 🔍 Elasticsearch Integration

- Emails are indexed in Elasticsearch (`index: emails`) upon scheduling, delivery, or failure.
- `GET /api/emails/search?q=query` performs multi-field fuzzy matches on `recipient`, `subject`, and `body`.
- If Elasticsearch is starting or offline, search automatically fails over to PostgreSQL text filtering gracefully.

---

## 📡 API Endpoints Reference

### Authentication
- `GET /auth/google` - Redirect to Google OAuth authorization page.
- `GET /auth/google/callback` - OAuth callback endpoint.
- `GET /api/auth/me` - Get current authenticated user details.
- `POST /api/auth/logout` - Clear authentication token.

### Email Operations
- `POST /api/emails/schedule` - Schedule email campaign.
- `GET /api/emails/scheduled` - Retrieve pending/processing scheduled emails.
- `GET /api/emails/sent` - Retrieve sent & failed email delivery logs.
- `GET /api/emails/search?q=` - Search emails using Elasticsearch.
- `GET /api/emails/:id` - Fetch single email details.

### Slack Integration
- `GET /auth/slack` - Redirect to Slack OAuth authorization page.
- `GET /auth/slack/callback` - Slack OAuth callback.
- `GET /api/slack/status` - Get Slack connection status.
- `POST /api/slack/disconnect` - Disconnect user's Slack workspace.

### Queue Dashboard
- `GET /admin/queues` - Bull Board UI for queue monitoring.

---

## 🧪 Testing

Run backend test suite verifying rate limits, date calculators, and Zod schemas:
```bash
cd backend
npm test
```

---

## 📺 Step-by-Step Demo Verification Instructions

1. **Start System:** Run `docker compose up -d` in `docker/`, `npm run dev` in `backend/` and `frontend/`.
2. **Log In:** Open `http://localhost:5173`, click **"Continue with Google"**.
3. **Upload CSV & Schedule:**
   - Click **"Compose New Email"**.
   - Upload a CSV with leads.
   - Set Subject, Body, Start Time (e.g. 1 minute ahead or immediate), Delay (2000ms), Hourly Limit (200).
   - Click **Schedule Email Campaign**.
4. **View Queue & Bull Board:**
   - Observe scheduled emails in the dashboard table.
   - Open `http://localhost:5000/admin/queues` to see delayed jobs in Bull Board.
5. **Observe Ethereal Delivery:**
   - Check terminal logs for `[ETHEREAL PREVIEW URL]`. Click the link to view the rendered email.
   - Watch email status update to `Sent` in the dashboard.
6. **Test Restart Resilience:**
   - Schedule an email 3 minutes in the future.
   - Stop the backend process (`Ctrl+C`).
   - Restart the backend (`npm run dev`).
   - Notice log output: `[RESTART SYNC] Re-scheduling/verifying missing delayed jobs`. Email delivers on schedule.
7. **Test Hourly Rate Limit & Slack Alert:**
   - Compose a campaign with `Hourly Limit = 2`.
   - Add 5 recipient emails.
   - First 2 send immediately. 3rd, 4th, 5th hit limit and are automatically rescheduled for the top of the next hour window.
   - If Slack is connected, inspect Slack channel for the rate limit warning message.
8. **Test Elasticsearch Search:**
   - Type recipient email or subject keywords in the header search bar.
   - Instant search results returned from Elasticsearch index.

---

## 📄 License & Credits

Designed & implemented for the **ReachInbox.ai Full-Stack Developer Hiring Assignment**.
