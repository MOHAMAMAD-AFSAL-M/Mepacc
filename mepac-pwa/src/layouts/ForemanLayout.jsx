import { Outlet } from 'react-router-dom';
import { Home, Users, Calendar, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const foremanNavItems = [
  { icon: Home,     label: 'Home',     path: '/foreman/home' },
  { icon: Users,    label: 'Crew',     path: '/foreman/crew' },
  { icon: Calendar, label: 'Calendar', path: '/foreman/calendar' },
  { icon: User,     label: 'Account',  path: '/foreman/account' },
];

/**
 * ForemanLayout — shell for all /foreman/* routes.
 * Renders the page content via <Outlet /> and the bottom navigation.
 */
export default function ForemanLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <main className="page safe-bottom">
        <Outlet />
      </main>
      {/* Shared Bottom Nav injected with foreman-specific items */}
      <BottomNav items={foremanNavItems} />
    </div>
  );
}
