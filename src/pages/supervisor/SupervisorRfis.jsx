import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Send,
  Plus,
  Paperclip,
  X,
  Building2,
  FileCode,
  Image as ImageIcon,
  CheckCheck,
  Clock,
  ShieldCheck,
  Sparkles,
  Check,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex.js';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import NotificationBellButton from '../../components/NotificationBellButton';
import useAuthStore from '../../store/authStore';
import { getSupervisorProjects } from '../../services/jobService';


/**
 * SupervisorRfis — RFI & Disputes Hub.
 * Features custom dropdown windows styled identically to the Foreman Proxy Reasons dropdown:
 *   - Custom trigger button with rotating chevron icon
 *   - Border & shadow styling matching Foreman Proxy Reason dropdown
 *   - Clean option list with hover & selection feedback
 */

const STATUS_OPTIONS = [
  { label: 'Status (All)', value: 'All Statuses' },
  { label: 'In Progress', value: 'IN PROGRESS' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Flagged Review', value: 'FLAGGED FOR ADMIN REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
];

const MODAL_PRIORITY_OPTIONS = [
  'High Priority',
  'Medium Priority',
  'Low Priority',
];

const INITIAL_ITEMS = [
  {
    id: 'rfi_01',
    type: 'rfi',
    title: 'Duct route conflict',
    project: 'Patel Villa',
    status: 'IN PROGRESS',
    statusBg: 'bg-primary/10 text-primary border-primary/20',
    updated: 'Updated 2h ago',
    priority: 'High Priority',
    priorityColor: 'bg-error text-error',
    expanded: true,
    rfiCode: 'RFI-2026-092',
    assignedTeam: 'Structural Engineering',
    messages: [
      {
        id: 'm1',
        sender: 'System Admin',
        role: 'System',
        roleBg: 'bg-slate-100 text-slate-700 border-slate-300',
        time: '10:00 AM',
        initials: 'AD',
        text: 'Automated RFI generated from 3D BIM clash detection report #CR-092.',
        attachment: {
          name: 'Clash_Report_CR092.pdf',
          size: '2.4 MB',
          type: 'pdf',
        },
        isSelf: false,
      },
      {
        id: 'm2',
        sender: 'You (Supervisor)',
        role: 'Supervisor',
        roleBg: 'bg-primary text-white border-primary',
        time: '10:05 AM',
        initials: 'SU',
        text: 'The main AC supply duct (600x400mm) conflicts with the plumbing riser stack installed yesterday at Grid B-4. Requesting structural clearance to offset ducting by 400mm southward.',
        isSelf: true,
      },
      {
        id: 'm3',
        sender: 'Rajesh Sharma',
        role: 'Project Manager',
        roleBg: 'bg-amber-100 text-amber-900 border-amber-300',
        time: '11:30 AM',
        initials: 'PM',
        text: 'Structural team reviewed the deflection load. Holding Zone 2 HVAC work temporarily. Proceed with electrical trunking in Zone 1.',
        isSelf: false,
      },
    ],
  },
  {
    id: 'rfi_02',
    type: 'rfi',
    title: 'HVAC Ducting Gauge Mismatch',
    project: 'Sharma Complex',
    status: 'OPEN',
    statusBg: 'bg-amber-100 text-amber-900 border-amber-300',
    updated: 'Updated 1d ago',
    priority: 'High Priority',
    priorityColor: 'bg-error text-error',
    expanded: false,
    rfiCode: 'RFI-2026-088',
    assignedTeam: 'HVAC Procurement',
    messages: [
      {
        id: 'm10',
        sender: 'Priya Sharma',
        role: 'Foreman',
        roleBg: 'bg-slate-200 text-slate-800 border-slate-300',
        time: 'Yesterday',
        initials: 'FM',
        text: 'Delivered duct sheet metal gauge is 24G instead of specified 22G. Installation paused.',
        isSelf: false,
      },
    ],
  },
  {
    id: 'rfi_03',
    type: 'rfi',
    title: 'Electrical Panel Clearance',
    project: 'Patel Villa',
    status: 'OPEN',
    statusBg: 'bg-amber-100 text-amber-900 border-amber-300',
    updated: 'Updated 3d ago',
    priority: 'Medium Priority',
    priorityColor: 'bg-amber-500 text-amber-600',
    expanded: false,
    rfiCode: 'RFI-2026-074',
    assignedTeam: 'Electrical Engineering',
    messages: [],
  },
  {
    id: 'disp_01',
    type: 'dispute',
    title: 'Karan Verma - Not on site flag',
    project: 'Patel Villa',
    status: 'FLAGGED FOR ADMIN REVIEW',
    statusBg: 'bg-error/10 text-error border-error/20',
    updated: 'Updated 4h ago',
    priority: 'High Priority',
    priorityColor: 'bg-error text-error',
    expanded: true,
    disputeCode: 'DSP-2026-014',
    rebuttal: {
      timestamp: '09:15 AM',
      author: 'Afsal Mohammed (Supervisor)',
      initialText: 'Technician Karan Verma was dispatched to Zone C unloading bay at 08:00 AM to verify heavy condenser delivery. He was physically present on site.',
      attachment: {
        name: 'Gate_Unloading_Photo_0815AM.jpg',
        size: '1.8 MB',
      },
      statusText: 'Under Active Review by MEP Admin Team',
      stepProgress: 66,
    },
  },
  {
    id: 'disp_02',
    type: 'dispute',
    title: 'Material Invoice Discrepancy',
    project: 'Sharma Complex',
    status: 'PENDING',
    statusBg: 'bg-amber-100 text-amber-900 border-amber-300',
    updated: 'Updated 1d ago',
    priority: 'Medium Priority',
    priorityColor: 'bg-amber-500 text-amber-600',
    expanded: false,
    disputeCode: 'DSP-2026-009',
  },
  {
    id: 'rfi_04',
    type: 'rfi',
    title: 'Safety Violation - Zone B',
    project: 'Sharma Complex',
    status: 'RESOLVED',
    statusBg: 'bg-success/10 text-success border-success/20',
    updated: 'Resolved 2h ago',
    priority: 'Closed',
    priorityColor: 'bg-slate-400 text-slate-500',
    expanded: false,
    rfiCode: 'RFI-2026-052',
    assignedTeam: 'HSE Safety Officer',
  },
];

const QUICK_CHIPS = [
  'Approved on site',
  'Request BIM Revision',
  'Holding Work in Zone',
  'Photo Attached',
];

export default function SupervisorRfis() {
  const user = useAuthStore((s) => s.user);
  const convexRfis = useQuery(api.rfis.list) || [];
  const createRfiMutation = useMutation(api.rfis.createRfi);

  const [items, setItems] = useState(INITIAL_ITEMS);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'rfis' | 'disputes'

  // Dynamic project options
  const [projectOptions, setProjectOptions] = useState(['All Projects']);
  const [modalProjectOptions, setModalProjectOptions] = useState([]);

  // Filter Dropdown Open States
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Modal Dropdown Open States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('');
  const [isModalProjectOpen, setIsModalProjectOpen] = useState(false);

  const [newPriority, setNewPriority] = useState('High Priority');
  const [isModalPriorityOpen, setIsModalPriorityOpen] = useState(false);

  const [newDescription, setNewDescription] = useState('');

  // Interactive inputs per card
  const [replyInputs, setReplyInputs] = useState({});
  const [rebuttalInputs, setRebuttalInputs] = useState({});

  // Refs for clicking outside
  const projectRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    getSupervisorProjects(user?.id).then((projects) => {
      if (projects && projects.length > 0) {
        const names = projects.map((p) => p.name);
        setProjectOptions(['All Projects', ...names]);
        setModalProjectOptions(names);
        if (!newProject && names.length > 0) {
          setNewProject(names[0]);
        }
      }
    }).catch((err) => console.warn('Failed to load projects for RFIs:', err));
  }, [user]);

  // Merge convex RFIs with items
  const allItems = [
    ...convexRfis.map((cr) => ({
      id: cr._id,
      type: cr.type,
      rfiCode: cr.rfiCode || cr._id.slice(-6),
      title: cr.title,
      project: cr.projectName,
      status: cr.status,
      statusBg:
        cr.status === 'FLAGGED FOR ADMIN REVIEW'
          ? 'bg-error/10 text-error border-error/20'
          : cr.status === 'RESOLVED'
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-amber-100 text-amber-900 border-amber-300',
      updated: 'Live from Server',
      priority: `${cr.priority} Priority`,
      priorityColor:
        cr.priority === 'High'
          ? 'bg-error text-error'
          : 'bg-amber-500 text-amber-600',
      expanded: false,
      details: cr.details,
      rebuttal: cr.type === 'dispute' ? {
        author: `${cr.createdByName} (${cr.createdByRole})`,
        timestamp: new Date(cr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        initialText: cr.details,
        statusText: `Status: ${cr.status}`,
        stepProgress: cr.status === 'RESOLVED' ? 100 : 66,
      } : undefined,
      messages: cr.type === 'rfi' && cr.details ? [
        {
          id: `m_${cr._id}`,
          sender: cr.createdByName,
          role: cr.createdByRole,
          roleBg: 'bg-primary text-white border-primary',
          time: new Date(cr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          initials: cr.createdByName?.[0] || 'U',
          text: cr.details,
          isSelf: cr.createdByWorkerId === user?.id,
        },
      ] : [],
    })),
    ...items,
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setIsProjectDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSendReply = (itemId, customText = null) => {
    const text = (customText || replyInputs[itemId])?.trim();
    if (!text) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newMsg = {
            id: `m_${Date.now()}`,
            sender: 'You (Supervisor)',
            role: 'Supervisor',
            roleBg: 'bg-primary text-white border-primary',
            time: 'Just now',
            initials: 'SU',
            text,
            isSelf: true,
          };
          return {
            ...item,
            messages: [...(item.messages || []), newMsg],
            updated: 'Updated just now',
          };
        }
        return item;
      })
    );

    setReplyInputs((prev) => ({ ...prev, [itemId]: '' }));
  };

  const handleSubmitRebuttal = (itemId) => {
    const text = rebuttalInputs[itemId]?.trim();
    if (!text) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            rebuttal: {
              ...item.rebuttal,
              initialText: text,
              timestamp: 'Just now',
            },
            updated: 'Updated just now',
          };
        }
        return item;
      })
    );

    setRebuttalInputs((prev) => ({ ...prev, [itemId]: '' }));
  };

  const handleCreateRfi = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createRfiMutation({
        projectName: newProject || 'General Project',
        createdByWorkerId: user?.id,
        createdByName: user?.name || user?.firstName || 'Supervisor',
        createdByRole: 'Supervisor',
        title: newTitle.trim(),
        details: newDescription.trim() || newTitle.trim(),
        priority: newPriority.includes('High') ? 'High' : newPriority.includes('Low') ? 'Low' : 'Medium',
      });
    } catch (err) {
      console.warn('Convex createRfi error:', err);
    }

    setIsModalOpen(false);
    setNewTitle('');
    setNewDescription('');
  };

  const filteredItems = allItems.filter((item) => {
    if (activeTab === 'rfis' && item.type !== 'rfi') return false;
    if (activeTab === 'disputes' && item.type !== 'dispute') return false;
    if (selectedProject !== 'All Projects' && item.project !== selectedProject)
      return false;
    if (selectedStatus !== 'All Statuses' && item.status !== selectedStatus)
      return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-full bg-background relative">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 shrink-0">
        <h1 className="text-xl font-bold font-heading text-text-primary">
          RFI & Disputes Hub
        </h1>
        <NotificationBellButton />
      </header>

      {/* ── Filter Controls (Matching Foreman Proxy Reason Dropdown Style) ── */}
      <div className="bg-surface border-b border-border p-4 flex flex-col gap-3 sticky top-[65px] z-20 shadow-xs">
        {/* Category Pills */}
        <div className="bg-slate-200/80 p-1 rounded-md flex items-center justify-between gap-1 w-full">
          <button
            onClick={() => setActiveTab('all')}
            className={[
              'flex-1 py-1.5 rounded-sm text-xs font-semibold tracking-wider text-center transition-all',
              activeTab === 'all'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('rfis')}
            className={[
              'flex-1 py-1.5 rounded-sm text-xs font-semibold tracking-wider text-center transition-all',
              activeTab === 'rfis'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            RFIs
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={[
              'flex-1 py-1.5 rounded-sm text-xs font-semibold tracking-wider text-center transition-all',
              activeTab === 'disputes'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            Disputes
          </button>
        </div>

        {/* Custom Dropdown Filters Row */}
        <div className="grid grid-cols-2 gap-2">

          {/* 1. Custom Project Filter Dropdown (Foreman Style) */}
          <div className="relative" ref={projectRef}>
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="w-full flex items-center justify-between bg-surface-card border border-border-strong text-text-primary text-xs font-medium rounded-md px-3.5 py-2 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span className="truncate">{selectedProject}</span>
              <ChevronDown
                size={16}
                className={`text-text-muted transition-transform duration-200 shrink-0 ${
                  isProjectDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute z-30 w-full mt-1 bg-surface-card rounded-md shadow-lg border border-border overflow-hidden animate-fade-in">
                {projectOptions.map((proj) => (
                  <button
                    key={proj}
                    type="button"
                    onClick={() => {
                      setSelectedProject(proj);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={[
                      'w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors border-b border-border/40 last:border-none',
                      selectedProject === proj
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-text-primary hover:bg-surface-container-low',
                    ].join(' ')}
                  >
                    <span>{proj}</span>
                    {selectedProject === proj && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Custom Status Filter Dropdown (Foreman Style) */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="w-full flex items-center justify-between bg-surface-card border border-border-strong text-text-primary text-xs font-medium rounded-md px-3.5 py-2 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <span className="truncate">
                {STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.label}
              </span>
              <ChevronDown
                size={16}
                className={`text-text-muted transition-transform duration-200 shrink-0 ${
                  isStatusDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute z-30 w-full mt-1 bg-surface-card rounded-md shadow-lg border border-border overflow-hidden animate-fade-in">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(opt.value);
                      setIsStatusDropdownOpen(false);
                    }}
                    className={[
                      'w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors border-b border-border/40 last:border-none',
                      selectedStatus === opt.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-text-primary hover:bg-surface-container-low',
                    ].join(' ')}
                  >
                    <span>{opt.label}</span>
                    {selectedStatus === opt.value && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Main Content List ────────────────────────────────── */}
      <div className="flex flex-col gap-4 p-4 pb-36 max-w-4xl mx-auto w-full">
        {filteredItems.map((item) => {
          const isExpanded = expandedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={[
                'bg-surface-card rounded-md border transition-all duration-default shadow-sm hover:shadow-md overflow-hidden',
                isExpanded && item.type === 'rfi'
                  ? 'border-primary ring-1 ring-primary/30'
                  : isExpanded && item.type === 'dispute'
                  ? 'border-error ring-1 ring-error/30'
                  : 'border-border',
              ].join(' ')}
            >
              {/* Card Summary Header */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-4 flex flex-col gap-3 cursor-pointer hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-10 h-10 rounded-md flex items-center justify-center shrink-0 border shadow-xs',
                        item.type === 'rfi'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-error/10 text-error border-error/20',
                      ].join(' ')}
                    >
                      {item.type === 'rfi' ? (
                        <FileText size={20} />
                      ) : (
                        <AlertTriangle size={20} />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-text-muted uppercase">
                          {item.rfiCode || item.disputeCode}
                        </span>
                      </div>
                      <h3 className="text-base font-bold font-heading text-text-primary leading-tight">
                        {item.title}
                      </h3>
                      <span className="text-xs text-text-secondary mt-0.5">
                        {item.project}
                      </span>
                    </div>
                  </div>

                  <button className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-surface">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {/* Status & Priority */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        item.statusBg,
                      ].join(' ')}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {item.updated}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.priorityColor.split(' ')[0]}`} />
                    <span className={`text-[11px] font-semibold ${item.priorityColor.split(' ')[1]}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── EXPANDED RFI DROPDOWN WINDOW ──────────────────── */}
              {isExpanded && item.type === 'rfi' && (
                <div className="bg-slate-50/80 border-t border-border p-4 flex flex-col gap-3.5">

                  {/* Sub-Header Metadata Ribbon */}
                  <div className="bg-surface-card border border-border rounded-md p-3 flex items-center justify-between text-xs text-text-secondary shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-primary shrink-0" />
                      <span>Project: <strong className="text-text-primary">{item.project}</strong></span>
                    </div>
                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                      {item.status}
                    </span>
                  </div>

                  {/* Primary Supervisor Message / Details Card */}
                  <div className="bg-surface-card border border-border rounded-md p-4 flex flex-col gap-2.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                          S
                        </div>
                        <span className="font-bold text-text-primary">
                          Inquiry Message Sent to Admin
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted">{item.updated}</span>
                    </div>

                    <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                      {item.details || (item.messages && item.messages[0]?.text) || 'Inquiry details submitted to admin.'}
                    </p>
                  </div>

                  {/* Threaded Follow-up Messages if any */}
                  {item.messages && item.messages.length > 1 && (
                    <div className="flex flex-col gap-2.5">
                      {item.messages.slice(1).map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 items-start ${
                            msg.isSelf ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {!msg.isSelf && (
                            <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                              {msg.initials || 'A'}
                            </div>
                          )}

                          <div className="flex flex-col gap-1 max-w-[85%]">
                            <div
                              className={`flex items-center gap-1.5 text-[11px] ${
                                msg.isSelf ? 'flex-row-reverse' : ''
                              }`}
                            >
                              <span className="font-bold text-text-primary">{msg.sender}</span>
                              <span className="text-text-muted text-[10px]">{msg.time}</span>
                            </div>

                            <div
                              className={[
                                'p-3 rounded-md text-xs leading-relaxed border shadow-xs',
                                msg.isSelf
                                  ? 'bg-primary text-white border-primary rounded-tr-none'
                                  : 'bg-surface-card text-text-primary border-border rounded-tl-none',
                              ].join(' ')}
                            >
                              <p>{msg.text}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status Indicator Bar */}
                  <div className="border-t border-border pt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCheck size={15} className="text-primary shrink-0" />
                    <span className="italic">
                      Status: {item.status} — Visible in Admin Console & RFI Hub
                    </span>
                  </div>

                </div>
              )}

              {/* ── EXPANDED DISPUTE DROPDOWN WINDOW ─────────────── */}
              {isExpanded && item.type === 'dispute' && (
                <div className="bg-slate-50/80 border-t border-border p-4 flex flex-col gap-3.5">

                  {/* Audit Status Bar */}
                  <div className="bg-surface-card border border-border rounded-md p-3.5 flex flex-col gap-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-text-primary flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-error" />
                        Attendance Dispute Audit #{item.rfiCode || item.id.slice(-5)}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-error px-2.5 py-0.5 bg-error/10 rounded-full">
                        {item.status}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-error h-full transition-all duration-default"
                        style={{ width: item.status === 'RESOLVED' ? '100%' : '65%' }}
                      />
                    </div>
                  </div>

                  {/* Supervisor Sent Dispute Reason & Explanation Box */}
                  <div className="bg-surface-card border border-border rounded-md p-4 flex flex-col gap-2.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                          S
                        </div>
                        <span className="font-bold text-text-primary">
                          Reason / Explanation Sent to Admin
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted">{item.updated}</span>
                    </div>

                    <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                      {item.details || item.rebuttal?.initialText || 'Supervisor attendance explanation submitted to admin.'}
                    </p>
                  </div>

                  {/* Admin Status Note */}
                  <div className="border-t border-border pt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCheck size={15} className="text-success shrink-0" />
                    <span className="italic">
                      Status: {item.status} — Logged and visible in Admin Console
                    </span>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Floating Action Button (FAB) ────────────────────── */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 z-40 bg-primary text-white px-5 py-3.5 rounded-full shadow-xl flex items-center gap-2 hover:bg-primary-light active:scale-95 transition-all"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider">
          New RFI
        </span>
      </button>

      {/* ── New RFI Modal (Featuring Custom Foreman Style Dropdowns) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-card w-full max-w-md rounded-md p-6 border border-border shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h2 className="text-xl font-bold font-heading text-text-primary">
                Raise Issue / RFI
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRfi} className="flex flex-col gap-4">
              <Input
                label="Issue Title"
                id="rfi-title"
                placeholder="e.g. Material shortage, Drawing clash"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              {/* Custom Project Dropdown (Foreman Style) */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Project
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModalProjectOpen(!isModalProjectOpen)}
                    className="w-full flex items-center justify-between bg-surface-card border border-border-strong text-text-primary text-xs font-medium rounded-md px-3.5 py-2.5 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <span>{newProject}</span>
                    <ChevronDown
                      size={16}
                      className={`text-text-muted transition-transform duration-200 shrink-0 ${
                        isModalProjectOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isModalProjectOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-surface-card rounded-md shadow-lg border border-border overflow-hidden animate-fade-in">
                      {modalProjectOptions.map((proj) => (
                        <button
                          key={proj}
                          type="button"
                          onClick={() => {
                            setNewProject(proj);
                            setIsModalProjectOpen(false);
                          }}
                          className={[
                            'w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors border-b border-border/40 last:border-none',
                            newProject === proj
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-text-primary hover:bg-surface-container-low',
                          ].join(' ')}
                        >
                          <span>{proj}</span>
                          {newProject === proj && <Check size={14} className="text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Priority Dropdown (Foreman Style) */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Priority
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModalPriorityOpen(!isModalPriorityOpen)}
                    className="w-full flex items-center justify-between bg-surface-card border border-border-strong text-text-primary text-xs font-medium rounded-md px-3.5 py-2.5 hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <span>{newPriority}</span>
                    <ChevronDown
                      size={16}
                      className={`text-text-muted transition-transform duration-200 shrink-0 ${
                        isModalPriorityOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isModalPriorityOpen && (
                    <div className="absolute z-30 w-full mt-1 bg-surface-card rounded-md shadow-lg border border-border overflow-hidden animate-fade-in">
                      {MODAL_PRIORITY_OPTIONS.map((prio) => (
                        <button
                          key={prio}
                          type="button"
                          onClick={() => {
                            setNewPriority(prio);
                            setIsModalPriorityOpen(false);
                          }}
                          className={[
                            'w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors border-b border-border/40 last:border-none',
                            newPriority === prio
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-text-primary hover:bg-surface-container-low',
                          ].join(' ')}
                        >
                          <span>{prio}</span>
                          {newPriority === prio && <Check size={14} className="text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Explanation
                  </label>
                  <span className="text-[10px] text-text-muted">
                    {newDescription.length} / 300
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={300}
                  placeholder="Describe the issue in detail for the engineering team..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-[2] py-3 text-xs font-bold rounded-md uppercase tracking-wider"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
