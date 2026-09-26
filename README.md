# Applicord — Personal Job Application Command Center

> **Tagline:** Every application. One timeline.

Applicord is a production-grade, privacy-first web application designed specifically to help professionals maintain a reliable, mostly automated record of every job application submitted, its current status, its complete immutable status history, related recruiter correspondence, follow-up reminders, submitted documents, and important events.

---

## 🌟 Core Product Principles

### 1. Automation First + Manual Fallback
For every major action, the system attempts reliable automation (email signal classification, browser extension tracking, URL intelligence autofill, smart follow-up suggestions) while **never silently modifying application state under low confidence**. Users always have immediate manual controls and status correction overrides.

### 2. Immutable Status History & Audit Trails
Every status change, automated detection, and user override appends to a chronological event stream (`application_status_history`) recording the exact source (`EMAIL`, `MANUAL`, `BROWSER_EXTENSION`, `SYSTEM`, `IMPORT`), transparent reasoning, and metadata.

### 3. Application Database as the Source of Truth
Automation mechanisms (email parsing, extensions, background queues) generate structured events and suggestions that update the database through validated backend services.

---

## 🏗️ Architecture & Technology Stack

```
                                  Applicord
                                     │
            ┌────────────────────────┼────────────────────────┐
            │                        │                        │
       [Frontend]               [Backend API]             [Worker]
     React 18 + Vite          Express + TypeScript     BullMQ / Scheduler
    Tailwind + Lucide             Prisma ORM            Email Sync / Reminders
    TanStack + Zod              PostgreSQL 16                 Redis 7
            │                        │                        │
            └────────────┬───────────┴───────────┬────────────┘
                         │                       │
                  [Chrome Extension]       [Document Vault]
                    Manifest V3             Local / S3 Storage
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router v6, React Hook Form, Zod.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, BullMQ, ioredis, Zod, bcryptjs, jsonwebtoken, Helmet, CORS, Rate Limiting.
- **Database:** PostgreSQL 16.
- **Queue / Cache:** Redis 7 / BullMQ (with in-memory fallback runner).
- **Extension:** Chromium Manifest V3 browser extension for 1-click job board tracking.
- **Containerization:** Docker & Docker Compose.

---

## 🚀 Quick Start with Docker Compose

To start the entire application (Postgres, Redis, Backend, Background Worker, and Frontend) in Docker:

```bash
# 1. Clone or navigate to the repository
cd Applicord

# 2. Copy the environment configuration
cp .env.example .env

# 3. Launch the container cluster
docker compose up -d
```

Once running:
- **Frontend App:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

---

## 💻 Local Development Setup

### 1. Backend Setup

```bash
cd backend
npm install

# Generate Prisma Client & push schema to Postgres
npx prisma generate
npx prisma db push

# (Optional) Seed the database with realistic sample applications and timeline data
npm run prisma:seed

# Start the Backend Server (includes in-process background worker scheduler)
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be accessible at `http://localhost:5173`.

### 3. Demo Credentials
If you ran the seed script, you can log in with:
- **Email:** `demo@applylog.dev`
- **Password:** `Password123!`
*(Or click the "Fill Demo Credentials" button on the login screen).*

---

## 🧩 Browser Extension Setup

1. Open Google Chrome or Microsoft Edge and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select the `Applicord/extension` folder.
4. Click the Applicord extension icon in your browser toolbar to log in and 1-click track job postings directly from LinkedIn, Indeed, Greenhouse, Lever, and Workday!

---

## 🧪 Testing Suite

Applicord includes comprehensive unit, service, and API integration tests:

```bash
cd backend
npm test
```

Tests cover:
- Application status transitions and terminal status validation
- Email classification, entity extraction, and confidence scoring
- Job URL intelligence parser (LinkedIn, Greenhouse, Lever, Indeed)
- Authentication rate limiting and security gates
- Status correction preserving audit trails

---

## 📡 API Reference Overview

### Authentication
- `POST /api/v1/auth/register` — Register a new account
- `POST /api/v1/auth/login` — Sign in and receive JWT tokens
- `POST /api/v1/auth/refresh` — Refresh access token
- `GET  /api/v1/auth/profile` — Get authenticated user details
- `PATCH /api/v1/auth/settings` — Update automation preferences & intervals
- `DELETE /api/v1/auth/account` — Delete account and all career records

### Applications
- `GET    /api/v1/applications` — List with search, filtering, sorting, pagination
- `POST   /api/v1/applications` — Track new job application
- `GET    /api/v1/applications/kanban` — Fetch applications grouped by status column
- `POST   /api/v1/applications/check-duplicate` — Real-time duplicate check
- `POST   /api/v1/applications/parse-url` — URL intelligence extractor
- `POST   /api/v1/applications/bulk-action` — Bulk status change, archive, delete
- `GET    /api/v1/applications/:id` — Full application details with relations
- `PATCH  /api/v1/applications/:id` — Update application fields
- `DELETE /api/v1/applications/:id` — Delete application
- `POST   /api/v1/applications/:id/status` — Record status transition event
- `POST   /api/v1/applications/correct-status` — Manual correction with audit preservation
- `GET    /api/v1/applications/:id/timeline` — Chronological status history

### Automation & Suggestions
- `GET  /api/v1/email/suggestions` — List pending status update suggestions
- `POST /api/v1/email/suggestions/:id/resolve` — Accept or dismiss suggestion
- `POST /api/v1/email/test-sync` — Run live sandbox simulation (Assessment, Interview, Rejection)

### Follow-ups & Reminders
- `GET    /api/v1/reminders` — List reminders (active / completed / overdue)
- `POST   /api/v1/reminders` — Create custom follow-up reminder
- `PATCH  /api/v1/reminders/:id` — Update / complete reminder
- `DELETE /api/v1/reminders/:id` — Delete reminder

### Data Portability
- `POST /api/v1/data/parse-csv` — Upload and preview CSV file
- `POST /api/v1/data/preview-import` — Validate column mapping & check duplicates
- `POST /api/v1/data/execute-import` — Import validated records
- `GET  /api/v1/data/export-csv` — Download CSV export
- `GET  /api/v1/data/export-json` — Download full JSON dataset backup

---

## 🔒 Security & Privacy by Design

- **User Scoping:** Every database query is strictly scoped by the authenticated user's ID.
- **Resource Ownership Verification:** Custom middleware strictly verifies ownership of applications, reminders, contacts, and documents before any read/write operation.
- **Token Security:** OAuth tokens and sensitive credentials are encrypted using AES-256-GCM.
- **Sanitized Logging:** Structured logs never output passwords, access tokens, or sensitive document text.
- **Protection Measures:** Helmet security headers, CORS origin isolation, request rate limiting, Zod schema validation, and secure password hashing via bcrypt.
