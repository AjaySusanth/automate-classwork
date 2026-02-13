import prisma from "../config/db.config.js";


const getSubmissionStatus = (submittedAt, dueDate) => {
  return submittedAt > dueDate ? "LATE" : "SUBMITTED";
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

export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Submission content is required" });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, dueDate: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const submittedAt = new Date();
    const status = getSubmissionStatus(submittedAt, assignment.dueDate);

    try {
      const submission = await prisma.submission.create({
        data: {
          assignmentId,
          studentId: req.user.id,
          content,
          status,
          submittedAt,
        },
      });

      return res.status(201).json({ submission });
    } catch (error) {
      if (error?.code === "P2002") {
        const submission = await prisma.submission.update({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: req.user.id,
            },
          },
          data: {
            content,
            status,
            submittedAt,
          },
        });

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
