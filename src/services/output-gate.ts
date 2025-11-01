import { logger } from '../utils/logger';
import { getAgentConfig } from '../agents/config';

export interface OutputGateResult {
  allowed: boolean;
  reason?: string;
  suggestedAction?: 'refuse' | 'regenerate' | 'add_disclaimer';
  modifiedResponse?: string;
}

export interface SafetyCheck {
  isOutOfDomain: boolean;
  containsUnsafeContent: boolean;
  needsDisclaimer: boolean;
  confidence: number;
  details: string[];
}

export class OutputGateService {
  private readonly domainKeywords = {
    general: ['general', 'help', 'assist', 'question', 'information'],
    education: [
      'education', 'learning', 'study', 'academic', 'school', 'university', 'course', 'syllabus', 'curriculum',
      'studies', 'studying', 'improve', 'performance', 'grades', 'exam', 'test', 'assignment', 'homework',
      'class', 'lecture', 'student', 'teacher', 'professor', 'tutor', 'learn', 'understand', 'practice',
      'knowledge', 'skill', 'improvement', 'teaching', 'revision', 'notes', 'textbook', 'score'
    ],
    finance: ['finance', 'financial', 'money', 'investment', 'trading', 'market', 'economy', 'budget', 'savings'],
    medical: [
      'medical', 'health', 'healthcare', 'medicine', 'symptom', 'symptoms', 'diagnosis', 'treatment', 'doctor', 'patient',
      'disease', 'illness', 'sick', 'sickness', 'condition', 'disorder', 'syndrome', 'infection', 'virus', 'bacteria',
      'pain', 'ache', 'hurt', 'sore', 'discomfort', 'suffering', 'fever', 'cold', 'flu', 'cough', 'headache',
      'stomach', 'gastro', 'gasteroogy', 'gastric', 'intestinal', 'digestive', 'bowel', 'nausea', 'vomit', 'diarrhea',
      'injury', 'wound', 'bleeding', 'bruise', 'fracture', 'sprain', 'strain', 'trauma',
      'chronic', 'acute', 'severe', 'mild', 'moderate', 'persistent', 'recurring', 'episodic',
      'anxiety', 'depression', 'stress', 'mental', 'psychological', 'emotional', 'mood',
      'heart', 'cardiac', 'blood', 'pressure', 'diabetes', 'cancer', 'tumor', 'respiratory', 'lung',
      'allergy', 'allergic', 'asthma', 'rash', 'skin', 'dermatology', 'eczema', 'psoriasis',
      'pregnancy', 'pregnant', 'prenatal', 'postnatal', 'maternal', 'pediatric', 'child', 'baby', 'infant',
      'vaccination', 'vaccine', 'immunization', 'shot', 'dose', 'medication', 'drug', 'prescription', 'pill',
      'therapy', 'therapist', 'counseling', 'rehabilitation', 'recovery', 'healing', 'cure',
      'hospital', 'clinic', 'emergency', 'urgent', 'care', 'nurse', 'physician', 'specialist',
      'wellness', 'wellbeing', 'fitness', 'nutrition', 'diet', 'exercise', 'lifestyle', 'preventive',
      'test', 'screening', 'examination', 'checkup', 'scan', 'xray', 'lab', 'blood work',
      'problem', 'issue', 'concern', 'worry', 'question', 'advice', 'help', 'what should i do'
    ],
    coding: [
      'code', 'coding', 'program', 'programming', 'script', 'function', 'class', 'method', 'variable', 
      'algorithm', 'data structure', 'debug', 'bug', 'error', 'compile', 'build', 'deploy', 'api', 'database',
      'frontend', 'backend', 'server', 'client', 'framework', 'library', 'package', 'module', 'import',
      'python', 'javascript', 'java', 'c++', 'rust', 'go', 'typescript', 'html', 'css', 'sql', 'react',
      'node', 'django', 'flask', 'spring', 'git', 'docker', 'kubernetes', 'aws', 'azure', 'devops',
      'write', 'create', 'build', 'develop', 'implement', 'fix', 'solve', 'optimize', 'refactor',
      'test', 'unit test', 'integration', 'architecture', 'design pattern', 'microservice', 'rest',
      'linked list', 'array', 'tree', 'graph', 'stack', 'queue', 'hash', 'sort', 'search', 'recursion'
    ],
    technology: ['technology', 'tech', 'software', 'hardware', 'digital', 'computer', 'system', 'network', 'cloud'],
    legal: ['legal', 'law', 'regulation', 'compliance', 'rights', 'contract', 'attorney', 'court', 'justice'],
    creative: [
      'creative', 'creativity', 'art', 'artistic', 'design', 'write', 'writing', 'story', 'poem', 'poetry',
      'song', 'lyrics', 'music', 'musical', 'compose', 'composition', 'paint', 'painting', 'draw', 'drawing',
      'create', 'craft', 'make', 'imagine', 'imagination', 'inspire', 'inspiration', 'idea', 'brainstorm',
      'novel', 'fiction', 'narrative', 'character', 'plot', 'dialogue', 'scene', 'verse', 'rhyme',
      'sketch', 'illustration', 'artwork', 'masterpiece', 'craft', 'handmade', 'diy',
      'for my', 'for her', 'for him', 'for someone', 'gift', 'present', 'special', 'romantic'
    ],
    language: ['language', 'translate', 'grammar', 'vocabulary', 'speak', 'write', 'read', 'pronunciation', 'fluent'],
    business: ['business', 'company', 'startup', 'entrepreneur', 'market', 'strategy', 'customer', 'sales', 'revenue']
  };

