# n8n Workflows

This folder contains exported n8n workflows so the automation logic is versioned in Git.

## Assignment + Reminders Workflow

- File: `assignment-and-reminders.json`
- Branch 1 (Webhook): sends new-assignment Telegram notifications to all telegram-linked students.
- Branch 2 (Schedule Trigger): polls due reminders and sends reminder messages, then marks reminders as sent.

### Screenshot

![n8n workflow canvas](workflow.png)

## Notes

- Workflow JSON is sanitized (credentials and instance metadata removed).
- Required backend endpoints:
  - GET `/api/users/telegram-linked`
  - GET `/api/reminders/due-soon`
  - POST `/api/reminders/:id/mark-sent`
- Required environment variables:
  - `N8N_WEBHOOK_URL`
