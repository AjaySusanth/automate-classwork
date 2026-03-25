import prisma from "../config/db.config.js";

/**
 * Internal (service-level) handlers for n8n workflows.
 * These bypass user-specific ownership checks since
 * they are protected by the INTERNAL_API_KEY instead of JWT.
 */

const toIsoString = (value) => {
  if (!value) return null;
  return value.toISOString ? value.toISOString() : value;
};

/**
 * GET /api/internal/telegram-linked
 * Returns all telegram-linked students (across all teachers/classrooms).
 */
export const getTelegramLinkedStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        telegramLinked: true,
        telegramChatId: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        telegramChatId: true,
      },
    });

    return res.status(200).json(students);
  } catch (error) {
    console.error("[internal] Error fetching telegram-linked students:", error);
    return res.status(500).json({ error: "Failed to fetch students" });
  }
};

/**
 * GET /api/internal/reminders/due-soon
 * Returns all unsent due reminders across ALL teachers.
 */
export const getDueReminders = async (req, res) => {
  try {
    const now = new Date();

    const reminders = await prisma.reminder.findMany({
      where: {
        sent: false,
        reminderTime: { lte: now },
        assignment: {
          submissions: {
            some: {
              status: "PENDING",
              student: {
                telegramLinked: true,
                telegramChatId: { not: null },
                // Only include students who are still members of the assignment's classroom
                memberships: {
                  some: {
                    classroom: {
                      assignments: {
                        some: { reminders: { some: { id: { not: undefined } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { reminderTime: "asc" },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            submissions: {
              where: {
                status: "PENDING",
                student: {
                  telegramLinked: true,
                  telegramChatId: { not: null },
                },
              },
              select: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    telegramChatId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const payload = reminders.map((reminder) => ({
      id: reminder.id,
      type: reminder.type,
      reminderTime: toIsoString(reminder.reminderTime),
      assignment: {
        id: reminder.assignment.id,
        title: reminder.assignment.title,
        dueDate: toIsoString(reminder.assignment.dueDate),
      },
      students: reminder.assignment.submissions.map(
        (submission) => submission.student,
      ),
    }));

    return res.status(200).json({ reminders: payload });
  } catch (error) {
    console.error("[internal] Get due reminders error:", error);
    return res.status(500).json({ error: "Failed to fetch due reminders" });
  }
};

/**
 * POST /api/internal/reminders/:id/mark-sent
 * Marks a reminder as sent (no ownership check).
 */
export const markReminderSent = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await prisma.reminder.findUnique({ where: { id } });

    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: { sent: true },
    });

    return res
      .status(200)
      .json({ reminder: { id: updated.id, sent: updated.sent } });
  } catch (error) {
    console.error("[internal] Mark reminder sent error:", error);
    return res.status(500).json({ error: "Failed to mark reminder as sent" });
  }
};
