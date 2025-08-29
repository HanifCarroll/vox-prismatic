'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
            }}>
              Application Error
            </h1>
            <p style={{
              color: '#666',
              marginBottom: '1.5rem',
            }}>
              A critical error occurred in the application layout.
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: '#999',
              marginBottom: '1.5rem',
            }}>
              {error.message || 'Unknown error'}
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '0.5rem 1.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              Reload Application
            </button>
            {error.digest && (
              <p style={{
                fontSize: '0.75rem',
                color: '#ccc',
                marginTop: '1rem',
              }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}