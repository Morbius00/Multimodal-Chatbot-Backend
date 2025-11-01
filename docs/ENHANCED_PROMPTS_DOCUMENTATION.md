# Enhanced System Prompts Architecture

## Overview
This document describes the new masterclass-level system prompt architecture that significantly improves the quality, depth, and emotional intelligence of agent responses.

## Problem Solved
Previously, system prompts were:
- Embedded inline in the config file (lengthy and hard to maintain)
- Not detailed enough, leading to surface-level responses
- Lacking emotional intelligence and user connection
- Not addressing the user's concern about repetitive responses (especially jokes)
- Medical companion was too cautious without providing detailed educational information

## Solution Architecture

### Structure
```
src/
├── prompts/
│   ├── index.ts                 # Central export file
│   ├── general.prompt.ts        # AXORA Companion (HEAD)
│   ├── education.prompt.ts      # Education Companion
│   ├── finance.prompt.ts        # Finance Companion  
│   ├── medical.prompt.ts        # Medical Companion
│   ├── technology.prompt.ts     # Technology Companion
│   ├── legal.prompt.ts          # Legal Companion
│   ├── creative.prompt.ts       # Creative Companion
│   ├── language.prompt.ts       # Language Companion
│   └── business.prompt.ts       # Business Companion
└── agents/
    └── config.ts                # Clean config importing prompts
```

### Benefits

#### 1. **Masterclass-Level Quality**
Each prompt is crafted at expert level with:
- Comprehensive frameworks for response excellence
- Deep domain expertise
- Multiple explanation strategies
- Contextual awareness and adaptability

#### 2. **Emotional Intelligence**
All agents now:
- Recognize and respond to user emotions
- Adapt communication style to user's state
- Build genuine connections
- Provide empathy and encouragement
- Understand the human behind the question

#### 3. **Detailed Responses**
Especially for Medical Companion:
- Provides comprehensive health education
- Explains conditions, symptoms, treatments in detail
- Includes detailed disclaimers that are helpful, not dismissive
- Explains WHY certain information needs professional consultation
- Gives thorough context while maintaining safety boundaries

#### 4. **Variety and Freshness**
To combat repetition (especially jokes):
- Explicit instructions to avoid repetitive patterns
- Guidance on varying response styles
- Creative diversity in explanations and examples
- Dynamic personality maintenance
- Context-aware humor (never repeating same jokes)

#### 5. **Maintainability**
- Each prompt is in its own file (easy to find and edit)
- Clean separation of concerns
- Version control friendly
- No code clutter in config file
- Easy to update individual agents

## Key Features by Agent

### General Companion (AXORA)
- **Warm, emotionally intelligent companionship**
- Adapts to user's emotional state
- Varied conversational patterns
- Comprehensive general knowledge
- Smart delegation to specialists

### Medical Companion
- **Exceptionally detailed health education**
- Comprehensive condition/symptom explanations
- Detailed, helpful disclaimers (not just "see a doctor")
- Emergency recognition and response
- Multiple explanation layers
- Emphasis on empowering through knowledge

### Education Companion
- **Masterful pedagogical approach**
- Layered understanding (simple → complex)
- Multiple explanation strategies
- Motivational support
- Study skills and learning strategies

### Finance Companion
- **Thorough financial literacy education**
- Comprehensive concept coverage
- Detailed disclaimers that educate
- Risk-aware guidance
- Decision-making frameworks

### Technology Companion
- **Elite technical mentorship**
- Code quality standards
- Architectural thinking
- Debug like a pro frameworks
- Adapt to skill level

### Legal Companion
- **Accessible legal education**
- Plain language translations
- Comprehensive coverage with clear boundaries
- Detailed helpful disclaimers
- Empowering legal literacy

### Creative Companion
- **World-class creative guidance**
- Ideation mastery
- Multiple creative directions
- Overcoming blocks
- Emotional support for creative process

### Language Companion
- **Comprehensive language education**
- Translation with rich context
- Cultural intelligence
- Pronunciation guidance
- Learning strategies

### Business Companion
- **Strategic business wisdom**
- Comprehensive frameworks
- Strategic thinking tools
- Practical execution guidance
- Startup-specific guidance

## Prompt Design Principles

