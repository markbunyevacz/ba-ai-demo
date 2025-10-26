import axios from 'axios'

class JiraService {
  constructor() {
    this.baseURL = process.env.JIRA_BASE_URL || 'https://your-domain.atlassian.net'
    this.clientId = process.env.JIRA_CLIENT_ID
    this.clientSecret = process.env.JIRA_CLIENT_SECRET
    this.callbackURL = process.env.JIRA_CALLBACK_URL
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'MVM'
    
    // Store access tokens (in production, use Redis or database)
    this.accessTokens = new Map()
    
    // OAuth endpoints
    this.authorizationURL = 'https://auth.atlassian.com/authorize'
    this.tokenURL = 'https://auth.atlassian.com/oauth/token'
    this.apiBaseURL = `${this.baseURL}/rest/api/3`
  }

  /**
   * Generate OAuth authorization URL
   * User should be redirected to this URL to start OAuth flow
   */
  getAuthorizationURL(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.callbackURL,
      scope: 'read:jira-work write:jira-work offline_access',
      state: state || this.generateRandomState()
    })
    return `${this.authorizationURL}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(this.tokenURL, {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.callbackURL
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { access_token, refresh_token, expires_in } = response.data
      
      // Store token with expiration time
      const tokenData = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000),
        expiresIn: expires_in
      }

      return tokenData
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message)
      throw new Error(`Failed to exchange authorization code: ${error.message}`)
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(this.tokenURL, {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { access_token, refresh_token, expires_in } = response.data
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token || refreshToken, // Use new refresh token if provided
        expiresAt: Date.now() + (expires_in * 1000),
        expiresIn: expires_in
      }
    } catch (error) {
      console.error('Error refreshing access token:', error.response?.data || error.message)
      throw new Error(`Failed to refresh access token: ${error.message}`)
    }
  }

  /**
   * Store token for user session
   */
  setUserToken(userId, tokenData) {
    this.accessTokens.set(userId, tokenData)
  }

  /**
   * Get valid access token for user, refresh if needed
   */
  async getValidAccessToken(userId) {
    const tokenData = this.accessTokens.get(userId)
    
    if (!tokenData) {
      throw new Error('No token found for user')
    }

    // Check if token is expired or about to expire (within 5 minutes)
    if (Date.now() >= tokenData.expiresAt - 300000) {
      console.log('Access token expired or expiring soon, refreshing...')
      const newTokenData = await this.refreshAccessToken(tokenData.refreshToken)
      this.setUserToken(userId, newTokenData)
      return newTokenData.accessToken
    }

    return tokenData.accessToken
  }

  /**
   * Make authenticated API call to Jira
   */
  async apiCall(endpoint, method = 'GET', data = null, userId = null, accessToken = null) {
    try {
      // Get access token
      let token
      if (accessToken) {
        token = accessToken
      } else if (userId) {
        token = await this.getValidAccessToken(userId)
      } else {
        throw new Error('Either userId or accessToken must be provided')
      }

      const config = {
        method,
        url: `${this.apiBaseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data
      }

      const response = await axios(config)
      return response.data
    } catch (error) {
      console.error(`API call failed (${method} ${endpoint}):`, error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Create a Jira issue
   */
  async createIssue(ticketData, userId, accessToken) {
    try {
      const issueData = {
        fields: {
          project: {
            key: this.projectKey
          },
          summary: ticketData.summary || 'Untitled Ticket',
          description: {
            type: 'doc',
            version: 3,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: ticketData.description || 'No description provided'
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: 'Story'
          },
          priority: {
            name: ticketData.priority || 'Medium'
          }
        }
      }

      // Add assignee if provided
      if (ticketData.assignee && ticketData.assignee !== 'Unassigned') {
        issueData.fields.assignee = {
          name: ticketData.assignee
        }
      }

      // Add epic if provided
      if (ticketData.epic && ticketData.epic !== 'No Epic') {
        issueData.fields.customfield_10000 = {
          name: ticketData.epic
        }
      }

      // Add acceptance criteria as comment if provided
      if (ticketData.acceptanceCriteria && ticketData.acceptanceCriteria.length > 0) {
        issueData.fields.description.content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [
            {
              type: 'text',
              text: 'Acceptance Criteria'
            }
          ]
        })

        ticketData.acceptanceCriteria.forEach(criteria => {
          issueData.fields.description.content.push({
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: criteria
                      }
                    ]
                  }
                ]
              }
            ]
          })
        })
      }

      const response = await this.apiCall('/issues', 'POST', issueData, userId, accessToken)
      return response
    } catch (error) {
      console.error('Error creating Jira issue:', error.message)
      throw new Error(`Failed to create Jira issue: ${error.message}`)
    }
  }

  /**
   * Create multiple Jira issues (batch operation)
   */
  async createMultipleIssues(tickets, userId, accessToken) {
    try {
      const results = []
      const errors = []

      for (const ticket of tickets) {
        try {
          const result = await this.createIssue(ticket, userId, accessToken)
          results.push({
            success: true,
            originalTicket: ticket,
            jiraTicket: result,
            issueKey: result.key,
            issueId: result.id
          })
        } catch (error) {
          errors.push({
            success: false,
            originalTicket: ticket,
            error: error.message
          })
        }
      }

      return {
        total: tickets.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    } catch (error) {
      console.error('Error in batch issue creation:', error.message)
      throw error
    }
  }

  /**
   * Update a Jira issue
   */
  async updateIssue(issueKey, updates, userId, accessToken) {
    try {
      const updateData = {
        fields: {}
      }

      if (updates.summary) {
        updateData.fields.summary = updates.summary
      }
      if (updates.description) {
        updateData.fields.description = {
          type: 'doc',
          version: 3,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: updates.description
                }
              ]
            }
          ]
        }
      }
      if (updates.priority) {
        updateData.fields.priority = { name: updates.priority }
      }
      if (updates.assignee) {
        updateData.fields.assignee = { name: updates.assignee }
      }

      const response = await this.apiCall(`/issues/${issueKey}`, 'PUT', updateData, userId, accessToken)
      return response
    } catch (error) {
      console.error(`Error updating Jira issue ${issueKey}:`, error.message)
      throw new Error(`Failed to update Jira issue: ${error.message}`)
    }
  }

  /**
   * Search for Jira issues using JQL
   */
  async searchIssues(jql, userId, accessToken) {
    try {
      const response = await this.apiCall(`/search?jql=${encodeURIComponent(jql)}`, 'GET', null, userId, accessToken)
      return response
    } catch (error) {
      console.error('Error searching Jira issues:', error.message)
      throw new Error(`Failed to search Jira issues: ${error.message}`)
    }
  }

  /**
   * Get Jira project details
   */
  async getProject(projectKey, userId, accessToken) {
    try {
      const response = await this.apiCall(`/projects/${projectKey}`, 'GET', null, userId, accessToken)
      return response
    } catch (error) {
      console.error(`Error getting project ${projectKey}:`, error.message)
      throw new Error(`Failed to get project details: ${error.message}`)
    }
  }

  /**
   * Get issue type schemes
   */
  async getIssueTypes(userId, accessToken) {
    try {
      const response = await this.apiCall('/issuetypes', 'GET', null, userId, accessToken)
      return response
    } catch (error) {
      console.error('Error getting issue types:', error.message)
      throw new Error(`Failed to get issue types: ${error.message}`)
    }
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey, userId, accessToken) {
    try {
      const response = await this.apiCall(`/issues/${issueKey}`, 'GET', null, userId, accessToken)
      return response
    } catch (error) {
      console.error(`Error getting issue ${issueKey}:`, error.message)
      throw new Error(`Failed to get issue: ${error.message}`)
    }
  }

  /**
   * Generate random state for OAuth
   */
  generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

export default new JiraService()
