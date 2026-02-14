import express from "express";
import { sendTestNotification } from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/test", authenticate, sendTestNotification);

export default router;
