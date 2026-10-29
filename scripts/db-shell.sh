#!/usr/bin/env bash
set -e

# ==============================================================================
# Paatam RDS PostgreSQL Interactive Terminal Shell
# Connects directly to the isolated RDS database via the running ECS container
# ==============================================================================

CLUSTER="paatam-cluster-dev"
SERVICE="paatam-service-dev"

echo "🔍 Locating running ECS backend container in $CLUSTER..."
TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" --query "taskArns[0]" --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ Error: No running task found for service $SERVICE in cluster $CLUSTER."
  exit 1
fi

TASK_ID=$(echo "$TASK_ARN" | cut -d/ -f3)
echo "🔌 Connecting to isolated RDS PostgreSQL (Task: $TASK_ID)..."
echo "💡 Tip: Once inside, use '\dt' to list tables, '\d \"TableName\"' for schema, or 'SELECT ... ;'"
echo "💡 To exit psql, type '\q' and press Enter."
echo "----------------------------------------------------------------------------------"

aws ecs execute-command \
  --cluster "$CLUSTER" \
  --task "$TASK_ID" \
  --container paatam-backend \
  --interactive \
  --command "sh -c 'which psql >/dev/null 2>&1 || apk add --no-cache postgresql-client; PAGER=cat psql \"\$DATABASE_URL\"'"
