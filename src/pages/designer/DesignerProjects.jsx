import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, FileText, Layers } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex.js';
import Card from '../../components/Card';
import NotificationBellButton from '../../components/NotificationBellButton';
import { getProjectGradient } from '../../utils/colors';

/**
 * DesignerProjects — Mobile Projects screen for Designers.
 * Clean, mobile-native layout matching SupervisorProjects.
 */
export default function DesignerProjects() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all projects and blueprints from Convex
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

  // Separate active and completed projects with search filtering
  const { activeProjects, completedProjects } = useMemo(() => {
    const active = [];
    const completed = [];

    if (rawProjects && Array.isArray(rawProjects)) {
      const q = searchQuery.toLowerCase().trim();
      rawProjects.forEach((p) => {
        const matches =
          !q ||
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.client && p.client.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q));

        if (!matches) return;

        if (p.isCompleted) {
          completed.push(p);
        } else {
          active.push(p);
        }
      });
    }

    return { activeProjects: active, completedProjects: completed };
  }, [rawProjects, searchQuery]);

  const isLoading = rawProjects === undefined;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <h1 className="text-xl font-bold font-heading text-text-primary">
          Projects
        </h1>
        <NotificationBellButton />
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-5 p-4 pb-32 max-w-4xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface-card border border-border rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary shadow-xs"
          />
        </div>

        {/* ── Section 1: Active Projects ──────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-heading text-text-secondary">
              Active Projects
            </h2>
            <span className="text-xs font-semibold text-text-muted">
              {activeProjects.length} ACTIVE
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 bg-surface-card border border-border rounded-lg text-xs text-text-muted">
              <span className="inline-block w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
              Loading projects...
            </div>
          ) : activeProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeProjects.map((project) => {
                const projectId = project.id || project._id;
                const count = drawingCountByProject[projectId] || 0;

                return (
                  <Card
                    key={projectId}
                    padding="none"
                    onClick={() => navigate(`/designer/projects/${projectId}`)}
                    className="border border-border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col group relative overflow-hidden rounded-lg bg-surface-card"
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
                      <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                        <FileText size={12} className="text-indigo-300" strokeWidth={2.5} />
                        <span>{count} {count === 1 ? 'Drawing' : 'Drawings'}</span>
                      </div>

                      <span className="relative z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/90 text-white backdrop-blur-md">
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

                      <ChevronRight
                        size={18}
                        className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-xs text-text-muted text-center border border-border rounded-lg bg-surface-card">
              No active projects found.
            </div>
          )}
        </div>

        {/* ── Section 2: Completed Projects ───────────────────── */}
        {completedProjects.length > 0 && (
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-heading text-text-secondary">
                Completed Projects
              </h2>
              <span className="text-xs font-semibold text-text-muted">
                {completedProjects.length} COMPLETED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedProjects.map((project) => {
                const projectId = project.id || project._id;
                return (
                  <Card
                    key={projectId}
                    padding="none"
                    onClick={() => navigate(`/designer/projects/${projectId}`)}
                    className="p-4 border border-border bg-slate-50/70 hover:bg-surface-card flex items-center justify-between cursor-pointer hover:shadow-sm transition-all group rounded-lg"
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                      <h3 className="text-sm font-medium font-heading text-text-primary group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </h3>
                      {project.location && (
                        <span className="text-xs text-text-muted truncate flex items-center gap-1">
                          <MapPin size={11} />
                          {project.location}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors shrink-0" />
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
