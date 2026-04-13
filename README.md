# SentinelBoard

**Live ML Model Monitoring Dashboard** — real-time prediction feed, drift detection, and observability.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Tests](https://img.shields.io/badge/tests-40%2B-blue)
![Deploy](https://img.shields.io/badge/deploy-Render-purple)

## Architecture

```
┌──────────────────┐      WebSocket       ┌──────────────────┐
│   React Frontend │◄────────────────────►│  FastAPI Backend  │
│   (Recharts, WS) │                      │  (Model Serving)  │
└──────────────────┘                      └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │   Prometheus      │
                                          │   (Metrics)       │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │   Grafana         │
                                          │   (Dashboards)    │
                                          └──────────────────┘
```

## Features

- **Real-time prediction feed** via WebSocket
- **PSI-based drift detection** with configurable thresholds
- **KS-test** secondary validation
- **Prometheus metrics**: predictions/sec, latency histogram (p50/p95/p99), drift scores
- **Grafana dashboards**: pre-built panels for model monitoring
- **Auto-deploy**: GitHub Actions → Render on push to main

## Quick Start

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install && npm run dev

# Full stack (Docker)
cd infra && docker compose up
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with model + drift status |
| `/predict` | POST | Run prediction, returns result + broadcasts via WS |
| `/metrics` | GET | Prometheus metrics |
| `/drift/history` | GET | PSI score history |
| `/ws` | WS | Real-time prediction + drift alert stream |

## Testing

```bash
cd backend && pytest --cov=app
```

## Scripts

```bash
python scripts/simulate_traffic.py --rate 10 --duration 60
python scripts/inject_drift.py --shift 0.1 --duration 120
```

## Tech Stack

**Backend**: Python, FastAPI, WebSockets, Prometheus, scikit-learn, NumPy, SciPy
**Frontend**: React, TypeScript, Recharts, Tailwind CSS, Vite
**Infrastructure**: Docker, Prometheus, Grafana, GitHub Actions, Render

## License

MIT
