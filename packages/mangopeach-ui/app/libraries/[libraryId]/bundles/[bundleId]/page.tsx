import { api } from '@/lib/api';
import { notFound } from 'next/navigation';
import BundleViewer from '@/components/BundleViewer';
import ErrorPage from '@/components/ErrorPage';

interface Bundle {
  id: string;
  name: string;
  type: string;
  path: string;
  libraryId: string;
  pageCount: number;
  coverImage?: string;
  tags: string[];
  createdAt: string;
  modifiedAt: string;
}

interface BundleDetails {
  bundle: Bundle;
  images: string[];
}

interface PageProps {
  params: Promise<{ libraryId: string; bundleId: string }>;
}

async function getBundleDetails(libraryId: string, bundleId: string): Promise<BundleDetails> {
  try {
    return await api.bundles.get(libraryId, bundleId);
  } catch (error) {
    console.error('Failed to fetch bundle details:', error);
    throw error;
  }
}

export default async function BundleViewerPage({ params }: PageProps) {
  const { libraryId, bundleId } = await params;

  try {
    const bundleDetails = await getBundleDetails(libraryId, bundleId);
    
    return (
      <BundleViewer
        libraryId={libraryId}
        bundleId={bundleId}
        bundleDetails={bundleDetails}
      />
    );
  } catch (error) {
    // Return error state instead of notFound for better UX
    return (
      <ErrorPage
        title="Bundle Not Found"
        message="The requested bundle could not be loaded."
      />
    );
  }
}