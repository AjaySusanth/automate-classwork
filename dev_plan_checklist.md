# Automated Classwork - Development Checklist

Backend-first, feature-by-feature plan with stop points and integration checks.

---

## Feature 0: Foundation (Setup + DB)

- [x] Create project folders for backend, frontend, n8n-workflows
- [x] Initialize backend (npm) and frontend (Vite React)
- [x] Install backend dependencies (express, prisma, @prisma/client, jsonwebtoken, bcryptjs, cors, dotenv, node-cron, axios)
- [x] Install frontend dependencies (axios, react-router-dom, recharts)
- [x] Install Tailwind CSS for frontend styling
- [x] Create Prisma schema with User, Assignment, Reminder, Submission, NotificationLog
- [x] Run initial migration and generate Prisma client
- [x] Create frontend folder structure (components, pages, services, context)
- [x] Add frontend .env.example

**Stop point**

- [x] Backend server starts
- [x] Prisma Studio shows correct tables
- [x] Health endpoint returns {"status":"ok","db":"connected"}

---

## Feature 1: Authentication

**Backend first**

- [x] Implement JWT middleware
- [x] Implement auth controller (register, login, me)
- [x] Add auth routes
- [x] Handle unique constraint race condition (P2002)

**Stop point**

- [x] Register creates user
- [x] Login returns JWT
- [x] Protected route blocks invalid token

**Frontend**

- [x] Create Login page
- [x] Create Register page
- [x] Build AuthContext (login/logout, token storage)
- [x] Create API service layer
- [x] Create ProtectedRoute component
- [x] Wire up React Router

**Integration check**

- [x] Login from UI works and token is used on API calls

---

## Feature 2: Assignments CRUD + Auto Reminders

**Backend first**

- [x] Assignment controller (CRUD)
- [x] Role checks (teacher only for write)
- [x] Auto-create 24h and 2h reminders on create
- [x] Recalculate reminders on due date change
- [x] Assignment routes

**Stop point**

- [x] Creating assignment creates reminders in DB

**Frontend**

- [x] Assignment list (teacher)
- [x] Assignment form (create/edit)

**Integration check**

- [x] Create assignment in UI and see in list
- [x] Reminders exist in DB

---

## Feature 3: Submission Tracking

**Backend first**

- [x] Submission controller (submit, list, by assignment, my submissions)
- [x] Auto-mark late submissions
- [x] (Optional) Create PENDING entries for all students on assignment creation
- [x] Submission routes

**Stop point**

- [x] Late submissions marked correctly

**Frontend**

- [x] Student assignments list
- [x] Student submit form
- [x] Teacher submissions view (basic list)

**Integration check**

- [x] Student submits from UI and status updates for teacher

---

## Feature 4: Notification Service Abstraction

**Backend first**

- [ ] Create NotificationChannel base interface
- [ ] Implement TelegramChannel
- [ ] Implement NotificationService registry
- [ ] Log notifications to DB
- [ ] Add WhatsAppChannel stub

**Stop point**

- [ ] Test send creates NotificationLog entry
- [ ] Telegram send succeeds

**Frontend**

- [ ] No UI required (optional admin test later)

---

## Feature 5: n8n Workflows (Automation)

**Backend first**

- [ ] Webhook endpoints: pending students, due reminders, log notification

**Stop point**

- [ ] Webhook endpoints return correct data

**n8n**

- [ ] New assignment notification workflow
- [ ] Scheduled reminders workflow
- [ ] Workflow README for setup

**Integration check**

- [ ] Creating assignment triggers student notifications
- [ ] Reminders sent only to pending students

---

## Feature 6: Telegram /start Linking Flow

**Backend first**

- [ ] Link token generation endpoint
- [ ] Link chatId endpoint
- [ ] Token storage and expiry
- [ ] Prevent duplicate chatId links

**Stop point**

- [ ] Token expires correctly
- [ ] ChatId links to correct user

**n8n**

- [ ] Telegram /start handler workflow
- [ ] Bot replies with link URL

**Frontend**

- [ ] Link Telegram page

**Integration check**

- [ ] /start -> link -> chatId saved

---

## Feature 7: Frontend Integration + Polish

- [ ] API layer (Axios instance + services)
- [ ] Protected routes by role
- [ ] Error handling and 404 page

**Integration check**

- [ ] Full flow works for teacher and student

---

## Testing

**Automated**

- [ ] Auth tests
- [ ] Assignment CRUD tests
- [ ] Submission tests
- [ ] Webhook tests

**Manual**

- [ ] Auth flow checklist
- [ ] Assignment flow checklist
- [ ] Notification flow checklist
- [ ] Submission tracking checklist
