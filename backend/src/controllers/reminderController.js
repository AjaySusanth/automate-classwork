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
          submissions: {
            some: {
              status: "PENDING",
              student: {
                telegramLinked: true,
                telegramChatId: { not: null },
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
    console.error("Mark reminder sent error:", error);
    return res.status(500).json({ error: "Failed to mark reminder as sent" });
  }
};
