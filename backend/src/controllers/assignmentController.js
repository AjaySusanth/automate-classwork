import prisma from "../config/db.config.js";

const parseDueDate = (dueDate) => {
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const buildDefaultReminders = (assignmentId, dueDate) => {
  const dueTime = dueDate.getTime();
  return [
    {
      assignmentId,
      reminderTime: new Date(dueTime - 24 * 60 * 60 * 1000),
      type: "H24",
    },
    {
      assignmentId,
      reminderTime: new Date(dueTime - 2 * 60 * 60 * 1000),
      type: "H2",
    },
  ];
};

export const listAssignments = async (req, res) => {
  try {
    const where =
      req.user.role === "TEACHER" ? { createdById: req.user.id } : {};

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    res.json({ assignments });
  } catch (error) {
    console.error("List assignments error:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (req.user.role === "TEACHER" && assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

export const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;

    if (!title || !description || !dueDate) {
      return res
        .status(400)
        .json({ error: "Title, description, and dueDate are required" });
    }

    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return res.status(400).json({ error: "Invalid dueDate" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          title,
          description,
          dueDate: parsedDueDate,
          createdById: req.user.id,
        },
      });

      const reminders = buildDefaultReminders(assignment.id, parsedDueDate);
      await tx.reminder.createMany({ data: reminders });

      const students = await tx.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true },
      });

      if (students.length > 0) {
        await tx.submission.createMany({
          data: students.map((student) => ({
            assignmentId: assignment.id,
            studentId: student.id,
          })),
        });
      }

      return assignment;
    });

    res.status(201).json({ assignment: result });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
};

export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    let parsedDueDate = null;
    const dueDateChanged = typeof dueDate !== "undefined";
    if (dueDateChanged) {
      parsedDueDate = parseDueDate(dueDate);
      if (!parsedDueDate) {
        return res.status(400).json({ error: "Invalid dueDate" });
      }
      updateData.dueDate = parsedDueDate;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.update({
        where: { id },
        data: updateData,
      });

      if (dueDateChanged) {
        await tx.reminder.deleteMany({ where: { assignmentId: id } });
        const reminders = buildDefaultReminders(id, parsedDueDate);
        await tx.reminder.createMany({ data: reminders });
      }

      return updated;
    });

    res.json({ assignment: result });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ error: "Failed to update assignment" });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.reminder.deleteMany({ where: { assignmentId: id } });
      await tx.submission.deleteMany({ where: { assignmentId: id } });
      await tx.notificationLog.deleteMany({ where: { assignmentId: id } });
      await tx.assignment.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
};
