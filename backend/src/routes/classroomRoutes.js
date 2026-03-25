import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  createClassroom,
  listClassrooms,
  getClassroom,
  joinClassroom,
  leaveClassroom,
  removeMember,
  deleteClassroom,
} from "../controllers/classroomController.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Classroom CRUD
router.post("/", requireRole("TEACHER"), createClassroom);
router.get("/", listClassrooms);
router.get("/:id", getClassroom);
router.delete("/:id", requireRole("TEACHER"), deleteClassroom);

// Student join/leave
router.post("/join", requireRole("STUDENT"), joinClassroom);
router.post("/:id/leave", requireRole("STUDENT"), leaveClassroom);

// Teacher member management
router.delete("/:id/members/:studentId", requireRole("TEACHER"), removeMember);

export default router;
