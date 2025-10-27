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
  },

  // BACCM Alignment Rules
  BACCM_RULES: {
    requiredConcepts: ['Change', 'Need', 'Solution', 'Stakeholder', 'Value', 'Context'],
    conceptDescriptions: {
      Change: 'What is being transformed or modified within the organization',
      Need: 'The problem or opportunity that triggers the change',
      Solution: 'The specific option chosen to satisfy the identified need',
      Stakeholder: 'People or groups affected by or influencing the change',
      Value: 'Measurable improvement delivered by addressing the need',
      Context: 'Circumstances surrounding and influencing the change'
    },
    validationChecks: {
      Change: {
        requiredFields: ['description', 'business_value'],
        keywords: ['change', 'transition', 'improve', 'upgrade', 'migrate']
      },
      Need: {
        requiredFields: ['problem_statement', 'current_state'],
        keywords: ['need', 'issue', 'challenge', 'gap', 'requirement']
      },
      Solution: {
        requiredFields: ['proposed_solution', 'solution_details'],
        keywords: ['solution', 'approach', 'implementation', 'design', 'option']
      },
      Stakeholder: {
        requiredFields: ['stakeholders', 'stakeholder_roles'],
        keywords: ['stakeholder', 'user', 'customer', 'sponsor', 'team']
      },
      Value: {
        requiredFields: ['business_value', 'success_metrics'],
        keywords: ['value', 'benefit', 'outcome', 'impact', 'metrics']
      },
      Context: {
        requiredFields: ['current_state', 'constraints'],
        keywords: ['context', 'environment', 'constraint', 'assumption', 'dependency']
      }
    },
    complianceThreshold: 0.6
  },

  // Strategic Analysis Rules
  STRATEGIC_RULES: {
    pestle: {
      minConfidence: 0.25,
      riskWeight: 0.55,
      opportunityWeight: 0.45,
      maxSignalsPerFactor: 5
    },
    swot: {
      minConfidence: 0.2,
      maxItemsPerCategory: 4,
      internalFactors: ['strengths', 'weaknesses'],
      externalFactors: ['opportunities', 'threats']
    },
    recommendations: {
      maxRecommendations: 5,
      priorityWeights: {
        urgency: 0.4,
        impact: 0.35,
        feasibility: 0.25
      },
      defaultUrgency: 'Medium',
      defaultImpact: 'Medium',
      defaultFeasibility: 'Medium'
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

export const STRATEGIC_ANALYSIS = {
  PESTLE_FACTORS: {
    Political: {
      description: 'Government policies, regulations, stability, and trade controls affecting the initiative',
      riskKeywords: ['regulation', 'policy change', 'compliance', 'tariff', 'sanction', 'government approval'],
      opportunityKeywords: ['incentive', 'subsidy', 'public funding', 'government support', 'regulatory alignment'],
      monitoringSignals: ['new legislation', 'election cycle', 'policy update', 'governance change']
    },
    Economic: {
      description: 'Economic trends, market conditions, and financial constraints impacting value',
      riskKeywords: ['budget cut', 'recession', 'cost increase', 'inflation', 'market decline'],
      opportunityKeywords: ['cost saving', 'efficiency', 'revenue growth', 'market expansion', 'investment'],
      monitoringSignals: ['roi', 'financial forecast', 'cost-benefit', 'economic indicator']
    },
    Social: {
      description: 'Cultural, demographic, and societal factors influencing stakeholders',
      riskKeywords: ['resistance', 'adoption challenge', 'skill gap', 'user dissatisfaction', 'workforce impact'],
      opportunityKeywords: ['training', 'engagement', 'customer satisfaction', 'collaboration', 'community'],
      monitoringSignals: ['change management', 'user feedback', 'stakeholder sentiment', 'employee readiness']
    },
    Technological: {
      description: 'Technological trends, capabilities, and dependencies shaping the solution',
      riskKeywords: ['technical debt', 'integration issue', 'legacy system', 'downtime', 'cybersecurity risk'],
      opportunityKeywords: ['automation', 'innovation', 'cloud adoption', 'scalability', 'modernization'],
      monitoringSignals: ['technology roadmap', 'system upgrade', 'platform', 'infrastructure']
    },
    Legal: {
      description: 'Legal constraints, compliance requirements, and contractual obligations',
      riskKeywords: ['non-compliance', 'legal dispute', 'licensing', 'data privacy', 'audit finding'],
      opportunityKeywords: ['regulatory approval', 'compliance certification', 'contract renewal', 'policy alignment'],
      monitoringSignals: ['legal review', 'compliance audit', 'regulatory framework', 'data protection']
    },
    Environmental: {
      description: 'Environmental sustainability, resource usage, and ecological considerations',
      riskKeywords: ['emission', 'waste', 'environmental impact', 'resource scarcity', 'sustainability risk'],
      opportunityKeywords: ['green energy', 'sustainability', 'carbon reduction', 'renewable', 'eco-friendly'],
      monitoringSignals: ['environmental policy', 'sustainability goal', 'energy efficiency', 'environmental audit']
    }
  },
  SWOT_CATEGORIES: {
    strengths: {
      description: 'Internal capabilities that create advantages',
      indicators: ['competitive advantage', 'expertise', 'resource availability', 'positive feedback', 'high performance'],
      sentiment: 'positive'
    },
    weaknesses: {
      description: 'Internal limitations or gaps to address',
      indicators: ['capacity constraint', 'skill gap', 'process bottleneck', 'defect rate', 'dependency'],
      sentiment: 'negative'
    },
    opportunities: {
      description: 'External chances to improve performance or outcomes',
      indicators: ['market demand', 'partnership', 'technology upgrade', 'regulatory support', 'customer need'],
      sentiment: 'positive'
    },
    threats: {
      description: 'External factors that could harm the initiative',
      indicators: ['competitor', 'market risk', 'compliance risk', 'budget pressure', 'stakeholder resistance'],
      sentiment: 'negative'
    }
  },
  RECOMMENDATION_TEMPLATES: {
    mitigateRisk: 'Develop mitigation plan for {factor} risk relating to {signal}',
    pursueOpportunity: 'Initiate opportunity assessment for {factor} opportunity: {signal}',
    strengthenCapability: 'Invest in strengthening capability: {capability}',
    monitorChange: 'Establish monitoring cadence for {factor} signals and report monthly'
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

  // BACCM Core Concepts
  BACCM_CONCEPTS: {
    Change: {
      description: 'The act of transformation in response to a need',
      guidingQuestions: [
        'What is being changed and why?',
        'How does the current state differ from the desired future state?',
        'What are the triggers and drivers of the change?'
      ],
      indicators: ['defined change scope', 'identified drivers', 'future state description']
    },
    Need: {
      description: 'A problem, opportunity, or constraint motivating the change',
      guidingQuestions: [
        'What problem or opportunity exists?',
        'Who experiences the need and to what extent?',
        'What happens if the need is not addressed?'
      ],
      indicators: ['problem statement', 'impact assessment', 'root cause analysis']
    },
    Solution: {
      description: 'A specific way to satisfy one or more identified needs',
      guidingQuestions: [
        'What options exist to address the need?',
        'How does the proposed solution deliver value?',
        'What are the solution components and scope?'
      ],
      indicators: ['solution options', 'implementation plan', 'solution scope']
    },
    Stakeholder: {
      description: 'Groups or individuals who influence or are impacted by the change',
      guidingQuestions: [
        'Who is affected by the change?',
        'Who has influence over the solution?',
        'What are stakeholder expectations and concerns?'
      ],
      indicators: ['stakeholder matrix', 'engagement plan', 'role definitions']
    },
    Value: {
      description: 'The benefit of a change expressed in terms meaningful to stakeholders',
      guidingQuestions: [
        'What measurable outcomes indicate success?',
        'How does the solution improve current performance?',
        'What metrics will be used to evaluate value?'
      ],
      indicators: ['value metrics', 'benefit analysis', 'acceptance criteria']
    },
    Context: {
      description: 'The circumstances that influence the change, including environment and culture',
      guidingQuestions: [
        'What constraints or dependencies exist?',
        'What organizational factors impact the change?',
        'What assumptions must be validated?'
      ],
      indicators: ['environment analysis', 'assumption log', 'risk assessment']
    }
  },

  PROCESS_PATTERNS: {
    taskKeywords: ['implement', 'develop', 'test', 'deploy', 'review'],
    gatewayKeywords: ['if', 'when', 'depends', 'conditional', 'either'],
    eventKeywords: ['trigger', 'start', 'end', 'complete', 'notify'],
    sequenceIndicators: ['then', 'next', 'after', 'before', 'followed by']
  },

  // Stakeholder Analysis Configuration
  STAKEHOLDER_ANALYSIS: {
    powerLevels: ['Low', 'Medium', 'High'],
    interestLevels: ['Low', 'Medium', 'High'],
    
    // Extraction patterns for stakeholder identification
    extractionPatterns: [
      /assigned to[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /assignee[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /stakeholder[s]?[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi,
      /contact[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /mentioned by[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /owner[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /lead[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /manager[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /reporter[:\s]+([A-Za-z\s]+?)(?:[,.]|$)/gi,
      /involving[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi,
      /team[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi,
      /department[:\s]+([A-Za-z\s,&]+?)(?:[,.]|$)/gi
    ],
    
    // Role-based power/interest mapping
    roleMapping: {
      'Product Owner': { power: 'High', interest: 'High' },
      'Business Analyst': { power: 'High', interest: 'High' },
      'Project Manager': { power: 'High', interest: 'High' },
      'Developer': { power: 'Medium', interest: 'High' },
      'QA Engineer': { power: 'Medium', interest: 'High' },
      'Tester': { power: 'Medium', interest: 'High' },
      'End User': { power: 'Low', interest: 'High' },
      'Customer': { power: 'Medium', interest: 'High' },
      'Stakeholder': { power: 'Medium', interest: 'Medium' },
      'Manager': { power: 'High', interest: 'Medium' },
      'Executive': { power: 'High', interest: 'Medium' },
      'Sponsor': { power: 'High', interest: 'High' }
    },
    
    // Quadrant strategy definitions
    quadrantStrategies: {
      manage: {
        title: 'Manage Closely',
        description: 'High Power, High Interest',
        strategies: [
          'Involve in key decisions and planning',
          'Regular updates and consultations',
          'Address concerns proactively',
          'Seek active participation'
        ],
        color: '#d4185d'
      },
      keep_satisfied: {
        title: 'Keep Satisfied',
        description: 'High Power, Low Interest',
        strategies: [
          'Regular updates with key information',
          'Highlight outcomes and benefits',
          'Avoid over-communication',
          'Ensure expectations are clear'
        ],
        color: '#ff6600'
      },
      keep_informed: {
        title: 'Keep Informed',
        description: 'Low Power, High Interest',
        strategies: [
          'Provide regular updates',
          'Include in relevant discussions',
          'Share progress and milestones',
          'Answer questions promptly'
        ],
        color: '#009900'
      },
      monitor: {
        title: 'Monitor',
        description: 'Low Power, Low Interest',
        strategies: [
          'General awareness only',
          'Minimal communication',
          'Watch for changes in interest/power',
          'Provide information if requested'
        ],
        color: '#cccccc'
      }
    },
    
    // Keywords for power level detection
    powerKeywords: {
      high: ['decides', 'approves', 'authorizes', 'budget', 'executive', 'sponsor', 'owner', 'lead', 'manager'],
      medium: ['implements', 'develops', 'designs', 'reviews', 'team lead', 'senior'],
      low: ['executes', 'supports', 'assists', 'junior', 'intern']
    },
    
    // Keywords for interest level detection
    interestKeywords: {
      high: ['critical', 'important', 'urgent', 'required', 'must', 'essential', 'dependent', 'directly', 'directly involved'],
      medium: ['involved', 'contribute', 'support', 'helps', 'related', 'relevant'],
      low: ['inform', 'notify', 'aware', 'optional', 'nice to have', 'future']
    },
    
    // Hallucination detection rules
    halluccinationDetection: {
      minNameLength: 3,
      maxNameLength: 50,
      genericNames: ['User', 'Team', 'People', 'Group', 'Staff'],
      suspiciousPatterns: [',', '@', '\\d{5,}'],
      minConfidenceForSingleMention: 0.7
    },
    
    // Network analysis settings
    networkAnalysis: {
      minEdgeWeight: 1,
      topRelationships: 50,
      topInfluencers: 10,
      densityThreshold: 0.3
    }
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

export const STAKEHOLDER_ANALYSIS = DOMAIN_KNOWLEDGE.STAKEHOLDER_ANALYSIS

export const STRATEGIC_ANALYSIS_CONFIG = {
  RULES: BUSINESS_RULES.STRATEGIC_RULES,
  FACTORS: STRATEGIC_ANALYSIS.PESTLE_FACTORS,
  SWOT: STRATEGIC_ANALYSIS.SWOT_CATEGORIES,
  TEMPLATES: STRATEGIC_ANALYSIS.RECOMMENDATION_TEMPLATES
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
  STAKEHOLDER_ANALYSIS,
  QUALITY_METRICS,
  ERROR_MESSAGES
}
