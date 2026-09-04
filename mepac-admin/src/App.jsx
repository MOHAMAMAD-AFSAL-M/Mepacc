import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

// Convex Imports
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';
import SessionLockModal from './components/auth/SessionLockModal';
import ErrorBoundary from './components/ErrorBoundary';
import { useSessionSecurity } from './utils/useSessionSecurity';

// View Components
import Dashboard from './views/Dashboard';
import ProjectsHub from './views/ProjectsHub';
import AttendanceLog from './views/AttendanceLog';
import Workforce from './views/Workforce';
import RFIs from './views/RFIs';
import Drawings from './views/Drawings';
import Settings from './views/Settings';
import ProjectDetail from './views/ProjectDetail';

// Modals and Overlays
import NotificationsPanel from './components/notifications/NotificationsPanel';
import AddProjectModal from './components/modals/AddProjectModal';
import AddWorkerModal from './components/modals/AddWorkerModal';
import NewRfiModal from './components/modals/NewRfiModal';
import UploadRevisionModal from './components/modals/UploadRevisionModal';
import AddBlueprintModal from './components/modals/AddBlueprintModal';
import EndProjectModal from './components/modals/EndProjectModal';
import ReopenProjectModal from './components/modals/ReopenProjectModal';
import EditProjectModal from './components/modals/EditProjectModal';

// Valid view IDs for hash routing
const VALID_VIEWS = [
  'view-dashboard', 'view-projects', 'view-project-details',
  'view-workforce', 'view-attendance', 'view-rfis',
  'view-drawings', 'view-settings'
];

function parseHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return { view: 'view-dashboard', projectId: null };

  const params = new URLSearchParams(hash);
  const view = params.get('view') || 'view-dashboard';
  const projectId = params.get('project') || null;

  if (!VALID_VIEWS.includes(view)) return { view: 'view-dashboard', projectId: null };
  return { view, projectId };
}

