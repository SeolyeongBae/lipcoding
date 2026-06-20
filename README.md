# lipcoding app

React + Vite + Tailwind CSS, deployed to **Azure Static Web Apps**.

## 🚀 Getting Started

```bash
pnpm install
pnpm run dev
```

## 🏗️ Build

```bash
pnpm run build
```

## ☁️ Deploy to Azure — First-time Setup

### Prerequisites
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- An Azure subscription
- A GitHub repository for this project

### 1. Provision Azure resources

```bash
bash scripts/azure-setup.sh
```

This will:
1. Log you in to Azure (`az login`)
2. Create a resource group `lipcoding-rg` in `eastasia`
3. Create an **Azure Static Web App** (Free tier)
4. Print the **deployment API token**

### 2. Add the token to GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** → New secret:

| Name | Value |
|------|-------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | *(token from step 1)* |

### 3. Push to `main`

GitHub Actions (`.github/workflows/azure-deploy.yml`) will automatically:
- Install deps with `pnpm`
- Build with Vite
- Deploy to Azure Static Web Apps

## 📁 Project Structure

```
app/
├── .github/workflows/azure-deploy.yml   # CI/CD pipeline
├── scripts/azure-setup.sh               # One-time Azure provisioning
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── index.css                        # Tailwind + custom styles
├── vite.config.js                       # Vite + Tailwind plugin
└── package.json
```
