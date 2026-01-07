module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      numberOfRuns: 3,
      settings: {
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4, // 3G
          cpuSlowdownMultiplier: 4,
        },
        skipAudits: ['uses-http2', 'uses-long-cache-ttl'], // Skip server-specific audits
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        interactive: ['error', { maxNumericValue: 3000 }],
        'total-byte-weight': ['error', { maxNumericValue: 600000 }], // 600KB (slightly higher for dev)
        'dom-size': ['warn', { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
