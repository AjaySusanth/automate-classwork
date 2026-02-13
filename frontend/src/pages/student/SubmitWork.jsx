import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchAssignmentById } from "../../services/assignmentService";
import { submitAssignment } from "../../services/submissionService";

export default function SubmitWork() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const data = await fetchAssignmentById(assignmentId);
        setAssignment(data.assignment);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await submitAssignment(assignmentId, { content });
      navigate("/student/assignments");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Submit Assignment</h1>
            <p className="text-gray-600">Submit your work below.</p>
          </div>
          <Link
            to="/student/assignments"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Back to assignments
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : assignment ? (
          <div className="rounded-md bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{assignment.title}</h2>
              <p className="text-gray-600">{assignment.description}</p>
              <p className="text-sm text-gray-500">
                Due: {new Date(assignment.dueDate).toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Submission (text or link)
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste your answer or link here"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Link
                  to="/student/assignments"
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-md bg-white p-6 shadow-sm text-gray-600">
            Assignment not found.
          </div>
        )}
      </div>
    </div>
  );
}
