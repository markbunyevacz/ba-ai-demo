# Business Analyst AI Demo - v2.0

A full-stack web application that demonstrates AI-powered business analysis capabilities by processing Excel files and generating structured tickets in **real Jira instances** via OAuth 2.0 integration.

## ✨ Features

### Core Features
- **Excel File Upload**: Drag & drop or browse to upload Excel files (.xlsx, .xls)
- **Intelligent Parsing**: Automatically detects columns and maps them to ticket properties
- **Real-time Processing**: Shows progress while processing files
- **Ticket Generation**: Creates structured tickets with proper categorization
- **Modern UI**: Built with React and styled with Tailwind CSS

### 🆕 Real Jira Integration (v2.0)
- **OAuth 2.0 Authentication**: Secure 3-legged OAuth flow with Atlassian
- **Direct Jira API Integration**: Creates tickets directly in your Jira instance
- **Token Refresh Management**: Automatic token refresh for long sessions
- **Batch Ticket Creation**: Create multiple tickets in a single operation
- **Session Management**: Persistent sessions with token expiration handling
- **Error Handling**: Graceful degradation with user-friendly error messages

### AI & Validation Features
- **RAG-based Grounding**: Validates tickets against business rules
- **Confidence Scoring**: 0-1 scale confidence metrics for each ticket
- **Hallucination Detection**: Detects and flags unreliable content
- **MVM Domain Knowledge**: Energy industry terminology and context
- **Comprehensive Monitoring**: Performance tracking and analytics

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool with hot reload
- **Tailwind CSS** - Styling
- **localStorage** - Session persistence

### Backend
- **Node.js** - Runtime
- **Express.js** - API framework
- **Axios** - HTTP client for Jira API
- **dotenv** - Environment configuration
- **Multer** - File upload handling
- **XLSX** - Excel parsing

### External Services
- **Atlassian Jira Cloud** - Issue management
- **Atlassian OAuth 2.0** - Authentication

## 🚀 Quick Start

### 1️⃣ Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- Jira Cloud instance
- Atlassian developer account

### 2️⃣ Jira Setup (5 minutes)

See **[QUICKSTART_JIRA.md](./QUICKSTART_JIRA.md)** for rapid setup OR **[JIRA_INTEGRATION_GUIDE.md](./JIRA_INTEGRATION_GUIDE.md)** for detailed instructions.

Quick steps:
1. Register OAuth app at https://developer.atlassian.com/apps/build
2. Add OAuth scopes: `read:jira-work`, `write:jira-work`, `offline_access`
3. Set Redirect URI: `http://localhost:3001/auth/jira/callback`
4. Get Client ID and Client Secret

### 3️⃣ Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# JIRA_CLIENT_ID=your_client_id
# JIRA_CLIENT_SECRET=your_client_secret
# JIRA_BASE_URL=https://your-domain.atlassian.net
# SESSION_SECRET=generate_random_32_chars
```

Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4️⃣ Installation & Running

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm start
```

Access the application:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3001 (Express server)
- **Jira Connection**: Click "🔗 Jira Connection" button in header

## 📖 Usage

### Basic Workflow

1. **Upload Excel File**
   - Drag and drop or click to browse
   - Supports .xlsx and .xls formats
   - Auto-detects: User Story, Priority, Assignee, Epic, Acceptance Criteria

2. **Process & Validate**
   - AI validates tickets against MVM domain rules
   - Shows confidence scores for each ticket
   - Identifies missing or invalid data

3. **Connect to Jira**
   - Click "🔗 Jira Connection" button
   - Log in with Atlassian account
   - Grant permissions
   - Redirected back to app

4. **Send to Jira**
   - Click "Jira-ba Küldés" button
   - Confirms ticket details
   - Creates tickets in real Jira instance
   - Shows success with Jira ticket keys

### Excel File Format

The application intelligently maps Excel columns:

| Column | Maps To | Example |
|--------|---------|---------|
| User Story | Summary | "As a user, I need..." |
| Priority | Priority | Kritikus, Magas, Közepes, Alacsony |
| Assignee | Assignee | user@company.com |
| Epic | Epic Link | Feature Name |
| Acceptance Criteria | Description | Criteria list (line-separated) |

## 🔌 API Endpoints

### File Processing
- `POST /api/upload` - Upload and process Excel file

### Jira OAuth
- `GET /auth/jira` - Initiate OAuth flow
- `GET /auth/jira/callback` - OAuth callback handler
- `GET /api/jira/status` - Check authentication status
- `POST /api/jira/logout` - Logout from Jira

### Jira Operations
- `POST /api/jira/create-tickets` - Create tickets in Jira
- `POST /api/jira/create-tickets` - **Batch create** multiple tickets

