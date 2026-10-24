import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homePathFor, useAuth } from "../context/AuthContext";

// Usage:
//   <Route element={<ProtectedRoute />}>                 any logged-in user
//   <Route element={<ProtectedRoute role="student" />}>  students only
//   <Route element={<ProtectedRoute role="teacher" />}>  teachers only
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        role="status"
        className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant"
      >
        Loading...
      </div>
    );
  }

  // Not logged in: go to login and remember where the user was heading
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Logged in with the wrong role: send them to the dashboard that fits their role
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;

  return <Outlet />;
}