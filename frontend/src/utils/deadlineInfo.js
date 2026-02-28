/**
 * Compute deadline urgency info for an assignment.
 * Returns { text, className } for display.
 */
export const getDeadlineInfo = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due - now;

  if (diffMs < 0) {
    return { text: "Overdue", className: "text-red-600 font-semibold" };
  }

  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return { text: "Less than 1 hour", className: "text-red-500 font-medium" };
  }
  if (diffHours <= 2) {
    return { text: `Due in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`, className: "text-red-500 font-medium" };
  }
  if (diffDays <= 1) {
    return { text: "Due in 1 day", className: "text-orange-500 font-medium" };
  }
  if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, className: "text-yellow-600" };
  }
  return { text: `Due ${due.toLocaleDateString()}`, className: "text-gray-500" };
};
