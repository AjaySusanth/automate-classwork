import express from "express";
import {
  listSubmissions,
  listSubmissionsByAssignment,
  submitAssignment,
  listMySubmissions,
} from "../controllers/submissionController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, requireRole("TEACHER"), listSubmissions);
router.get(
  "/assignment/:id",
  authenticate,
  requireRole("TEACHER"),
  listSubmissionsByAssignment,
);
router.get("/my", authenticate, requireRole("STUDENT"), listMySubmissions);
router.post(
  "/:assignmentId",
  authenticate,
  requireRole("STUDENT"),
  submitAssignment,
);

export default router;
