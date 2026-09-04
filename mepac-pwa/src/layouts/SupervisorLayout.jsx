import { Outlet } from 'react-router-dom';
import { Home, Building2, FileText, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const supervisorNavItems = [
  { icon: Home,      label: 'Home',     path: '/supervisor/home' },
  { icon: Building2, label: 'Projects', path: '/supervisor/projects' },
  { icon: FileText,  label: 'RFIs',     path: '/supervisor/rfis' },
  { icon: User,      label: 'Account',  path: '/supervisor/account' },
];

/**
 * SupervisorLayout — shell for all /supervisor/* routes.
 * Renders the page content via <Outlet /> and the bottom navigation.
 */
export default function SupervisorLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <main className="page safe-bottom">
        <Outlet />
      </main>
      <BottomNav items={supervisorNavItems} />
    </div>
  );
}
