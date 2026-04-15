export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </a>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Deal Details
        </h2>
        <p className="text-gray-600 mb-4">
          Deal ID: {id}
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Lead Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
              <div>
                <span className="font-medium">Company:</span>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Deal Status
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Stage:</span>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Activities
          </h3>
          <div className="space-y-2">
            <p className="text-gray-600 text-sm">
              No activities yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
