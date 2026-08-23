import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  UserPlus,
  Trash2,
  ExternalLink,
  Search,
  X,
  Check,
  Building,
  MoreVertical,
  ShieldAlert,
  Send,
  CheckCircle2,
  Circle,
  MessageSquare,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex.js';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { getProjectGradient, getProjectColor } from '../../utils/colors';

export default function SupervisorProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState('workforce'); // 'workforce' | 'attendance' | 'blueprints'
  const [roleFilter, setRoleFilter] = useState('All');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Technician');

  // ── Dispute Modal State ───────────────────────────────────────
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeWorker, setDisputeWorker] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputePriority, setDisputePriority] = useState('High');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // ── Convex Real-Time Queries ──────────────────────────────────
  const project = useQuery(api.projects.get, projectId ? { projectId } : 'skip');
  const assignedWorkers = useQuery(api.assignments.getByProject, projectId ? { projectId } : 'skip') || [];
  const checkIns = useQuery(api.checkIns.getByProject, projectId ? { projectId } : 'skip') || [];
  const blueprints = useQuery(api.blueprints.getByProject, projectId ? { projectId } : 'skip') || [];
  const allWorkers = useQuery(api.workers.list) || [];

  // ── Convex Real-Time Mutations ────────────────────────────────
  const assignWorker = useMutation(api.assignments.assign);
  const removeWorker = useMutation(api.assignments.remove);
  const createDispute = useMutation(api.rfis.createDispute);

  if (project === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <span className="inline-block w-6 h-6 border-2 border-border-strong border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary mb-4">Project not found.</p>
        <Button variant="secondary" onClick={() => navigate('/supervisor/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  // Filter assigned workers by role tab
  const filteredAssignedWorkers = roleFilter === 'All'
    ? assignedWorkers
    : assignedWorkers.filter((w) => w.role === roleFilter);

  // Unassigned workers for assignment modal
  const assignedWorkerIds = new Set(assignedWorkers.map((w) => w._id));
  const availableWorkers = allWorkers.filter((w) => {
    if (assignedWorkerIds.has(w._id)) return false;
    if (selectedRole && w.role !== selectedRole) return false;
    if (assignSearch.trim()) {
      const query = assignSearch.toLowerCase();
      const name = `${w.firstName} ${w.lastName}`.toLowerCase();
      const code = (w.workerCode || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    }
    return true;
  });

  const handleAssign = async (workerId) => {
    try {
      await assignWorker({ projectId, workerId });
    } catch (err) {
      console.error('Assign worker failed:', err);
    }
  };

  const handleRemove = async (workerId) => {
    try {
      await removeWorker({ projectId, workerId });
    } catch (err) {
      console.error('Remove worker failed:', err);
    }
  };

  const getMapsUrl = () => {
    if (project.latitude != null && project.longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${project.latitude},${project.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`;
  };

  // Open Dispute Modal for a specific worker
  const handleOpenDispute = (worker) => {
    setDisputeWorker(worker);
    setDisputeReason('');
    setDisputePriority('High');
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim() || !disputeWorker) return;

    setIsSubmittingDispute(true);
    try {
      await createDispute({
        projectId: project._id,
        projectName: project.name,
        workerId: disputeWorker._id,
        workerName: disputeWorker.name || `${disputeWorker.firstName || ''} ${disputeWorker.lastName || ''}`.trim() || 'Worker',
        workerRole: disputeWorker.role || 'Technician',
        createdByWorkerId: user?.id,
        createdByName: user?.name || user?.firstName || 'Supervisor',
        createdByRole: 'Supervisor',
        reason: disputeReason.trim(),
        priority: disputePriority,
      });

      setShowDisputeModal(false);
      setSuccessToast(`Dispute / explanation for ${disputeWorker.name || 'worker'} sent to Admin.`);
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err) {
      console.error('Failed to submit dispute:', err);
      alert('Failed to submit dispute. Please try again.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/supervisor/projects')}
            className="p-1.5 rounded-full hover:bg-surface-card transition-colors text-text-primary"
            aria-label="Back to projects"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold font-heading text-text-primary truncate max-w-[200px]">
              {project.name}
            </h1>
            <span className="text-xs text-text-secondary">Client: {project.client}</span>
          </div>
        </div>

        <a
          href={getMapsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <MapPin size={14} />
          <span>Location</span>
          <ExternalLink size={12} />
        </a>
      </header>

      {/* ── Success Toast Alert ─────────────────────────────── */}
      {successToast && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2.5 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="p-1 text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-5 p-4 pb-32 max-w-4xl mx-auto w-full">

        {/* ── Hero Image & Summary Card ──────────────────────── */}
        <Card
          padding="none"
          className="relative w-full h-44 overflow-hidden border border-border shrink-0 shadow-md"
          style={{
            background: getProjectGradient(projectId),
          }}
        >
          {project.imageUrl && (
            <img
              src={project.imageUrl}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-blue-300 font-semibold">
                {project.location}
              </span>
              <h2 className="text-xl font-bold font-heading">{project.name}</h2>
            </div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                {assignedWorkers.length} Workforce
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-xs font-semibold">
                {project.employeesPresent || checkIns.length} Present
              </span>
            </div>
          </div>
        </Card>

        {/* ── Supervisor Inspection Real-Time Status Banner ── */}
        {(() => {
          const supervisorVisit = checkIns.find(
            (c) => c.role === 'Supervisor' || c.workerRole === 'Supervisor' || c.type === 'Proxy'
          );
          const isVisited = Boolean(supervisorVisit || project.isVisitedToday);
          const visitName = supervisorVisit?.name || supervisorVisit?.workerName || project.visitedBySupervisorName || 'Supervisor';
          const visitTime = supervisorVisit?.checkInTimeStr || project.visitedAtTimeStr || 'Today';

          return (
            <div className={[
              'flex items-center justify-between p-3 rounded-md border text-xs font-semibold shadow-xs',
              isVisited
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200',
            ].join(' ')}>
              <div className="flex items-center gap-2">
                {isVisited ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                ) : (
                  <Circle size={16} className="text-amber-600 shrink-0" strokeWidth={2} />
                )}
                <span>
                  {isVisited
                    ? `Site Inspection Verified: Visited by ${visitName} at ${visitTime}`
                    : 'Supervisor Site Inspection: Awaiting visit today'}
                </span>
              </div>
              <span className={[
                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                isVisited ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
              ].join(' ')}>
                {isVisited ? 'Inspected' : 'Pending'}
              </span>
            </div>
          );
        })()}

        {/* ── Tabs Navigation ────────────────────────────────── */}
        <div className="flex border-b border-border bg-surface-card rounded-t-sm px-2 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('workforce')}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold font-heading border-b-2 transition-colors whitespace-nowrap',
              activeTab === 'workforce'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            <Users size={16} />
            <span>Workforce ({assignedWorkers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold font-heading border-b-2 transition-colors whitespace-nowrap',
              activeTab === 'attendance'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            <Clock size={16} />
            <span>Today Attendance ({checkIns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('blueprints')}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold font-heading border-b-2 transition-colors whitespace-nowrap',
              activeTab === 'blueprints'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            <FileText size={16} />
            <span>Drawings ({blueprints.length})</span>
          </button>
        </div>

        {/* ── TAB 1: Assigned Workforce ──────────────────────── */}
        {activeTab === 'workforce' && (
          <div className="flex flex-col gap-4">
            {/* Header + Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Role filter pills */}
              <div className="flex items-center gap-1 bg-surface-card p-1 rounded-md border border-border text-xs font-semibold overflow-x-auto no-scrollbar max-w-full">
                {['All', 'Supervisor', 'Foreman', 'Technician'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={[
                      'px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap shrink-0',
                      roleFilter === r
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : 'text-text-secondary hover:text-text-primary',
                    ].join(' ')}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-colors w-full sm:w-auto shrink-0 shadow-xs"
              >
                <UserPlus size={16} />
                <span>+ Assign Worker</span>
              </button>
            </div>

            {/* Workers List */}
            <Card padding="none" className="border border-border overflow-hidden shadow-sm">
              {filteredAssignedWorkers.length > 0 ? (
                filteredAssignedWorkers.map((worker, idx) => (
                  <div
                    key={worker._id}
                    className={[
                      'flex items-center justify-between p-4 transition-colors',
                      idx !== filteredAssignedWorkers.length - 1 ? 'border-b border-border' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-heading shrink-0">
                        {worker.initials || worker.name[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold font-heading text-text-primary">
                            {worker.name}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-text-secondary border border-border">
                            {worker.role}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted">{worker.workerCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Dispute / Options Button */}
                      <button
                        onClick={() => handleOpenDispute(worker)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                        title="Raise attendance dispute or note to admin"
                      >
                        <AlertTriangle size={13} className="text-amber-600" />
                        <span>Dispute</span>
                      </button>

                      <button
                        onClick={() => handleRemove(worker._id)}
                        className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-full transition-colors"
                        title="Remove worker from project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-text-muted">
                  No workers assigned under this filter. Click "+ Assign Worker" to add team members.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── TAB 2: Today Attendance ────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-heading text-text-primary">
                Site Attendance Log Today ({checkIns.length})
              </h3>
              <span className="text-xs font-semibold text-text-muted">
                {assignedWorkers.length} total workforce assigned
              </span>
            </div>

            <Card padding="none" className="border border-border overflow-hidden shadow-sm">
              {checkIns.length > 0 ? (
                checkIns.map((ci, idx) => (
                  <div
                    key={ci._id}
                    className={[
                      'flex items-center justify-between p-4 transition-colors flex-wrap gap-2',
                      idx !== checkIns.length - 1 ? 'border-b border-border' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold font-heading shrink-0">
                        {ci.initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-semibold font-heading text-text-primary">
                          {ci.name}
                        </span>
                        <span className="text-xs text-text-muted">Time In: {ci.checkInTimeStr || 'Today'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ci.checkOutTime ? 'bg-slate-100 text-text-secondary' : 'bg-emerald-100 text-emerald-800'}`}>
                          {ci.checkOutTime ? `Out ${ci.checkOutTimeStr}` : 'On Site'}
                        </span>
                        <span className="text-[11px] text-text-muted">Method: {ci.type || 'Self'}</span>
                      </div>

                      {/* Dispute button for checked-in worker */}
                      <button
                        onClick={() => handleOpenDispute({
                          _id: ci.workerId,
                          name: ci.name,
                          role: 'Technician',
                          initials: ci.initials,
                        })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                        title="Raise dispute or note regarding this check-in"
                      >
                        <AlertTriangle size={13} className="text-amber-600" />
                        <span>Dispute</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-text-muted">
                  No check-ins recorded for this project site today.
                </div>
              )}
            </Card>

            {/* List unclocked assigned workers for easy dispute / explanation reporting */}
            <div className="flex flex-col gap-2 mt-2">
              <h4 className="text-xs font-bold font-heading text-text-secondary uppercase tracking-wider">
                Assigned Workers — Quick Dispute / Attendance Note
              </h4>

              <Card padding="none" className="border border-border overflow-hidden divide-y divide-border">
                {assignedWorkers.map((w) => {
                  const hasCheckedIn = checkIns.some((ci) => ci.workerId === w._id);
                  return (
                    <div key={w._id} className="p-3.5 flex items-center justify-between hover:bg-surface-card transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {hasCheckedIn ? (
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        ) : (
                          <Circle size={16} className="text-amber-500 shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-text-primary truncate">{w.name}</span>
                          <span className="text-[11px] text-text-muted">{w.role} • {hasCheckedIn ? 'Checked in today' : 'Not yet checked in'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenDispute(w)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-surface hover:bg-amber-50 text-amber-800 border border-border hover:border-amber-300 text-xs font-semibold transition-colors shrink-0 shadow-2xs"
                      >
                        <AlertTriangle size={13} className="text-amber-600" />
                        <span>Dispute / Note</span>
                      </button>
                    </div>
                  );
                })}
              </Card>
            </div>
          </div>
        )}

        {/* ── TAB 3: Blueprints / Drawings ──────────────────── */}
        {activeTab === 'blueprints' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold font-heading text-text-primary">
              Project Blueprints ({blueprints.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {blueprints.length > 0 ? (
                blueprints.map((bp) => (
                  <Card key={bp._id} padding="none" className="p-4 border border-border shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-blue-50 text-primary flex items-center justify-center border border-blue-100">
                        <FileText size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold font-heading text-text-primary">
                          {bp.name}
                        </span>
                        <span className="text-xs text-text-secondary">Version {bp.currentVersion}</span>
                      </div>
                    </div>

                    {bp.fileUrl ? (
                      <a
                        href={bp.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-sm text-xs font-semibold hover:bg-primary-light transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-xs text-text-muted">No file URL</span>
                    )}
                  </Card>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-text-muted col-span-full border border-border rounded-sm">
                  No blueprints uploaded for this project yet.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Assign Worker Modal ──────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card rounded-xl border border-border shadow-2xl w-full max-w-md p-4 sm:p-6 flex flex-col gap-3.5 max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary flex items-center gap-2">
                <UserPlus size={18} className="text-primary shrink-0" />
                <span>Assign Worker to Project</span>
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-full hover:bg-surface text-text-muted hover:text-text-primary transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Role Filter Buttons */}
            <div className="flex gap-1.5 border-b border-border pb-3 overflow-x-auto no-scrollbar">
              {['Technician', 'Foreman', 'Supervisor'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={[
                    'flex-1 py-1.5 px-2 rounded-md text-xs font-bold text-center transition-colors whitespace-nowrap',
                    selectedRole === r
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder={`Search unassigned ${selectedRole}s...`}
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Available Workers List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[320px] pr-0.5 -mr-0.5">
              {availableWorkers.length > 0 ? (
                availableWorkers.map((w) => (
                  <div
                    key={w._id}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-md border border-border bg-surface hover:bg-surface-card transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs font-heading shrink-0">
                        {w.initials || w.firstName[0]}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold font-heading text-text-primary truncate">
                          {w.firstName} {w.lastName}
                        </span>
                        <span className="text-xs text-text-muted truncate">{w.workerCode}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAssign(w._id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-light transition-colors shrink-0 shadow-xs active:scale-95"
                    >
                      <Check size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-text-muted">
                  No unassigned {selectedRole}s found.
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-2 border-t border-border flex justify-end">
              <Button variant="secondary" size="md" onClick={() => setShowAssignModal(false)} className="w-full sm:w-auto justify-center">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Dispute Modal Window ─────────────────── */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-card rounded-md border border-border shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-text-primary">
                    Raise Attendance Dispute / Note
                  </h3>
                  <span className="text-[11px] text-text-secondary">
                    Send explanation directly to Admin Console & RFI Hub
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Worker Details Card */}
            {disputeWorker && (
              <div className="bg-surface border border-border rounded-md p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {disputeWorker.initials || disputeWorker.name?.[0] || 'W'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-primary">{disputeWorker.name}</span>
                      <span className="text-[11px] text-text-muted">{disputeWorker.role || 'Worker'} {disputeWorker.workerCode ? `• ${disputeWorker.workerCode}` : ''}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-900 border border-amber-200">
                    Flag Issue
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
                  <span>Site: <strong className="text-text-primary">{project.name}</strong></span>
                  <span>Supervisor: <strong className="text-text-primary">{user?.name || user?.firstName || 'You'}</strong></span>
                </div>
              </div>
            )}

            {/* Dispute Form */}
            <form onSubmit={handleSubmitDispute} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Reason / Explanation for Admin <span className="text-error">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why this worker is late, off-site, delayed at unloading bay, transport delay, or GPS glitch..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full p-3 text-xs bg-surface border border-border-strong rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary leading-relaxed shadow-inner resize-none"
                />
              </div>

              {/* Priority Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['High', 'Medium', 'Low'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDisputePriority(p)}
                      className={[
                        'py-1.5 text-xs font-bold rounded border transition-colors',
                        disputePriority === p
                          ? p === 'High'
                            ? 'bg-error text-white border-error'
                            : 'bg-primary text-white border-primary'
                          : 'bg-surface border-border text-text-secondary hover:text-text-primary',
                      ].join(' ')}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
                  disabled={isSubmittingDispute}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || !disputeReason.trim()}
                  className="px-4 py-2 text-xs font-bold rounded bg-primary hover:bg-primary-light text-white uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSubmittingDispute ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <span>Send to Admin</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

