import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createAssignment,
  fetchAssignmentById,
  updateAssignment,
} from "../../services/assignmentService";

const toInputValue = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AssignmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const data = await fetchAssignmentById(id);
        setFormData({
          title: data.assignment.title,
          description: data.assignment.description,
          dueDate: toInputValue(data.assignment.dueDate),
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    if (isEditing) {
      loadAssignment();
    }
  }, [id, isEditing]);

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: new Date(formData.dueDate).toISOString(),
      };

      if (isEditing) {
        await updateAssignment(id, payload);
      } else {
        await createAssignment(payload);
      }

      navigate("/teacher/assignments");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Assignment" : "New Assignment"}
            </h1>
            <p className="text-gray-600">Set up the assignment details below.</p>
          </div>
          <Link
            to="/teacher/assignments"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Back to list
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-md bg-white p-6 shadow-sm">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-md bg-white p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Assignment title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Assignment instructions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                to="/teacher/assignments"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Assignment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
