/**
 * Unit Tests — Quality Gate
 *
 * These tests verify core business logic IN ISOLATION.
 * Prisma and the database are fully mocked — no real DB connection is made.
 * This means tests run fast and work in CI without any Azure infrastructure.
 *
 * Coverage:
 *   1. authenticate middleware — rejects missing/invalid tokens
 *   2. requireRole middleware — blocks unauthorized roles
 *   3. auth controller — register() rejects missing fields + invalid role
 *   4. auth controller — login() rejects missing fields
 *   5. assignment controller — createAssignment() rejects missing fields
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock: Prisma DB client ────────────────────────────────────────────────
// Must be declared before any controller imports so the mock is hoisted.
vi.mock("../src/config/db.config.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    assignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    classroom: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

// ─── Mock: pg Pool (used inside db.config.js) ─────────────────────────────
vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({})),
}));

// ─── Mock: @prisma/adapter-pg ─────────────────────────────────────────────
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn().mockImplementation(() => ({})),
}));

// ─── Mock: Prisma generated client ────────────────────────────────────────
vi.mock("../src/generated/index.js", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Creates a minimal mock Express req object.
 */
const mockReq = (overrides = {}) => ({
  body: {},
  headers: {},
  params: {},
  query: {},
  user: null,
  ...overrides,
});

/**
 * Creates a mock Express res object that captures status + json calls.
 * Returns the mock so you can assert on it.
 */
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

// ─────────────────────────────────────────────────────────────────────────
// 1. authenticate middleware
// ─────────────────────────────────────────────────────────────────────────
describe("authenticate middleware", () => {
  let authenticate;

  beforeEach(async () => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-secret";
    const mod = await import("../src/middleware/auth.js");
    authenticate = mod.authenticate;
  });

  it("rejects requests with no Authorization header", () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("rejects requests with a malformed token", () => {
    const req = mockReq({
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });
    const res = mockRes();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid token" });
  });

  it("rejects requests where Authorization header is missing Bearer prefix", () => {
    const req = mockReq({
      headers: { authorization: "Token abc123" },
    });
    const res = mockRes();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "No token provided" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. requireRole middleware
// ─────────────────────────────────────────────────────────────────────────
describe("requireRole middleware", () => {
  let requireRole;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/middleware/auth.js");
    requireRole = mod.requireRole;
  });

  it("blocks a STUDENT from a TEACHER-only route", () => {
    const req = mockReq({ user: { id: "u1", role: "STUDENT" } });
    const res = mockRes();

    requireRole("TEACHER")(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Access denied" });
  });

  it("allows a TEACHER through a TEACHER-only route", () => {
    const next = vi.fn();
    const req = mockReq({ user: { id: "u1", role: "TEACHER" } });
    const res = mockRes();

    requireRole("TEACHER")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("allows multiple roles through", () => {
    const next = vi.fn();
    const req = mockReq({ user: { id: "u1", role: "STUDENT" } });
    const res = mockRes();

    requireRole("TEACHER", "STUDENT")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 401 when req.user is not set", () => {
    const req = mockReq({ user: null });
    const res = mockRes();

    requireRole("TEACHER")(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Auth controller — register()
// ─────────────────────────────────────────────────────────────────────────
describe("register controller", () => {
  let register;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/controllers/authController.js");
    register = mod.register;
  });

  it("returns 400 when email is missing", async () => {
    const req = mockReq({
      body: { password: "pass123", name: "Alice", role: "STUDENT" },
    });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "All fields are required" });
  });

  it("returns 400 when password is missing", async () => {
    const req = mockReq({
      body: { email: "alice@test.com", name: "Alice", role: "STUDENT" },
    });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "All fields are required" });
  });

  it("returns 400 for an invalid role", async () => {
    const req = mockReq({
      body: {
        email: "alice@test.com",
        password: "pass123",
        name: "Alice",
        role: "ADMIN",
      },
    });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid role. Must be TEACHER or STUDENT",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Auth controller — login()
// ─────────────────────────────────────────────────────────────────────────
describe("login controller", () => {
  let login;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/controllers/authController.js");
    login = mod.login;
  });

  it("returns 400 when email is missing", async () => {
    const req = mockReq({ body: { password: "pass123" } });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email and password are required",
    });
  });

  it("returns 400 when password is missing", async () => {
    const req = mockReq({ body: { email: "alice@test.com" } });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email and password are required",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Assignment controller — createAssignment()
// ─────────────────────────────────────────────────────────────────────────
describe("createAssignment controller", () => {
  let createAssignment;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/controllers/assignmentController.js");
    createAssignment = mod.createAssignment;
  });

  it("returns 400 when title is missing", async () => {
    const req = mockReq({
      user: { id: "teacher-1", role: "TEACHER" },
      body: {
        description: "Do homework",
        dueDate: "2026-12-01T00:00:00.000Z",
        classroomId: "class-1",
      },
    });
    const res = mockRes();

    await createAssignment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Title, description, and dueDate are required",
    });
  });

  it("returns 400 when classroomId is missing", async () => {
    const req = mockReq({
      user: { id: "teacher-1", role: "TEACHER" },
      body: {
        title: "Assignment 1",
        description: "Do homework",
        dueDate: "2026-12-01T00:00:00.000Z",
      },
    });
    const res = mockRes();

    await createAssignment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "classroomId is required" });
  });

  it("returns 400 for an invalid dueDate", async () => {
    // Need to mock prisma.classroom.findUnique to return a valid classroom
    const prisma = (await import("../src/config/db.config.js")).default;
    prisma.classroom.findUnique.mockResolvedValueOnce({
      id: "class-1",
      teacherId: "teacher-1",
    });

    const req = mockReq({
      user: { id: "teacher-1", role: "TEACHER" },
      body: {
        title: "Assignment 1",
        description: "Do homework",
        dueDate: "not-a-date",
        classroomId: "class-1",
      },
    });
    const res = mockRes();

    await createAssignment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid dueDate" });
  });
});
