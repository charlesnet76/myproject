#!/usr/bin/env bash
# Provisions all Azure resources for AeroBase and prints GitHub secrets.
# Prerequisites: az CLI logged in, jq installed.
# Usage: bash azure/setup.sh
set -euo pipefail

# ── Config — change these if needed ────────────────────────────────────────────
RESOURCE_GROUP="aerobase-rg"
LOCATION="eastus"
ACR_NAME="aerobaseregistry"          # must be globally unique, lowercase, no hyphens
CONTAINER_APP_ENV="aerobase-env"
CONTAINER_APP="aerobase-backend"
STATIC_WEB_APP="aerobase-frontend"
GITHUB_REPO="charlesnet76/myproject" # owner/repo
# ───────────────────────────────────────────────────────────────────────────────

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Using subscription: $SUBSCRIPTION_ID"

echo ""
echo "── Creating resource group ──────────────────────────────────"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

echo "── Creating Container Registry ──────────────────────────────"
az acr create \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --sku Basic \
  --admin-enabled false \
  -o none

echo "── Creating Container Apps environment ──────────────────────"
az containerapp env create \
  --name "$CONTAINER_APP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  -o none

echo "── Creating Container App (backend) ─────────────────────────"
az containerapp create \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 5001 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  -o none

echo "── Creating Static Web App (frontend) ───────────────────────"
az staticwebapp create \
  --name "$STATIC_WEB_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --location "eastus2" \
  -o none

echo "── Creating Service Principal for GitHub Actions (OIDC) ─────"
SP_JSON=$(az ad sp create-for-rbac \
  --name "aerobase-github-actions" \
  --role contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --json-auth)

CLIENT_ID=$(echo "$SP_JSON" | jq -r .clientId)
TENANT_ID=$(echo "$SP_JSON" | jq -r .tenantId)

echo "── Adding federated OIDC credential (branch: master) ────────"
az ad app federated-credential create \
  --id "$CLIENT_ID" \
  --parameters "{
    \"name\": \"github-master\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_REPO}:ref:refs/heads/master\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" -o none

echo "── Granting ACR push permission to Service Principal ────────"
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az role assignment create \
  --assignee "$CLIENT_ID" \
  --role "AcrPush" \
  --scope "$ACR_ID" \
  -o none

SWA_TOKEN=$(az staticwebapp secrets list \
  --name "$STATIC_WEB_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" -o tsv)

BACKEND_URL=$(az containerapp show \
  --name "$CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Add these to GitHub → Settings → Secrets and Variables"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "── Secrets ──────────────────────────────────────────────────"
echo "AZURE_CLIENT_ID=$CLIENT_ID"
echo "AZURE_TENANT_ID=$TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
echo "AZURE_REGISTRY=${ACR_NAME}.azurecr.io"
echo "AZURE_STATIC_WEB_APP_TOKEN=$SWA_TOKEN"
echo ""
echo "── Variables (Settings → Variables → Actions) ───────────────"
echo "AZURE_RESOURCE_GROUP=$RESOURCE_GROUP"
echo "AZURE_CONTAINER_APP=$CONTAINER_APP"
echo "AZURE_BACKEND_URL=https://$BACKEND_URL"
echo "AZURE_FRONTEND_URL=$(az staticwebapp show --name $STATIC_WEB_APP --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)"
echo ""
echo "── Also add your app secrets ────────────────────────────────"
echo "MONGO_URI=<your Atlas connection string>"
echo "JWT_SECRET=<your jwt secret>"
echo "CLOUDINARY_CLOUD_NAME=<if used>"
echo "CLOUDINARY_API_KEY=<if used>"
echo "CLOUDINARY_API_SECRET=<if used>"
echo "SENDGRID_API_KEY=<if used>"
echo "SENDGRID_FROM_EMAIL=<if used>"
echo "════════════════════════════════════════════════════════════════"
