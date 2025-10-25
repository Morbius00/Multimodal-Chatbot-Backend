import { connectMongoDB, disconnectMongoDB } from '../db/mongo';
import { Agent } from '../db/models';
import { getAllAgentConfigs } from '../agents/config';
import { logger } from '../utils/logger';

async function seedDatabase() {
  try {
    logger.info('Starting database seed...');
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Clear existing agents
    await Agent.deleteMany({});
    logger.info('Cleared existing agents');
    
    // Get all agent configurations
    const agentConfigs = getAllAgentConfigs();
    
    // Create agents in database
    const agents = await Agent.insertMany(agentConfigs);
    
    logger.info({ 
      count: agents.length,
      agents: agents.map(a => ({ key: a.key, displayName: a.displayName }))
    }, 'Seeded agents successfully');
    
    // Verify seeding
    const totalAgents = await Agent.countDocuments();
    logger.info({ totalAgents }, 'Database seeding completed');
    
  } catch (error) {
    logger.error({ error }, 'Database seeding failed');
    throw error;
  } finally {
    await disconnectMongoDB();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, 'Seed failed');
      process.exit(1);
    });
}

export { seedDatabase };
