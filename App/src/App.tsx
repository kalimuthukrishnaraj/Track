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

const ROUTE_META: Record<string, { title: string; fabType?: EntryType }> = {
  '/': { title: 'Agenda' },
  '/tasks': { title: 'Tasks', fabType: 'task' },
  '/meals': { title: 'Meals', fabType: 'meal' },
  '/shopping': { title: 'Shopping', fabType: 'shopping_item' },
  '/settings': { title: 'Settings' },
};

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const openForCreate = useEntryFormStore((s) => s.openForCreate);
  const meta = ROUTE_META[location.pathname] ?? { title: 'Track' };
  const showFab = location.pathname !== '/settings';

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{meta.title}</h1>
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
