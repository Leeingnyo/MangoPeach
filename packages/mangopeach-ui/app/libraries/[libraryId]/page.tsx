import Link from 'next/link';
import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import GroupCard from '@/components/GroupCard';
import BundleCard from '@/components/BundleCard';

interface Group {
  id: string;
  name: string;
  path: string;
  libraryId: string;
  parentId?: string;
}

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

interface LibraryContents {
  groups: Group[];
  bundles: Bundle[];
}

interface PageProps {
  params: Promise<{ libraryId: string }>;
  searchParams: Promise<{ parentId?: string }>;
}

async function getLibraryContents(libraryId: string, parentId?: string): Promise<LibraryContents> {
  try {
    return await api.libraries.get(libraryId, parentId);
  } catch (error) {
    console.error('Failed to fetch library contents:', error);
    throw error;
  }
}

export default async function LibraryPage({ params, searchParams }: PageProps) {
  const { libraryId } = await params;
  const { parentId } = await searchParams;

  try {
    const { groups, bundles } = await getLibraryContents(libraryId, parentId);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link href="/libraries" className="hover:text-blue-600">
                Libraries
              </Link>
              <span>/</span>
              <span className="text-gray-900">Library Contents</span>
            </nav>
            <h1 className="text-3xl font-bold">
              {parentId ? 'Folder Contents' : 'Library Contents'}
            </h1>
          </div>
          <Link
            href="/libraries"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Libraries
          </Link>
        </div>

        <div className="space-y-8">
          {/* Groups (Folders) */}
          {groups.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                Folders ({groups.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groups.map((group) => (
                  <GroupCard key={group.id} group={group} libraryId={libraryId} />
                ))}
              </div>
            </div>
          )}

          {/* Bundles (Manga/Comics) */}
          {bundles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Manga & Comics ({bundles.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {bundles.map((bundle) => (
                  <BundleCard key={bundle.id} bundle={bundle} libraryId={libraryId} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {groups.length === 0 && bundles.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <p className="text-gray-600 mb-2">No content found</p>
              <p className="text-sm text-gray-500">
                This library appears to be empty or the content hasn&apos;t been scanned yet.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}