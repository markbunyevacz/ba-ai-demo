# Jira OAuth Integration Guide

## Overview

This guide walks you through implementing real Jira Cloud integration with OAuth 2.0 authentication for the BA AI Assistant. The system now creates tickets directly in your Jira instance instead of simulating API calls.

---

## 📋 Prerequisites

- Jira Cloud instance (https://yourcompany.atlassian.net)
- Atlassian Cloud account with admin/project access
- Node.js 16+ installed
- NPM 8+

---

## 🔧 Setup Steps

### Step 1: Register OAuth App in Atlassian

1. Go to **https://developer.atlassian.com/apps/build**
2. Click **Create app**
3. Select **OAuth 2.0 (3LO)** as your integration type
4. Fill in App details:
   - **App name**: BA AI Assistant
   - **App description**: Automated Excel to Jira ticket generation

### Step 2: Configure OAuth Scopes

In your app settings, add these required scopes:

```
read:jira-work
write:jira-work
offline_access
```

These scopes allow:
- **read:jira-work**: Read project and issue data
- **write:jira-work**: Create and update issues
- **offline_access**: Get refresh tokens for long-lived sessions

### Step 3: Set Redirect URI

Add the following redirect URI in your app's OAuth configuration:

```
http://localhost:3001/auth/jira/callback
```

**For Production**: Replace `localhost:3001` with your actual domain:
```
https://yourdomain.com/auth/jira/callback
```

### Step 4: Get Client Credentials

In your app settings, find:
- **Client ID** - Copy this value
- **Client Secret** - Copy this value (keep it secret!)

---

## 📝 Environment Configuration

### 1. Create .env File

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 2. Update .env with Your Credentials

```env
# Jira OAuth Configuration
JIRA_CLIENT_ID=your_client_id_from_atlassian
JIRA_CLIENT_SECRET=your_client_secret_from_atlassian
JIRA_CALLBACK_URL=http://localhost:3001/auth/jira/callback
JIRA_BASE_URL=https://yourcompany.atlassian.net

# Session Configuration
SESSION_SECRET=generate_a_random_string_here_at_least_32_chars

# Server Configuration
PORT=3001
NODE_ENV=development

# Jira Project
JIRA_PROJECT_KEY=MVM
```

**How to generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `axios` - HTTP client for Jira API calls
- `dotenv` - Environment variable management
- `express-session` - Session management
- `passport` - Authentication middleware
- `passport-oauth2` - OAuth 2.0 strategy

### 2. Start the Application

```bash
npm start
```

This runs both the Express backend and React frontend:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (Vite)

---

## 🔐 Authentication Flow

### OAuth 3-Legged Flow

```
1. User clicks "🔗 Jira Connection" button
   ↓
2. Frontend redirects to /auth/jira
   ↓
3. Server generates OAuth state and redirects to Atlassian
   ↓
4. User logs in and grants permissions on Atlassian
   ↓
5. Atlassian redirects to /auth/jira/callback with authorization code
   ↓
6. Server exchanges code for access token
   ↓
7. Server stores token in SessionStore
   ↓
8. User is redirected back with sessionId in URL
   ↓
9. Frontend stores sessionId in localStorage
   ↓
10. ✅ User can now send tickets to Jira
```

---

## 🚀 API Endpoints

### 1. Initiate Jira OAuth

```
GET /auth/jira
```

Redirects user to Atlassian login page.

**Response**: Redirect to Atlassian OAuth endpoint

---

### 2. OAuth Callback Handler

```
GET /auth/jira/callback?code=XXX&state=YYY
```

Handles the OAuth callback from Atlassian.

**Response**: 
```json
Redirects to /?sessionId=sess_XXXXX&auth=success
```

---

### 3. Create Jira Tickets

```
POST /api/jira/create-tickets

Content-Type: application/json

{
  "tickets": [
    {
      "id": "MVM-1001",
      "summary": "User Story Title",
      "description": "Detailed description",
      "priority": "High",
      "assignee": "user@company.com",
      "epic": "Epic Name",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
    }
  ],
  "sessionId": "sess_XXXXX"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Successfully created 3 out of 3 tickets",
  "result": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "tickets": [
      {
        "originalId": "MVM-1001",
        "jiraKey": "MVM-123",
        "jiraId": "10000",
        "status": "created"
      }
    ],
    "errors": []
  }
}
```

**Error Response (401)**:
```json
{
  "error": "Unauthorized",
  "details": "Session expired or invalid",
  "authUrl": "/auth/jira"
}
```

---

### 4. Check Jira Authentication Status

```
GET /api/jira/status?sessionId=sess_XXXXX
```

**Response**:
```json
{
  "authenticated": true,
  "sessionId": "sess_XXXXX",
  "message": "Authenticated",
  "authUrl": null
}
```

---

### 5. Logout from Jira

```
POST /api/jira/logout

Content-Type: application/json

{
  "sessionId": "sess_XXXXX"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🛠️ Services

### JiraService (`src/services/jiraService.js`)

Main service for Jira API interactions:

**Methods**:
- `getAuthorizationURL(state)` - Generate OAuth URL
- `exchangeCodeForToken(code)` - Exchange auth code for token
- `refreshAccessToken(refreshToken)` - Refresh expired token
- `createIssue(ticketData, userId, accessToken)` - Create single issue
- `createMultipleIssues(tickets, userId, accessToken)` - Create multiple issues
- `updateIssue(issueKey, updates, userId, accessToken)` - Update issue
- `searchIssues(jql, userId, accessToken)` - Search using JQL
- `getProject(projectKey, userId, accessToken)` - Get project details
- `getIssueTypes(userId, accessToken)` - Get available issue types

### SessionStore (`src/services/sessionStore.js`)

In-memory session management (use Redis in production):

**Methods**:
- `createSession(userId, sessionData)` - Create new session
- `getSession(sessionId)` - Get session by ID
- `setJiraToken(sessionId, tokenData)` - Store token
- `getJiraToken(sessionId)` - Get stored token
- `isJiraTokenValid(sessionId)` - Check token validity
- `deleteSession(sessionId)` - Clear session

---

## 📊 Frontend Integration

### Authentication State in React

```javascript
// Check if user is authenticated
const [jiraAuthenticated, setJiraAuthenticated] = useState(false)
const [jiraSessionId, setJiraSessionId] = useState(null)

// Handle OAuth callback
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get('sessionId')
  
  if (sessionId) {
    setJiraSessionId(sessionId)
    setJiraAuthenticated(true)
    localStorage.setItem('jiraSessionId', sessionId)
  }
}, [])