  private readonly unsafePatterns = [
    // Medical emergency patterns (tightened to avoid false positives like "urgent care")
    /(?:call 911|call your local emergency|emergency number)/i,
    /(?:go to (?:the )?(?:hospital|er|emergency room))/i,
    /(?:seek\s+(?:immediate|emergency)\s+medical\s+attention)/i,
    /(?:suicide|self-harm|kill myself|end my life)/i,
    /(?:overdose|poisoning|bleeding heavily)/i,
    
    // Financial advice patterns
    /(?:buy this stock|sell that|invest in|guaranteed return|sure thing)/i,
    /(?:personal financial advice|your money|your investment)/i,
    
  // Medical advice patterns (narrowly scoped to avoid blocking harmless guidance)
  /(?:take this medication|prescribe|dosage|treatment plan)/i,
  /(?:start|stop) (?:medication|taking|dosage)/i,
  /(?:self-medicate|use leftover antibiotics|share prescriptions)/i,
    
    // Inappropriate content
    /(?:illegal|unlawful|harmful|dangerous)/i
  ];

  private readonly disclaimerTemplates = {
    medical: '\n\n⚠️ **Medical Disclaimer**: This information is for educational purposes only and should not be considered medical advice. Please consult with a qualified healthcare professional for medical concerns.',
    finance: '\n\n⚠️ **Financial Disclaimer**: This information is for educational purposes only and should not be considered financial advice. Please consult with a qualified financial advisor for personal financial decisions.'
  };

  /**
   * Check if response is safe and appropriate for the agent domain
   */
  async checkResponse(
    agentKey: string,
    userQuery: string,
    response: string,
    retrievalResults: any[] = []
  ): Promise<OutputGateResult> {
    try {
      logger.info({ 
        agentKey, 
        responseLength: response.length,
        hasRetrievalResults: retrievalResults.length > 0 
      }, 'Running output gate checks');

      const agentConfig = getAgentConfig(agentKey);
      if (!agentConfig) {
        return {
          allowed: false,
          reason: 'Invalid agent configuration',
          suggestedAction: 'refuse'
        };
      }

      // Perform safety checks
      const safetyCheck = await this.performSafetyChecks(agentKey, userQuery, response, retrievalResults);
      
      // Check if response is out of domain
      // Lenient policy: don't block for domain mismatch — trust the user's agent selection.
      // We only log the event and continue so the user still gets a helpful answer.
      if (safetyCheck.isOutOfDomain) {
        logger.warn({ agentKey, userQuery }, 'OutputGate: domain mismatch detected, allowing due to lenient policy');
        // continue without blocking
      }

      // Check for unsafe content
      if (safetyCheck.containsUnsafeContent) {
        return {
          allowed: false,
          reason: 'Response contains potentially unsafe content',
          suggestedAction: 'refuse'
        };
      }

      // Check if disclaimer is needed
      if (safetyCheck.needsDisclaimer) {
        const modifiedResponse = this.addAppropriateDisclaimer(agentKey, response);
        return {
          allowed: true,
          reason: 'Response needs disclaimer',
          suggestedAction: 'add_disclaimer',
          modifiedResponse
        };
      }

      // Retrieval context: do NOT block; just proceed (LLM answer + disclaimer is better UX)
      if (retrievalResults.length === 0 && this.requiresContext(agentKey, userQuery)) {
        logger.info({ agentKey }, 'OutputGate: missing retrieval context but proceeding');
      }

      return {
        allowed: true,
        reason: 'Response passed all safety checks'
      };

    } catch (error) {
      logger.error({ error, agentKey }, 'Output gate check failed');
      return {
        allowed: false,
        reason: 'Safety check failed due to technical error',
        suggestedAction: 'refuse'
      };
    }
  }

