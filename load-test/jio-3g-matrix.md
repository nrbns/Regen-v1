# Jio / 3G Resilience Test Matrix (v0.4)

- **Goal**: validate realtime + agentic flows under constrained networks before beta push.
- **Profiles**:
  - Jio 4G: 400ms RTT, 1.5–4 Mbps down, 0.5–1 Mbps up, 1% loss.
  - 3G worst: 800ms RTT, 1 Mbps down, 256 Kbps up, 2–3% loss.
- **Scenarios** (run via `npm run test:load:sse` or k6 CLI with `--env PROFILE=jio|3g`):
  - Tab sync (Yjs): open/close/reorder 20 tabs; verify <2s convergence; offline 30s then resume.
  - Collab editor: 3 peers edit 500 chars; ensure no more than 2 desyncs/5min.
  - Voice → agent (Hindi/EN): 10 commands; target <2.5s first token (GPU), <4.5s CPU.
  - Research mode: live search + summarize in parallel; target <6s combined result.
  - Trade feed: 1k ticks/min; no dropped >5% messages.
- **KPIs**:
  - Uptime ≥ 0.9 on Jio, ≥ 0.8 on 3G.
  - Reconnect time after drop < 3s.
  - AI latency p95: GPU 2.5s, CPU 5s.
- **How to run quickly**:
  - `k6 run load-test/k6-sse.js --vus 10 --duration 2m --env PROFILE=jio`
  - `k6 run load-test/k6-sse.js --vus 5 --duration 2m --env PROFILE=3g`
- **Log captures**: keep `logs/realtime/*.log` and k6 summary for regression.
