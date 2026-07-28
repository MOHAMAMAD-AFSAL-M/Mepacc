import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, ArrowUpDown, Check, CheckCircle2, Circle } from 'lucide-react';
import Card from '../../components/Card';

/**
 * SupervisorProjects — Projects List page for Supervisor.
 * Matches Stitch screen "Supervisor Projects List - Management by Exception" (screen ID: 83c508b3cd4d4a6b8a7f8a5a4bdf7e36).
 *
 * Features:
 *   1. Top App Bar with "Projects" title & Notification bell
 *   2. "Current Working" projects section with interactive Sort dropdown (Alphabetically, Visited / Not Visited)
 *   3. "Old Projects" section with past/completed project list
 *   4. Project Card navigation to Project Details dashboard
 */

const INITIAL_CURRENT_PROJECTS = [
  {
    id: 'job_01',
    name: 'M M TOWER',
    phase: 'Foundation',
    visited: true,
  },
  {
    id: 'job_02',
    name: 'Sharma Complex',
    phase: 'MEP Rough-in',
    visited: false,
  },
  {
    id: 'job_03',
    name: 'Patel Villa',
    phase: 'Finishing',
    visited: false,
  },
];

const OLD_PROJECTS = [
  { id: 'old_01', name: 'City Mall', phase: 'Completed' },
  { id: 'old_02', name: 'Sunrise Apartments', phase: 'Completed' },
];

export default function SupervisorProjects() {
  const navigate = useNavigate();

  const [currentProjects, setCurrentProjects] = useState(INITIAL_CURRENT_PROJECTS);
  const [sortOption, setSortOption] = useState('alphabetical'); // 'alphabetical' | 'visited'
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortChange = (option) => {
    setSortOption(option);
    setIsSortOpen(false);

    const sorted = [...currentProjects];
    if (option === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (option === 'visited') {
      sorted.sort((a, b) => (b.visited ? 1 : 0) - (a.visited ? 1 : 0));
    }
    setCurrentProjects(sorted);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
        <h1 className="text-xl font-bold font-heading text-text-primary">
          Projects
        </h1>
        <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">
          <Bell size={20} className="text-text-secondary" />
        </button>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <div className="flex flex-col gap-6 p-4 pb-32 max-w-4xl mx-auto w-full">

        {/* ── Section 1: Current Working Projects ─────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center relative">
            <h2 className="text-base font-bold font-heading text-text-secondary">
              Current Working
            </h2>

            {/* Sort Dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-border rounded-sm text-text-secondary hover:bg-surface transition-colors text-xs font-semibold"
              >
                <span>Sort</span>
                <ArrowUpDown size={14} />
              </button>

              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-card rounded-sm shadow-md border border-border z-20 flex flex-col overflow-hidden">
                  <button
                    onClick={() => handleSortChange('alphabetical')}
                    className={[
                      'px-4 py-2.5 text-left text-xs font-medium flex items-center justify-between transition-colors border-b border-border',
                      sortOption === 'alphabetical'
                        ? 'text-primary bg-primary/10 font-semibold'
                        : 'text-text-primary hover:bg-surface',
                    ].join(' ')}
                  >
                    <span>Alphabetically</span>
                    {sortOption === 'alphabetical' && <Check size={14} />}
                  </button>

                  <button
                    onClick={() => handleSortChange('visited')}
                    className={[
                      'px-4 py-2.5 text-left text-xs font-medium flex items-center justify-between transition-colors',
                      sortOption === 'visited'
                        ? 'text-primary bg-primary/10 font-semibold'
                        : 'text-text-primary hover:bg-surface',
                    ].join(' ')}
                  >
                    <span>Visited / Not Visited</span>
                    {sortOption === 'visited' && <Check size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Active Projects Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentProjects.map((project) => (
              <Card
                key={project.id}
                padding="none"
                onClick={() => navigate(`/supervisor/projects/${project.id}`)}
                className="p-4 border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between group"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold font-heading text-text-primary">
                    {project.name}
                  </h3>
                  <span className="text-xs text-text-secondary">
                    Active Phase: {project.phase}
                  </span>

                  {project.visited ? (
                    <div className="flex items-center gap-1 text-success mt-1">
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                      <span className="text-[11px] font-semibold">Visited</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-text-muted mt-1">
                      <Circle size={14} strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold">Not Visited</span>
                    </div>
                  )}
                </div>

                <ChevronRight
                  size={20}
                  className="text-text-muted group-hover:text-primary transition-colors shrink-0"
                />
              </Card>
            ))}
          </div>
        </div>

        {/* ── Section 2: Old Projects ─────────────────────────── */}
        <div className="flex flex-col gap-3 mt-2">
          <h2 className="text-base font-bold font-heading text-text-secondary">
            Old Projects
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OLD_PROJECTS.map((project) => (
              <Card
                key={project.id}
                padding="none"
                className="p-4 border border-border bg-slate-50 opacity-80 flex items-center justify-between cursor-pointer hover:opacity-100 transition-opacity"
              >
                <h3 className="text-base font-medium font-heading text-text-secondary">
                  {project.name}
                </h3>
                <ChevronRight size={18} className="text-text-muted" />
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