  /**
   * Perform comprehensive safety checks
   */
  private async performSafetyChecks(
    agentKey: string,
    userQuery: string,
    response: string,
    retrievalResults: any[]
  ): Promise<SafetyCheck> {
    const details: string[] = [];
    let isOutOfDomain = false;
    let containsUnsafeContent = false;
    let needsDisclaimer = false;
    let confidence = 1.0;

    // Check for out-of-domain content
    const domainCheck = this.checkDomainRelevance(agentKey, userQuery, response);
    if (!domainCheck.isRelevant) {
      isOutOfDomain = true;
      details.push(`Content not relevant to ${agentKey} domain: ${domainCheck.reason}`);
      confidence -= 0.3;
    }

    // Check for unsafe patterns
    const unsafeCheck = this.checkUnsafePatterns(response);
    if (unsafeCheck.hasUnsafeContent) {
      containsUnsafeContent = true;
      details.push(`Unsafe content detected: ${unsafeCheck.patterns.join(', ')}`);
      confidence -= 0.5;
    }

    // Check if disclaimer is needed
    const disclaimerCheck = this.checkDisclaimerNeeded(agentKey, response);
    if (disclaimerCheck.needsDisclaimer) {
      needsDisclaimer = true;
      details.push(`Disclaimer needed: ${disclaimerCheck.reason}`);
    }

    // Check retrieval confidence
    if (retrievalResults.length === 0) {
      confidence -= 0.2;
      details.push('No retrieval context available');
    } else {
      const avgScore = retrievalResults.reduce((sum, r) => sum + (r.score || 0), 0) / retrievalResults.length;
      if (avgScore < 0.7) {
        confidence -= 0.1;
        details.push('Low retrieval confidence');
      }
    }

    return {
      isOutOfDomain,
      containsUnsafeContent,
      needsDisclaimer,
      confidence: Math.max(0, confidence),
      details
    };
  }

  /**
   * Check if content is relevant to the agent's domain
   */
  private readonly commonDomainPhrases = {
    general: [
      'can you', 'how to', 'what is', 'tell me about', 'explain',
      'help me', 'i need', 'give me', 'show me', 'define'
    ],
    education: [
      'how can i', 'help me', 'tell me', 'explain', 'understand',
      'better', 'improve', 'learn', 'study', 'topic', 'teach',
      'practice', 'remember', 'prepare', 'review', 'tips',
      'strategy', 'method', 'technique', 'comprehend'
    ],
    finance: [
      'money', 'cost', 'price', 'worth', 'value', 'spend',
      'save', 'invest', 'budget', 'payment', 'expense',
      'income', 'profit', 'loss', 'debt', 'credit',
      'mortgage', 'loan', 'tax', 'insurance'
    ],
    medical: [
      'health', 'feel', 'feeling', 'pain', 'symptoms', 'symptom', 'condition',
      'treatment', 'medicine', 'doctor', 'hospital', 'sick', 'illness',
      'disease', 'infection', 'injury', 'wellness', 'diet',
      'exercise', 'therapy', 'care', 'prevention', 'healing',
      'suffering', 'suffering from', 'diagnosed with', 'have been', 'experiencing',
      'i am', 'i have', 'i feel', 'what should i', 'what can i', 'how do i',
      'is it normal', 'is this', 'should i worry', 'worried about', 'concerned about',
      'tell me about', 'explain', 'what is', 'why do i', 'causes of',
      'remedies', 'cure', 'relief', 'help with', 'advice for', 'tips for'
    ],
    coding: [
      'write', 'create', 'build', 'develop', 'make', 'implement',
      'fix', 'debug', 'solve', 'code', 'program', 'script',
      'function', 'algorithm', 'help me', 'how to', 'can you',
      'show me', 'example', 'tutorial', 'guide', 'explain',
      'optimize', 'refactor', 'test', 'review', 'design'
    ],
    technology: [
      'how does', 'what is', 'explain', 'tell me about', 'understand',
      'work', 'use', 'setup', 'configure', 'install', 'deploy'
    ],
    legal: [
      'rights', 'law', 'legal', 'regulation', 'contract', 'agreement',
      'can i', 'am i allowed', 'is it legal', 'what happens if'
    ],
    creative: [
      'write', 'create', 'make', 'design', 'compose', 'draw',
      'paint', 'craft', 'imagine', 'generate', 'inspire'
    ],
    language: [
      'translate', 'how do you say', 'what does', 'mean', 'pronunciation',
      'grammar', 'speak', 'write', 'read', 'learn'
    ],
    business: [
      'strategy', 'plan', 'grow', 'market', 'startup', 'company',
      'business', 'revenue', 'customer', 'competitor', 'analysis'
    ]
  };

