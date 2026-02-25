This document outlines the architectural evolution of **Automated Classwork** from a monolithic prototype to a production-grade, event-driven distributed system. It is designed to demonstrate competency in high-concurrency backend patterns, Cloud Infrastructure (IaC), and AI integration.

---

# 📋 Project Specification: Automated Classwork (v2.0)

**Role:** Senior Backend & DevOps Engineer

**Objective:** A scalable, AI-enhanced educational automation platform leveraging Telegram for low-latency student engagement.

---

## 🏗️ 1. System Architecture

To move beyond a simple CRUD app, the architecture follows an **Event-Driven Micro-services** pattern. This ensures the API remains responsive while heavy lifting (notifications, AI processing) happens in the background.

### **Core Components**

* **API Gateway (Express.js):** Handles authentication (JWT), RBAC, and core CRUD. Optimized with Redis caching for high-read endpoints like `/assignments`.
* **Asynchronous Task Queue (BullMQ + Redis):** Manages "fire-and-forget" tasks (Telegram notifications, deadline reminders, AI grading) to prevent API blocking.
* **AI Intelligence Layer:** Utilizes **Azure OpenAI** or **LangChain** for automated submission feedback and RAG-based (Retrieval-Augmented Generation) syllabus queries.
* **Persistence Layer:** * **PostgreSQL:** Relational data and `pgvector` for semantic search.
* **Azure Blob Storage:** Persistent storage for student file uploads (PDFs/Images).



---

## 🛠️ 2. Technical Stack & Justification

| Layer | Technology | Justification |
| --- | --- | --- |
| **Compute** | Azure Container Apps | Serverless container orchestration; scales to zero to save Azure credits. |
| **Database** | PostgreSQL + Prisma | Type-safe ORM with support for complex relational mapping and vector embeddings. |
| **Messaging** | Redis (BullMQ) | Handles high-concurrency background jobs and rate-limiting for Telegram. |
| **IAAS/IaC** | Terraform / Bicep | Ensures the entire infrastructure is reproducible and version-controlled. |
| **CI/CD** | GitHub Actions | Automated linting, Vitest unit testing, and Docker builds on every push. |
| **AI** | Azure OpenAI (GPT-4o) | Provides semantic understanding of submissions and student queries. |

---

## 🚀 3. Engineering Highlights (The "Senior" Focus)

### **A. Scalability & Reliability**

* **Webhook Resilience:** Instead of the API calling n8n/Telegram directly, jobs are pushed to a Redis queue. This ensures that if the Telegram API is down, the system retries until successful (Exponential Backoff).
* **Database Optimization:** Implemented database indexing on `email` and `telegramChatId` to ensure  or  lookup times as the student body grows.

### **B. AI-Driven Automation (RAG)**

The system implements a **Knowledge Retrieval** bot. Students can upload a syllabus or lecture notes, which are then chunked and stored as embeddings.

* **Flow:** Student asks `/ask When is the midterm?` → System performs a vector similarity search in PostgreSQL → LLM generates a precise answer based *only* on the provided documents.

### **C. Security & Observability**

* **Zero Trust Principles:** All internal secrets (DB strings, API keys) are managed via **Azure Key Vault** and injected at runtime—never stored in `.env`.
* **Observability:** Integrated **OpenTelemetry** for distributed tracing. This allows us to track a request from the Telegram Bot, through the API, into the Redis queue, and finally to the DB.

---

## ☁️ 4. DevOps & Deployment Strategy

The project utilizes a fully automated **GitOps** workflow.

1. **Infrastructure as Code:** A `/terraform` directory defines the Azure Resource Group, Container App Environment, and Managed Postgres.
2. **Containerization:** Multi-stage Docker builds to keep image sizes  for faster deployment.
3. **Deployment Pipeline:**
* **Quality Gate:** Runs `vitest` for business logic and `eslint` for code standards.
* **Build:** Pushes images to **Azure Container Registry (ACR)**.
* **Release:** Blue/Green deployment to Azure Container Apps to ensure zero downtime.



---

## 📈 5. Future Roadmap

* **Multi-Tenant Support:** Implementing "Classroom IDs" to allow independent teachers to manage their own student clusters.
* **WhatsApp Integration:** Implementing a `NotificationProvider` interface to swap between Telegram and WhatsApp (via Twilio) seamlessly.
* **Advanced Analytics:** A Grafana dashboard showing submission rates and average student "sentiment" via AI analysis of submissions.
