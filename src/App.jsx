import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import TechnicianLayout from './layouts/TechnicianLayout';
import ForemanLayout from './layouts/ForemanLayout';
import SupervisorLayout from './layouts/SupervisorLayout';
import DesignerLayout from './layouts/DesignerLayout';

// Pages
import LoginPage from './pages/LoginPage';
import AcceptInvite from './pages/AcceptInvite';
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
import SupervisorProjectDetail from './pages/supervisor/SupervisorProjectDetail';
import SupervisorRfis from './pages/supervisor/SupervisorRfis';
import SupervisorAccount from './pages/supervisor/SupervisorAccount';
import SupervisorProfile from './pages/supervisor/SupervisorProfile';
import SupervisorChangePin from './pages/supervisor/SupervisorChangePin';
import DesignerProjects from './pages/designer/DesignerProjects';
import DesignerProjectDrawings from './pages/designer/DesignerProjectDrawings';
import DesignerAccount from './pages/designer/DesignerAccount';
import DesignerProfile from './pages/designer/DesignerProfile';
import DesignerChangePin from './pages/designer/DesignerChangePin';

import SessionEnforcerModal from './components/SessionEnforcerModal';
import PushNotificationListener from './components/PushNotificationListener';

export default function App() {
  return (
    <ErrorBoundary>
      <SessionEnforcerModal />
      <PushNotificationListener />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

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
          <Route path="projects/:projectId" element={<SupervisorProjectDetail />} />
          <Route path="rfis" element={<SupervisorRfis />} />
          <Route path="account" element={<SupervisorAccount />} />
          <Route path="profile" element={<SupervisorProfile />} />
          <Route path="change-pin" element={<SupervisorChangePin />} />
        </Route>

        {/* Designer routes */}
        <Route
          path="/designer"
          element={
            <ProtectedRoute role="designer">
              <DesignerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<DesignerProjects />} />
          <Route path="projects" element={<DesignerProjects />} />
          <Route path="projects/:projectId" element={<DesignerProjectDrawings />} />
          <Route path="account" element={<DesignerAccount />} />
          <Route path="profile" element={<DesignerProfile />} />
          <Route path="change-pin" element={<DesignerChangePin />} />
        </Route>

        {/* Catch-all: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
