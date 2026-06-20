#!/bin/bash
# Azure App Service deployment setup script (Next.js)
# Run once to provision the Azure resource and link it to your GitHub repo
set -e

# ── Configuration ──────────────────────────────────────────────────────────────
RESOURCE_GROUP="lipcoding-rg"
LOCATION="eastasia"
APP_NAME="lipcoding-app"
PLAN_NAME="lipcoding-plan"
NODE_VERSION="22-lts"
# ──────────────────────────────────────────────────────────────────────────────

echo "🔐 Logging in to Azure..."
az login

echo "📦 Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "📋 Creating App Service Plan (B1): $PLAN_NAME"
az appservice plan create \
  --name "$PLAN_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku B1 \
  --is-linux

echo "🌐 Creating Web App: $APP_NAME"
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --runtime "NODE:${NODE_VERSION}"

echo "⚙️  Configuring startup command and settings"
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "node server.js"

az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    WEBSITE_NODE_DEFAULT_VERSION="~22" \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false \
    ENABLE_ORYX_BUILD=false

echo "📡 Enabling deployment from GitHub Actions (publish profile)"
az webapp deployment list-publishing-profiles \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --xml \
  > publish-profile.xml

echo ""
echo "✅ Done! Next steps:"
echo "  1. Copy the contents of publish-profile.xml"
echo "  2. Add it as a GitHub secret named: AZURE_WEBAPP_PUBLISH_PROFILE"
echo "  3. Delete publish-profile.xml (it contains secrets!)"
echo "  4. Push to main branch — GitHub Actions will deploy automatically"
echo ""
echo "🌍 App URL: https://${APP_NAME}.azurewebsites.net"
