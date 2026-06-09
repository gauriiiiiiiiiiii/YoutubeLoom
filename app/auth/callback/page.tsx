'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForToken } from '@/lib/youtube-auth';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        console.error('OAuth error:', errorParam);
        setError(`Authentication failed: ${errorParam}`);
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      if (code) {
        try {
          // Exchange code for access token
          await exchangeCodeForToken(code);

          // Redirect back to home with success
          router.push('/?auth=success');
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate';
          console.error('Token exchange error:', err);
          setError(errorMessage);
          setTimeout(() => router.push('/'), 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        {error ? (
          <>
            <div className="mb-4 text-4xl">❌</div>
            <h1 className="text-2xl font-bold mb-4 text-red-500">Authentication Failed</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting back to home...
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">🔄</div>
            <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we connect to YouTube
            </p>
          </>
        )}
      </div>
    </main>
  );
}
