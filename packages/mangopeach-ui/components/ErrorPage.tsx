'use client';

interface ErrorPageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

export default function ErrorPage({ 
  title = 'Error',
  message = 'Something went wrong',
  showBackButton = true
}: ErrorPageProps) {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-400 mb-4">{message}</p>
        {showBackButton && (
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}