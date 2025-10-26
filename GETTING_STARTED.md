# 🚀 Getting Started with Real Jira Integration

## ✅ Pre-Implementation Checklist

You now have a fully implemented real Jira OAuth 2.0 integration!
Follow these steps to get it running.

## 📋 Step 1: Atlassian OAuth Registration (5 minutes)

### 1.1 Go to Atlassian Developer Portal
- Navigate to: https://developer.atlassian.com/apps/build
- Sign in with your Atlassian account (create if needed)

### 1.2 Create New App
- Click "Create app"
- Select "OAuth 2.0 (3LO)" 
- App name: "BA AI Assistant"
- Description: "Automated Excel to Jira ticket generation"

### 1.3 Configure OAuth Settings
- Go to App settings
- Find **Client ID** - Copy it
- Find **Client Secret** - Copy it
- Add Redirect URI: \http://localhost:3001/auth/jira/callback\

### 1.4 Configure Scopes
Add these scopes:
- read:jira-work
- write:jira-work
- offline_access

### 1.5 Get Your Jira URL
- Your Jira base URL should be: \https://yourcompany.atlassian.net\

## 📝 Step 2: Environment Configuration (2 minutes)

### 2.1 Create .env file
\\\ash
cp .env.example .env
\\\

### 2.2 Edit .env with your values
\\\nv
# From Atlassian OAuth App
JIRA_CLIENT_ID=your_client_id_from_step_1
JIRA_CLIENT_SECRET=your_client_secret_from_step_1
JIRA_CALLBACK_URL=http://localhost:3001/auth/jira/callback
JIRA_BASE_URL=https://yourcompany.atlassian.net

# Generate this: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=generated_random_string_here

# Server config
PORT=3001
NODE_ENV=development

# Your Jira project key (find in Jira URL: https://yourcompany.atlassian.net/browse/MVM-1)
JIRA_PROJECT_KEY=MVM
\\\

### 2.3 Generate SESSION_SECRET
\\\ash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\\\
Copy output into \SESSION_SECRET=\ in .env

## 🔧 Step 3: Installation (1 minute)

\\\ash
npm install
\\\

This installs all dependencies including new Jira OAuth packages.

## 🚀 Step 4: Start the Application (1 minute)

\\\ash
npm start
\\\

Two servers will start:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

## 🧪 Step 5: Test OAuth Flow (2 minutes)

### 5.1 Open Application
Go to: http://localhost:5173

### 5.2 Connect to Jira
- Look for "🔗 Jira Connection" button in top-right
- Click it
- You should be redirected to Atlassian login

### 5.3 Grant Permissions
- Log in with Atlassian account
- Click "Allow" to grant permissions
- You should be redirected back to the app

### 5.4 Verify Connection
- Button should now show "✅ Jira Connected" (green)
- Congratulations! OAuth integration works!

## 🎯 Step 6: Test Ticket Creation (3 minutes)

### 6.1 Upload Excel File
- Upload a test Excel file with tickets
- Click "Feldolgozás" to process
- Wait for tickets to be generated

### 6.2 View Generated Tickets
- You should see generated tickets with AI grounding info
- All tickets show confidence scores

### 6.3 Send to Jira
- Click "Jira-ba Küldés" button
- Confirm in the modal
- Wait for success message

### 6.4 Verify in Jira
- Go to your Jira project
- Check that new tickets were created
- You should see ticket keys (e.g., MVM-123, MVM-124)

## ✅ Success Criteria

Your implementation is working if:
- ✅ Jira Connection button appears
- ✅ OAuth redirects to Atlassian
- ✅ You get redirected back to app
- ✅ Button shows "Jira Connected"
- ✅ Tickets are created in real Jira instance
- ✅ Ticket keys are returned in success message

## 🚨 Troubleshooting

### Issue: "Invalid redirect URI"
- Verify redirect URI in .env matches Atlassian app settings exactly
- Check for typos (http vs https, localhost vs domain)

