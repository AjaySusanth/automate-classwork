# Automated Classwork

[![CI/CD Pipeline](https://github.com/AjaySusanth/automate-classwork/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/AjaySusanth/automate-classwork/actions/workflows/ci-cd.yml)
[![Node.js](https://img.shields.io/badge/Node.js-v22-green.svg?style=flat&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue.svg?style=flat&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38BDF8.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-v7-2D3748.svg?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![n8n](https://img.shields.io/badge/n8n-Workflow_Automation-FF6C37.svg?style=flat&logo=n8n)](https://n8n.io/)
[![Azure](https://img.shields.io/badge/Azure-Container_Apps-0089D6.svg?style=flat&logo=microsoft-azure)](https://azure.microsoft.com/)

A production-grade, event-driven educational automation platform that streamlines assignment delivery, submission tracking, and student deadline reminders. Built with a self-hosted **n8n orchestration layer** and **Telegram integration** for real-time, fault-tolerant notification delivery.

> **Live Demo:** https://classwork-api-prod.purpleflower-3dc62b84.centralindia.azurecontainerapps.io &nbsp;|&nbsp; **Bot:** https://t.me/ClassworkNotifBot

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Engineering Highlights](#engineering-highlights)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Roadmap](#roadmap)

---

## Overview

Automated Classwork solves a real operational gap in classroom management: teachers spend significant time manually notifying students about assignments and chasing defaulters. This platform automates that entire lifecycle.

**What it does:**
- Teachers publish assignments through a dashboard — students are notified on Telegram instantly
- A scheduled workflow polls for pending submissions before deadlines and sends targeted reminders
- Students can check assignment status and submit through a dedicated portal
- Teachers get an analytics dashboard with submission rates, defaulter lists, and deadline telemetry

**Why it's interesting technically:** The core API is intentionally kept thin and fast. All notification orchestration, scheduling, and message formatting are offloaded to n8n — a pattern that mirrors how production systems at scale separate real-time API concerns from async background processing.

---

## System Architecture

The platform follows a **decoupled micro-automations** pattern. The REST API handles fast CRUD and authentication; long-running notification pipelines and polling schedules are delegated to n8n workflows acting as an out-of-band processing layer.

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React 19 + Vite + Tailwind v4)"]
        TD["Teacher Portal — Analytics Dashboard"]
        SD["Student Portal — Grade & Status Views"]
    end

    subgraph Backend["Backend (Node.js + Express 5)"]
        API["REST API (JWT Auth / RBAC)"]
        PRISMA["Prisma ORM"]
        NS["Notification Service Abstraction"]
    end

    subgraph Database["Database (PostgreSQL 16)"]
        DB[("PostgreSQL")]
    end

    subgraph Automation["Automation Layer (n8n)"]
        WH["Webhook Receivers"]
        SCH["Cron Schedulers"]
        TG["Telegram Bot API"]
    end

    Frontend -->|HTTPS / REST| API
    API --> PRISMA
    PRISMA --> DB
    API -->|Async Webhook Dispatch| WH
    SCH -->|Poll /reminders/due-soon| API
    WH -->|Push Notification| TG
    SCH -->|Remind Defaulters| TG
    TG -->|Command Router| WH
    WH -->|Token Exchange / Account Binding| API
```

### Notification Pipeline

Two async flows handle all messaging without blocking the web server:

**Assignment creation flow:** When a teacher publishes an assignment, the API returns immediately. A background webhook fires to n8n, which resolves the class list, filters students with linked Telegram accounts, and bulk-dispatches notifications.

**Deadline reminder flow:** A cron workflow periodically polls `/api/reminders/due-soon`, identifies students with pending submissions, sends Telegram alerts, and updates the database — entirely outside the request cycle.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router v7, Recharts | Tailwind v4's CSS variable engine enables zero-runtime theming. Recharts drives the teacher analytics dashboard. |
| **Backend** | Node.js v22, Express 5 (ESM) | Express 5 natively resolves async router rejections, removing the need for `try/catch` boilerplate across controllers. |
| **Database** | PostgreSQL 16, Prisma ORM v7 | ACID guarantees correctness for grading operations. Prisma v7 provides type-safe queries and automated migration tracking. |
| **Automation** | n8n (self-hosted) | Moves complex orchestration, scheduling, and message formatting out of the Node.js process into a scalable visual workflow engine. |
| **Infrastructure** | Terraform, Azure Container Apps | Full IaC definition. Container Apps scale to zero when idle, keeping cloud costs minimal. |
| **CI/CD** | GitHub Actions | Multi-stage pipeline with quality gates, OIDC credential exchange, staging smoke tests, and Blue/Green production rollouts. |

---

## Engineering Highlights

### 1. Channel-Agnostic Notification Architecture

Notification delivery is abstracted behind an interface rather than hardcoded to Telegram. Adding a new channel (e.g., WhatsApp via Twilio) requires only implementing the interface and registering it with the `NotificationService` — no changes to business logic.

```javascript
// backend/src/services/notifications/NotificationChannel.js
export class NotificationChannel {
  async sendMessage(userId, message) {
    throw new Error('Method not implemented');
  }
  getName() {
    throw new Error('Method not implemented');
  }
}
```

### 2. Secure Telegram Account Binding

Account linking uses a token-based handshake that avoids exposing credentials or requiring manual chat ID entry:

1. Student requests a link token from the web portal
2. Backend generates a signed token with a 10-minute TTL
3. Frontend renders a deep-link: `t.me/YourBot?start=TOKEN`
4. Clicking the link sends `/start TOKEN` to the Telegram bot
5. n8n receives the webhook, extracts the token, and calls `/api/telegram/link` to bind the account

### 3. Atomic Enrollment with Submission Backfill

When a student joins a classroom mid-course, the enrollment must also create pending submission records for all existing assignments — or not at all. This is handled atomically:

```javascript
const member = await prisma.$transaction(async (tx) => {
  const newMember = await tx.classroomMember.create({ ... });
  const existingAssignments = await tx.assignment.findMany({ ... });

  if (existingAssignments.length > 0) {
    await tx.submission.createMany({ ... }); // backfill PENDING records
  }

  return newMember;
});
```

If any step fails, the entire transaction rolls back — no orphaned records, no partial state.

---

## Project Structure

```
automated-classwork/
├── .github/
│   └── workflows/
│       └── ci-cd.yml                       # GitHub Actions CI/CD pipeline
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                   # Database schema
│   │   └── migrations/                     # Migration history
│   └── src/
│       ├── config/                         # DB client configuration
│       ├── controllers/                    # Auth, Assignments, Classrooms
│       ├── middleware/                     # JWT guards, RBAC
│       ├── routes/                         # API route definitions
│       └── server.js                       # Entry point
├── frontend/
│   └── src/
│       ├── components/                     # Charts, Cards, Defaulter tables
│       ├── context/                        # Auth & global state
│       ├── pages/                          # Dashboards, link handlers
│       ├── services/                       # Axios API clients
│       └── App.jsx                         # Routes & layout
├── infra/
│   └── terraform/                          # Azure IaC scripts
├── n8n-workflows/
│   ├── assignment-and-reminders.json       # Assignment dispatch + reminder cron
│   ├── Telegram Command Router.json        # /start, /assignments command router
│   └── README.md                           # n8n setup guide
├── tests/                                  # Vitest unit & integration tests
├── docker-compose.yml                      # Local PostgreSQL setup
└── nginx.conf                              # Reverse proxy config
```

---

## Local Setup

### Prerequisites

- [Node.js v22+](https://nodejs.org/en)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

---

### Step 1 — Start the local database

```bash
docker compose up -d
```

### Step 2 — Configure and start the backend

```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example`:

```env
PORT=3001
DATABASE_URL="postgresql://classwork:classwork_dev@localhost:5432/classwork?schema=public"
JWT_SECRET="your-secret-key"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
N8N_WEBHOOK_URL="http://localhost:5678/webhook/assignment-created"
```

Run migrations and start the server:

```bash
npx prisma migrate dev
npm run dev
# Server runs at http://localhost:3001
```

### Step 3 — Start the frontend

```bash
cd frontend
npm install
npm run dev
# Client runs at http://localhost:5173
```

### Step 4 — Import n8n workflows

1. Start a local n8n instance or connect to your cloud instance
2. Go to the workflow canvas → **Import from File**
3. Import both files from `/n8n-workflows/`:
   - `assignment-and-reminders.json`
   - `Telegram Command Router.json`
4. Follow the credential setup guide in [`n8n-workflows/README.md`](./n8n-workflows/README.md)

---

## CI/CD Pipeline

The pipeline runs on every push to `main` across three stages:

```
Quality Gate  ──►  Build & Staging Deploy  ──►  Blue/Green Production Rollout
```

**Quality Gate** — Runs Vitest test suite and ESLint checks. Blocks the pipeline on failure.

**Build & Staging Deploy** — Builds multi-stage Docker images and pushes to Azure Container Registry. Deploys to the staging Container App and runs curl health checks on `/health` for 2 minutes to confirm startup.

**Blue/Green Production Rollout:**
- Deploys a new container revision at **0% traffic weight**
- Smoke-tests the revision using its unique FQDN
- On success: shifts 100% traffic to the new revision, deactivates old ones
- On failure: shifts 100% traffic back to the last known-good revision and deactivates the broken one — zero downtime in either path

---

## Author

Built by [Ajay Susanth](https://github.com/AjaySusanth).

_Feedback and contributions welcome — open an issue or submit a PR._
