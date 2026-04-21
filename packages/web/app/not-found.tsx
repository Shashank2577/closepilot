export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-2xl font-bold text-gray-900">Not Found</h2>
      <p className="mt-2 text-gray-600">Could not find requested resource</p>
      <a
        href="/"
        className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
      >
        Return Home
      </a>
    </div>
  );
}
