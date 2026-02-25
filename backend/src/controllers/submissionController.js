import prisma from "../config/db.config.js";
import notificationService from "../services/notifications/notificationSetup.js";
import storageProvider from "../services/storage/storageSetup.js";

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
      select: { id: true, title: true, dueDate: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
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
        // Resubmission — delete old file, then update record
        const existing = await prisma.submission.findUnique({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: req.user.id,
            },
          },
          select: { fileUrl: true },
        });

        if (existing?.fileUrl) {
          // Extract path within bucket from Supabase public URL
          // URL format: .../storage/v1/object/public/<bucket>/<path>
          try {
            const afterPublic = existing.fileUrl.split("/storage/v1/object/public/").pop();
            // Strip the bucket name prefix to get the key within the bucket
            const oldKey = afterPublic.substring(afterPublic.indexOf("/") + 1);
            if (oldKey) await storageProvider.delete(oldKey);
          } catch (deleteErr) {
            console.error("Old file cleanup failed:", deleteErr?.message);
          }
        }

        const submission = await prisma.submission.update({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: req.user.id,
            },
          },
          data: {
            fileUrl,
            fileName: file.originalname,
            status,
            submittedAt,
          },
        });

        sendSubmissionConfirmation(req.user.id, assignment.title, assignmentId, status);
        return res.status(200).json({ submission });
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
      where: { studentId: req.user.id },
      include: {
        assignment: {
          select: { id: true, title: true, dueDate: true },
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
