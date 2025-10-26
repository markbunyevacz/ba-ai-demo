# Jira Integration Quick Start

## 🚀 5-Minute Setup

### 1. Register Atlassian OAuth App (5 min)
- Go to https://developer.atlassian.com/apps/build
- Create new app → Select "OAuth 2.0 (3LO)"
- Add scopes: read:jira-work, write:jira-work, offline_access
- Set Redirect URI: http://localhost:3001/auth/jira/callback
- Get Client ID and Client Secret

### 2. Setup Environment (2 min)
\\\ash
cp .env.example .env
# Edit .env and add:
# - JIRA_CLIENT_ID
# - JIRA_CLIENT_SECRET  
# - JIRA_BASE_URL=https://your-domain.atlassian.net
# - Generate SESSION_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\\\

### 3. Install & Run (3 min)
\\\ash
npm install
npm start
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
\\\

### 4. Test (1 min)
- Upload Excel file
- Click "🔗 Jira Connection"
- Log in to Atlassian
- Grant permissions
- Click "Jira-ba Küldés"
- ✅ Tickets created in Jira!

## 📚 Full Documentation
See JIRA_INTEGRATION_GUIDE.md for complete setup instructions.
