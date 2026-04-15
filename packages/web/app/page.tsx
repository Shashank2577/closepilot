export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Deal Pipeline Dashboard
        </h2>
        <p className="text-gray-600">
          Closepilot is initializing. Check back soon for deal activity.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">New Leads</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