  private checkDomainRelevance(agentKey: string, userQuery: string, response: string): {
    isRelevant: boolean;
    reason?: string;
  } {
    // General agent can handle any domain
    if (agentKey === 'general') {
      return { isRelevant: true };
    }

    // IMPORTANT: Be very lenient - if user selected this agent, trust their choice
    // Only reject if it's clearly completely unrelated (very strict threshold)
    
    const queryLower = userQuery.toLowerCase();
    const domainKeywords = this.domainKeywords[agentKey as keyof typeof this.domainKeywords] || [];
    const domainPhrases = this.commonDomainPhrases[agentKey as keyof typeof this.commonDomainPhrases] || [];
    
    // First check query for domain relevance using keywords and phrases
    const hasQueryDomainKeywords = domainKeywords.some(keyword => queryLower.includes(keyword));
    const hasQueryDomainPhrases = domainPhrases.some(phrase => queryLower.includes(phrase));
    
    if (hasQueryDomainKeywords || hasQueryDomainPhrases) {
      return { isRelevant: true };
    }

    // If response exists, check it as well
    if (response && response.trim() !== '') {
      const responseLower = response.toLowerCase();
      const hasResponseDomainKeywords = domainKeywords.some(keyword => responseLower.includes(keyword));
      const hasResponseDomainPhrases = domainPhrases.some(phrase => responseLower.includes(phrase));
      
      if (hasResponseDomainKeywords || hasResponseDomainPhrases) {
        return { isRelevant: true };
      }
    }

    // Check for ANY generic question patterns - be very inclusive
    const genericQuestionPatterns = [
      /^(?:what|how|why|when|where|who|can|should|could|would|will|do|does|is|are)/i,
      /(?:tell me|explain|help|advice|guide|tips|show|give|create|make|write|build)/i,
      /(?:more information|learn about|understand|solve|fix|debug|develop|design)/i
    ];

    if (genericQuestionPatterns.some(pattern => pattern.test(queryLower))) {
      return { isRelevant: true };
    }

    // If query has ANY question mark or imperative form, allow it
    if (queryLower.includes('?') || queryLower.split(' ').length > 2) {
      return { isRelevant: true };
    }

    // Default to ALLOWING - user selected this agent intentionally
    // Only reject if there's strong evidence it's spam or completely unrelated
    const spamPatterns = [
      /^[a-z]$/i,  // Single letter
      /^(hi|hello|hey)$/i,  // Just greetings
      /^(ok|okay|yes|no)$/i  // Just acknowledgments
    ];

    if (spamPatterns.some(pattern => pattern.test(queryLower.trim()))) {
      return {
        isRelevant: false,
        reason: 'Query appears to be too brief or unclear'
      };
    }

    // Default: ALLOW the query (trust user's agent selection)
    return { isRelevant: true };
  }

