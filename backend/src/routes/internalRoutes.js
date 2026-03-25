import express from "express";
import { serviceAuth } from "../middleware/serviceAuth.js";
import {
  getTelegramLinkedStudents,
  getDueReminders,
  markReminderSent,
} from "../controllers/internalController.js";

const router = express.Router();

// All routes here require INTERNAL_API_KEY
router.use(serviceAuth);

router.get("/telegram-linked", getTelegramLinkedStudents);
router.get("/reminders/due-soon", getDueReminders);
router.post("/reminders/:id/mark-sent", markReminderSent);

export default router;
