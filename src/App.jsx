import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import TechnicianLayout from './layouts/TechnicianLayout';
// import ForemanLayout from './layouts/ForemanLayout';
// import SupervisorLayout from './layouts/SupervisorLayout';

// Pages
import LoginPage from './pages/LoginPage';
import TechnicianHome from './pages/technician/TechnicianHome';
import TechnicianCalendar from './pages/technician/TechnicianCalendar';
import TechnicianAccount from './pages/technician/TechnicianAccount';
import TechnicianProfile from './pages/technician/TechnicianProfile';
import TechnicianChangePin from './pages/technician/TechnicianChangePin';
// import ForemanHome from './pages/foreman/ForemanHome';
// import SupervisorHome from './pages/supervisor/SupervisorHome';

/**
 * App — top-level route configuration.
 *
 * Route structure:
 *   /login              → public login page
 *   /technician/*       → ProtectedRoute(role=technician) → TechnicianLayout
 *   /                   → redirect to /login
 */
export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Technician routes */}
      <Route
        path="/technician"
        element={
          <ProtectedRoute role="technician">
            <TechnicianLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<TechnicianHome />} />
        <Route path="attendance" element={<TechnicianCalendar />} />
        <Route path="account" element={<TechnicianAccount />} />
        <Route path="profile" element={<TechnicianProfile />} />
        <Route path="change-pin" element={<TechnicianChangePin />} />
      </Route>

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

