import express from "express";
import multer from "multer";
import {
  listSubmissions,
  listSubmissionsByAssignment,
  submitAssignment,
  listMySubmissions,
  getMySubmission,
} from "../controllers/submissionController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.get("/", authenticate, requireRole("TEACHER"), listSubmissions);
router.get(
  "/assignment/:id",
  authenticate,
  requireRole("TEACHER"),
  listSubmissionsByAssignment,
);
router.get("/my", authenticate, requireRole("STUDENT"), listMySubmissions);
router.get("/my/:assignmentId", authenticate, requireRole("STUDENT"), getMySubmission);
router.post(
  "/:assignmentId",
  authenticate,
  requireRole("STUDENT"),
  upload.single("file"),
  submitAssignment,
);

export default router;
