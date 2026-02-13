import express from "express";
import {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignmentController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, listAssignments);
router.get("/:id", authenticate, getAssignmentById);
router.post("/", authenticate, requireRole("TEACHER"), createAssignment);
router.put("/:id", authenticate, requireRole("TEACHER"), updateAssignment);
router.delete("/:id", authenticate, requireRole("TEACHER"), deleteAssignment);

export default router;
