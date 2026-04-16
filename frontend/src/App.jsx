import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import EmployeePage from "./pages/EmployeePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { clearAuth, getUser, hasValidSession } from "./auth.js";

const PrivateRoute = ({ children, role }) => {
  if (!hasValidSession()) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (role && user?.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const HomeRedirect = () => {
  if (!hasValidSession()) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (!user) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  return user.role === "ADMIN" ? <Navigate to="/admin" replace /> : user.status === "pending" ? <Navigate to="/employee?tab=profile" replace /> : <Navigate to="/employee?tab=history" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/employee"
        element={
          <PrivateRoute role="EMPLOYEE">
            <EmployeePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute role="ADMIN">
            <AdminPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
