import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Agenda', icon: '🗓️', end: true },
  { to: '/tasks', label: 'Tasks', icon: '✓', end: false },
  { to: '/meals', label: 'Meals', icon: '🍽️', end: false },
  { to: '/shopping', label: 'Shopping', icon: '🛒', end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
