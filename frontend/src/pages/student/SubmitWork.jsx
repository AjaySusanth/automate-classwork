import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchAssignmentById } from "../../services/assignmentService";
import { submitAssignment, fetchMySubmission } from "../../services/submissionService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function SubmitWork() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [existing, setExisting] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const [assignmentData, submissionData] = await Promise.all([
          fetchAssignmentById(assignmentId),
          fetchMySubmission(assignmentId),
        ]);
        setAssignment(assignmentData.assignment);
        if (submissionData.submission?.fileUrl) {
          setExisting(submissionData.submission);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [assignmentId]);

  const handleFileChange = (event) => {
    const selected = event.target.files[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File size must be under 10 MB");
      setFile(null);
      return;
    }
    setError("");
    setFile(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a file to submit");
      return;
    }
    setSaving(true);
    setError("");

    try {
      await submitAssignment(assignmentId, file);
      navigate("/student/assignments");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit assignment");
    } finally {
      setSaving(false);
    }
  };

  const isResubmission = !!existing;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isResubmission ? "Update Submission" : "Submit Assignment"}
            </h1>
            <p className="text-gray-600">
              {isResubmission
                ? "You can upload a new file to replace your previous submission."
                : "Upload your work below."}
            </p>
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
          <div className="rounded-md bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-semibold">{assignment.title}</h2>
              <p className="text-gray-600">{assignment.description}</p>
              <p className="text-sm text-gray-500">
                Due: {new Date(assignment.dueDate).toLocaleString()}
              </p>
            </div>

            {/* Previous submission info */}
            {existing && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-blue-800">
                  📎 Previous Submission
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <a
                      href={existing.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {existing.fileName}
                    </a>
                    <p className="text-xs text-blue-500">
                      Submitted: {new Date(existing.submittedAt).toLocaleString()}
                      {" · "}
                      {existing.status === "LATE" ? "⚠️ Late" : "✅ On Time"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isResubmission ? "Upload new file (replaces previous)" : "Upload file"}{" "}
                  <span className="text-gray-400 font-normal">(max 10 MB)</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    Choose file
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    {file ? file.name : "No file selected"}
                  </span>
                </div>
                {file && (
                  <p className="mt-1 text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
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
                  disabled={saving || !file}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Uploading..."
                    : isResubmission
                      ? "Update Submission"
                      : "Submit"}
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
