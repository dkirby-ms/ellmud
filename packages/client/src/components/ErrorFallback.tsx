import { useRouteError } from 'react-router';

/**
 * Route-level error boundary.
 * Catches render errors within a route group so a crash in one page
 * doesn't white-screen the entire app.
 */
export function ErrorFallback() {
  const error = useRouteError();

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0A0B0F',
        color: '#E8E0D0',
        fontFamily: 'sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ color: '#C9A84C', marginBottom: '0.5rem' }}>
        Something went wrong
      </h1>
      <p style={{ color: '#8B8B8B', marginBottom: '1.5rem', maxWidth: '400px' }}>
        {message}
      </p>
      <a
        href="/refuge"
        style={{
          color: '#3A7D7B',
          textDecoration: 'underline',
          fontSize: '1.1rem',
        }}
      >
        Return to Refuge
      </a>
    </div>
  );
}
