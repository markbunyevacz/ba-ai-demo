/**
 * Session Store for managing user sessions and Jira tokens
 * In production, this should be replaced with Redis or a database
 */
class SessionStore {
  constructor() {
    this.sessions = new Map()
  }

  /**
   * Create a new user session
   */
  createSession(userId, sessionData = {}) {
    const sessionId = this.generateSessionId()
    const session = {
      id: sessionId,
      userId,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ...sessionData
    }
    this.sessions.set(sessionId, session)
    return sessionId
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastAccessed = Date.now()
    }
    return session
  }

  /**
   * Update session data
   */
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, updates)
      session.lastAccessed = Date.now()
      return session
    }
    return null
  }

  /**
   * Delete session
   */
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId)
  }

  /**
   * Store Jira token for user session
   */
  setJiraToken(sessionId, tokenData) {
    const session = this.getSession(sessionId)
    if (session) {
      session.jiraToken = tokenData
      session.jiraTokenExpiresAt = Date.now() + (tokenData.expiresIn * 1000)
      return true
    }
    return false
  }

  /**
   * Get Jira token for user session
   */
  getJiraToken(sessionId) {
    const session = this.getSession(sessionId)
    return session?.jiraToken || null
  }

  /**
   * Check if Jira token is still valid
   */
  isJiraTokenValid(sessionId) {
    const session = this.getSession(sessionId)
    if (!session || !session.jiraToken) {
      return false
    }
    // Token is valid if not expired
    return Date.now() < session.jiraTokenExpiresAt
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId) {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId)
  }

  /**
   * Clear expired sessions (older than 24 hours)
   */
  clearExpiredSessions(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now()
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > maxAge) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

export default new SessionStore()
