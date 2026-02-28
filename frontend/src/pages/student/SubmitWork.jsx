import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAssignmentById } from "../../services/assignmentService";
import { submitAssignment, fetchMySubmission } from "../../services/submissionService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function SubmitWork() {
  const { assignmentId } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [existing, setExisting] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lockError, setLockError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    setLockError("");

    const load = async () => {
      try {
        const [assignmentData, submissionData] = await Promise.all([
          fetchAssignmentById(assignmentId),
          fetchMySubmission(assignmentId),
        ]);
        
        const currentAssignment = assignmentData.assignment;
        setAssignment(currentAssignment);
        
        const currentSubmission = submissionData.submission;
        if (currentSubmission?.fileUrl) {
          setExisting(currentSubmission);
        }

        // Only lock if a real submission (with file) exists
        const hasRealSubmission = currentSubmission?.fileUrl;
        const isPastDue = currentAssignment && new Date() > new Date(currentAssignment.dueDate);
        const isGraded = currentSubmission?.grade != null;
        
        if (hasRealSubmission && (isGraded || isPastDue)) {
          setLockError(isGraded 
            ? "This assignment has already been graded and cannot be updated." 
            : "The deadline for updates has passed. Submissions are locked.");
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
      const result = await submitAssignment(assignmentId, file);
      setSubmitted(true);
      setFile(null);
      setSubmissionResult(result.submission);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit assignment");
    } finally {
      setSaving(false);
    }
  };

  if (submitted && submissionResult) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-md bg-white p-8 shadow-sm text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">Assignment Submitted!</h1>
              <p className="text-gray-600">Your work has been successfully uploaded.</p>
            </div>
            <div className="rounded-md bg-gray-50 p-4 text-left max-w-md mx-auto">
              <p className="text-sm font-medium text-gray-700">File: {submissionResult.fileName}</p>
              <p className="text-sm text-gray-500">
                Submitted: {new Date(submissionResult.submittedAt).toLocaleString()}
              </p>
              <p className="text-sm">
                Status:{" "}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    submissionResult.status === "LATE"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {submissionResult.status === "LATE" ? "⚠️ Late" : "✅ On Time"}
                </span>
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Link
                to="/student/assignments"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Back to Dashboard
              </Link>
              <Link
                to={`/student/assignments/${assignmentId}`}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            &larr; Back to assignments
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm text-center">Loading assignment...</div>
        ) : assignment ? (
          <div className="rounded-md bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-semibold">{assignment.title}</h2>
              <p className="text-gray-600 mb-2">{assignment.description}</p>
              <p className="text-sm text-gray-500">
                Due: {new Date(assignment.dueDate).toLocaleString()}
              </p>
            </div>

            {/* Locked State Warning */}
            {lockError && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800 text-sm font-medium">
                ⚠️ {lockError}
              </div>
            )}

            {/* Previous submission info */}
            {existing && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
                <p className="text-sm font-semibold text-blue-800">📎 Previous Submission</p>
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

            {!lockError && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isResubmission ? "Upload new file (replaces previous)" : "Upload file"}{" "}
                    <span className="text-gray-400 font-normal">(max 10 MB)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                      Choose file
                      <input type="file" onChange={handleFileChange} className="hidden" />
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

                <div className="flex items-center justify-end gap-3 pt-2">
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
                    {saving ? "Uploading..." : isResubmission ? "Update Submission" : "Submit"}
                  </button>
                </div>
              </form>
            )}
            
            {lockError && (
               <div className="flex items-center justify-center pt-4">
                  <Link
                    to="/student/assignments"
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Return to Dashboard
                  </Link>
               </div>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-white p-6 shadow-sm text-gray-600 text-center">
            Assignment not found or access denied.
          </div>
        )}
      </div>
    </div>
  );
}
