import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchClassrooms, createClassroom, deleteClassroom } from "../../services/classroomService";
import { useAuth } from "../../context/AuthContext";

export default function ClassroomList() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const loadClassrooms = async () => {
    try {
      setError("");
      const data = await fetchClassrooms();
      setClassrooms(data.classrooms || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createClassroom(newName.trim());
      setNewName("");
      setShowCreate(false);
      await loadClassrooms();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create classroom");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this classroom? This cannot be undone.")) return;
    try {
      await deleteClassroom(id);
      await loadClassrooms();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete classroom");
    }
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            <h1 className="text-2xl font-bold">My Classrooms</h1>
            <p className="text-gray-600">Manage your classrooms and share invite codes with students.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + New Classroom
            </button>
            <Link
              to="/teacher/assignments"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Assignments
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="rounded-md bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Create Classroom</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Classroom name (e.g. CS101 - Fall 2026)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : classrooms.length === 0 ? (
          <div className="rounded-md bg-white p-6 shadow-sm text-gray-600 text-center">
            No classrooms yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="rounded-md bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <Link to={`/teacher/classrooms/${c.id}`} className="text-lg font-semibold text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>{c._count?.members || 0} students</span>
                      <span>{c._count?.assignments || 0} assignments</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5">
                      <span className="text-xs text-gray-500">Code:</span>
                      <code className="text-sm font-mono font-semibold">{c.inviteCode}</code>
                      <button
                        onClick={() => copyCode(c.inviteCode, c.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {copiedId === c.id ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-sm text-red-600 hover:underline"
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
