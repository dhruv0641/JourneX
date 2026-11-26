'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary:', error?.digest ?? error?.message ?? 'unknown');
  }, [error]);

  const handleRetry = () => {
    if (typeof retry === 'function') retry();
    else if (typeof reset === 'function') reset();
    else window.location.reload();
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          backgroundColor: '#191318',
          color: '#f5efe6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: '#221a21',
            padding: '28px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
            Unable to load JournalX
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: 1.5, color: '#cbbdc4' }}>
            A temporary server error occurred while loading this page. Try reloading or signing in
            again.
          </p>
          {error?.digest ? (
            <p style={{ margin: '0 0 18px', fontSize: '12px', fontFamily: 'monospace', color: '#9c8b95' }}>
              Ref: {error.digest}
            </p>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                cursor: 'pointer',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#d98ab7',
                color: '#1f121b',
                fontWeight: 600,
                fontSize: '14px',
                padding: '10px 18px',
              }}
            >
              Try again
            </button>
            <a
              href="/login"
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#f5efe6',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '10px 18px',
              }}
            >
              Sign in
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
