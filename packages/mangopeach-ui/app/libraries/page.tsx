import { api } from '@/lib/api';
import LibraryCard from '@/components/LibraryCard';

interface Library {
  id: string;
  name: string;
  path: string;
  type: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getLibraries(): Promise<Library[]> {
  try {
    return await api.libraries.list();
  } catch (error) {
    console.error('Failed to fetch libraries:', error);
    return [];
  }
}

export default async function LibrariesPage() {
  const libraries = await getLibraries();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">MangoPeach Libraries</h1>
      
      {libraries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No libraries found</p>
          <p className="text-sm text-gray-500">
            Check your server configuration and make sure libraries are properly configured.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {libraries.map((library) => (
            <LibraryCard key={library.id} library={library} />
          ))}
        </div>
      )}
      
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Libraries are configured in your server settings. 
          <a href="/api" className="text-blue-600 hover:text-blue-800 ml-1">
            View API Documentation
          </a>
        </p>
      </div>
    </div>
  );
}