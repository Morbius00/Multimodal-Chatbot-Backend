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
    medical: ['medical', 'health', 'healthcare', 'medicine', 'symptom', 'diagnosis', 'treatment', 'doctor', 'patient']
  };

  private readonly unsafePatterns = [
    // Medical emergency patterns
    /(?:emergency|urgent|call 911|go to hospital|immediately|right now)/i,
    /(?:suicide|self-harm|kill myself|end my life)/i,
    /(?:overdose|poisoning|bleeding heavily)/i,
    
    // Financial advice patterns
    /(?:buy this stock|sell that|invest in|guaranteed return|sure thing)/i,
    /(?:personal financial advice|your money|your investment)/i,
    
    // Medical advice patterns
    /(?:take this medication|prescribe|dosage|treatment plan)/i,
    /(?:you should|you need to|I recommend you)/i,
    
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
      if (safetyCheck.isOutOfDomain) {
        return {
          allowed: false,
          reason: `Response is outside the ${agentKey} domain scope`,
          suggestedAction: 'refuse'
        };
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

      // Check retrieval confidence
      if (retrievalResults.length === 0 && this.requiresContext(agentKey, userQuery)) {
        return {
          allowed: false,
          reason: `I don't have enough ${agentKey} context to provide a reliable answer`,
          suggestedAction: 'refuse'
        };
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
      'health', 'feel', 'pain', 'symptoms', 'condition',
      'treatment', 'medicine', 'doctor', 'hospital', 'sick',
      'disease', 'infection', 'injury', 'wellness', 'diet',
      'exercise', 'therapy', 'care', 'prevention', 'healing'
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

    // Domain-specific contextual analysis
    switch (agentKey) {
      case 'education':
        // Check for learning intent phrases
        const learningIntentPhrases = ['how can i', 'help me', 'want to', 'need to', 'trying to'];
        if (learningIntentPhrases.some(phrase => queryLower.includes(phrase))) {
          return { isRelevant: true };
        }
        break;

      case 'finance':
        // Check for financial intent phrases
        const financialIntentPhrases = ['how much', 'afford', 'cost of', 'price of', 'pay for'];
        if (financialIntentPhrases.some(phrase => queryLower.includes(phrase))) {
          return { isRelevant: true };
        }
        break;

      case 'medical':
        // Check for health-related intent phrases
        const healthIntentPhrases = ['not feeling', 'experiencing', 'symptoms of', 'worried about', 'concerned about'];
        if (healthIntentPhrases.some(phrase => queryLower.includes(phrase))) {
          return { isRelevant: true };
        }
        break;
    }

    // Check for generic question patterns that might be domain-relevant
    const genericQuestionPatterns = [
      /^(?:what|how|why|when|where|who|can|should|could|would|will)/i,
      /(?:tell me|explain|help|advice|guide|tips)/i,
      /(?:more information|learn about|understand)/i
    ];

    if (genericQuestionPatterns.some(pattern => pattern.test(queryLower))) {
      return { isRelevant: true };
    }

    return {
      isRelevant: false,
      reason: 'Query does not appear to be relevant to the domain'
    };
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
      general: `I'm a general assistant, but your question seems to require specialized knowledge. Consider asking a more specific question or switching to a specialized agent.`,
      education: `I'm the ${agentName} and I can only help with education-related topics. Your question seems to be about something else. Please rephrase your question to be about education, learning, or academic topics.`,
      finance: `I'm the ${agentName} and I can only provide educational information about financial topics. I cannot give personal financial advice. Please rephrase your question to be about general financial concepts or education.`,
      medical: `I'm the ${agentName} and I can only provide educational health information. I cannot provide medical advice or diagnosis. If you have urgent medical concerns, please consult a healthcare professional immediately.`
    };

    return refusalTemplates[agentKey as keyof typeof refusalTemplates] || 
           `I'm the ${agentName} and I can only help with topics related to my domain. Please rephrase your question to be relevant to ${agentKey} topics.`;
  }
}

export const outputGateService = new OutputGateService();
