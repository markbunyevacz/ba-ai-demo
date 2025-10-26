/**
 * Knowledge Base Configuration for AI Grounding
 * Contains business rules, validation patterns, and domain-specific knowledge
 */

export const BUSINESS_RULES = {
  // Ticket Priority Rules
  PRIORITY_RULES: {
    validPriorities: ['Critical', 'High', 'Medium', 'Low'],
    priorityMapping: {
      'Kritikus': 'Critical',
      'Magas': 'High', 
      'Közepes': 'Medium',
      'Alacsony': 'Low',
      'URGENT': 'Critical',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low'
    },
    escalationRules: {
      'Critical': { maxAge: 24, escalation: 'Immediate' },
      'High': { maxAge: 72, escalation: 'Within 3 days' },
      'Medium': { maxAge: 168, escalation: 'Within 1 week' },
      'Low': { maxAge: 720, escalation: 'Within 1 month' }
    }
  },

  // Ticket Type Rules
  TYPE_RULES: {
    validTypes: ['Bug', 'Feature', 'Enhancement', 'Task', 'Story', 'Epic'],
    typeDescriptions: {
      'Bug': 'A defect or error in the system',
      'Feature': 'New functionality to be added',
      'Enhancement': 'Improvement to existing functionality',
      'Task': 'Work item that needs to be completed',
      'Story': 'User story describing functionality from user perspective',
      'Epic': 'Large body of work that can be broken down into stories'
    },
    typeRequirements: {
      'Bug': ['description', 'steps_to_reproduce', 'expected_behavior', 'actual_behavior'],
      'Feature': ['description', 'acceptance_criteria', 'business_value'],
      'Story': ['as_a', 'i_want', 'so_that', 'acceptance_criteria']
    }
  },

  // Assignee Rules
  ASSIGNEE_RULES: {
    validFormats: [
      /^[A-Za-z\s\.]+$/, // Names with letters, spaces, dots
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email format
      /^[A-Za-z0-9\-_]+$/, // Usernames
      /^Team\s+[A-Za-z0-9\s]+$/ // Team assignments
    ],
    requiredFields: ['name', 'email'],
    teamAssignments: {
      'Development': ['developer1@mvm.hu', 'developer2@mvm.hu'],
      'Testing': ['tester1@mvm.hu', 'tester2@mvm.hu'],
      'Business Analysis': ['ba1@mvm.hu', 'ba2@mvm.hu']
    }
  },

  // Epic Rules
  EPIC_RULES: {
    validFormats: [
      /^[A-Za-z0-9\s\-_]+$/, // Alphanumeric with spaces, dashes, underscores
      /^EPIC-\d+$/, // EPIC-123 format
      /^[A-Z]{2,}-\d+$/ // AB-123 format
    ],
    namingConventions: {
      pattern: /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/,
      maxLength: 50,
      minLength: 3
    }
  },

  // Content Validation Rules
  CONTENT_RULES: {
    summary: {
      minLength: 5,
      maxLength: 100,
      required: true,
      patterns: {
        noSpecialChars: /^[A-Za-z0-9\s\-_.,!?()]+$/,
        startsWithCapital: /^[A-Z]/
      }
    },
    description: {
      minLength: 10,
      maxLength: 2000,
      required: true,
      patterns: {
        noHtml: /<[^>]*>/g,
        noScripts: /<script[^>]*>.*?<\/script>/gi
      }
    },
    acceptanceCriteria: {
      minCount: 1,
      maxCount: 10,
      maxLength: 200,
      patterns: {
        validFormat: /^[A-Za-z0-9\s\-_.,!?()]+$/
      }
    }
  }
}

export const VALIDATION_PATTERNS = {
  // Email validation
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Phone number validation (Hungarian format)
  PHONE: /^(\+36|06)[0-9]{1,2}[0-9]{3}[0-9]{4}$/,
  
  // Date formats
  DATE_FORMATS: [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}\.\d{2}\.\d{4}$/ // DD.MM.YYYY
  ],
  
  // ID formats
  ID_FORMATS: {
    TICKET_ID: /^[A-Z]{2,}-\d+$/, // MVM-1234
    EPIC_ID: /^EPIC-\d+$/, // EPIC-123
    STORY_ID: /^STORY-\d+$/ // STORY-123
  },
  
  // Text patterns
  TEXT_PATTERNS: {
    NO_HTML: /<[^>]*>/g,
    NO_SCRIPT: /<script[^>]*>.*?<\/script>/gi,
    NO_MARKDOWN: /[#*_`\[\]()]/g,
    VALID_CHARS: /^[A-Za-z0-9\s\-_.,!?()]+$/
  }
}

