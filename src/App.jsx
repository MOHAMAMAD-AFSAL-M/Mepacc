import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import TechnicianLayout from './layouts/TechnicianLayout';
import ForemanLayout from './layouts/ForemanLayout';
import SupervisorLayout from './layouts/SupervisorLayout';

// Pages
import LoginPage from './pages/LoginPage';
import TechnicianHome from './pages/technician/TechnicianHome';
import TechnicianCalendar from './pages/technician/TechnicianCalendar';
import TechnicianAccount from './pages/technician/TechnicianAccount';
import TechnicianProfile from './pages/technician/TechnicianProfile';
import TechnicianChangePin from './pages/technician/TechnicianChangePin';
import ForemanHome from './pages/foreman/ForemanHome';
import ForemanCrew from './pages/foreman/ForemanCrew';
import ForemanCalendar from './pages/foreman/ForemanCalendar';
import ForemanAccount from './pages/foreman/ForemanAccount';
import ForemanProfile from './pages/foreman/ForemanProfile';
import ForemanChangePin from './pages/foreman/ForemanChangePin';
import SupervisorHome from './pages/supervisor/SupervisorHome';
import SupervisorProjects from './pages/supervisor/SupervisorProjects';
import SupervisorRfis from './pages/supervisor/SupervisorRfis';
import SupervisorAccount from './pages/supervisor/SupervisorAccount';
import SupervisorProfile from './pages/supervisor/SupervisorProfile';
import SupervisorChangePin from './pages/supervisor/SupervisorChangePin';

/**
 * App — top-level route configuration.
 *
 * Route structure:
 *   /login              → public login page
 *   /technician/*       → ProtectedRoute(role=technician) → TechnicianLayout
 *   /foreman/*          → ProtectedRoute(role=foreman)    → ForemanLayout
 *   /supervisor/*       → ProtectedRoute(role=supervisor) → SupervisorLayout
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

      {/* Foreman routes */}
      <Route
        path="/foreman"
        element={
          <ProtectedRoute role="foreman">
            <ForemanLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<ForemanHome />} />
        <Route path="crew" element={<ForemanCrew />} />
        <Route path="calendar" element={<ForemanCalendar />} />
        <Route path="account" element={<ForemanAccount />} />
        <Route path="profile" element={<ForemanProfile />} />
        <Route path="change-pin" element={<ForemanChangePin />} />
      </Route>

      {/* Supervisor routes */}
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute role="supervisor">
            <SupervisorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<SupervisorHome />} />
        <Route path="projects" element={<SupervisorProjects />} />
        <Route path="rfis" element={<SupervisorRfis />} />
        <Route path="account" element={<SupervisorAccount />} />
        <Route path="profile" element={<SupervisorProfile />} />
        <Route path="change-pin" element={<SupervisorChangePin />} />
      </Route>

      {/* Catch-all: redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

