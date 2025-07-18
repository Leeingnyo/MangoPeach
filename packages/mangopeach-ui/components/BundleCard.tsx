import Link from 'next/link';

interface Bundle {
  id: string;
  name: string;
  type: string;
  path: string;
  libraryId: string;
  parentId?: string;
  pageCount: number;
  coverImage?: string;
  tags: string[];
}

interface BundleCardProps {
  bundle: Bundle;
  libraryId: string;
}

export default function BundleCard({ bundle, libraryId }: BundleCardProps) {
  return (
    <Link
      href={`/libraries/${libraryId}/bundles/${bundle.id}`}
      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            bundle.type === 'directory' 
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {bundle.type}
          </span>
          <span className="text-xs text-gray-500">
            {bundle.pageCount} pages
          </span>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900 truncate">
            {bundle.name}
          </h3>
          <p className="text-xs text-gray-500 truncate mt-1">
            {bundle.path}
          </p>
        </div>

        {bundle.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bundle.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
            {bundle.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                +{bundle.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}