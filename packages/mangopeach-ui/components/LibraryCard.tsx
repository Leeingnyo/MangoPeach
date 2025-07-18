import Link from 'next/link';

interface Library {
  id: string;
  name: string;
  path: string;
  type: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LibraryCardProps {
  library: Library;
}

export default function LibraryCard({ library }: LibraryCardProps) {
  return (
    <Link
      href={`/libraries/${library.id}`}
      className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {library.name}
        </h2>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          library.enabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {library.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <p>
          <span className="font-medium">Type:</span> {library.type}
        </p>
        <p>
          <span className="font-medium">Path:</span> 
          <span className="font-mono text-xs ml-1">{library.path}</span>
        </p>
        <p>
          <span className="font-medium">Created:</span> 
          {new Date(library.createdAt).toLocaleDateString()}
        </p>
      </div>
      
      <div className="mt-4 flex items-center text-blue-600 hover:text-blue-800">
        <span className="text-sm font-medium">Browse Library</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}