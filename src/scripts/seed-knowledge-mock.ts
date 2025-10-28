import { logger } from '../utils/logger';
import { documentChunker } from '../utils/chunk';

// Sample knowledge base data
type KnowledgeDoc = { docId: string; title: string; content: string; metadata: any };
const sampleKnowledge: Record<string, KnowledgeDoc[]> = {
  global_faq: [
    {
      docId: 'faq-001',
      title: 'General FAQ',
      content: `This is a general knowledge base with frequently asked questions about various topics. It provides basic information and guidance for common queries.`,
      metadata: { category: 'general', priority: 'high' }
    }
  ],
  
  edu_faq: [
    {
      docId: 'edu-001',
      title: 'Study Tips and Techniques',
      content: `Effective study techniques include active recall, spaced repetition, and the Feynman technique. Active recall involves testing yourself on material rather than just re-reading. Spaced repetition helps you remember information by reviewing it at increasing intervals. The Feynman technique involves explaining concepts in simple terms to identify gaps in understanding.`,
      metadata: { category: 'study_techniques', level: 'beginner' }
    },
    {
      docId: 'edu-002',
      title: 'Academic Writing Guidelines',
      content: `Academic writing should be clear, concise, and well-structured. Use proper citations and references. Follow the specific formatting guidelines for your institution. Always proofread your work and ensure proper grammar and spelling.`,
      metadata: { category: 'writing', level: 'intermediate' }
    }
  ],
  
  finance_docs: [
    {
      docId: 'finance-001',
      title: 'Basic Financial Concepts',
      content: `Understanding basic financial concepts is essential for making informed decisions. Key concepts include compound interest, inflation, diversification, and risk management. Compound interest is the interest calculated on the initial principal and accumulated interest. Inflation reduces the purchasing power of money over time.`,
      metadata: { category: 'basics', complexity: 'beginner' }
    },
    {
      docId: 'finance-002',
      title: 'Investment Fundamentals',
      content: `Investment fundamentals include understanding different asset classes like stocks, bonds, and mutual funds. Diversification helps reduce risk by spreading investments across different assets. Always consider your risk tolerance and investment timeline before making investment decisions.`,
      metadata: { category: 'investments', complexity: 'intermediate' }
    }
  ],
  
  medical_faq: [
    {
      docId: 'medical-001',
      title: 'General Health Information',
      content: `Maintaining good health involves regular exercise, a balanced diet, adequate sleep, and stress management. Regular check-ups with healthcare providers are important for preventive care. Always consult with qualified healthcare professionals for medical concerns.`,
      metadata: { category: 'general_health', audience: 'general' }
    },
    {
      docId: 'medical-002',
      title: 'Common Symptoms and When to Seek Help',
      content: `Common symptoms like fever, cough, and headache are usually not serious. However, seek immediate medical attention for severe symptoms like chest pain, difficulty breathing, or signs of stroke. When in doubt, consult with a healthcare professional.`,
      metadata: { category: 'symptoms', audience: 'general' }
    }
  ]
};

async function seedKnowledgeBaseMock() {
  try {
    logger.info('Starting knowledge base seeding (mock mode)...');
    
    let totalChunks = 0;
    let totalDocuments = 0;
    
    // Process each collection
    for (const [collection, documents] of Object.entries(sampleKnowledge)) {
      logger.info({ collection, documentCount: documents.length }, 'Processing collection');
      
      // Process each document
      for (const doc of documents) {
        // Chunk the document
        const documentChunks = documentChunker.chunkDocument(doc.content, {
          maxChunkSize: 800,
          overlap: 100,
          minChunkSize: 50,
          preserveSentences: true,
          preserveParagraphs: true
        });
        
        totalChunks += documentChunks.length;
        totalDocuments++;
        
        logger.info({ 
          docId: doc.docId,
          title: doc.title,
          chunksCreated: documentChunks.length,
          collection
        }, 'Document processed (mock)');
      }
    }
    
    logger.info({ 
      totalCollections: Object.keys(sampleKnowledge).length,
      totalDocuments,
      totalChunks 
    }, 'Knowledge base seeding completed (mock mode)');
    
    // Show sample chunks
    logger.info('Sample chunks created:');
    for (const [collection, documents] of Object.entries(sampleKnowledge)) {
      const doc = documents[0] || { content: '', docId: 'unknown', title: 'unknown' } as KnowledgeDoc;
      const chunks = documentChunker.chunkDocument(doc.content, {
        maxChunkSize: 800,
        overlap: 100,
        minChunkSize: 50
      });
      
      logger.info({
        collection,
        docId: doc.docId,
        title: doc.title,
        sampleChunk: chunks[0]?.text.substring(0, 100) + '...',
        totalChunks: chunks.length
      }, 'Sample chunk preview');
    }
    
  } catch (error) {
    logger.error({ error }, 'Knowledge base seeding failed');
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedKnowledgeBaseMock()
    .then(() => {
      logger.info('Knowledge base mock seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Knowledge base mock seed failed');
      process.exit(1);
    });
}

export { seedKnowledgeBaseMock };
