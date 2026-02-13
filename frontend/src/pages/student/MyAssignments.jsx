import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAssignments } from "../../services/assignmentService";
import { fetchMySubmissions } from "../../services/submissionService";
import { useAuth } from "../../context/AuthContext";

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  SUBMITTED: "bg-green-100 text-green-700 border-green-200",
  LATE: "bg-red-100 text-red-700 border-red-200",
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
    return submissions.reduce((acc, submission) => {
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Assignments</h1>
            <p className="text-gray-600">Welcome, {user?.name || "Student"}.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Logout
          </button>
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
          <div className="grid gap-4">
            {assignments.map((assignment) => {
              const submission = submissionMap[assignment.id];
              const status = formatStatus(submission?.status);
              const badgeStyle = statusStyles[status] || statusStyles.PENDING;

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
                      <p className="text-sm text-gray-500">
                        Due: {new Date(assignment.dueDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-start sm:items-end">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle}`}
                      >
                        {status}
                      </span>
                      <Link
                        to={`/student/assignments/${assignment.id}/submit`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {status === "PENDING" ? "Submit" : "Update submission"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
