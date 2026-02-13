import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchAssignments } from "../../services/assignmentService";
import { fetchSubmissionsByAssignment } from "../../services/submissionService";

const statusColors = {
  SUBMITTED: "bg-green-100 text-green-700 border-green-200",
  LATE: "bg-red-100 text-red-700 border-red-200",
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function SubmissionDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    const loadSubmissions = async () => {
      if (!selectedId) {
        setSubmissions([]);
        return;
      }

      try {
        setError("");
        const data = await fetchSubmissionsByAssignment(selectedId);
        setSubmissions(data.submissions || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load submissions");
      }
    };

    loadSubmissions();
  }, [selectedId]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
                  </option>
                ))}
              </select>
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
              <div className="border-b border-gray-200 px-6 py-4 font-semibold">
                Submissions
              </div>
              {submissions.length === 0 ? (
                <div className="p-6 text-gray-600">No submissions yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {submission.student?.name || "Student"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {submission.student?.email || ""}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.submittedAt
                          ? new Date(submission.submittedAt).toLocaleString()
                          : "Not submitted"}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          statusColors[submission.status || "PENDING"]
                        }`}
                      >
                        {submission.status || "PENDING"}
                      </span>
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
