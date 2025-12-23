# Pull Request

## Summary

<!-- Brief description of changes -->

## Files Changed

<!-- List of files modified/added -->

- [ ] `packages/shared/events.js` - Shared event constants
- [ ] `server/realtime.js` - Socket.IO server
- [ ] `src/services/realtime/socketService.ts` - Client socket service
- [ ] Worker files - Publishing progress to Redis
- [ ] Component files - Replaced polling with socket events

## How to Run Locally

```bash
# Start Redis
docker run -p 6379:6379 -d redis

# Start server
npm run dev:server

# Start client
npm run dev:web
```

## Test Plan

- [ ] Unit tests pass
- [ ] Integration test: Socket connection with valid JWT
- [ ] Integration test: Worker publishes → Socket.IO forwards → Client receives
- [ ] Reconnection test: Disconnect mid-stream → Reconnect → Resume
- [ ] Load test: 100 concurrent socket connections

## Demo

<!-- Add GIF/video showing the feature working -->

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass locally

## Related Issues

Closes #<!-- issue number -->

## Reviewers

- [ ] Backend reviewer assigned
- [ ] Frontend reviewer assigned
- [ ] QA reviewer assigned