### Monitoring
- `GET /api/health` - Health check
- `GET /api/grounding/stats` - Grounding validation statistics
- `GET /api/monitoring/metrics` - Performance metrics
- `GET /api/monitoring/alerts` - System alerts

## 📁 Project Structure

```
ba-ai-demo/
├── server.js                              # Express backend with OAuth routes
├── package.json                           # Dependencies
├── .env.example                           # Environment template
├── JIRA_INTEGRATION_GUIDE.md             # Detailed Jira setup guide
├── QUICKSTART_JIRA.md                    # Quick Jira setup (5 min)
│
├── public/
│   ├── index.html                         # Main HTML
│   ├── demo_data.xlsx                     # Sample Excel
│   └── app.js                             # Static app
│
├── src/
│   ├── App.jsx                           # Main React app with OAuth
│   ├── main.jsx                          # React entry point
│   ├── index.css                         # Tailwind imports
│   │
│   ├── components/
│   │   ├── FileUpload.jsx                # File upload UI
│   │   ├── ProgressBar.jsx               # Progress indicator
│   │   ├── TicketCard.jsx                # Ticket display
│   │   ├── SuccessModal.jsx              # Confirmation modal
│   │   └── GroundingDashboard.jsx        # Validation metrics
│   │
│   ├── services/
│   │   ├── jiraService.js                # 🆕 Jira API client
│   │   ├── sessionStore.js               # 🆕 Session management
│   │   ├── groundingService.js           # AI validation
│   │   └── monitoringService.js          # Metrics tracking
│   │
│   └── config/
│       └── knowledgeBase.js              # MVM domain knowledge

└── vite.config.js                        # Vite configuration
```

## 🔐 Authentication Flow

```
User clicks "Jira Connection"
         ↓
Backend redirects to Atlassian OAuth
         ↓
User logs in & grants permissions
         ↓
Atlassian redirects to /auth/jira/callback
         ↓
Server exchanges code for access token
         ↓
Token stored in SessionStore
         ↓
User redirected with sessionId in URL
         ↓
Frontend stores sessionId in localStorage
         ↓
✅ Ready to create Jira tickets
```

## 🛠️ Development

### Running in Development Mode

```bash
# Terminal 1: Start backend with nodemon
npm run server

# Terminal 2: Start frontend with Vite hot reload
npm run dev
```

### Backend Architecture
- **Express.js** server on port 3001
- OAuth state tracking with 10-minute expiry
- In-memory session store (use Redis in production)
- Comprehensive error handling

### Frontend Architecture
- **React 19** with hooks
- OAuth callback handling in useEffect
- Session persistence in localStorage
- Responsive Tailwind CSS design

## 📊 Monitoring & Analytics

### Grounding Statistics
```bash
curl http://localhost:3001/api/grounding/stats
```

### Performance Metrics
```bash
curl http://localhost:3001/api/monitoring/metrics
```

### Recent Alerts
```bash
curl http://localhost:3001/api/monitoring/alerts
```

## ⚠️ Common Issues

### OAuth Configuration
**Problem**: "Invalid OAuth state"
- **Solution**: Check redirect URI exactly matches Atlassian app settings

### Session Expired
**Problem**: "Session expired or invalid"
- **Solution**: Click "Jira Connection" button to re-authenticate

### Project Not Found
**Problem**: "Project not found" when creating tickets
- **Solution**: Verify JIRA_PROJECT_KEY in .env matches Jira project

See **[JIRA_INTEGRATION_GUIDE.md](./JIRA_INTEGRATION_GUIDE.md)** for complete troubleshooting.

## 📚 Documentation

- **[JIRA_INTEGRATION_GUIDE.md](./JIRA_INTEGRATION_GUIDE.md)** - Complete Jira setup & API reference
- **[QUICKSTART_JIRA.md](./QUICKSTART_JIRA.md)** - 5-minute quick start
- **[DEMO_SCENARIOS.md](./docs/DEMO_SCENARIOS.md)** - Demo workflow examples

## 🚀 Production Deployment

### Key Changes for Production

1. **Use HTTPS** and update redirect URI
2. **Replace in-memory SessionStore** with Redis
3. **Enable secure HTTP-only cookies** for token storage
4. **Set environment variables** via deployment platform
5. **Use connection pooling** for database
6. **Add rate limiting** and CORS restrictions

See JIRA_INTEGRATION_GUIDE.md → Production Deployment section.

## 📝 License

ISC

---

**Version**: 2.0  
**Last Updated**: January 2025  
**Status**: ✅ Production Ready with Real Jira Integration
