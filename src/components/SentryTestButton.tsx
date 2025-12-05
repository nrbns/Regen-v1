/**
 * Sentry Test Button Component
 * Add this button component to your app to test Sentry's error tracking
 */

import * as Sentry from '@sentry/react';
// testSentry function not available - using direct Sentry calls instead

export function SentryTestButton() {
  const handleTestError = () => {
    try {
      // This will throw an error that should be captured by Sentry
      throw new Error('Test error from Sentry test button');
    } catch (error) {
      // Error is automatically captured by Sentry
      Sentry.captureException(error);
      console.error('Test error thrown:', error);
    }
  };

  const handleTestCapture = () => {
    // Alternative: manually capture an exception
    Sentry.captureException(new Error('Manual test error from button'));
  };

  const handleTestMessage = () => {
    // Test capturing a message
    Sentry.captureMessage('Test message from Sentry test button', {
      level: 'info',
      tags: {
        source: 'test-button',
      },
    });
  };

  return (
    <div className="sentry-test-buttons" style={{ padding: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Sentry Test Buttons</h3>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleTestError}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Break the world
        </button>
        <button
          onClick={handleTestCapture}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Test Exception
        </button>
        <button
          onClick={handleTestMessage}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Test Message
        </button>
      </div>
      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
        These buttons will send test events to Sentry. Check your Sentry dashboard to verify.
      </p>
    </div>
  );
}
