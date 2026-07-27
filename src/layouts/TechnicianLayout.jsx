import { Outlet } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const technicianNavItems = [
  { icon: Home,      label: 'Home',       path: '/technician/home' },
  { icon: Calendar,  label: 'Calendar',   path: '/technician/attendance' },
  { icon: User,      label: 'Account',    path: '/technician/account' },
];

/**
 * TechnicianLayout — shell for all /technician/* routes.
 * Renders the page content via <Outlet /> and the bottom navigation.
 */
export default function TechnicianLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <main className="page safe-bottom">
        <Outlet />
      </main>
      <BottomNav items={technicianNavItems} />
    </div>
  );
}
