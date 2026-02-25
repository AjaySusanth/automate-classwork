import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fetchAssignments } from "../../services/assignmentService";
import { fetchSubmissionsByAssignment } from "../../services/submissionService";

const COLORS = {
  SUBMITTED: "#22c55e",
  LATE: "#ef4444",
  PENDING: "#eab308",
};

export default function Analytics() {
  const [assignments, setAssignments] = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAssignments();
        const list = data.assignments || [];
        setAssignments(list);

        // Fetch submissions for all assignments in parallel
        const entries = await Promise.all(
          list.map(async (a) => {
            try {
              const sub = await fetchSubmissionsByAssignment(a.id);
              return [a.id, sub.submissions || []];
            } catch {
              return [a.id, []];
            }
          }),
        );
        setSubmissionsMap(Object.fromEntries(entries));
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        console.error("Analytics load failed:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Stats for selected assignment (pie chart)
  const pieData = useMemo(() => {
    const subs = submissionsMap[selectedId] || [];
    const counts = { SUBMITTED: 0, LATE: 0, PENDING: 0 };
    subs.forEach((s) => {
      const key = s.status || "PENDING";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [submissionsMap, selectedId]);

  // Bar chart: completion rate per assignment
  const barData = useMemo(() => {
    return assignments.map((a) => {
      const subs = submissionsMap[a.id] || [];
      const total = subs.length;
      const done = subs.filter(
        (s) => s.status === "SUBMITTED" || s.status === "LATE",
      ).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      const shortTitle =
        a.title.length > 15 ? a.title.slice(0, 15) + "…" : a.title;
      return { name: shortTitle, rate };
    });
  }, [assignments, submissionsMap]);

  // Summary cards
  const summary = useMemo(() => {
    let totalSubs = 0;
    let totalDone = 0;
    let totalLate = 0;
    Object.values(submissionsMap).forEach((subs) => {
      subs.forEach((s) => {
        totalSubs++;
        if (s.status === "SUBMITTED" || s.status === "LATE") totalDone++;
        if (s.status === "LATE") totalLate++;
      });
    });
    return {
      assignments: assignments.length,
      avgCompletion:
        totalSubs > 0 ? Math.round((totalDone / totalSubs) * 100) : 0,
      latePercent:
        totalSubs > 0 ? Math.round((totalLate / totalSubs) * 100) : 0,
    };
  }, [assignments, submissionsMap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">📊 Analytics</h1>
            <p className="text-gray-600">
              Submission & completion insights across all assignments.
            </p>
          </div>
          <Link
            to="/teacher/submissions"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Back to submissions
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Assignments</p>
            <p className="text-3xl font-semibold">{summary.assignments}</p>
          </div>
          <div className="rounded-md bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Avg Completion Rate</p>
            <p className="text-3xl font-semibold text-green-600">
              {summary.avgCompletion}%
            </p>
          </div>
          <div className="rounded-md bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Late Submissions</p>
            <p className="text-3xl font-semibold text-red-600">
              {summary.latePercent}%
            </p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie chart */}
          <div className="rounded-md bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">
              Status Breakdown
            </h2>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4 text-sm"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>

            {pieData.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">
                No submissions yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[entry.name] || "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar chart */}
          <div className="rounded-md bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">
              Completion Rate by Assignment
            </h2>
            {barData.length === 0 ? (
              <p className="text-gray-400 text-sm py-12 text-center">
                No assignments yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
