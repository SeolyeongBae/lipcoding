#!/bin/bash
# Azure Static Web App deployment setup script
# Run once to provision the Azure resource and link it to your GitHub repo
set -e

# ── Configuration ──────────────────────────────────────────────────────────────
RESOURCE_GROUP="lipcoding-rg"
LOCATION="eastasia"
APP_NAME="lipcoding-app"
# ──────────────────────────────────────────────────────────────────────────────

echo "🔐 Logging in to Azure..."
az login

echo "📦 Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "🌐 Creating Static Web App: $APP_NAME"
az staticwebapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Free

echo ""
echo "✅ Done! Next steps:"
echo "  1. Copy the deployment token shown below"
echo "  2. Add it as a GitHub secret named: AZURE_STATIC_WEB_APPS_API_TOKEN"
echo "  3. Push to main branch — GitHub Actions will deploy automatically"
echo ""

az staticwebapp secrets list \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" \
  --output tsv
