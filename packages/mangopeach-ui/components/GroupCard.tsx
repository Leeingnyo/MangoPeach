import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  path: string;
  libraryId: string;
  parentId?: string;
}

interface GroupCardProps {
  group: Group;
  libraryId: string;
}

export default function GroupCard({ group, libraryId }: GroupCardProps) {
  return (
    <Link
      href={`/libraries/${libraryId}?parentId=${group.id}`}
      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {group.name}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {group.path}
          </p>
        </div>
      </div>
    </Link>
  );
}