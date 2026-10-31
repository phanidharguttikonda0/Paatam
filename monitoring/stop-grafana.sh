#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping Paatam Observability Grafana..."
cd "${SCRIPT_DIR}"
docker compose down
echo "✅ Grafana stopped."
