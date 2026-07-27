import { NavLink } from 'react-router-dom';

/**
 * BottomNav — reusable mobile bottom navigation bar.
 * Matches Figma Node 3:340 (Floating pill shape, dark background).
 *
 * Props:
 *   items – Array<{ icon: LucideIconComponent, label: string, path: string }>
 */
export default function BottomNav({ items }) {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-max">
      {/* Safe area wrapper implied by fixed positioning and safe-bottom on main */}
      <div className="bg-[#213145] rounded-full shadow-md px-3 py-2 flex items-center justify-center gap-6">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center transition-all duration-fast ${
                  isActive
                    ? 'bg-primary-dark rounded-full px-5 py-1.5 text-white'
                    : 'bg-transparent p-1.5 text-[#bec6e0] hover:text-white'
                }`
              }
            >
              <Icon
                size={20}
                strokeWidth={2}
                className="mb-1"
              />
              <span className="text-xs font-semibold tracking-wide">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
