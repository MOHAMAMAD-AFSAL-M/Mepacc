import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Layers, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex.js';
import useAuthStore from '../../store/authStore';
import Card from '../../components/Card';
import NotificationBellButton from '../../components/NotificationBellButton';
import { getProjectGradient } from '../../utils/colors';

/**
 * DesignerProjects — Main Home Dashboard for the Designer role.
 * Designers have global access to all active company projects to manage drawings.
 */
export default function DesignerProjects() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all active company projects from Convex
  const rawProjects = useQuery(api.projects.getSupervisorProjects, {});
  const rawBlueprints = useQuery(api.blueprints.listAll, {});

  // Compute drawing count map by projectId
  const drawingCountByProject = useMemo(() => {
    const map = {};
    if (rawBlueprints && Array.isArray(rawBlueprints)) {
      for (const bp of rawBlueprints) {
        if (bp.projectId) {
          map[bp.projectId] = (map[bp.projectId] || 0) + 1;
        }
      }
    }
    return map;
  }, [rawBlueprints]);

  // Filter only active projects matching search query
  const activeProjects = useMemo(() => {
    if (!rawProjects || !Array.isArray(rawProjects)) return [];
    return rawProjects
      .filter((p) => !p.isCompleted)
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.client && p.client.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q))
        );
      });
  }, [rawProjects, searchQuery]);

  const isLoading = rawProjects === undefined;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-surface-card border-b border-border shadow-xs px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-heading text-primary leading-none">
              MEPacc
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Designer
            </span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBellButton />
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 p-4 pb-28 max-w-4xl mx-auto w-full">
        {/* Designer Welcome Banner */}
        <Card padding="md" className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0 shadow-md">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
                <Layers size={18} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Engineering & Design Portal
              </span>
            </div>
            <h2 className="text-xl font-bold font-heading">
              MEP Drawings & Version History
            </h2>
            <p className="text-xs text-white/80 leading-relaxed">
              Global drawing control for active company projects. Upload, download, categorize, and track maximum 3 version-controlled revisions per discipline (Electrical, Plumbing, HVAC, Fire Protection, etc.).
            </p>
          </div>
        </Card>

        {/* Search & Active Project Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-heading text-text-primary">
                Active Projects
              </h3>
              <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                {activeProjects.length}
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, client, or city..."
              className="w-full pl-9 pr-3 py-2 bg-surface-card border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Project Cards List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border rounded-lg">
            <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
            <span className="text-xs text-text-muted">Loading projects & drawings...</span>
          </div>
        ) : activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeProjects.map((project) => {
              const projectId = project.id || project._id;
              const count = drawingCountByProject[projectId] || 0;
              const mapsUrl = project.latitude != null && project.longitude != null
                ? `https://www.google.com/maps/search/?api=1&query=${project.latitude},${project.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location || project.name)}`;

              return (
                <Card
                  key={projectId}
                  padding="none"
                  onClick={() => navigate(`/designer/projects/${projectId}`)}
                  className="border border-border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group relative overflow-hidden rounded-lg bg-surface-card"
                >
                  {/* Top Gradient Banner matching Admin Console */}
                  <div
                    className="h-28 w-full relative overflow-hidden flex items-start justify-between p-3"
                    style={{
                      background: getProjectGradient(projectId),
                    }}
                  >
                    {project.imageUrl && (
                      <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Drawing Count Pill */}
                    <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                      <FileText size={12} className="text-indigo-300" strokeWidth={2.5} />
                      <span>{count} {count === 1 ? 'Drawing' : 'Drawings'}</span>
                    </div>

                    <span className="relative z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/80 text-white backdrop-blur-md">
                      Active
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h3 className="text-base font-bold font-heading text-text-primary group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="truncate font-medium text-text-primary">{project.client}</span>
                        {project.location && (
                          <>
                            <span>•</span>
                            <span className="truncate flex items-center gap-0.5">
                              <MapPin size={11} className="text-primary shrink-0" />
                              {project.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-primary font-semibold text-xs shrink-0 group-hover:translate-x-1 transition-transform">
                      <span className="hidden sm:inline">Drawings</span>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border rounded-lg text-center gap-2">
            <Layers size={36} className="text-text-muted" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-text-primary">No active projects found</span>
            <span className="text-xs text-text-secondary">
              {searchQuery ? `No projects match "${searchQuery}"` : 'Active projects assigned in the Admin panel will appear here.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