export default function App() {
  const initial = parseHash();
  const [activeView, setActiveViewRaw] = useState(initial.view);
  const [selectedProjectId, setSelectedProjectId] = useState(initial.projectId);
  const [activeModal, setActiveModal] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Security & Session Inactivity Lock (3hr timeout or screen off)
  const { isLocked, lockReason, unlockSession } = useSessionSecurity();
  const currentUser = useQuery(api.adminUsers.current);

  // Flag to prevent hashchange listener from re-processing our own hash changes
  const isUpdatingHash = useRef(false);

  // Write state to URL hash (without triggering our own listener)
  const writeHash = useCallback((view, projectId) => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (projectId) params.set('project', projectId);
    const newHash = params.toString();
    if (window.location.hash.slice(1) !== newHash) {
      isUpdatingHash.current = true;
      window.location.hash = newHash;
      isUpdatingHash.current = false;
    }
  }, []);

  // Navigate to a view (used by sidebar, back buttons, etc.)
  const setActiveView = useCallback((view) => {
    setActiveViewRaw(view);
    if (view !== 'view-project-details') {
      setSelectedProjectId(null);
      writeHash(view, null);
    }
  }, [writeHash]);

  // Navigate to a specific project detail page
  const navigateToProject = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    setActiveViewRaw('view-project-details');
    writeHash('view-project-details', projectId);
  }, [writeHash]);

  // Listen for browser back/forward only
  useEffect(() => {
    const handleHashChange = () => {
      if (isUpdatingHash.current) return;
      const state = parseHash();
      setActiveViewRaw(state.view);
      setSelectedProjectId(state.projectId);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Convex Queries
  const projectsQuery = useQuery(api.projects.list);
  const projects = projectsQuery || [];
  const isProjectsLoading = projectsQuery === undefined;

  const workforce = useQuery(api.workers.list) || [];
  const notifications = useQuery(api.notifications.list) || [];
  const todayCheckIns = useQuery(api.checkIns.getAllToday) || [];

  // Convex Mutations
  const toggleComplete = useMutation(api.projects.toggleComplete);
  const assignWorker = useMutation(api.assignments.assign);
  const removeWorker = useMutation(api.assignments.remove);
  const removeNotification = useMutation(api.notifications.remove);

  // Find the selected project from the list
  const selectedProject = projects.find(p => p._id === selectedProjectId) || null;

  const handleEndProject = (projectId) => {
    toggleComplete({ projectId });
  };

  const handleReopenProject = (projectId) => {
    toggleComplete({ projectId });
  };

  const openModal = (modalId) => setActiveModal(modalId);
  const closeModal = () => setActiveModal(null);

  const togglePanel = (panel, e) => {
    if (e) e.stopPropagation();
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const deleteNotification = (id) => {
    removeNotification({ notificationId: id });
  };

  const handleAddWorkerToProject = (projectId, worker) => {
    assignWorker({ projectId, workerId: worker._id });
  };

  const handleRemoveWorkerFromProject = (projectId, workerId) => {
    removeWorker({ projectId, workerId });
  };

  return (
    <div className="app-layout">
      {/* Session Security Lock Screen (3h inactivity or screen off) */}
      {isLocked && (
        <SessionLockModal
          currentUser={currentUser}
          onUnlock={unlockSession}
          reason={lockReason}
        />
      )}

      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {activePanel && (
        <div
          className="transparent-click-catcher"
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: activePanel === 'notifications' ? 2000 : 998,
            backgroundColor: activePanel === 'notifications' ? 'rgba(15, 23, 42, 0.5)' : 'transparent',
            backdropFilter: activePanel === 'notifications' ? 'blur(2px)' : 'none'
          }}
          onClick={() => {
            setActivePanel(null);
          }}
        />
      )}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <main className="main-content">
        <Topbar
          activeView={activeView}
          selectedProject={selectedProject}
          activePanel={activePanel}
          togglePanel={togglePanel}
          notifications={notifications}
          onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)}
        />

        <div className="views-container">
          <ErrorBoundary>
            {activeView === 'view-dashboard' && <Dashboard setActiveView={setActiveView} projects={projects} workforce={workforce} checkIns={todayCheckIns} />}
            {activeView === 'view-projects' && (
              <ProjectsHub
                openModal={openModal}
                projects={projects}
                isProjectsLoading={isProjectsLoading}
                todayCheckIns={todayCheckIns}
                setActiveView={setActiveView}
                setSelectedProject={(project) => {
                  if (project && project._id) {
                    navigateToProject(project._id);
                  }
                }}
              />
            )}
            {activeView === 'view-project-details' && (
              <ProjectDetail
                projectId={selectedProjectId}
                project={selectedProject}
                isProjectsLoading={isProjectsLoading}
                workforce={workforce}
                setActiveView={setActiveView}
                openModal={openModal}
                onAssignWorker={handleAddWorkerToProject}
                onRemoveWorker={handleRemoveWorkerFromProject}
              />
            )}
            {activeView === 'view-workforce' && <Workforce openModal={openModal} workforce={workforce} projects={projects} />}
            {activeView === 'view-attendance' && <AttendanceLog setActiveView={setActiveView} projects={projects} checkIns={todayCheckIns} workforce={workforce} />}
            {activeView === 'view-rfis' && <RFIs openModal={openModal} />}
            {activeView === 'view-drawings' && <Drawings openModal={openModal} projects={projects} />}
            {activeView === 'view-settings' && <Settings />}
          </ErrorBoundary>
        </div>
      </main>

      {/* Overlays */}
      <NotificationsPanel
        isOpen={activePanel === 'notifications'}
        onClose={() => setActivePanel(null)}
        notifications={notifications}
        deleteNotification={deleteNotification}
      />

      {activeModal && (
        <div className="modal-overlay active">
          {activeModal === 'add-project' && <AddProjectModal onClose={closeModal} />}
          {activeModal === 'add-worker' && <AddWorkerModal onClose={closeModal} projects={projects} />}
          {activeModal === 'new-rfi' && <NewRfiModal onClose={closeModal} projects={projects} workers={workforce} />}
          {activeModal === 'upload-revision' && <UploadRevisionModal onClose={closeModal} projects={projects} />}
          {activeModal === 'add-blueprint' && <AddBlueprintModal onClose={closeModal} projects={projects} projectId={selectedProjectId} />}
          {activeModal === 'edit-project' && <EditProjectModal onClose={closeModal} project={selectedProject} />}
          {activeModal === 'end-project' && <EndProjectModal onClose={closeModal} onConfirm={handleEndProject} project={selectedProject} />}
          {activeModal === 'reopen-project' && <ReopenProjectModal onClose={closeModal} onConfirm={handleReopenProject} project={selectedProject} />}
        </div>
      )}
    </div>
  );
}
