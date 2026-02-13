import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import AssignmentList from "./pages/teacher/AssignmentList";
import AssignmentForm from "./pages/teacher/AssignmentForm";
import SubmissionDashboard from "./pages/teacher/SubmissionDashboard";
import MyAssignments from "./pages/student/MyAssignments";
import SubmitWork from "./pages/student/SubmitWork";

const HomeRedirect = () => {
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

  const redirectPath =
    user.role === "TEACHER" ? "/teacher/assignments" : "/student/assignments";

  return <Navigate to={redirectPath} replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    const redirectPath =
      user.role === "TEACHER" ? "/teacher/assignments" : "/student/assignments";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Teacher routes - placeholder for now */}
          <Route
            path="/teacher/assignments"
            element={
              <ProtectedRoute requiredRole="TEACHER">
                <AssignmentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments/new"
            element={
              <ProtectedRoute requiredRole="TEACHER">
                <AssignmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments/:id/edit"
            element={
              <ProtectedRoute requiredRole="TEACHER">
                <AssignmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/submissions"
            element={
              <ProtectedRoute requiredRole="TEACHER">
                <SubmissionDashboard />
              </ProtectedRoute>
            }
          />

          {/* Student routes - placeholder for now */}
          <Route
            path="/student/assignments"
            element={
              <ProtectedRoute requiredRole="STUDENT">
                <MyAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments/:assignmentId/submit"
            element={
              <ProtectedRoute requiredRole="STUDENT">
                <SubmitWork />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
