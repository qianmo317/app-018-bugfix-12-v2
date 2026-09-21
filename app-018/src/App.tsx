import { usePath, matchPlanPath } from './router';
import { PlanList } from './pages/PlanList';
import { EditorPage } from './pages/Editor';
import { PrintPage } from './pages/PrintView';
import { LibraryPage } from './pages/Library';
import { SettingsPage } from './pages/Settings';

export default function App() {
  const path = usePath();
  const plan = matchPlanPath(path);
  if (path === '/library') return <LibraryPage />;
  if (path === '/settings') return <SettingsPage />;
  if (plan) return plan.print ? <PrintPage key={plan.id} /> : <EditorPage key={plan.id} />;
  return <PlanList />;
}
