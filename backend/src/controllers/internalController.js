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
 * Returns telegram-linked students, optionally scoped to a specific classroom.
 *
 * If classroomId is provided → return only members of that classroom who have
 * Telegram linked (targeted, correct behaviour for assignment notifications).
 * If classroomId is omitted → return ALL telegram-linked students (generic broadcast).
 */
export const getTelegramLinkedStudents = async (req, res) => {
  try {
    const { classroomId } = req.query;

    const where = {
      role: "STUDENT",
      telegramLinked: true,
      telegramChatId: { not: null },
      // Only scope to classroom members when classroomId is supplied
      ...(classroomId && {
        memberships: {
          some: { classroomId },
        },
      }),
    };

    const students = await prisma.user.findMany({
      where,
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
 * Self-healing: automatically marks reminders with no remaining active students as sent.
 */
export const getDueReminders = async (req, res) => {
  try {
    const now = new Date();

    const reminders = await prisma.reminder.findMany({
      where: {
        sent: false,
        reminderTime: { lte: now },
      },
      orderBy: { reminderTime: "asc" },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            classroom: {
              select: {
                members: {
                  select: {
                    studentId: true,
                  },
                },
              },
            },
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

    const activeReminders = [];
    const emptyReminderIds = [];

    for (const reminder of reminders) {
      const activeMemberIds = new Set(
        reminder.assignment.classroom?.members.map((m) => m.studentId) || []
      );

      const activeStudents = reminder.assignment.submissions
        .filter((submission) => activeMemberIds.has(submission.student.id))
        .map((submission) => submission.student);

      if (activeStudents.length > 0) {
        activeReminders.push({
          id: reminder.id,
          type: reminder.type,
          reminderTime: toIsoString(reminder.reminderTime),
          assignment: {
            id: reminder.assignment.id,
            title: reminder.assignment.title,
            dueDate: toIsoString(reminder.assignment.dueDate),
          },
          students: activeStudents,
        });
      } else {
        emptyReminderIds.push(reminder.id);
      }
    }

    // Self-heal: mark empty reminders as sent so they don't clog the schedule
    if (emptyReminderIds.length > 0) {
      await prisma.reminder.updateMany({
        where: { id: { in: emptyReminderIds } },
        data: { sent: true },
      });
    }

    return res.status(200).json({ reminders: activeReminders });
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
