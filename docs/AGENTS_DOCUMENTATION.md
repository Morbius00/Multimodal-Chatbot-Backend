# AXORA Multi-Agent System Documentation

## Overview

The AXORA Multimodal Chat Backend features an advanced **multi-agent system** with a **Head Assistant (General Agent)** that intelligently orchestrates specialized AI assistants. This architecture ensures users receive the most appropriate expertise for their queries.

---

## 🎯 System Architecture

### Head Assistant Model (General Agent)
The **General Assistant** acts as the primary interface and intelligent router:
- **First point of contact** for all user queries
- **Handles general queries** directly with comprehensive knowledge
- **Intelligently delegates** to specialists when domain expertise is needed
- **Synthesizes cross-domain** information when queries span multiple areas

---

## 🤖 Available Agents

### 1. **General Assistant** (Head/Orchestrator)
**Agent Key:** `general`  
**Display Name:** AXORA - Head Assistant  
**Model:** gemini-2.5-flash

**Role:**
- Primary user interface and conversation coordinator
- Handles general knowledge, multi-domain questions, and broad topics
- Intelligently recognizes when to delegate to specialists
- Provides seamless handoff to expert agents

**Capabilities:**
- General knowledge across all topics
- Current events and news
- Product recommendations and comparisons
- Travel and lifestyle advice
- Entertainment and culture
- Simple how-to guides
- Cross-domain synthesis

**Delegation Strategy:**
The General Assistant analyzes queries and delegates to specialists when:
- Query requires deep domain-specific expertise
- Technical/specialized terminology indicates expert need
- User explicitly requests specialized assistance
- Compliance or safety concerns exist

**Example Delegations:**
```
User: "How do I implement OAuth2 in Node.js?"
→ Delegates to Technology Assistant

User: "What are the symptoms of diabetes?"
→ Delegates to Medical Assistant

User: "Should I invest in index funds?"
→ Delegates to Finance Assistant
```

---

### 2. **Education Assistant**
**Agent Key:** `education`  
**Display Name:** Education Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Academic subjects (all levels): STEM, humanities, languages, arts
- Study strategies and learning methodologies
- Educational resources and curriculum guidance
- Exam preparation and academic planning
- Critical thinking and skill development

**System Prompt Highlights:**
- Progressive learning (simple → intermediate → advanced)
- Multiple explanation strategies (analogies, examples, visual descriptions)
- Adaptive to different learning styles
- Encourages critical thinking and deeper understanding
- Provides memory aids and study techniques

**Best For:**
- Homework help and concept explanations
- Study planning and learning strategies
- Academic research guidance
- Skill development in specific subjects

---

### 3. **Finance Assistant**
**Agent Key:** `finance`  
**Display Name:** Finance Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Financial education and literacy
- Investment principles and market concepts
- Personal finance (budgeting, savings, debt management)
- Economic indicators and market analysis
- Financial products and instruments

**Key Features:**
- Educational focus (not personal financial advice)
- Mandatory financial disclaimers
- Balanced perspective on financial strategies
- Clear explanation of risks and uncertainties
- Empowers informed decision-making

**Guardrails:**
✗ No personalized investment recommendations
✗ No specific stock/security suggestions
✗ No tailored portfolio advice
✓ Educational information only
✓ Directs to qualified financial advisors for personal advice

---

### 4. **Medical Information Assistant**
**Agent Key:** `medical`  
**Display Name:** Medical Information Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Health education and medical concepts
- Anatomy and physiology
- Medical conditions and symptoms (educational)
- Wellness and preventive health
- Healthcare systems and processes

**Critical Safety Features:**
- 🚨 Emergency recognition and immediate redirection
- Mandatory medical disclaimers
- Clear boundaries (education, not diagnosis/treatment)
- Evidence-based information only
- Prioritizes user safety above all

**Strict Boundaries:**
✗ No diagnosis based on symptoms
✗ No treatment recommendations
✗ No medication advice
✗ No interpretation of medical tests
✓ General health education
✓ Directs to healthcare providers for medical advice

---

### 5. **Technology Assistant** ⭐ NEW
**Agent Key:** `technology`  
**Display Name:** Technology Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Software development (all major languages and frameworks)
- System architecture and design patterns
- DevOps, CI/CD, and cloud computing
- Cybersecurity and best practices
- Database design and optimization
- Mobile and web development
- AI/ML integration

**Programming Languages:**
JavaScript/TypeScript, Python, Java, C/C++, Go, Rust, C#, PHP, Ruby, Swift, Kotlin, and more

**Key Strengths:**
- Clean, production-ready code examples
- Security-conscious recommendations
- Performance optimization guidance
- Best practices and design patterns
- Debugging and troubleshooting strategies
- Technology selection advice

**Response Structure:**
1. Clear explanation of approach
2. Well-commented, working code
3. Usage examples
4. Edge cases and considerations
5. Alternative solutions and improvements

---