// Send tickets to Jira
const handleJiraConfirm = async () => {
  const response = await fetch('/api/jira/create-tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tickets: tickets,
      sessionId: jiraSessionId
    })
  })
  // Handle response...
}
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid OAuth state` | State parameter mismatch | State expires after 10 minutes. Restart authentication. |
| `Session expired` | Token lifetime exceeded | Click "Jira Connection" button to re-authenticate. |
| `Unauthorized` | Missing/invalid token | Check sessionId is correctly passed. |
| `Project not found` | Wrong JIRA_PROJECT_KEY | Verify project key in .env matches Jira. |
| `Issue type not found` | Story issue type doesn't exist | Check Jira project has Story issue type enabled. |

### Token Refresh

Tokens are automatically refreshed when:
- Token is expired
- Token is within 5 minutes of expiration

---

## 🔒 Security Considerations

1. **Keep CLIENT_SECRET Secret**: Never commit `.env` to version control
2. **HTTPS in Production**: Always use HTTPS for OAuth callback URL
3. **Session Storage**: Use Redis/database in production instead of in-memory Map
4. **State Validation**: CSRF protection via state parameter (10-min expiry)
5. **Token Storage**: Don't expose tokens in frontend; store in secure HTTP-only cookies in production

---

## 🧪 Testing

### Manual Testing Steps

1. **Start Application**:
   ```bash
   npm start
   ```

2. **Upload Excel File**:
   - Go to http://localhost:3001
   - Upload sample Excel with tickets

3. **Connect to Jira**:
   - Click "🔗 Jira Connection" button
   - Log in with your Atlassian account
   - Grant permissions
   - Redirected back to app

4. **Send Tickets**:
   - Click "Jira-ba Küldés"
   - Confirm
   - Tickets should appear in your Jira project

### API Testing with cURL

```bash
# Check Jira status
curl "http://localhost:3001/api/jira/status?sessionId=YOUR_SESSION_ID"

# Create tickets
curl -X POST http://localhost:3001/api/jira/create-tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tickets": [{"summary": "Test", "description": "Test ticket"}],
    "sessionId": "YOUR_SESSION_ID"
  }'
```

---

## 📚 Production Deployment

### Changes for Production

1. **Update Redirect URI**:
   ```env
   JIRA_CALLBACK_URL=https://yourdomain.com/auth/jira/callback
   ```

2. **Use Redis for Sessions**:
   ```javascript
   // Replace in-memory SessionStore with Redis
   import redis from 'redis'
   ```

3. **Enable HTTPS**:
   ```javascript
   const options = {
     key: fs.readFileSync('path/to/key.pem'),
     cert: fs.readFileSync('path/to/cert.pem')
   }
   https.createServer(options, app).listen(3001)
   ```

4. **Environment Variables**:
   ```env
   NODE_ENV=production
   SESSION_SECRET=use_strong_random_string
   ```

---

## 🆘 Troubleshooting

### Issue: "Failed to exchange authorization code"

**Cause**: Client credentials or redirect URI mismatch

**Solution**:
1. Verify JIRA_CLIENT_ID and JIRA_CLIENT_SECRET are correct
2. Verify JIRA_CALLBACK_URL exactly matches Atlassian app settings
3. Check .env file is loaded: `console.log(process.env.JIRA_CLIENT_ID)`

### Issue: "No token found for user"

**Cause**: Session was cleared or expired

**Solution**:
1. Click "Jira Connection" to re-authenticate
2. Check token expiration in SessionStore

### Issue: "Project not found" when creating tickets

**Cause**: JIRA_PROJECT_KEY doesn't match Jira project

**Solution**:
1. Go to your Jira project
2. Find project key (e.g., "MVM", "TEST")
3. Update .env: `JIRA_PROJECT_KEY=YOUR_KEY`

---

## 📞 Support

For issues:
1. Check logs: `npm start` shows detailed errors
2. Verify .env configuration
3. Test endpoints with cURL
4. Check Atlassian OAuth app settings

---

## ✅ Checklist

- [ ] Atlassian app registered
- [ ] OAuth scopes configured
- [ ] Redirect URI set correctly
- [ ] Client ID and Secret obtained
- [ ] .env file created and configured
- [ ] Dependencies installed (`npm install`)
- [ ] Session SECRET generated
- [ ] Application started (`npm start`)
- [ ] Test OAuth flow
- [ ] Test ticket creation
- [ ] Verify tickets in Jira

---

## 📖 Resources

- [Atlassian OAuth Documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-authorization-code-grants-3lo-for-user-impersonation/)
- [Jira REST API 3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Atlassian SDK for Node.js](https://atlassian.github.io/jira.js/)

---

**Version**: 2.0  
**Last Updated**: 2025-01-01  
**Status**: ✅ Production Ready
