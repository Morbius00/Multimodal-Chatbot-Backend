import { z } from 'zod';
import {
  generalPrompt,
  educationPrompt,
  financePrompt,
  medicalPrompt,
  technologyPrompt,
  legalPrompt,
  creativePrompt,
  languagePrompt,
  businessPrompt,
  codingPrompt,
} from '../prompts';

export const AgentConfigSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  systemPrompt: z.string(),
  guardrails: z.object({
    medicalDisclaimer: z.boolean().optional(),
    financialDisclaimer: z.boolean().optional(),
    legalDisclaimer: z.boolean().optional(),
  }),
  enabledTools: z.array(z.string()),
  retrieval: z.object({
    collections: z.array(z.string()),
    topK: z.number(),
  }),
  model: z.object({
    provider: z.literal('google'),
    name: z.string(),
  }),
  temperature: z.number(),
  maxTokens: z.number(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const Agents = {
  general: {
    key: 'general',
    displayName: 'AXORA Companion',
    systemPrompt: generalPrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'web_search'],
    retrieval: { 
      collections: ['global_faq', 'general_knowledge'], 
      topK: 5 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.5,
    maxTokens: 2000,
  },
  
  education: {
    key: 'education',
    displayName: 'Education Companion',
    systemPrompt: educationPrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'syllabus_lookup'],
    retrieval: { 
      collections: ['edu_faq', 'syllabus', 'policies'], 
      topK: 6 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.3,
    maxTokens: 1200,
  },
  
  finance: {
    key: 'finance',
    displayName: 'Finance Companion',
    systemPrompt: financePrompt,
    guardrails: { 
      financialDisclaimer: true 
    },
    enabledTools: ['search_docs', 'get_quotes', 'fx_convert'],
    retrieval: { 
      collections: ['finance_docs', 'glossary'], 
      topK: 6 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.3,
    maxTokens: 1000,
  },
  
  medical: {
    key: 'medical',
    displayName: 'Medical Information Companion',
    systemPrompt: medicalPrompt,
    guardrails: { 
      medicalDisclaimer: true 
    },
    enabledTools: ['search_docs', 'symptom_info'],
    retrieval: { 
      collections: ['medical_faq', 'consumer_guidelines'], 
      topK: 6 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.2,
    maxTokens: 1000,
  },

  technology: {
    key: 'technology',
    displayName: 'Technology Companion',
    systemPrompt: technologyPrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'code_search', 'github_search'],
    retrieval: { 
      collections: ['tech_docs', 'code_examples', 'api_docs'], 
      topK: 7 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.3,
    maxTokens: 2500,
  },

  legal: {
    key: 'legal',
    displayName: 'Legal Information Companion',
    systemPrompt: legalPrompt,
    guardrails: { 
      legalDisclaimer: true 
    },
    enabledTools: ['search_docs', 'legal_lookup'],
    retrieval: { 
      collections: ['legal_concepts', 'legal_faq'], 
      topK: 6 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.2,
    maxTokens: 1500,
  },

  creative: {
    key: 'creative',
    displayName: 'Creative Companion',
    systemPrompt: creativePrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'image_inspiration', 'style_guide'],
    retrieval: { 
      collections: ['creative_resources', 'style_guides', 'writing_tips'], 
      topK: 5 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.8,
    maxTokens: 2000,
  },

  language: {
    key: 'language',
    displayName: 'Language Companion',
    systemPrompt: languagePrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'translate', 'dictionary_lookup'],
    retrieval: { 
      collections: ['language_resources', 'grammar_guides', 'cultural_notes'], 
      topK: 6 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.4,
    maxTokens: 1800,
  },

  business: {
    key: 'business',
    displayName: 'Business Companion',
    systemPrompt: businessPrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'market_research', 'competitor_analysis'],
    retrieval: { 
      collections: ['business_resources', 'case_studies', 'frameworks'], 
      topK: 6 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.4,
    maxTokens: 2000,
  },

  coding: {
    key: 'coding',
    displayName: 'Code Master',
    systemPrompt: codingPrompt,
    guardrails: {},
    enabledTools: ['search_docs', 'code_search', 'github_search', 'stack_overflow'],
    retrieval: { 
      collections: ['code_examples', 'api_docs', 'tech_docs', 'stackoverflow', 'github'], 
      topK: 8 
    },
    model: { 
      provider: 'google' as const, 
      name: 'gemini-2.5-flash' 
    },
    temperature: 0.2,
    maxTokens: 4000,
  },
} as const satisfies Record<string, AgentConfig>;

export const getAgentConfig = (key: string): AgentConfig | null => {
  return Agents[key as keyof typeof Agents] || null;
};

export const getAllAgentConfigs = (): AgentConfig[] => {
  return Object.values(Agents);
};
