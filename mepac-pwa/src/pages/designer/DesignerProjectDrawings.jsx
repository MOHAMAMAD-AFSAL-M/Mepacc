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
  X,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
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
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': formFile.type || 'application/octet-stream' },
        body: formFile,
      });
      const { storageId } = await result.json();

      const sizeBytes = formFile.size;
      const sizeStr =
        sizeBytes < 1024 * 1024
          ? `${(sizeBytes / 1024).toFixed(1)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

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

      setFormName('');
      setFormNotes('');
      setFormFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadModalOpen(false);
      showToast(`Drawing "${formName}" (v1) created!`);
    } catch (err) {
      console.error('Failed to create blueprint:', err);
      alert('Failed to upload drawing: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle Uploading a New Revision (v+1) ──────────────────────
  const handleUploadRevision = async (e) => {
    e.preventDefault();
    if (!selectedBlueprint || !revisionFile) {
      alert('Please select a file for the revision.');
      return;
    }

    setIsSubmitting(true);
    try {
      const postUrl = await generateUploadUrl();
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
      showToast(`Uploaded revision (v${nextVer})!`);
    } catch (err) {
      console.error('Failed to upload revision:', err);
      alert('Failed to upload revision: ' + (err.message || ''));
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
      showToast('Drawing deleted.');
    } catch (err) {
      console.error('Failed to delete blueprint:', err);
      alert('Failed to delete drawing.');
    }
  };

  const isLoading = rawBlueprints === undefined;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/designer/home')}
            className="p-1 rounded-full hover:bg-surface-card transition-colors focus:outline-none shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} className="text-text-primary" />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold font-heading text-text-primary truncate">
              {project?.name || 'Project Drawings'}
            </h1>
            <span className="text-xs text-text-secondary truncate">
              {project?.location || 'MEP Drawings'}
            </span>
          </div>
        </div>

        <NotificationBellButton />
      </header>

      {/* ── Toast Alert ─────────────────────────────────────── */}
      {toastMessage && (
        <div className="sticky top-16 z-30 bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="p-0.5 text-white/80 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 p-4 pb-32 max-w-4xl mx-auto w-full">
        {/* Project Card with Gradient */}
        <Card
          padding="none"
          className="relative w-full h-32 overflow-hidden border border-border shrink-0 shadow-sm rounded-lg"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute inset-0 p-3.5 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                Drawings
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md">
                {rawBlueprints?.length || 0} Total
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <h2 className="text-base font-bold font-heading leading-tight truncate max-w-[200px]">
                  {project?.name || 'Drawings'}
                </h2>
                <span className="text-[11px] text-white/80 truncate">{project?.client}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3 py-1.5 rounded bg-white text-primary text-xs font-bold flex items-center gap-1 shadow-md hover:bg-slate-100 transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Upload</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ── Discipline Category Filter Tabs ─────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0',
                    isActive
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-card text-text-secondary border-border hover:text-text-primary',
                  ].join(' ')}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drawings by name..."
              className="w-full pl-8 pr-3 py-2 bg-surface-card border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary shadow-xs"
            />
          </div>
        </div>

        {/* ── Drawings List ───────────────────────────────────── */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted border border-border rounded-lg bg-surface-card">
            Loading drawings...
          </div>
        ) : filteredBlueprints.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {filteredBlueprints.map((bp) => {
              const bpId = bp._id || bp.id;
              const isHistoryOpen = historyOpenBlueprintId === bpId;
              const latest = bp.latestRevision;
              const revisions = bp.revisions || (latest ? [latest] : []);

              return (
                <Card
                  key={bpId}
                  padding="none"
                  className="p-3.5 border border-border shadow-xs hover:shadow-sm transition-all rounded-lg bg-surface-card flex flex-col gap-2.5"
                >
                  {/* Top Row: Icon + Title + Version + Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded bg-blue-50 text-primary flex items-center justify-center border border-blue-100 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold font-heading text-text-primary truncate">
                            {bp.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                            v{bp.currentVersion}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-secondary">
                          {bp.category || 'Drawing'} {latest?.fileSize ? `• ${latest.fileSize}` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBlueprintToDelete(bp)}
                      className="p-1 rounded text-text-muted hover:text-rose-600 transition-colors"
                      title="Delete drawing"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Notes snippet if available */}
                  {latest?.notes && (
                    <div className="p-2 rounded bg-surface border border-border text-[11px] text-text-secondary flex items-start gap-1.5">
                      <MessageSquare size={13} className="text-primary shrink-0 mt-0.5" />
                      <span className="leading-tight line-clamp-2">{latest.notes}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/70">
                    {/* Download */}
                    {bp.fileUrl ? (
                      <a
                        href={bp.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={latest?.fileName || `${bp.name}.pdf`}
                        className="flex-1 py-1.5 px-2.5 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                    ) : (
                      <button disabled className="flex-1 py-1.5 px-2.5 rounded bg-surface text-text-muted text-xs font-semibold border border-border">
                        Processing...
                      </button>
                    )}

                    {/* Upload Revision */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBlueprint(bp);
                        setIsRevisionModalOpen(true);
                      }}
                      className="py-1.5 px-2.5 rounded border border-border bg-surface hover:bg-surface-card text-text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Upload size={13} className="text-primary" />
                      <span>Upload Revision</span>
                    </button>

                    {/* History */}
                    <button
                      type="button"
                      onClick={() => setHistoryOpenBlueprintId(isHistoryOpen ? null : bpId)}
                      className={[
                        'py-1.5 px-2 rounded border text-xs font-semibold flex items-center gap-1 transition-colors',
                        isHistoryOpen
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'border-border bg-surface text-text-secondary hover:bg-surface-card',
                      ].join(' ')}
                      title="Version history"
                    >
                      <Clock size={13} />
                      <span>{revisions.length}</span>
                    </button>
                  </div>

                  {/* Version History Accordion */}
                  {isHistoryOpen && (
                    <div className="mt-1 p-2.5 bg-surface border border-border rounded flex flex-col gap-1.5 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        Version History (Max 3)
                      </span>
                      {revisions.map((rev) => (
                        <div
                          key={rev._id || rev.version}
                          className="p-2 bg-surface-card border border-border/80 rounded flex items-center justify-between gap-2"
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[11px]">v{rev.version}</span>
                              {rev.version === bp.currentVersion && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">Latest</span>
                              )}
                              <span className="text-[10px] text-text-muted">
                                {rev.uploadedAt ? new Date(rev.uploadedAt).toLocaleDateString() : ''}
                              </span>
                            </div>
                            {rev.notes && (
                              <span className="text-[10px] text-text-secondary italic truncate max-w-[180px]">
                                {rev.notes}
                              </span>
                            )}
                          </div>

                          {rev.fileUrl && (
                            <a
                              href={rev.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={rev.fileName || `${bp.name}_v${rev.version}.pdf`}
                              className="p-1 text-primary hover:text-primary-dark font-semibold text-xs flex items-center gap-1 shrink-0"
                            >
                              <Download size={12} />
                              <span>v{rev.version}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-text-muted border border-border rounded-lg bg-surface-card">
            No drawings in {activeCategory}. Click "+ Upload" above to add one.
          </div>
        )}
      </div>

      {/* ── Modal: Upload New Drawing ──────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface-card border border-border rounded-lg shadow-xl p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Upload New Drawing
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBlueprint} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-text-primary"
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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">Title</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ground Floor Power"
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-text-primary"
                  required
                  maxLength={60}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setFormFile(e.target.files[0] || null)}
                  className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white bg-surface border border-border rounded p-1"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">Notes (Optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes about this drawing..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-text-primary resize-none"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim() || !formFile}
                  className="flex-1 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload v1'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Upload Revision (v+1) ───────────────────────── */}
      {isRevisionModalOpen && selectedBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface-card border border-border rounded-lg shadow-xl p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex flex-col min-w-0">
                <h3 className="text-sm font-bold font-heading text-text-primary truncate">
                  Upload Revision
                </h3>
                <span className="text-[11px] text-text-secondary truncate">
                  {selectedBlueprint.name} &bull; <strong>v{(selectedBlueprint.currentVersion || 1) + 1}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRevisionModalOpen(false);
                  setSelectedBlueprint(null);
                }}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadRevision} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">Revision File</label>
                <input
                  ref={revisionFileInputRef}
                  type="file"
                  onChange={(e) => setRevisionFile(e.target.files[0] || null)}
                  className="w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white bg-surface border border-border rounded p-1"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary">Revision Notes</label>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="What was changed in this version..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded text-xs text-text-primary resize-none"
                  required
                  maxLength={200}
                />
              </div>

              <span className="text-[10px] text-text-muted">
                Max 3 latest versions are preserved in a FIFO queue.
              </span>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsRevisionModalOpen(false);
                    setSelectedBlueprint(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !revisionFile || !revisionNotes.trim()}
                  className="flex-1 py-2 rounded bg-primary hover:bg-primary-dark text-white text-xs font-semibold"
                >
                  {isSubmitting ? 'Uploading...' : `Upload v${(selectedBlueprint.currentVersion || 1) + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ─────────────────────────── */}
      {blueprintToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-surface-card border border-border rounded-lg shadow-xl p-4 flex flex-col gap-3 text-center">
            <h3 className="text-sm font-bold font-heading text-text-primary">
              Delete Drawing?
            </h3>
            <p className="text-xs text-text-secondary">
              Delete <strong>"{blueprintToDelete.name}"</strong> and all its versions?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlueprintToDelete(null)}
                className="flex-1 py-2 rounded border border-border text-xs font-semibold text-text-secondary hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBlueprint}
                className="flex-1 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
