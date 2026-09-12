import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { EntryFormModal } from './components/EntryFormModal';
import { useEntryFormStore } from './store/useEntryFormStore';
import { Agenda } from './views/Agenda';
import { Tasks } from './views/Tasks';
import { Meals } from './views/Meals';
import { Shopping } from './views/Shopping';
import { Settings } from './views/Settings';
import type { EntryType } from './data/db';

const ROUTE_META: Record<string, { title: string; subtitle: string; fabType?: EntryType }> = {
  '/': {
    title: 'Agenda',
    subtitle: 'Work shifts, Assignments, Appointments & Travel on one calendar.',
  },
  '/tasks': {
    title: 'Tasks',
    subtitle: 'To-dos and errands — filter by status or due date.',
    fabType: 'task',
  },
  '/meals': {
    title: 'Meals',
    subtitle: "Plan the week's meals and add ingredients to your shopping list.",
    fabType: 'meal',
  },
  '/shopping': {
    title: 'Shopping',
    subtitle: 'Shopping list items, grouped by list and checked off as you shop.',
    fabType: 'shopping_item',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Calendar export, backup & restore.',
  },
};

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const openForCreate = useEntryFormStore((s) => s.openForCreate);
  const meta = ROUTE_META[location.pathname] ?? { title: 'Track', subtitle: '' };
  const showFab = location.pathname !== '/settings';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-titles">
          <h1>{meta.title}</h1>
          {meta.subtitle && <p className="app-header-subtitle">{meta.subtitle}</p>}
        </div>
        {location.pathname === '/settings' ? (
          <span style={{ width: 36 }} />
        ) : (
          <button
            type="button"
            className="icon-button"
            aria-label="Settings"
            onClick={() => navigate('/settings')}
          >
            ⚙️
          </button>
        )}
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Agenda />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {showFab && (
        <button
          type="button"
          className="fab"
          aria-label="Add entry"
          onClick={() => openForCreate({ type: meta.fabType })}
        >
          +
        </button>
      )}

      <BottomNav />
      <EntryFormModal />
    </div>
  );
}

function App() {
  return (
    // HashRouter (not BrowserRouter) because GitHub Pages is a static file
    // host with no server-side rewrite: a direct load of /Track/tasks would
    // 404 under history-API routing. Hash routes (/Track/#/tasks) always
    // resolve to index.html since everything after # never reaches the server.
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

export default App;
