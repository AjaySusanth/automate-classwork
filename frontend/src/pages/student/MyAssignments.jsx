import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAssignments } from "../../services/assignmentService";
import { fetchMySubmissions } from "../../services/submissionService";
import { useAuth } from "../../context/AuthContext";
import { getDeadlineInfo } from "../../utils/deadlineInfo";

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  SUBMITTED: "bg-green-100 text-green-700 border-green-200",
  LATE: "bg-red-100 text-red-700 border-red-200",
  GRADED: "bg-purple-100 text-purple-700 border-purple-200",
};

const formatStatus = (status) => status || "PENDING";

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const submissionMap = useMemo(() => {
    return submissions
      .filter((s) => s.fileName) // only real submissions with a file
      .reduce((acc, submission) => {
        acc[submission.assignmentId] = submission;
        return acc;
      }, {});
  }, [submissions]);

  const loadData = async () => {
    try {
      setError("");
      const [assignmentData, submissionData] = await Promise.all([
        fetchAssignments(),
        fetchMySubmissions(),
      ]);
      setAssignments(assignmentData.assignments || []);
      setSubmissions(submissionData.submissions || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getStatusWithGraded = (submission) => {
    if (submission?.grade != null) {
      return "GRADED";
    }
    return formatStatus(submission?.status);
  };

  const summaryCards = useMemo(() => {
    const counts = { PENDING: 0, SUBMITTED: 0, LATE: 0, GRADED: 0 };
    // Use the same filtered submissionMap for consistency with the card list
    const realSubmissions = Object.values(submissionMap);
    realSubmissions.forEach((sub) => {
      const status = getStatusWithGraded(sub);
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    const pendingAssignments = assignments.filter(
      (a) => !submissionMap[a.id]
    );
    counts.PENDING = pendingAssignments.length;
    return counts;
  }, [assignments, submissionMap]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Assignments</h1>
            <p className="text-gray-600">Welcome, {user?.name || "Student"}.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/student/link-telegram"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Link Telegram
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
            No assignments available yet.
          </div>
          ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-yellow-400">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{summaryCards.PENDING}</p>
              </div>
              <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-green-400">
                <p className="text-sm text-gray-500">Submitted</p>
                <p className="text-2xl font-bold text-green-700">{summaryCards.SUBMITTED}</p>
              </div>
              <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-purple-400">
                <p className="text-sm text-gray-500">Graded</p>
                <p className="text-2xl font-bold text-purple-700">{summaryCards.GRADED}</p>
              </div>
              <div className="rounded-md bg-white p-4 shadow-sm border-l-4 border-red-400">
                <p className="text-sm text-gray-500">Late</p>
                <p className="text-2xl font-bold text-red-700">{summaryCards.LATE}</p>
              </div>
            </div>

            <div className="grid gap-4">
            {assignments.map((assignment) => {
              const submission = submissionMap[assignment.id];
              const status = getStatusWithGraded(submission);
              const badgeStyle = statusStyles[status] || statusStyles.PENDING;
              const deadlineInfo = getDeadlineInfo(assignment.dueDate);

              return (
                <div
                  key={assignment.id}
                  className="rounded-md bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold">
                        {assignment.title}
                      </h2>
                      <p className="text-gray-600">{assignment.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-gray-500">
                          Due: {new Date(assignment.dueDate).toLocaleString()}
                        </span>
                        {status === "PENDING" && (
                          <span className={deadlineInfo.className}>
                            ({deadlineInfo.text})
                          </span>
                        )}
                      </div>
                      {status === "GRADED" && submission?.grade != null && assignment.totalMark && (
                        <div className="inline-flex items-center rounded-md bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                          Score: {submission.grade}/{assignment.totalMark}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-start sm:items-end">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle}`}
                      >
                        {status}
                      </span>
                      <Link
                        to={`/student/assignments/${assignment.id}`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {status === "PENDING" ? "Submit" : "View Details"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