### Issue: "Client ID or Secret invalid"
- Copy-paste values again from Atlassian dev portal
- Make sure no extra spaces

### Issue: "Project not found"
- Verify JIRA_PROJECT_KEY in .env matches actual Jira project
- Go to Jira project → see URL: /browse/XXXX (XXXX is the key)

### Issue: "Session expired"
- Click "Jira Connection" button again
- This is normal - tokens expire after ~1 hour

### Issue: "No tickets created"
- Check that you're authenticated (button shows "Jira Connected")
- Check Jira project settings (must have Story issue type)
- Check server logs (npm start output) for error details

## 📚 Full Documentation

Read these files for more details:

1. **QUICKSTART_JIRA.md**
   - Fast 5-minute setup overview

2. **JIRA_INTEGRATION_GUIDE.md**
   - Complete reference with:
     - OAuth flow explanation
     - All API endpoints
     - Error handling
     - Production deployment
     - Troubleshooting guide

3. **IMPLEMENTATION_SUMMARY.md**
   - Technical details of implementation
   - Architecture changes
   - Files created/modified

4. **README.md**
   - Updated with new features
   - Installation guide
   - Usage instructions

## 🔒 Security Notes

- **Keep .env secret**: Never commit to git
- **Protect CLIENT_SECRET**: It's as important as a password
- **Use HTTPS in production**: OAuth requires secure connections
- **Session tokens**: Automatically expire and refresh
- **CSRF protection**: State parameter prevents attacks

## 📊 What Was Changed

### New Services
- \src/services/jiraService.js\ - Jira API client (400+ lines)
- \src/services/sessionStore.js\ - Session management (150+ lines)

### New Files
- \.env.example\ - Configuration template
- \JIRA_INTEGRATION_GUIDE.md\ - Detailed setup guide
- \QUICKSTART_JIRA.md\ - Quick start guide

### Modified Files
- \package.json\ - Added 5 new dependencies
- \server.js\ - Added OAuth routes (150+ lines)
- \src/App.jsx\ - Added OAuth flow (200+ lines)
- \README.md\ - Updated with Jira features

### Dependencies Added
- axios - HTTP client
- dotenv - Environment config
- express-session - Session management
- passport - Authentication
- passport-oauth2 - OAuth 2.0

## 🎓 How It Works

1. User clicks "Jira Connection" button
2. App redirects to Atlassian OAuth
3. User logs in and grants permissions
4. Atlassian redirects back with auth code
5. Backend exchanges code for access token
6. Token stored in secure session
7. Frontend stores sessionId in localStorage
8. User uploads Excel and creates tickets
9. When sending to Jira:
   - Frontend sends tickets + sessionId
   - Backend validates session
   - Backend creates issues in Jira using token
   - Returns Jira ticket keys to frontend
10. Success! Tickets are in real Jira

## 🚀 Next Steps After Setup

### Short Term
1. Test with sample Excel files
2. Verify tickets are created correctly
3. Test error scenarios
4. Try different file formats

### Medium Term
1. Customize Jira field mappings
2. Add more ticket metadata
3. Set up monitoring/alerts
4. Configure email notifications

### Long Term
1. Move to production deployment
2. Use Redis for session storage
3. Enable HTTPS
4. Add user management
5. Add audit logging

## 📞 Need Help?

1. Check error messages in browser console (F12)
2. Check server logs (npm start output)
3. Read JIRA_INTEGRATION_GUIDE.md troubleshooting section
4. Verify .env configuration
5. Check Atlassian OAuth app settings

## ✨ You're Ready!

You now have a production-ready Jira integration that:
- ✅ Authenticates with Atlassian securely
- ✅ Creates real Jira tickets
- ✅ Handles token refresh
- ✅ Manages user sessions
- ✅ Includes comprehensive error handling

Start with Step 1 (Atlassian registration) and follow through!

---

**Implementation Status**: ✅ Complete
**Version**: 2.0
**Date**: January 2025
