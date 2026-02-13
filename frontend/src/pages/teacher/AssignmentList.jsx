import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAssignments, deleteAssignment } from "../../services/assignmentService";
import { useAuth } from "../../context/AuthContext";

export default function AssignmentList() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadAssignments = async () => {
    try {
      setError("");
      const data = await fetchAssignments();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Delete this assignment?")) {
      return;
    }
    setError("");
    try {
      await deleteAssignment(assignmentId);
      setAssignments((prev) => prev.filter((item) => item.id !== assignmentId));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete assignment");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Assignments</h1>
            <p className="text-gray-600">Welcome, {user?.name || "Teacher"}.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/teacher/assignments/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              New Assignment
            </Link>
            <Link
              to="/teacher/submissions"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Submissions
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
            No assignments yet. Create your first assignment.
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
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
                  <div className="flex gap-3">
                    <Link
                      to={`/teacher/assignments/${assignment.id}/edit`}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(assignment.id)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
