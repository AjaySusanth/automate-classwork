import prisma from "../config/db.config.js";

/**
 * Get all telegram-linked students
 * Teacher-only endpoint used by n8n to send notifications
 */
export const getTelegramLinkedStudents = async (req, res) => {
  try {
    // Verify user is a teacher
    if (req.user.role !== "TEACHER") {
      return res
        .status(403)
        .json({ error: "Only teachers can access this endpoint" });
    }

    // Fetch all students with telegram linked and valid chat ID
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        telegramLinked: true,
        telegramChatId: { not: null }, // Ensure chat ID exists
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
    console.error("Error fetching telegram-linked students:", error);
    return res.status(500).json({ error: "Failed to fetch students" });
  }
};