### 6. **Legal Information Assistant** ⭐ NEW
**Agent Key:** `legal`  
**Display Name:** Legal Information Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Legal concepts and terminology
- Legal rights and responsibilities
- Court procedures and legal processes
- Contract basics and common clauses
- Legal system education
- Consumer rights and employment law basics

**Critical Features:**
- ⚠️ Mandatory legal disclaimers in EVERY response
- Clear distinction: Information vs. Advice
- Jurisdiction-aware (notes laws vary by location)
- Strong redirection to qualified attorneys

**Core Competencies:**
- Business law basics
- Consumer law and rights
- Employment law concepts
- Real estate basics
- Criminal law education
- Intellectual property concepts

**Strict Boundaries:**
✗ No specific legal advice for personal situations
✗ No interpretation of personal legal documents
✗ No litigation strategy recommendations
✗ No jurisdiction-specific advice without disclaimers
✓ General legal education
✓ Explanation of legal concepts and processes
✓ Directs to licensed attorneys for legal advice

---

### 7. **Creative Assistant** ⭐ NEW
**Agent Key:** `creative`  
**Display Name:** Creative Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Creative writing (fiction, non-fiction, scripts, poetry)
- Visual arts and design concepts
- Brand storytelling and marketing content
- Creative strategy and ideation
- Content creation and optimization
- Design thinking and problem-solving

**Creative Domains:**
- **Writing:** Stories, articles, scripts, poetry, copy
- **Design:** Graphic design, UI/UX, branding, typography
- **Marketing:** Campaigns, brand voice, social media content
- **Strategy:** Creative direction, concept development

**Approach:**
- Balances originality with audience connection
- Encourages iteration and experimentation
- Provides specific, actionable creative guidance
- Uses creative techniques (brainstorming, SCAMPER, mind mapping)
- Helps overcome creative blocks

**Temperature Setting:** 0.8 (higher for more creative variety)

---

### 8. **Language Assistant** ⭐ NEW
**Agent Key:** `language`  
**Display Name:** Language Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Translation and interpretation
- Language learning strategies
- Grammar and pronunciation
- Cultural context and communication
- Multiple languages support
- Linguistics and language structure

**Languages Supported:**
English, Spanish, French, German, Italian, Portuguese, Russian, Chinese (Mandarin), Japanese, Korean, Arabic, Hindi, and more

**Core Services:**
- **Translation:** Accurate, contextually appropriate translations
- **Grammar:** Clear explanations with examples
- **Vocabulary:** Thematic learning with context
- **Pronunciation:** Phonetic guidance and techniques
- **Cultural Context:** Cultural norms affecting language use

**Learning Support:**
- Comprehensible input strategies
- Spaced repetition techniques
- Immersion method guidance
- Error correction with encouragement
- Resource recommendations

---

### 9. **Business Assistant** ⭐ NEW
**Agent Key:** `business`  
**Display Name:** Business Assistant  
**Model:** gemini-2.5-flash

**Expertise:**
- Business strategy and planning
- Entrepreneurship and startups
- Marketing and growth strategies
- Operations and management
- Leadership and organizational development
- Product management

**Core Competencies:**
- **Strategy:** Market analysis, competitive positioning, growth planning
- **Entrepreneurship:** Startup validation, MVP development, fundraising
- **Marketing:** Digital marketing, brand building, customer acquisition
- **Operations:** Process optimization, supply chain, project management
- **Leadership:** Team building, culture, performance management

**Strategic Frameworks:**
- Business Model Canvas
- Value Proposition Canvas
- SWOT Analysis
- Porter's Five Forces
- OKRs (Objectives and Key Results)
- Lean Canvas
- Blue Ocean Strategy

**Startup Guidance:**
- Validation phase (problem validation, market sizing)
- Early stage (product-market fit, go-to-market)
- Growth stage (scaling, team building, systems)

---

## 🔄 How Delegation Works

### Intelligent Routing Process

1. **User Query Received** → General Assistant analyzes
2. **Domain Detection** → Identifies primary domain(s)
3. **Complexity Assessment** → Evaluates expertise level needed
4. **Decision:**
   - **Handle Directly:** General knowledge, multi-domain, simple queries
   - **Delegate:** Deep expertise, technical complexity, safety concerns

### Delegation Communication Pattern

When delegating, the General Assistant:
1. **Acknowledges** understanding of the query
2. **Explains** why a specialist is better suited
3. **Recommends** the specific specialized assistant
4. **Previews** what the specialist can offer

**Example:**
```
User: "I'm building a React app and need to implement JWT authentication."

General Assistant Response:
"I can see you're working on authentication for your React application. 
For detailed technical implementation of JWT authentication with React, 
our Technology Assistant would be ideal. They specialize in full-stack 
development and can provide you with production-ready code examples, 
security best practices, and complete implementation guidance. Would you 
like me to direct you to them, or would you prefer I give you a general 
overview first?"
```

