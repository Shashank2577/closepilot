import { KanbanBoard } from '../components/kanban/KanbanBoard';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Deal Pipeline Dashboard</h2>
        <p className="text-gray-600">Track and manage your active deals.</p>
      </div>

      <KanbanBoard />
    </div>
  );
}
