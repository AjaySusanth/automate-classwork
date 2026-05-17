import prisma from "../config/db.config.js";

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  return value.toISOString ? value.toISOString() : value;
};

/**
 * Get due reminders with telegram-linked students who are still pending
 * Teacher-only endpoint used by n8n scheduled workflow
 */
export const getDueReminders = async (req, res) => {
  try {
    const now = new Date();

    const reminders = await prisma.reminder.findMany({
      where: {
        sent: false,
        reminderTime: { lte: now },
        assignment: {
          createdById: req.user.id,
        },
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
    console.error("Get due reminders error:", error);
    return res.status(500).json({ error: "Failed to fetch due reminders" });
  }
};

/**
 * Mark a reminder as sent after n8n completes notification
 */
export const markReminderSent = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: { assignment: { select: { createdById: true } } },
    });
    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    if (reminder.assignment?.createdById !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: { sent: true },
    });

    return res
      .status(200)
      .json({ reminder: { id: updated.id, sent: updated.sent } });
  } catch (error) {
    console.error("Mark reminder sent error:", error);
    return res.status(500).json({ error: "Failed to mark reminder as sent" });
  }
};
