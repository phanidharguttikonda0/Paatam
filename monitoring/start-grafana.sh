#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "🚀 Starting Paatam Observability Grafana Dashboard..."
echo "=========================================================="

# Export active AWS credentials for Grafana container
export AWS_ACCESS_KEY_ID=$(aws configure get aws_access_key_id)
export AWS_SECRET_ACCESS_KEY=$(aws configure get aws_secret_access_key)
export AWS_DEFAULT_REGION="ap-south-2"
export AWS_REGION="ap-south-2"

cd "${SCRIPT_DIR}"
docker compose down >/dev/null 2>&1 || true
docker compose up -d

echo ""
echo "✅ Grafana is now running at: http://localhost:3000"
echo "📊 Dashboard: 'Paatam Engineering' -> 'Paatam Backend - Executive & Engineering Command Center'"
echo "🔑 Pre-authenticated as Admin (No login required)"
echo "📡 Data Sources Connected:"
echo "   - AWS Managed Prometheus (AMP) [ws-6253c683-b281-4bab-a14c-f1134b426632] via SigV4"
echo "   - AWS CloudWatch Logs Insights (/ecs/paatam-backend-dev, /aws/lambda/*)"
echo "   - AWS X-Ray Tracing (Waterfall spans & Service Map)"
echo "=========================================================="
