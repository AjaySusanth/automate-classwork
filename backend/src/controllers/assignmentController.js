import axios from "axios";
import prisma from "../config/db.config.js";

const notifyN8nAssignmentCreated = async (assignment) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const payload = {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate?.toISOString?.() ?? assignment.dueDate,
    createdById: assignment.createdById,
  };

  try {
    await axios.post(webhookUrl, payload, { timeout: 5000 });
  } catch (error) {
    console.error("n8n webhook failed:", error?.message || error);
  }
};

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
    const { classroomId } = req.query;
    let where = {};

    if (req.user.role === "TEACHER") {
      where = { createdById: req.user.id };
      if (classroomId) where.classroomId = classroomId;
    } else {
      // Students see only assignments in their classrooms
      where = {
        classroom: {
          members: { some: { studentId: req.user.id } },
        },
      };
      if (classroomId) where.classroomId = classroomId;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        classroom: { select: { id: true, name: true } },
      },
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
      include: {
        classroom: { select: { id: true, name: true } },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (req.user.role === "TEACHER" && assignment.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Student must be a member of the assignment's classroom
    if (req.user.role === "STUDENT" && assignment.classroomId) {
      const membership = await prisma.classroomMember.findUnique({
        where: {
          classroomId_studentId: {
            classroomId: assignment.classroomId,
            studentId: req.user.id,
          },
        },
      });
      if (!membership) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    res.json({ assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

export const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, classroomId, totalMark } = req.body;

    if (!title || !description || !dueDate) {
      return res
        .status(400)
        .json({ error: "Title, description, and dueDate are required" });
    }

    if (!classroomId) {
      return res.status(400).json({ error: "classroomId is required" });
    }

    // Verify teacher owns the classroom
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, teacherId: true },
    });

    if (!classroom || classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: "You do not own this classroom" });
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
          classroomId,
          totalMark: totalMark ? Number(totalMark) : null,
        },
      });

      const reminders = buildDefaultReminders(assignment.id, parsedDueDate);
      await tx.reminder.createMany({ data: reminders });

      // Create submission placeholders only for classroom members
      const members = await tx.classroomMember.findMany({
        where: { classroomId },
        select: { studentId: true },
      });

      if (members.length > 0) {
        await tx.submission.createMany({
          data: members.map((m) => ({
            assignmentId: assignment.id,
            studentId: m.studentId,
          })),
        });
      }

      return assignment;
    });

    await notifyN8nAssignmentCreated(result);
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

/**
 * Get pending assignments for a student (not yet submitted).
 * Used for Telegram /assignments command and student dashboard.
 */
export const getPendingAssignments = async (req, res) => {
  try {
    const { id: studentId } = req.user;

    const assignments = await prisma.assignment.findMany({
      where: {
        classroom: {
          members: { some: { studentId } },
        },
        submissions: {
          some: {
            studentId,
            status: "PENDING",
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    res.json({ assignments });
  } catch (error) {
    console.error("Get pending assignments error:", error);
    res.status(500).json({ error: "Failed to fetch pending assignments" });
  }
};

/**
 * Get pending assignments for a student by their Telegram chatId.
 * Used for n8n workflows (no JWT required).
 */
export const getPendingAssignmentsByChatId = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Find user by telegram chat ID
    const user = await prisma.user.findUnique({
      where: { telegramChatId: chatId },
      select: { id: true, name: true, telegramLinked: true },
    });

    if (!user || !user.telegramLinked) {
      return res.status(404).json({ error: "User not linked to this Telegram account" });
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        classroom: {
          members: { some: { studentId: user.id } },
        },
        submissions: {
          some: {
            studentId: user.id,
            status: "PENDING",
          },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
      },
      orderBy: { dueDate: "asc" },
    });

    res.json({ assignments, userName: user.name });
  } catch (error) {
    console.error("Get pending assignments by chat ID error:", error);
    res.status(500).json({ error: "Failed to fetch pending assignments" });
  }
};