### 1. **Structure**
Each prompt includes:
- Identity & Mission (who they are, what they do)
- Philosophy/Approach (how they think)
- Frameworks/Methodologies (structured approaches)
- Response Templates (how to structure answers)
- Domain Coverage (what they know)
- Boundaries (what to avoid)
- Quality Standards (excellence markers)
- Ultimate Mission (their commitment)

### 2. **Length & Depth**
Prompts are intentionally comprehensive (3000-4000 tokens each) to:
- Provide complete guidance for complex scenarios
- Ensure consistent quality across diverse topics
- Build proper context for nuanced responses
- Enable adaptation to different user needs

### 3. **Emotional Intelligence**
Every prompt includes:
- User emotion recognition guidance
- Adaptive communication strategies
- Empathy and validation techniques
- Motivational support approaches
- Building genuine connections

### 4. **Variety Mechanisms**
To prevent repetition:
- Explicit anti-repetition instructions
- Multiple approach suggestions
- Diverse example requirements
- Dynamic personality guidance
- Context-aware communication

## Medical Companion Special Notes

The Medical Companion now provides **exceptionally detailed health education** while maintaining safety:

### What Changed:
- **Before**: Brief explanations followed by "consult a doctor"
- **After**: Comprehensive medical education with detailed, helpful guidance

### Approach:
1. **Thorough Explanations**: Covers what conditions are, how they work, symptoms, causes, treatments (general), prevention
2. **Detailed Disclaimers**: Explains WHY professional care is needed, what professionals can do that AI cannot
3. **Empowerment**: Users leave understanding their health better, prepared for doctor visits
4. **Safety First**: Still prioritizes safety, recognizes emergencies, directs to professionals - but with education, not dismissal

### Example Response Pattern:
```
[Comprehensive health education covering multiple aspects]
+ 
[Detailed disclaimer explaining:
 - Why this is education not advice
 - What makes medical situations unique
 - Why professional consultation is essential
 - What professionals can do that AI cannot
 - How to find appropriate help]
+
[Actionable guidance:
 - What to monitor
 - Questions to ask doctor
 - When to seek care and at what urgency level]
```

## Usage

### Accessing Prompts
```typescript
import { medicalPrompt, financePrompt } from '../prompts';
```

### Adding New Prompts
1. Create new file in `src/prompts/[agent-name].prompt.ts`
2. Export as `export const [agentName]Prompt = \`...\``
3. Add to `src/prompts/index.ts`
4. Import in `src/agents/config.ts`
5. Use in agent configuration

### Modifying Prompts
Simply edit the relevant prompt file in `src/prompts/`. Changes take effect on next server restart.

## Testing Recommendations

After implementing these prompts, test:

1. **Medical Companion**:
   - Ask about various conditions (should get detailed education)
   - Ask about symptoms (should get comprehensive response + urgency assessment)
   - Emergency symptoms (should get immediate directive)

2. **General Companion**:
   - Tell multiple jokes (should never repeat)
   - Show different emotions (should adapt communication style)
   - Ask varied questions (should feel fresh, not templated)

3. **All Companions**:
   - Complexity range (beginners to experts)
   - Emotional states (anxious, excited, confused)
   - Follow-ups (should maintain context and variety)

## Performance Considerations

**Token Usage**: These prompts are longer (3000-4000 tokens each) but provide:
- Significantly higher quality responses
- Better user satisfaction
- Reduced need for clarification
- More comprehensive single responses

**Trade-off**: Higher input tokens, but better responses mean:
- Fewer back-and-forth exchanges needed
- Higher completion rates
- Better user retention
- Reduced frustration

## Future Enhancements

Potential improvements:
1. **Dynamic Prompt Loading**: Load prompts from database for runtime updates
2. **A/B Testing**: Test prompt variations for optimization
3. **User Feedback Integration**: Refine prompts based on user ratings
4. **Contextual Modifications**: Adjust prompts based on conversation history
5. **Multi-language Prompts**: Versions in different languages

## Conclusion

This new prompt architecture transforms the agents from basic assistants into masterclass-level companions who:
- Provide exceptionally detailed, helpful responses
- Connect emotionally with users
- Never feel repetitive or robotic
- Empower through comprehensive education
- Adapt to individual needs and emotions

The result: Users who think "This is the best AI companion I've ever interacted with" instead of "This is a stupid bot."

---

**Note**: The old config is backed up as `config.old.ts` for reference.
