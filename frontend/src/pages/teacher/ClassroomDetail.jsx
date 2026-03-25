import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchClassroom, removeMember } from "../../services/classroomService";

export default function ClassroomDetail() {
  const { id } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const load = async () => {
    try {
      setError("");
      const data = await fetchClassroom(id);
      setClassroom(data.classroom);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load classroom");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleRemove = async (studentId, name) => {
    if (!window.confirm(`Remove ${name} from this classroom?`)) return;
    try {
      await removeMember(id, studentId);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove member");
    }
  };

  const copyCode = () => {
    if (classroom?.inviteCode) {
      navigator.clipboard.writeText(classroom.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/teacher/classrooms" className="text-sm font-semibold text-blue-600 hover:underline">
          &larr; Back to classrooms
        </Link>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : classroom ? (
          <>
            <div className="rounded-md bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{classroom.name}</h1>
                  <p className="text-sm text-gray-500">
                    Created by {classroom.teacher?.name} · {classroom._count?.assignments || 0} assignments · {classroom.members?.length || 0} students
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2">
                  <span className="text-xs text-gray-500">Invite Code:</span>
                  <code className="text-lg font-mono font-bold tracking-wider">{classroom.inviteCode}</code>
                  <button onClick={copyCode} className="text-sm text-blue-600 hover:underline">
                    {copiedCode ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to={`/teacher/assignments?classroom=${id}`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View Assignments
              </Link>
              <Link
                to={`/teacher/assignments/new?classroom=${id}`}
                className="rounded-md border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                + New Assignment
              </Link>
            </div>

            <div className="rounded-md bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">
                Students ({classroom.members?.length || 0})
              </h2>
              {classroom.members?.length === 0 ? (
                <p className="text-gray-500 text-sm">No students have joined yet. Share the invite code above.</p>
              ) : (
                <div className="divide-y">
                  {classroom.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{m.student.name}</p>
                        <p className="text-xs text-gray-500">{m.student.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemove(m.student.id, m.student.name)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-md bg-white p-6 shadow-sm text-gray-600">Classroom not found.</div>
        )}
      </div>
    </div>
  );
}
