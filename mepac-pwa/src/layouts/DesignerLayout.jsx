import { Outlet } from 'react-router-dom';
import { Layers, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const designerNavItems = [
  { icon: Layers, label: 'Projects', path: '/designer/home' },
  { icon: User,   label: 'Account',  path: '/designer/account' },
];

/**
 * DesignerLayout — shell for all /designer/* routes.
 * Streamlined for blueprint revision management and project browsing without attendance widgets.
 */
export default function DesignerLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <main className="page safe-bottom">
        <Outlet />
      </main>
      <BottomNav items={designerNavItems} />
    </div>
  );
}
