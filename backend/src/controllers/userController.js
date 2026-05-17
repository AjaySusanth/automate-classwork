import prisma from "../config/db.config.js";

/**
 * Get telegram-linked students.
 * Used by n8n to determine who should receive an assignment notification.
 *
 * Bug fix: previously returned ALL telegram-linked students in the system,
 * causing notifications to be sent to students in unrelated classrooms.
 *
 * Now accepts an optional `classroomId` query param.
 * - If classroomId is provided → return only members of that classroom
 *   who have Telegram linked (correct, targeted behaviour).
 * - If classroomId is omitted → return all telegram-linked students
 *   (backward-compatible fallback for generic broadcasts).
 */
export const getTelegramLinkedStudents = async (req, res) => {
  try {
    if (req.user.role !== "TEACHER") {
      return res
        .status(403)
        .json({ error: "Only teachers can access this endpoint" });
    }

    const { classroomId } = req.query;

    // Build the where clause dynamically based on whether a classroomId was given
    const where = {
      role: "STUDENT",
      telegramLinked: true,
      telegramChatId: { not: null },
      // If classroomId is supplied, add a membership filter so we only
      // notify students who actually belong to this classroom
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
    console.error("Error fetching telegram-linked students:", error);
    return res.status(500).json({ error: "Failed to fetch students" });
  }
};
