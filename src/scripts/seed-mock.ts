import { logger } from '../utils/logger';
import { getAllAgentConfigs } from '../agents/config';

async function seedDatabaseMock() {
  try {
    logger.info('Starting database seed (mock mode)...');
    
    // Get all agent configurations
    const agentConfigs = getAllAgentConfigs();
    
    logger.info({ 
      count: agentConfigs.length,
      agents: agentConfigs.map(a => ({ key: a.key, displayName: a.displayName }))
    }, 'Agent configurations loaded successfully');
    
    // Simulate database operations
    logger.info('Simulating agent creation...');
    for (const config of agentConfigs) {
      logger.info({ 
        key: config.key, 
        displayName: config.displayName,
        model: config.model.name,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      }, 'Agent configuration ready');
    }
    
    logger.info({ totalAgents: agentConfigs.length }, 'Mock database seeding completed');
    
  } catch (error) {
    logger.error({ error }, 'Mock database seeding failed');
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabaseMock()
    .then(() => {
      logger.info('Mock seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Mock seed failed');
      process.exit(1);
    });
}

export { seedDatabaseMock };
