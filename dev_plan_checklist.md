# Automated Classwork - Development Checklist

Backend-first, feature-by-feature plan with stop points and integration checks.

---

## Feature 0: Foundation (Setup + DB)

- [ ] Create project folders for backend, frontend, n8n-workflows
- [ ] Initialize backend (npm) and frontend (Vite React)
- [ ] Install backend dependencies (express, prisma, @prisma/client, jsonwebtoken, bcryptjs, cors, dotenv, node-cron, axios)
- [ ] Install frontend dependencies (axios, react-router-dom, recharts)
- [ ] Create Prisma schema with User, Assignment, Reminder, Submission, NotificationLog
- [ ] Run initial migration and generate Prisma client

**Stop point**

- [ ] Backend server starts
- [ ] Prisma Studio shows correct tables

---

## Feature 1: Authentication

**Backend first**

- [ ] Implement JWT middleware
- [ ] Implement auth controller (register, login, me)
- [ ] Add auth routes

**Stop point**

- [ ] Register creates user
- [ ] Login returns JWT
- [ ] Protected route blocks invalid token

**Frontend**

- [ ] Create Login page
- [ ] Create Register page
- [ ] Build AuthContext (login/logout, token storage)

**Integration check**

- [ ] Login from UI works and token is used on API calls

---

## Feature 2: Assignments CRUD + Auto Reminders

**Backend first**

- [ ] Assignment controller (CRUD)
- [ ] Role checks (teacher only for write)
- [ ] Auto-create 24h and 2h reminders on create
- [ ] Recalculate reminders on due date change
- [ ] Assignment routes

**Stop point**

- [ ] Creating assignment creates reminders in DB

**Frontend**

- [ ] Assignment list (teacher)
- [ ] Assignment form (create/edit)

**Integration check**

- [ ] Create assignment in UI and see in list
- [ ] Reminders exist in DB

---

## Feature 3: Submission Tracking

**Backend first**

- [ ] Submission controller (submit, list, by assignment, my submissions)
- [ ] Auto-mark late submissions
- [ ] (Optional) Create PENDING entries for all students on assignment creation
- [ ] Submission routes

**Stop point**

- [ ] Late submissions marked correctly

**Frontend**

- [ ] Student assignments list
- [ ] Student submit form
- [ ] Teacher submissions view (basic list)

**Integration check**

- [ ] Student submits from UI and status updates for teacher

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
