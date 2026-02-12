import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute wrapper - only allows authenticated users.
 * Redirects to login if not authenticated.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Wrong role - redirect to their dashboard
    const redirectPath =
      user.role === "TEACHER" ? "/teacher/assignments" : "/student/assignments";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
