import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Plus,
  Search,
  Download,
  Upload,
  Clock,
  Trash2,
  FileText,
  Layers,
  CheckCircle2,
  X,
  AlertTriangle,
  File,
  Eye,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex.js';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import NotificationBellButton from '../../components/NotificationBellButton';
import { getProjectGradient } from '../../utils/colors';

const CATEGORIES = [
  'All',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Fire Protection',
  'Architectural',
  'Other',
];

export default function DesignerProjectDrawings() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [blueprintToDelete, setBlueprintToDelete] = useState(null);
  const [historyOpenBlueprintId, setHistoryOpenBlueprintId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form states for New Drawing Upload
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Electrical');
  const [formNotes, setFormNotes] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Form states for Revision Upload
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionFile, setRevisionFile] = useState(null);
  const revisionFileInputRef = useRef(null);

  // Convex Queries & Mutations
  const rawProjects = useQuery(api.projects.getSupervisorProjects, {});
  const project = useMemo(() => {
    if (!rawProjects || !Array.isArray(rawProjects)) return null;
    return rawProjects.find((p) => p.id === projectId || p._id === projectId) || null;
  }, [rawProjects, projectId]);

  const rawBlueprints = useQuery(
    api.blueprints.getByProject,
    projectId ? { projectId } : 'skip'
  );

  const generateUploadUrl = useMutation(api.blueprints.generateWorkerUploadUrl);
  const createBlueprint = useMutation(api.blueprints.create);
  const uploadRevision = useMutation(api.blueprints.uploadRevision);
  const deleteBlueprint = useMutation(api.blueprints.remove);

  // Filter blueprints by Category and Search Query
  const filteredBlueprints = useMemo(() => {
    if (!rawBlueprints || !Array.isArray(rawBlueprints)) return [];
    return rawBlueprints.filter((bp) => {
      const matchCat =
        activeCategory === 'All' ||
        (bp.category && bp.category.toLowerCase() === activeCategory.toLowerCase());
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (bp.name && bp.name.toLowerCase().includes(q)) ||
        (bp.latestRevision?.notes && bp.latestRevision.notes.toLowerCase().includes(q)) ||
        (bp.latestRevision?.fileName && bp.latestRevision.fileName.toLowerCase().includes(q))
      );
    });
  }, [rawBlueprints, activeCategory, searchQuery]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: 0 };
    for (const cat of CATEGORIES) {
      if (cat !== 'All') counts[cat] = 0;
    }
    if (rawBlueprints && Array.isArray(rawBlueprints)) {
      counts.All = rawBlueprints.length;
      for (const bp of rawBlueprints) {
        const cat = bp.category || 'Other';
        if (counts[cat] !== undefined) {
          counts[cat]++;
        } else {
          counts.Other = (counts.Other || 0) + 1;
        }
      }
    }
    return counts;
  }, [rawBlueprints]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // ── Handle New Drawing Creation ───────────────────────────────
  const handleCreateBlueprint = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formFile) {
      alert('Please provide a drawing title and select a file.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get upload URL from Convex
      const postUrl = await generateUploadUrl();

      // 2. Upload physical file to Convex storage
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': formFile.type || 'application/octet-stream' },
        body: formFile,
      });
      const { storageId } = await result.json();

      // Calculate readable file size
      const sizeBytes = formFile.size;
      const sizeStr =
        sizeBytes < 1024 * 1024
          ? `${(sizeBytes / 1024).toFixed(1)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

      // 3. Create document record
      await createBlueprint({
        projectId,
        name: formName.trim(),
        category: formCategory,
        fileStorageId: storageId,
        uploadedBy: user?.name || 'Designer',
        uploadedByRole: 'Designer',
        workerId: user?.id,
        notes: formNotes.trim() || 'Initial release (v1)',
        fileName: formFile.name,
        fileSize: sizeStr,
      });

      // Reset form
      setFormName('');
      setFormNotes('');
      setFormFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadModalOpen(false);
      showToast(`Drawing "${formName}" (v1) created successfully!`);
    } catch (err) {
      console.error('Failed to create blueprint:', err);
      alert('Failed to upload drawing: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle Uploading a New Revision (v+1) ──────────────────────
  const handleUploadRevision = async (e) => {
    e.preventDefault();
    if (!selectedBlueprint || !revisionFile) {
      alert('Please select a file for the new revision.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get upload URL
      const postUrl = await generateUploadUrl();

      // 2. Upload file to Convex storage
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': revisionFile.type || 'application/octet-stream' },
        body: revisionFile,
      });
      const { storageId } = await result.json();

      const sizeBytes = revisionFile.size;
      const sizeStr =
        sizeBytes < 1024 * 1024
          ? `${(sizeBytes / 1024).toFixed(1)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

      // 3. Insert revision (backend automatically prunes versions > 3 FIFO)
      const nextVer = await uploadRevision({
        blueprintId: selectedBlueprint._id || selectedBlueprint.id,
        fileStorageId: storageId,
        uploadedBy: user?.name || 'Designer',
        uploadedByRole: 'Designer',
        workerId: user?.id,
        notes: revisionNotes.trim() || `Updated revision (v${(selectedBlueprint.currentVersion || 1) + 1})`,
        fileName: revisionFile.name,
        fileSize: sizeStr,
      });

      setRevisionNotes('');
      setRevisionFile(null);
      if (revisionFileInputRef.current) revisionFileInputRef.current.value = '';
      setIsRevisionModalOpen(false);
      setSelectedBlueprint(null);
      showToast(`Uploaded new revision (v${nextVer})! Max 3 latest versions retained.`);
    } catch (err) {
      console.error('Failed to upload revision:', err);
      alert('Failed to upload revision: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle Blueprint Deletion ─────────────────────────────────
  const handleDeleteBlueprint = async () => {
    if (!blueprintToDelete) return;
    try {
      await deleteBlueprint({
        blueprintId: blueprintToDelete._id || blueprintToDelete.id,
      });
      setBlueprintToDelete(null);
      showToast('Drawing and all stored versions deleted.');
    } catch (err) {
      console.error('Failed to delete blueprint:', err);
      alert('Failed to delete drawing.');
    }
  };

  const isLoading = rawBlueprints === undefined;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* ── Sticky Top Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-surface-card border-b border-border shadow-xs px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/designer/home')}
              className="p-1.5 rounded-md hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors shrink-0"
              title="Back to Projects"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-bold font-heading text-text-primary truncate">
                {project?.name || 'Project Drawings'}
              </h1>
              <span className="text-[11px] text-text-secondary truncate">
                {project?.client ? `${project.client} • ` : ''}{project?.location || 'MEP Drawing Set'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBellButton />
          </div>
        </div>
      </header>

      {/* ── Success Toast Alert ────────────────────────────────── */}
      {toastMessage && (
        <div className="sticky top-[57px] z-30 bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-white shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="p-1 text-white/80 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Main Content Container ─────────────────────────────── */}
      <div className="flex flex-col gap-4 p-4 pb-28 max-w-4xl mx-auto w-full">
        {/* Project Hero Card */}
        <Card
          padding="none"
          className="relative w-full h-36 sm:h-40 overflow-hidden border border-border shrink-0 shadow-md rounded-lg"
          style={{
            background: getProjectGradient(projectId),
          }}
        >
          {project?.imageUrl && (
            <img
              src={project.imageUrl}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
                MEP Engineering Set
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/80 backdrop-blur-md">
                {rawBlueprints?.length || 0} Total Drawings
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-xl font-bold font-heading tracking-tight leading-tight">
                  {project?.name || 'Drawings Hub'}
                </h2>
                <span className="text-xs text-white/80">{project?.location}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3.5 py-2 rounded-md bg-white text-primary hover:bg-slate-100 active:scale-95 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Upload Drawing</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ── Discipline Category Filter Tabs ─────────────────── */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Discipline / Category
            </span>
            <span className="text-[11px] text-text-muted">Max 3 versions kept per drawing</span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border',
                    isActive
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-card text-text-secondary border-border hover:text-text-primary hover:bg-surface',
                  ].join(' ')}
                >
                  <span>{cat}</span>
                  <span
                    className={[
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      isActive ? 'bg-white/25 text-white' : 'bg-surface text-text-muted',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative mt-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeCategory === 'All' ? 'all drawings' : `${activeCategory} drawings`} by title or notes...`}
              className="w-full pl-9 pr-3 py-2 bg-surface-card border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* ── Drawings List / Cards ────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border rounded-lg">
            <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
            <span className="text-xs text-text-muted">Loading drawings and revisions...</span>
          </div>
        ) : filteredBlueprints.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredBlueprints.map((bp) => {
              const bpId = bp._id || bp.id;
              const isHistoryOpen = historyOpenBlueprintId === bpId;
              const latest = bp.latestRevision;
              const revisions = bp.revisions || (latest ? [latest] : []);
              const categoryColor =
                bp.category === 'Electrical'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : bp.category === 'Plumbing'
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  : bp.category === 'HVAC'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : bp.category === 'Fire Protection'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200';

              return (
                <Card
                  key={bpId}
                  padding="none"
                  className="border border-border shadow-xs hover:shadow-md transition-all rounded-lg overflow-hidden bg-surface-card flex flex-col"
                >
                  <div className="p-4 flex flex-col gap-3">
                    {/* Top Row: Title, Category Badge, Version Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryColor}`}
                          >
                            {bp.category || 'Discipline'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            v{bp.currentVersion} (Latest)
                          </span>
                        </div>
                        <h3 className="text-base font-bold font-heading text-text-primary truncate mt-0.5">
                          {bp.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Delete Blueprint Button */}
                        <button
                          type="button"
                          onClick={() => setBlueprintToDelete(bp)}
                          className="p-1.5 rounded-md text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete drawing"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Designer Revision Notes / Comment Box */}
                    {latest?.notes && (
                      <div className="p-2.5 rounded-md bg-surface border border-border text-xs text-text-secondary flex items-start gap-2">
                        <MessageSquare size={14} className="text-primary shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Revision Notes (v{bp.currentVersion})
                          </span>
                          <span className="text-xs text-text-primary leading-relaxed">
                            {latest.notes}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Metadata line: File name, file size, upload timestamp */}
                    <div className="flex items-center justify-between text-xs text-text-secondary pt-1 border-t border-border/60 flex-wrap gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={13} className="text-text-muted shrink-0" />
                        <span className="truncate max-w-[200px]" title={latest?.fileName || bp.name}>
                          {latest?.fileName || `${bp.name}.pdf`}
                        </span>
                        {latest?.fileSize && (
                          <span className="text-text-muted">({latest.fileSize})</span>
                        )}
                      </div>

                      <span className="text-[11px] text-text-muted shrink-0">
                        {latest?.uploadedAt
                          ? new Date(latest.uploadedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Download Latest File */}
                      {bp.fileUrl ? (
                        <a
                          href={bp.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={latest?.fileName || `${bp.name}.pdf`}
                          className="flex-1 py-2 px-3 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Download size={14} />
                          <span>Download Latest (v{bp.currentVersion})</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="flex-1 py-2 px-3 rounded-md bg-surface text-text-muted text-xs font-semibold cursor-not-allowed border border-border"
                        >
                          File Processing...
                        </button>
                      )}

                      {/* Upload New Revision */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBlueprint(bp);
                          setIsRevisionModalOpen(true);
                        }}
                        className="py-2 px-3 rounded-md border border-border bg-surface hover:bg-surface-card hover:border-primary text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
                        title="Upload new version"
                      >
                        <Upload size={14} className="text-primary" />
                        <span>Upload Revision</span>
                      </button>

                      {/* Toggle Version History */}
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryOpenBlueprintId(isHistoryOpen ? null : bpId)
                        }
                        className={[
                          'py-2 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1 transition-all shrink-0',
                          isHistoryOpen
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'border-border bg-surface hover:bg-surface-card text-text-secondary',
                        ].join(' ')}
                        title="View revision history"
                      >
                        <Clock size={14} />
                        <span>{revisions.length}/3</span>
                      </button>
                    </div>

                    {/* ── Accordion: Version History (Max 3 retained versions) ── */}
                    {isHistoryOpen && (
                      <div className="mt-2 p-3 bg-surface border border-border rounded-md flex flex-col gap-2 animate-fade-in">
                        <div className="flex items-center justify-between pb-1 border-b border-border/80">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                            <Clock size={12} className="text-primary" />
                            <span>Version History (Max 3 Retained)</span>
                          </span>
                          <span className="text-[10px] text-text-muted">FIFO Queue</span>
                        </div>

                        {revisions.map((rev) => (
                          <div
                            key={rev._id || rev.version}
                            className="p-2.5 bg-surface-card border border-border/70 rounded-md flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary px-1.5 py-0.2 rounded bg-surface border border-border text-[11px]">
                                  v{rev.version}
                                </span>
                                {rev.version === bp.currentVersion && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                    Current
                                  </span>
                                )}
                                <span className="text-[11px] text-text-muted">
                                  {rev.uploadedAt
                                    ? new Date(rev.uploadedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Recent'}
                                </span>
                              </div>

                              {rev.notes && (
                                <p className="text-[11px] text-text-secondary leading-tight italic">
                                  "{rev.notes}"
                                </p>
                              )}

                              {rev.fileName && (
                                <span className="text-[10px] text-text-muted truncate">
                                  File: {rev.fileName} {rev.fileSize ? `(${rev.fileSize})` : ''}
                                </span>
                              )}
                            </div>

                            {rev.fileUrl ? (
                              <a
                                href={rev.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={rev.fileName || `${bp.name}_v${rev.version}.pdf`}
                                className="px-2.5 py-1.5 rounded-md bg-surface hover:bg-surface-card border border-border text-primary hover:text-primary-dark font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                              >
                                <Download size={12} />
                                <span>Get v{rev.version}</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-text-muted">N/A</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border rounded-lg text-center gap-2">
            <FileText size={36} className="text-text-muted" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-text-primary">
              No drawings in {activeCategory}
            </span>
            <span className="text-xs text-text-secondary max-w-sm">
              {searchQuery
                ? `No drawings match "${searchQuery}".`
                : 'Click "+ Upload Drawing" above to add the initial revision for this discipline.'}
            </span>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-2 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Upload First Drawing</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modal: Upload New Drawing ──────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-card border border-border rounded-lg shadow-2xl p-5 flex flex-col gap-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <Plus size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-bold font-heading text-text-primary">
                  Upload New MEP Drawing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBlueprint} className="flex flex-col gap-3.5">
              {/* Category selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">
                  Discipline / Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-primary"
                  required
                >
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Fire Protection">Fire Protection</option>
                  <option value="Architectural">Architectural</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Title input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">
                  Drawing Title / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ground Floor Power Layout"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-primary"
                  required
                  maxLength={80}
                />
              </div>

              {/* File selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">
                  Drawing File (PDF, DWG, CAD, Image) <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFormFile(e.target.files[0] || null)}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer bg-surface border border-border rounded-md p-1.5"
                  required
                />
              </div>

              {/* Revision Notes / Changelog comments */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
                  <span>Revision Notes / Comments</span>
                  <span className="text-[10px] text-text-muted">Version 1</span>
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Describe what is included in this drawing (e.g. Cable trays, DB layouts, circuit schedule)..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                  maxLength={300}
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-md border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim() || !formFile}
                  className="flex-1 py-2.5 px-3 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload v1</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Upload Revision (v+1) ───────────────────────── */}
      {isRevisionModalOpen && selectedBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-card border border-border rounded-lg shadow-2xl p-5 flex flex-col gap-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex flex-col min-w-0">
                <h3 className="text-base font-bold font-heading text-text-primary truncate">
                  Upload Revision for {selectedBlueprint.name}
                </h3>
                <span className="text-[11px] text-text-secondary">
                  Will create <strong>v{(selectedBlueprint.currentVersion || 1) + 1}</strong> (Max 3 latest versions retained)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRevisionModalOpen(false);
                  setSelectedBlueprint(null);
                }}
                className="p-1 rounded-md text-text-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadRevision} className="flex flex-col gap-3.5">
              {/* File selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">
                  New Revision File <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={revisionFileInputRef}
                  type="file"
                  onChange={(e) => setRevisionFile(e.target.files[0] || null)}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer bg-surface border border-border rounded-md p-1.5"
                  required
                />
              </div>

              {/* Revision comments */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
                  <span>Revision Changelog / Notes <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-text-muted">v{(selectedBlueprint.currentVersion || 1) + 1}</span>
                </label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Explain what was updated in this revision (e.g. Revised pipe sizing in risers as per RFI-012)..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                  required
                  maxLength={300}
                />
              </div>

              <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>FIFO Version Queue:</strong> A maximum of 3 latest versions are preserved. If this is version 4 or higher, the oldest version is automatically removed.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsRevisionModalOpen(false);
                    setSelectedBlueprint(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-3 rounded-md border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !revisionFile || !revisionNotes.trim()}
                  className="flex-1 py-2.5 px-3 rounded-md bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload v{(selectedBlueprint.currentVersion || 1) + 1}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ─────────────────────────── */}
      {blueprintToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface-card border border-border rounded-lg shadow-2xl p-5 flex flex-col gap-4 text-center animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={24} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold font-heading text-text-primary">
                Delete Drawing?
              </h3>
              <p className="text-xs text-text-secondary">
                Are you sure you want to delete <strong>"{blueprintToDelete.name}"</strong>? All stored revisions and physical files will be permanently purged.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlueprintToDelete(null)}
                className="flex-1 py-2.5 px-3 rounded-md border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBlueprint}
                className="flex-1 py-2.5 px-3 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
