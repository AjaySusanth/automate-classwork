import express from "express";
import multer from "multer";
import {
  listSubmissions,
  listSubmissionsByAssignment,
  downloadAllSubmissions,
  submitAssignment,
  listMySubmissions,
  getMySubmission,
  gradeSubmission,
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
router.get(
  "/assignment/:id/download",
  authenticate,
  requireRole("TEACHER"),
  downloadAllSubmissions,
);
router.get("/my", authenticate, requireRole("STUDENT"), listMySubmissions);
router.get("/my/:assignmentId", authenticate, requireRole("STUDENT"), getMySubmission);
router.patch("/:submissionId/grade", authenticate, requireRole("TEACHER"), gradeSubmission);
router.post(
  "/:assignmentId",
  authenticate,
  requireRole("STUDENT"),
  upload.single("file"),
  submitAssignment,
);

export default router;