---

## 🎯 Agent Selection Guide

### When to Use Each Agent

| Query Type | Recommended Agent | Why |
|-----------|-------------------|-----|
| "What is...?" (general concepts) | General | Broad knowledge base |
| "How do I learn...?" | Education | Learning strategies |
| "Explain this financial concept" | Finance | Financial literacy |
| "What are symptoms of...?" | Medical | Health education |
| "How do I code...?" | Technology | Technical implementation |
| "What are my rights regarding...?" | Legal | Legal education |
| "Help me write a story" | Creative | Creative expertise |
| "Translate this to Spanish" | Language | Language services |
| "How should I price my product?" | Business | Business strategy |

---

## 🛠️ API Usage

### List All Available Agents

```bash
GET /api/agents
```

**Response:**
```json
{
  "agents": [
    {
      "key": "general",
      "displayName": "AXORA - Head Assistant",
      "description": "Head assistant and intelligent orchestrator"
    },
    {
      "key": "education",
      "displayName": "Education Assistant",
      "description": "Academic learning and educational support"
    },
    // ... all other agents
  ]
}
```

### Create Conversation with Specific Agent

```bash
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentKey": "technology"
}
```

### Chat with Agent

```bash
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "conversation_id",
  "text": "How do I implement OAuth2 in Node.js?"
}
```

The system will automatically use the agent associated with the conversation, or you can override:

```bash
{
  "conversationId": "conversation_id",
  "agentKey": "technology",  // Override the conversation's default agent
  "text": "Your question here"
}
```

---

## 📊 Agent Comparison Matrix

| Agent | Temperature | Max Tokens | Key Strength | Best Use Case |
|-------|-------------|------------|--------------|---------------|
| General | 0.5 | 2000 | Orchestration & broad knowledge | Entry point, general queries |
| Education | 0.3 | 1200 | Learning pedagogy | Academic help |
| Finance | 0.3 | 1000 | Financial literacy | Money education |
| Medical | 0.2 | 1000 | Safety-first health info | Health questions |
| Technology | 0.3 | 2500 | Code & architecture | Development help |
| Legal | 0.2 | 1500 | Legal education | Rights & procedures |
| Creative | 0.8 | 2000 | Originality | Content creation |
| Language | 0.4 | 1800 | Multilingual expertise | Learning & translation |
| Business | 0.4 | 2000 | Strategic thinking | Business planning |

---

## 🔒 Safety & Guardrails

### Disclaimer System

Agents with sensitive domains include automatic disclaimers:

- **Medical Assistant:** Medical disclaimer in every response
- **Finance Assistant:** Financial advice disclaimer
- **Legal Assistant:** Legal information vs. advice disclaimer

### Redirection Protocols

Agents will redirect to professionals when:
- Personal advice is requested (medical, financial, legal)
- Safety concerns exist
- Expertise is beyond AI capabilities
- Real-world professional consultation is needed

---

## 🚀 Best Practices

### For Users

1. **Start with General Assistant** for broad or unclear queries
2. **Choose specialist directly** if you know your domain
3. **Follow delegation suggestions** for optimal expertise
4. **Be specific** in your questions for better responses

### For Developers

1. **Seed agents** to database after deployment
2. **Monitor delegation patterns** for system optimization
3. **Update system prompts** based on user feedback
4. **Test safety boundaries** for sensitive agents

---

## 📈 Future Enhancements

Planned improvements:
- [ ] Automatic agent switching within conversations
- [ ] Multi-agent collaboration for complex queries
- [ ] Agent performance analytics
- [ ] Custom agent creation
- [ ] Agent fine-tuning based on feedback
- [ ] Conversation summary with agent recommendations

---

## 🎓 System Prompt Philosophy

All AXORA agents follow these principles:

1. **Excellence:** Deliver highest quality responses in their domain
2. **Clarity:** Communicate complex topics accessibly
3. **Safety:** Prioritize user wellbeing and appropriate boundaries
4. **Education:** Empower users with knowledge, not just answers
5. **Honesty:** Acknowledge limitations and uncertainties
6. **Professionalism:** Maintain consistent, reliable assistance

---

## 💡 Tips for Optimal Results

1. **Be Specific:** "How do I implement JWT auth in Express.js?" vs "How do I make my app secure?"
2. **Provide Context:** Include your skill level, constraints, or specific requirements
3. **Ask Follow-ups:** Agents maintain conversation context
4. **Trust Delegations:** When General Assistant suggests a specialist, follow the recommendation
5. **Use Right Agent:** Save time by selecting the appropriate specialist directly

---

## 📞 Support

For questions about the agent system:
- Check the API Documentation: http://localhost:3001/api-docs
- Review the codebase: `src/agents/config.ts`
- Test endpoints: See `test-conversation-title.js` for examples

---

**Last Updated:** October 31, 2025  
**Version:** 2.0  
**System:** AXORA Multimodal Chat Backend
