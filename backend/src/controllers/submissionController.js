import prisma from "../config/db.config.js";
import notificationService from "../services/notifications/notificationSetup.js";
import storageProvider from "../services/storage/storageSetup.js";
import archiver from "archiver";

const getSubmissionStatus = (submittedAt, dueDate) => {
  return submittedAt > dueDate ? "LATE" : "SUBMITTED";
};

/**
 * Fire-and-forget Telegram confirmation after a successful submission.
 * Never throws — errors are silently logged.
 */
const sendSubmissionConfirmation = (studentId, assignmentTitle, assignmentId, status) => {
  (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, telegramChatId: true, telegramLinked: true },
      });

      if (!user?.telegramLinked || !user?.telegramChatId?.trim()) return;

      const statusEmoji = status === "LATE" ? "⚠️ Late" : "✅ On Time";
      const message =
        `✅ Assignment Submitted!\n` +
        `📝 ${assignmentTitle}\n` +
        `⏰ Status: ${statusEmoji}`;

      await notificationService.send(user, message, "telegram", assignmentId);
    } catch (err) {
      console.error("Submission confirmation failed:", err?.message || err);
    }
  })();
};

/**
 * Build storage path for a submission file.
 */
const buildStoragePath = (assignmentId, studentId, fileName) => {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${assignmentId}/${studentId}/${timestamp}-${safeName}`;
};

export const listSubmissions = async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        assignment: {
          select: { id: true, title: true, dueDate: true },
        },
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ submissions });
  } catch (error) {
    console.error("List submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const listSubmissionsByAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { id: true, createdById: true, title: true, dueDate: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: id },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ assignment, submissions });
  } catch (error) {
    console.error("List submissions by assignment error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const downloadAllSubmissions = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      select: { id: true, createdById: true, title: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: id, fileUrl: { not: null } },
      include: {
        student: { select: { name: true } },
      },
    });

    if (submissions.length === 0) {
      return res.status(404).json({ error: "No submitted files to download" });
    }

    const safeName = assignment.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_submissions.zip"`);

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(res);

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create archive" });
      }
    });

    for (const submission of submissions) {
      const studentName = (submission.student?.name || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = submission.fileName || "file";
      const entryName = `${studentName}_${fileName}`;

      try {
        const response = await fetch(submission.fileUrl);
        if (!response.ok) {
          console.error(`Failed to fetch file for ${studentName}: ${response.status}`);
          continue;
        }
        // Convert web ReadableStream to Node stream
        const { Readable } = await import("stream");
        const nodeStream = Readable.fromWeb(response.body);
        archive.append(nodeStream, { name: entryName });
      } catch (fetchErr) {
        console.error(`Failed to fetch file for ${studentName}:`, fetchErr.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Download all submissions error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download submissions" });
    }
  }
};

export const getMySubmission = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: req.user.id,
        },
      },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        status: true,
        submittedAt: true,
        grade: true,
        gradedAt: true,
      },
    });

    res.json({ submission });
  } catch (error) {
    console.error("Get my submission error:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
};


export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "A file is required for submission" });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, title: true, dueDate: true, classroomId: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Verify student is a member of the assignment's classroom
    if (assignment.classroomId) {
      const membership = await prisma.classroomMember.findUnique({
        where: {
          classroomId_studentId: {
            classroomId: assignment.classroomId,
            studentId: req.user.id,
          },
        },
      });
      if (!membership) {
        return res.status(403).json({ error: "You are not a member of this classroom" });
      }
    }

    // Check for existing submission and locking rules
    const existing = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: req.user.id,
        },
      },
    });

    if (existing && existing.fileUrl) {
      // A real submission already exists
      if (existing.grade !== null) {
        return res.status(403).json({ error: "Cannot update a graded submission" });
      }
      if (new Date() > assignment.dueDate) {
        return res.status(403).json({ error: "Cannot update submission after the due date" });
      }
    }

    // Upload file to storage
    const storagePath = buildStoragePath(assignmentId, req.user.id, file.originalname);
    const { url: fileUrl } = await storageProvider.upload(
      file.buffer,
      storagePath,
      file.mimetype,
    );

    const submittedAt = new Date();
    const status = getSubmissionStatus(submittedAt, assignment.dueDate);

    try {
      const submission = await prisma.submission.create({
        data: {
          assignmentId,
          studentId: req.user.id,
          fileUrl,
          fileName: file.originalname,
          status,
          submittedAt,
        },
      });

      sendSubmissionConfirmation(req.user.id, assignment.title, assignmentId, status);
      return res.status(201).json({ submission });
    } catch (error) {
      if (error?.code === "P2002") {
        // Resubmission — re-validate with a conditional update to prevent race conditions
        // Clean up old file if it exists
        if (existing?.fileUrl) {
          try {
            const afterPublic = existing.fileUrl.split("/storage/v1/object/public/").pop();
            const oldKey = afterPublic.substring(afterPublic.indexOf("/") + 1);
            if (oldKey) await storageProvider.delete(oldKey);
          } catch (deleteErr) {
            console.error("Old file cleanup failed:", deleteErr?.message);
          }
        }

        // Conditional update: only succeeds if submission is not graded
        const result = await prisma.submission.updateMany({
          where: {
            assignmentId,
            studentId: req.user.id,
            grade: null, // Only allow update if not yet graded
          },
          data: {
            fileUrl,
            fileName: file.originalname,
            status,
            submittedAt,
          },
        });

        if (result.count === 0) {
          // The update didn't match — submission was graded or state changed
          // Clean up the newly uploaded file since we can't use it
          try {
            await storageProvider.delete(storagePath);
          } catch (_) { /* best effort */ }
          return res.status(403).json({ error: "Submission is locked and cannot be updated" });
        }

        // Fetch the updated record to return it
        const updatedSubmission = await prisma.submission.findUnique({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: req.user.id,
            },
          },
        });

        sendSubmissionConfirmation(req.user.id, assignment.title, assignmentId, status);
        return res.status(200).json({ submission: updatedSubmission });
      }

      throw error;
    }
  } catch (error) {
    console.error("Submit assignment error:", error);
    res.status(500).json({ error: "Failed to submit assignment" });
  }
};

export const listMySubmissions = async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: req.user.id,
        assignment: {
          classroom: {
            members: { some: { studentId: req.user.id } },
          },
        },
      },
      select: {
        id: true,
        assignmentId: true,
        status: true,
        submittedAt: true,
        grade: true,
        gradedAt: true,
        fileName: true,
        assignment: {
          select: { id: true, title: true, dueDate: true, totalMark: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ submissions });
  } catch (error) {
    console.error("List my submissions error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade } = req.body;

    if (grade == null || typeof grade !== "number" || grade < 0) {
      return res.status(400).json({ error: "A valid grade is required" });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          select: { id: true, createdById: true, totalMark: true },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (submission.assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (submission.assignment.totalMark != null && grade > submission.assignment.totalMark) {
      return res
        .status(400)
        .json({ error: `Grade cannot exceed total marks (${submission.assignment.totalMark})` });
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade,
        gradedAt: new Date(),
      },
    });

    res.json({ submission: updated });
  } catch (error) {
    console.error("Grade submission error:", error);
    res.status(500).json({ error: "Failed to grade submission" });
  }
};
