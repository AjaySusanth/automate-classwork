import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchAssignmentById } from "../../services/assignmentService";
import { fetchMySubmission } from "../../services/submissionService";

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  SUBMITTED: "bg-green-100 text-green-700 border-green-200",
  LATE: "bg-red-100 text-red-700 border-red-200",
  GRADED: "bg-purple-100 text-purple-700 border-purple-200",
};

const getDeadlineInfo = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { text: "Overdue", className: "text-red-600 font-semibold" };
  }
  if (diffHours <= 2) {
    return { text: `Due in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`, className: "text-red-500 font-medium" };
  }
  if (diffDays <= 1) {
    return { text: `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`, className: "text-orange-500 font-medium" };
  }
  if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, className: "text-yellow-600" };
  }
  return { text: `Due ${due.toLocaleDateString()}`, className: "text-gray-500" };
};

export default function AssignmentDetail() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const [assignmentData, submissionData] = await Promise.all([
          fetchAssignmentById(id),
          fetchMySubmission(id),
        ]);
        setAssignment(assignmentData.assignment);
        // Only treat as a real submission if it has an uploaded file
        if (submissionData.submission?.fileUrl) {
          setSubmission(submissionData.submission);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const getStatus = () => {
    if (submission?.grade != null) {
      return "GRADED";
    }
    return submission?.status || "PENDING";
  };

  const status = getStatus();
  const badgeStyle = statusStyles[status] || statusStyles.PENDING;
  const deadlineInfo = assignment ? getDeadlineInfo(assignment.dueDate) : null;
  const isPastDue = assignment && new Date() > new Date(assignment.dueDate);
  const isGraded = submission?.grade != null;
  // Lock updates if graded, or if already submitted and past due.
  // Still allow first-time submission after due (submission will be null).
  const isLocked = isGraded || (submission && isPastDue);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/student/assignments"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              &larr; Back to assignments
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : assignment ? (
          <div className="rounded-md bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">{assignment.title}</h1>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle}`}
                >
                  {status}
                </span>
              </div>
              {assignment.totalMark && (
                <div className="rounded-md bg-gray-100 px-4 py-2 text-sm">
                  <span className="text-gray-600">Total Marks: </span>
                  <span className="font-semibold">{assignment.totalMark}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-2">Deadline</h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-gray-700">
                  {new Date(assignment.dueDate).toLocaleString()}
                </span>
                {status === "PENDING" && deadlineInfo && (
                  <span className={`text-sm ${deadlineInfo.className}`}>
                    ({deadlineInfo.text})
                  </span>
                )}
              </div>
            </div>

            {submission && (
              <div className="border-t pt-4">
                <h2 className="text-lg font-semibold mb-3">Your Submission</h2>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {submission.fileName}
                      </a>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        {" · "}
                        {submission.status === "LATE" ? "⚠️ Late" : "✅ On Time"}
                      </p>
                    </div>
                  </div>

                  {submission.grade != null && (
                    <div className="rounded-md bg-purple-50 border border-purple-200 px-4 py-3">
                      <p className="text-sm font-semibold text-purple-800">
                        Grade: {submission.grade}/{assignment.totalMark}
                      </p>
                      {submission.gradedAt && (
                        <p className="text-xs text-purple-600">
                          Graded on: {new Date(submission.gradedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              {isLocked ? (
                <div className="rounded-md bg-gray-100 p-4 text-center">
                  <p className="text-sm font-medium text-gray-600">
                    {isGraded
                      ? "This submission has been graded and can no longer be updated."
                      : "The deadline has passed. Submissions are now locked."}
                  </p>
                </div>
              ) : (
                <Link
                  to={`/student/assignments/${id}/submit`}
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                >
                  {submission ? "Update Submission" : "Submit Work"}
                </Link>
              )}
            </div>
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
