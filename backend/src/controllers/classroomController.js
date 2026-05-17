import prisma from "../config/db.config.js";
import crypto from "crypto";

/**
 * Generate a short, human-friendly invite code (6 alphanumeric chars).
 */
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString("base64url").slice(0, 6).toUpperCase();
};

/**
 * Create a new classroom. Teacher only.
 */
export const createClassroom = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Classroom name is required" });
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: name.trim(),
        inviteCode: generateInviteCode(),
        teacherId: req.user.id,
      },
    });

    res.status(201).json({ classroom });
  } catch (error) {
    console.error("Create classroom error:", error);
    res.status(500).json({ error: "Failed to create classroom" });
  }
};

/**
 * List classrooms.
 * Teacher: classrooms they own.
 * Student: classrooms they are a member of.
 */
export const listClassrooms = async (req, res) => {
  try {
    let classrooms;

    if (req.user.role === "TEACHER") {
      classrooms = await prisma.classroom.findMany({
        where: { teacherId: req.user.id },
        include: {
          _count: { select: { members: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      classrooms = await prisma.classroom.findMany({
        where: {
          members: { some: { studentId: req.user.id } },
        },
        include: {
          teacher: { select: { name: true } },
          _count: { select: { members: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    res.json({ classrooms });
  } catch (error) {
    console.error("List classrooms error:", error);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
};

/**
 * Get a single classroom by ID with member list.
 */
export const getClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { assignments: true } },
      },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Access check: must be the teacher or a member
    const isMember = classroom.members.some((m) => m.studentId === req.user.id);
    if (classroom.teacherId !== req.user.id && !isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ classroom });
  } catch (error) {
    console.error("Get classroom error:", error);
    res.status(500).json({ error: "Failed to fetch classroom" });
  }
};

/**
 * Join a classroom by invite code. Student only.
 *
 * Bug fix: When a student joins, we backfill PENDING submission records
 * for all assignments that were created BEFORE they joined. Without this,
 * new joiners would never see past assignments in their dashboard.
 */
export const joinClassroom = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      select: { id: true, name: true },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    // Check if already a member
    const existing = await prisma.classroomMember.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: req.user.id,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: "You are already a member of this classroom" });
    }

    // Use a transaction: create membership + backfill past assignment submissions atomically.
    // If either step fails, the whole thing rolls back — student is not half-joined.
    const member = await prisma.$transaction(async (tx) => {
      // 1. Create the classroom membership
      const newMember = await tx.classroomMember.create({
        data: {
          classroomId: classroom.id,
          studentId: req.user.id,
        },
      });

      // 2. Find all assignments that already exist in this classroom
      const existingAssignments = await tx.assignment.findMany({
        where: { classroomId: classroom.id },
        select: { id: true },
      });

      // 3. Create PENDING submission placeholders for each past assignment
      // so the student can see and submit them from their dashboard
      if (existingAssignments.length > 0) {
        await tx.submission.createMany({
          data: existingAssignments.map((a) => ({
            assignmentId: a.id,
            studentId: req.user.id,
            // status defaults to PENDING as defined in schema
          })),
          skipDuplicates: true, // safety net in case of race conditions
        });
      }

      return newMember;
    });

    res.status(201).json({ member, classroom });
  } catch (error) {
    console.error("Join classroom error:", error);
    res.status(500).json({ error: "Failed to join classroom" });
  }
};

/**
 * Leave a classroom. Student only.
 */
export const leaveClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await prisma.classroomMember.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: id,
          studentId: req.user.id,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: "You are not a member of this classroom" });
    }

    await prisma.classroomMember.delete({
      where: { id: membership.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Leave classroom error:", error);
    res.status(500).json({ error: "Failed to leave classroom" });
  }
};

/**
 * Remove a student from a classroom. Teacher only.
 */
export const removeMember = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      select: { teacherId: true },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const membership = await prisma.classroomMember.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: id,
          studentId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: "Student is not a member of this classroom" });
    }

    await prisma.classroomMember.delete({
      where: { id: membership.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
};

/**
 * Delete a classroom. Teacher only.
 */
export const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      select: { teacherId: true },
    });

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    if (classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if classroom has assignments
    const assignmentCount = await prisma.assignment.count({
      where: { classroomId: id },
    });

    if (assignmentCount > 0) {
      return res.status(400).json({
        error: "Cannot delete a classroom that has assignments. Remove assignments first.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.classroomMember.deleteMany({ where: { classroomId: id } });
      await tx.classroom.delete({ where: { id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete classroom error:", error);
    res.status(500).json({ error: "Failed to delete classroom" });
  }
};
