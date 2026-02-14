import express from "express";
import {
  getDueReminders,
  markReminderSent,
} from "../controllers/reminderController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /api/reminders/due-soon
router.get("/due-soon", authenticate, requireRole("TEACHER"), getDueReminders);

// POST /api/reminders/:id/mark-sent
router.post(
  "/:id/mark-sent",
  authenticate,
  requireRole("TEACHER"),
  markReminderSent,
);

export default router;