export const DOMAIN_KNOWLEDGE = {
  // MVM-specific knowledge
  MVM_CONTEXT: {
    departments: [
      'IT', 'HR', 'Finance', 'Operations', 'Legal', 'Marketing', 'Sales'
    ],
    systems: [
      'SAP', 'Jira', 'Confluence', 'SharePoint', 'Azure', 'AWS'
    ],
    locations: [
      'Budapest', 'Debrecen', 'Szeged', 'Pécs', 'Győr'
    ],
    businessUnits: [
      'MVM Zrt', 'MVM Partner', 'MVM Next', 'MVM Solar'
    ]
  },

  // Business Analysis specific knowledge
  BA_CONTEXT: {
    methodologies: [
      'Agile', 'Scrum', 'Waterfall', 'Kanban', 'SAFe'
    ],
    artifacts: [
      'User Story', 'Epic', 'Feature', 'Requirement', 'Use Case',
      'Business Process', 'Workflow', 'Data Model', 'Interface Design'
    ],
    stakeholders: [
      'Product Owner', 'Scrum Master', 'Developer', 'Tester',
      'Business User', 'End User', 'Stakeholder', 'Sponsor'
    ]
  },

  // Technical knowledge
  TECHNICAL_CONTEXT: {
    programmingLanguages: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'PHP', 'Go'
    ],
    frameworks: [
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Spring', 'Django'
    ],
    databases: [
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server'
    ],
    cloudProviders: [
      'AWS', 'Azure', 'Google Cloud', 'IBM Cloud'
    ]
  }
}

export const QUALITY_METRICS = {
  // Confidence scoring weights
  CONFIDENCE_WEIGHTS: {
    VALIDATION_PASS: 0.3,
    PATTERN_MATCH: 0.2,
    DOMAIN_CONTEXT: 0.2,
    SOURCE_ATTRIBUTION: 0.15,
    BUSINESS_RULE_COMPLIANCE: 0.15
  },

  // Quality thresholds
  THRESHOLDS: {
    MIN_CONFIDENCE: 0.7,
    MAX_ISSUES: 3,
    MAX_WARNINGS: 5,
    MIN_VALIDATION_RATE: 0.8
  },

  // Performance metrics
  PERFORMANCE: {
    MAX_PROCESSING_TIME: 5000, // 5 seconds
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
    MAX_CONCURRENT_REQUESTS: 10
  }
}

export const ERROR_MESSAGES = {
  VALIDATION: {
    INVALID_PRIORITY: 'Invalid priority level. Must be one of: Critical, High, Medium, Low',
    INVALID_TYPE: 'Invalid ticket type. Must be one of: Bug, Feature, Enhancement, Task, Story, Epic',
    INVALID_ASSIGNEE: 'Invalid assignee format. Must be a valid name or email address',
    INVALID_EPIC: 'Invalid epic format. Must follow naming conventions',
    SUMMARY_TOO_SHORT: 'Summary must be at least 5 characters long',
    SUMMARY_TOO_LONG: 'Summary must not exceed 100 characters',
    DESCRIPTION_TOO_SHORT: 'Description must be at least 10 characters long',
    DESCRIPTION_TOO_LONG: 'Description must not exceed 2000 characters',
    TOO_MANY_CRITERIA: 'Too many acceptance criteria. Maximum 10 allowed',
    CRITERIA_TOO_LONG: 'Acceptance criteria must not exceed 200 characters each'
  },
  
  HALLUCINATION: {
    FABRICATED_ID: 'Ticket ID format does not match expected pattern',
    SUSPICIOUS_TIMESTAMP: 'Timestamp appears to be fabricated',
    EXCESSIVE_CRITERIA: 'Number of acceptance criteria exceeds reasonable limits',
    INVALID_FORMAT: 'Content format does not match expected patterns',
    MISSING_SOURCE: 'No source attribution found for generated content'
  },
  
  SYSTEM: {
    PROCESSING_ERROR: 'Error occurred during ticket processing',
    VALIDATION_ERROR: 'Error occurred during validation',
    GROUNDING_ERROR: 'Error occurred during grounding validation',
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT_ERROR: 'Request timed out'
  }
}

export default {
  BUSINESS_RULES,
  VALIDATION_PATTERNS,
  DOMAIN_KNOWLEDGE,
  QUALITY_METRICS,
  ERROR_MESSAGES
}
