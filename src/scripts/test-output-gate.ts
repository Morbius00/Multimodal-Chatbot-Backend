import { outputGateService } from '../services/output-gate';

async function run() {
  const agentKey = 'medical';
  const userQuery = 'tell me I am suffering from gasterogy problem whhat i doo';
  const llmResponse = 'You might be describing a gastrointestinal issue. Common causes include gastritis, acid reflux, or infection. Start with gentle hydration, small meals, and avoid spicy/fatty foods. Seek urgent care if you have severe pain, persistent vomiting, blood in stool, or high fever.';
  const result = await outputGateService.checkResponse(agentKey, userQuery, llmResponse, []);
  console.log('Allowed:', result.allowed, 'Reason:', result.reason, 'Suggested:', result.suggestedAction);
  if (result.modifiedResponse) {
    console.log('\nModified Response Preview:\n', result.modifiedResponse.slice(0, 160), '...');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
