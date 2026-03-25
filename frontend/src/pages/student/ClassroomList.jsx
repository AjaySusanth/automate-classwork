import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchClassrooms, joinClassroom, leaveClassroom } from "../../services/classroomService";
import { useAuth } from "../../context/AuthContext";

export default function StudentClassroomList() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
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
    load();
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setError("");
    setSuccessMsg("");
    try {
      const data = await joinClassroom(inviteCode.trim());
      setInviteCode("");
      setSuccessMsg(`Joined "${data.classroom.name}" successfully!`);
      await load();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to join classroom");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (id, name) => {
    if (!window.confirm(`Leave "${name}"? You will lose access to its assignments.`)) return;
    try {
      await leaveClassroom(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to leave classroom");
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
            <h1 className="text-2xl font-bold">My Classrooms</h1>
            <p className="text-gray-600">Welcome, {user?.name || "Student"}.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/student/assignments"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              All Assignments
            </Link>
            <Link
              to="/student/link-telegram"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Link Telegram
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Join form */}
        <form onSubmit={handleJoin} className="rounded-md bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Join a Classroom</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              maxLength={6}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono tracking-wider uppercase focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={joining || !inviteCode.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </div>
        </form>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}
        {successMsg && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-700">{successMsg}</div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : classrooms.length === 0 ? (
          <div className="rounded-md bg-white p-6 shadow-sm text-gray-600 text-center">
            You haven't joined any classrooms yet. Enter an invite code above to join.
          </div>
        ) : (
          <div className="grid gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="rounded-md bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>Teacher: {c.teacher?.name}</span>
                      <span>{c._count?.members || 0} students</span>
                      <span>{c._count?.assignments || 0} assignments</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/student/assignments?classroom=${c.id}`}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      View Assignments
                    </Link>
                    <button
                      onClick={() => handleLeave(c.id, c.name)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Leave
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
