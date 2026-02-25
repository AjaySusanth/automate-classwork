import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchAssignments } from "../../services/assignmentService";
import {
  fetchSubmissionsByAssignment,
  downloadSubmissionsZip,
  gradeSubmission,
} from "../../services/submissionService";

const statusColors = {
  SUBMITTED: "bg-green-100 text-green-700 border-green-200",
  LATE: "bg-red-100 text-red-700 border-red-200",
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function SubmissionDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [grades, setGrades] = useState({});
  const [savingGrade, setSavingGrade] = useState({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totals = {
      submitted: 0,
      late: 0,
      pending: 0,
      total: submissions.length,
    };
    submissions.forEach((submission) => {
      if (submission.status === "LATE") totals.late += 1;
      else if (submission.status === "SUBMITTED") totals.submitted += 1;
      else totals.pending += 1;
    });
    return totals;
  }, [submissions]);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const data = await fetchAssignments();
        const assignmentList = data.assignments || [];
        setAssignments(assignmentList);
        if (assignmentList.length > 0) {
          setSelectedId(assignmentList[0].id);
          setSelectedAssignment(assignmentList[0]);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadSubmissions = async () => {
      if (!selectedId) {
        if (isCurrent) {
          setSubmissions([]);
        }
        return;
      }

      // Update selected assignment reference
      const found = assignments.find((a) => a.id === selectedId);
      if (found) setSelectedAssignment(found);

      try {
        if (isCurrent) {
          setError("");
        }
        const data = await fetchSubmissionsByAssignment(selectedId);
        if (isCurrent) {
          const subs = data.submissions || [];
          setSubmissions(subs);
          // Init grade inputs from existing data
          const gradeMap = {};
          subs.forEach((s) => {
            gradeMap[s.id] = s.grade != null ? String(s.grade) : "";
          });
          setGrades(gradeMap);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.response?.data?.error || "Failed to load submissions");
        }
      }
    };

    loadSubmissions();
    return () => {
      isCurrent = false;
    };
  }, [selectedId, assignments]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleGradeSave = async (submissionId) => {
    const val = grades[submissionId];
    const grade = parseInt(val, 10);
    if (isNaN(grade) || grade < 0) {
      setError("Please enter a valid grade");
      return;
    }
    if (totalMark != null && grade > totalMark) {
      setError(`Grade cannot exceed total marks (${totalMark})`);
      return;
    }
    setSavingGrade((prev) => ({ ...prev, [submissionId]: true }));
    setError("");
    try {
      const result = await gradeSubmission(submissionId, grade);
      // Update local state with server response
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, grade: result.submission.grade, gradedAt: result.submission.gradedAt }
            : s,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save grade");
    } finally {
      setSavingGrade((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const totalMark = selectedAssignment?.totalMark;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Submission Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name || "Teacher"}.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/teacher/assignments"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Back to assignments
            </Link>
            <Link
              to="/teacher/analytics"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              📊 Analytics
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="rounded-md bg-white p-6 shadow-sm text-gray-600">
            Create an assignment to see submissions.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-white p-6 shadow-sm space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select assignment
              </label>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title}
                    {assignment.totalMark != null ? ` (/${assignment.totalMark})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  setDownloading(true);
                  setError("");
                  try {
                    await downloadSubmissionsZip(selectedId);
                  } catch (err) {
                    setError(err.response?.data?.error || "Failed to download");
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading || submissions.length === 0}
                className="mt-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {downloading ? "Downloading..." : "📦 Download All"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-md bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-md bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Submitted</p>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.submitted}
                </p>
              </div>
              <div className="rounded-md bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Late</p>
                <p className="text-2xl font-semibold text-red-600">
                  {stats.late}
                </p>
              </div>
              <div className="rounded-md bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
            </div>

            <div className="rounded-md bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <span className="font-semibold">Submissions</span>
                {totalMark != null && (
                  <span className="text-sm text-gray-500">
                    Total Marks: {totalMark}
                  </span>
                )}
              </div>
              {submissions.length === 0 ? (
                <div className="p-6 text-gray-600">No submissions yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {submission.student?.name || "Student"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {submission.student?.email || ""}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 shrink-0">
                        {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleString()
                          : "Not submitted"}
                      </div>
                      {submission.fileUrl ? (
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium shrink-0"
                        >
                          📎 {submission.fileName || "View File"}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400 shrink-0">No file</span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shrink-0 ${
                          statusColors[submission.status || "PENDING"]
                        }`}
                      >
                        {submission.status || "PENDING"}
                      </span>
                      {/* Grade input — only for submitted/late */}
                      {submission.status !== "PENDING" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max={totalMark ?? undefined}
                            value={grades[submission.id] ?? ""}
                            onChange={(e) =>
                              setGrades((prev) => ({
                                ...prev,
                                [submission.id]: e.target.value,
                              }))
                            }
                            placeholder="—"
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-center"
                          />
                          {totalMark != null && (
                            <span className="text-sm text-gray-400">/ {totalMark}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleGradeSave(submission.id)}
                            disabled={
                              savingGrade[submission.id] ||
                              grades[submission.id] === "" ||
                              grades[submission.id] === String(submission.grade)
                            }
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingGrade[submission.id] ? "..." : "Save"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
