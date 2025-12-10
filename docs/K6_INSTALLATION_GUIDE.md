# k6 Load Testing - Installation Guide

**Status**: ⏳ Installation Required  
**Platform**: Windows 10/11

---

## Installation Options for Windows

### Option 1: Chocolatey (Recommended)

```powershell
# Install Chocolatey first (if not installed)
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install k6
choco install k6
```

### Option 2: Direct Download

1. Visit: https://k6.io/docs/getting-started/installation/
2. Download Windows installer
3. Run installer
4. Add to PATH if needed

### Option 3: Scoop

```powershell
# Install Scoop first (if not installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install k6
scoop install k6
```

### Option 4: npm (May not work on Windows)

```bash
npm install -g k6
# Note: This may not add k6 to PATH on Windows
```

---

## Verify Installation

```bash
k6 version
```

Expected output:

```
k6 v0.xx.x (go1.xx.x, windows/amd64)
```

---

## Running the Load Test

### Prerequisites

1. **Server must be running**:

   ```bash
   npm run dev:server
   # Or: node server/redix-server.js
   ```

2. **Verify server is accessible**:
   - Base URL: `http://localhost:4000`
   - WebSocket URL: `ws://localhost:4000`

### Run Load Test

```bash
# From project root
npm run test:load

# Or directly
k6 run tests/load/k6-load-test.js
```

### Custom Configuration

```bash
# Use custom base URL
k6 run --env BASE_URL=http://localhost:4000 tests/load/k6-load-test.js

# Use custom WebSocket URL
k6 run --env WS_URL=ws://localhost:4000 tests/load/k6-load-test.js
```

---

## Test Scenarios

The load test simulates:

1. **WebSocket Connections** (25% of load)
   - Tests real-time connection handling
   - Target: 95% success rate

2. **Tab Operations** (25% of load)
   - Tests tab creation/management
   - Target: 95% success rate

3. **Voice Commands** (25% of load)
   - Tests voice command processing
   - Target: 90% success rate (voice can be flaky)

4. **Research Queries** (25% of load)
   - Tests research query processing
   - Target: 95% success rate

### Load Profile

- **Ramp up**: 0 → 50 → 100 → 200 → 500 → 1000 users (over 10 minutes)
- **Sustain**: 1000 concurrent users (2 minutes)
- **Ramp down**: 1000 → 500 → 0 users (over 1.5 minutes)
- **Total duration**: ~13.5 minutes

### Success Criteria

- ✅ 95% of HTTP requests < 2s
- ✅ 95% WebSocket connection success
- ✅ 95% tab operation success
- ✅ 90% voice command success
- ✅ 95% research query success

---

## Troubleshooting

### k6 not found

**Problem**: `k6: command not found`

**Solutions**:

1. Restart terminal after installation
2. Check PATH: `echo $env:PATH` (PowerShell)
3. Reinstall using Chocolatey or direct download
4. Manually add k6 to PATH

### Server not running

**Problem**: Connection refused errors

**Solution**: Start the server first:

```bash
npm run dev:server
```

### WebSocket connection fails

**Problem**: WebSocket connection errors

**Solutions**:

1. Verify server supports WebSocket
2. Check WebSocket URL is correct
3. Ensure server is configured for WebSocket

### High failure rates

**Problem**: Test thresholds not met

**Solutions**:

1. Check server logs for errors
2. Reduce load (modify stages in test file)
3. Check server resources (CPU, memory)
4. Verify database/Redis connections

---

## Expected Results

### Successful Run

```
✓ WebSocket connection status is 101
✓ Tab operation status is 200 or 201
✓ Voice command status is 200
✓ Research query status is 200

checks.........................: 95.00% ✓ 95.00% ✗
data_received..................: 1.2 MB
data_sent......................: 450 kB
http_req_duration..............: avg=150ms min=50ms med=120ms max=2000ms p(95)=800ms
http_reqs......................: 5000
ws_connection_success..........: 95.00% ✓
tab_operation_success..........: 95.00% ✓
voice_command_success.........: 90.00% ✓
research_query_success.........: 95.00% ✓
```

### Failed Run

If thresholds are not met, k6 will exit with error code 1.

---

## Next Steps

After successful load test:

1. ✅ Update `docs/TEST_RESULTS_TRACKER.md` with results
2. ✅ Update `docs/TESTING_STATUS.md` to mark load test complete
3. ✅ Proceed to Week 2: Cross-platform testing

---

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Installation Guide](https://k6.io/docs/getting-started/installation/)
- [k6 WebSocket Testing](https://k6.io/docs/javascript-api/k6-ws/)

---

_Last Updated: December 10, 2025_