  /**
   * Check for unsafe patterns in the response
   */
  private checkUnsafePatterns(response: string): {
    hasUnsafeContent: boolean;
    patterns: string[];
  } {
    const foundPatterns: string[] = [];
    
    for (const pattern of this.unsafePatterns) {
      if (pattern.test(response)) {
        foundPatterns.push(pattern.source);
      }
    }

    return {
      hasUnsafeContent: foundPatterns.length > 0,
      patterns: foundPatterns
    };
  }

  /**
   * Check if disclaimer is needed
   */
  private checkDisclaimerNeeded(agentKey: string, response: string): {
    needsDisclaimer: boolean;
    reason?: string;
  } {
    const responseLower = response.toLowerCase();

    // Medical disclaimer check
    if (agentKey === 'medical' || responseLower.includes('medical') || responseLower.includes('health')) {
      return {
        needsDisclaimer: true,
        reason: 'Medical content requires disclaimer'
      };
    }

    // Financial disclaimer check
    if (agentKey === 'finance' || responseLower.includes('investment') || responseLower.includes('financial')) {
      return {
        needsDisclaimer: true,
        reason: 'Financial content requires disclaimer'
      };
    }

    return { needsDisclaimer: false };
  }

  /**
   * Add appropriate disclaimer to response
   */
  private addAppropriateDisclaimer(agentKey: string, response: string): string {
    const agentConfig = getAgentConfig(agentKey);
    if (!agentConfig) return response;

    let modifiedResponse = response;

    // Add medical disclaimer
    if (agentConfig.guardrails.medicalDisclaimer) {
      modifiedResponse += this.disclaimerTemplates.medical;
    }

    // Add financial disclaimer
    if (agentConfig.guardrails.financialDisclaimer) {
      modifiedResponse += this.disclaimerTemplates.finance;
    }

    return modifiedResponse;
  }

  /**
   * Check if query requires context (retrieval results)
   */
  private requiresContext(agentKey: string, userQuery: string): boolean {
    // General agent doesn't require context
    if (agentKey === 'general') return false;

    // Check for specific question patterns that require context
    const contextRequiredPatterns = [
      /what is/i,
      /how does/i,
      /explain/i,
      /tell me about/i,
      /describe/i
    ];

    return contextRequiredPatterns.some(pattern => pattern.test(userQuery));
  }

  /**
   * Generate refusal message for out-of-domain queries
   */
  generateRefusalMessage(agentKey: string, userQuery: string): string {
    const agentConfig = getAgentConfig(agentKey);
    const agentName = agentConfig?.displayName || agentKey;

    const refusalTemplates = {
      general: `I'm AXORA, your supreme companion. I can help with almost anything! Could you please provide a bit more detail or context so I can assist you better?`,
      education: `I'm the ${agentName}, your master educator. Could you rephrase your question to be about learning, studying, or academic topics? I'm here to help you excel!`,
      finance: `I'm the ${agentName}, your financial literacy expert. I can help explain financial concepts and education. Could you rephrase your question to be about financial topics?`,
      medical: `I'm the ${agentName}. I provide comprehensive health education. For urgent medical concerns, please consult a healthcare professional immediately. Otherwise, feel free to ask health-related questions!`,
      coding: `I'm the ${agentName}, your supreme coding companion. I can help with any programming language, debugging, architecture, or complete project creation. Just ask me any coding-related question!`,
      technology: `I'm the ${agentName}, your elite technical mentor. I can help with technology, software, systems, and digital solutions. What would you like to know?`,
      legal: `I'm the ${agentName}. I provide legal information and education. Could you rephrase your question to be about legal concepts or rights?`,
      creative: `I'm the ${agentName}, your creative collaborator. I can help with writing, art, music, stories, and all creative endeavors. What would you like to create?`,
      language: `I'm the ${agentName}, your polyglot expert. I can help with language learning, translation, grammar, and cultural insights. What language topic can I assist with?`,
      business: `I'm the ${agentName}, your strategic business advisor. I can help with business strategy, startups, marketing, and growth. What business challenge can I help with?`
    };

    return refusalTemplates[agentKey as keyof typeof refusalTemplates] || 
           `I'm the ${agentName} and I'm here to help! Could you provide more details about what you'd like assistance with?`;
  }
}

export const outputGateService = new OutputGateService();
