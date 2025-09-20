import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyC5yidGMZZSLYpCwZj_mNM0kHFkZHUrb40');

interface ProcessedContent {
  type: 'resume' | 'jobDescription' | 'companyInfo' | 'otherInfo';
  content: string;
  method: string;
  filename?: string;
  url?: string;
}

interface Question {
  id: string;
  question: string;
  category: 'technical' | 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  context?: string;
}

interface GeneratedQuestions {
  technical: Question[];
  behavioral: Question[];
}

/**
 * Generate interview questions using Gemini AI
 */
export const generateQuestions = async (req: Request, res: Response) => {
  try {
    const { processedContent }: { processedContent: ProcessedContent[] } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
        error: 'Session ID must be provided in headers'
      });
    }

    if (!processedContent || processedContent.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No content provided',
        error: 'Processed content is required for question generation'
      });
    }

    // Find resume and job description content
    const resumeContent = processedContent.find(c => c.type === 'resume')?.content || '';
    const jobDescContent = processedContent.find(c => c.type === 'jobDescription')?.content || '';
    const companyContent = processedContent.find(c => c.type === 'companyInfo')?.content || '';
    const otherContent = processedContent
      .filter(c => c.type === 'otherInfo')
      .map(c => c.content)
      .join('\n\n');

    // Create comprehensive prompt for Gemini
    console.log('🔍 DEBUGGING CONTENT RECEIVED BY GEMINI:');
    console.log('==========================================');
    console.log('📄 RESUME CONTENT:');
    console.log(resumeContent || 'No resume content provided');
    console.log('\n📋 JOB DESCRIPTION CONTENT:');
    console.log(jobDescContent || 'No job description content provided');
    console.log('\n🏢 COMPANY CONTENT:');
    console.log(companyContent || 'No company content provided');
    console.log('\n📝 OTHER CONTENT:');
    console.log(otherContent || 'No other content provided');
    console.log('==========================================\n');

    const prompt = `
🚨 **CRITICAL INSTRUCTIONS - READ CAREFULLY**

You are a professional interviewer creating questions for a job candidate. You MUST follow these rules EXACTLY:

**RULE #1: ONLY USE INFORMATION PROVIDED BELOW**
- You can ONLY reference content from the candidate's uploaded materials
- You MUST NOT assume, infer, or invent any work experience, companies, projects, or skills
- If information is missing, ask GENERIC questions instead

**RULE #2: NEVER HALLUCINATE OR INVENT**
- Do NOT mention specific companies unless they appear in the uploaded content
- Do NOT mention specific technologies unless they appear in the uploaded content  
- Do NOT mention specific projects unless they appear in the uploaded content
- Do NOT assume years of experience or team sizes
- Do NOT invent leadership experience or accomplishments

**RULE #3: WHEN IN DOUBT, USE GENERIC QUESTIONS**
- If you cannot find specific details in the content, ask general behavioral/technical questions
- Generic questions are better than invented specifics

**UPLOADED CONTENT TO ANALYZE:**

**RESUME CONTENT:**
${resumeContent || 'No resume content provided'}

**JOB DESCRIPTION:**
${jobDescContent || 'No job description provided'}

${companyContent ? `**COMPANY INFORMATION:**\n${companyContent}\n` : ''}

${otherContent ? `**ADDITIONAL INFORMATION:**\n${otherContent}\n` : ''}

**QUESTION GENERATION INSTRUCTIONS:**

Generate exactly 8 technical questions and 6 behavioral questions. 

**FOR TECHNICAL QUESTIONS:**
- Only reference technologies/tools mentioned in the uploaded content
- If no specific technologies are mentioned, ask general technical questions
- Focus on problem-solving, coding practices, and technical thinking

**FOR BEHAVIORAL QUESTIONS:**
- MUST include these 2 required questions:
  1. "Tell me about a time where you faced a significant challenge in a project. How did you overcome it?"
  2. "Describe a situation where you had to work with a difficult team member or stakeholder. How did you handle it?"
- For other behavioral questions, only reference specific experiences if clearly mentioned in uploads
- Otherwise, ask general behavioral questions about teamwork, problem-solving, leadership

**EXAMPLES OF CORRECT APPROACH:**

✅ GOOD (when resume mentions JavaScript):
"I see from your resume that you have experience with JavaScript. Can you walk me through your approach to debugging JavaScript applications?"

✅ GOOD (when no specific tech mentioned):
"How do you approach learning new programming languages or frameworks?"

❌ WRONG (inventing experience):
"Given your experience at Google..." (when Google isn't mentioned)
"Your background in microservices..." (when microservices isn't mentioned)

**OUTPUT FORMAT:**
Return valid JSON with this structure:

{
  "technical": [
    {
      "id": "tech_1",
      "question": "Question text here",
      "category": "technical", 
      "difficulty": "easy|medium|hard",
      "tags": ["relevant", "tags"],
      "context": "Explanation of why this question is relevant"
    }
  ],
  "behavioral": [
    {
      "id": "behav_1",
      "question": "Question text here", 
      "category": "behavioral",
      "difficulty": "easy|medium|hard", 
      "tags": ["relevant", "tags"],
      "context": "Explanation of why this question is relevant"
    }
  ]
}

🚨 **FINAL CHECK BEFORE RESPONDING:**
- Are you referencing any companies/projects/technologies NOT in the uploaded content? → REMOVE THEM
- Are you assuming experience levels not stated? → USE GENERIC QUESTIONS  
- Are you inventing details? → STICK TO WHAT'S PROVIDED

Generate the interview questions now, following these rules strictly:`;

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Generate questions
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let questions: GeneratedQuestions;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      questions = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!questions.technical || !questions.behavioral || 
          !Array.isArray(questions.technical) || !Array.isArray(questions.behavioral)) {
        throw new Error('Invalid question structure');
      }

      // Ensure we have the expected number of questions
      if (questions.technical.length === 0 && questions.behavioral.length === 0) {
        throw new Error('No questions generated');
      }

    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw response:', text);
      
      // Fallback: Create some default questions based on content analysis
      questions = createFallbackQuestions(resumeContent, jobDescContent);
    }

    res.json({
      success: true,
      questions,
      sessionId
    });

  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({
      success: false,
      questions: { technical: [], behavioral: [] },
      error: error instanceof Error ? error.message : 'Failed to generate questions'
    });
  }
};

/**
 * Create fallback questions if Gemini API fails
 */
function createFallbackQuestions(resumeContent: string, jobDescContent: string): GeneratedQuestions {
  const technical: Question[] = [
    {
      id: 'tech_fallback_1',
      question: 'Walk me through your approach to debugging a complex issue in a production system. What tools and methodologies do you use?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['debugging', 'production-systems', 'problem-solving'],
      context: 'Assesses systematic debugging approach and production experience'
    },
    {
      id: 'tech_fallback_2',
      question: 'How do you ensure code quality and maintainability in your projects? What practices and tools do you implement?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['code-quality', 'best-practices', 'maintainability'],
      context: 'Evaluates understanding of software engineering best practices'
    },
    {
      id: 'tech_fallback_3',
      question: 'Describe a time when you had to optimize the performance of an application or system. What was your approach and what results did you achieve?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['performance-optimization', 'system-design', 'metrics'],
      context: 'Tests performance optimization skills and results-oriented thinking'
    },
    {
      id: 'tech_fallback_4',
      question: 'How do you approach learning and staying current with new technologies in your field? Can you give me an example?',
      category: 'technical',
      difficulty: 'easy',
      tags: ['learning', 'technology-trends', 'professional-development'],
      context: 'Assesses commitment to continuous learning and technology adoption'
    },
    {
      id: 'tech_fallback_5',
      question: 'Explain how you would design a system to handle a significant increase in user traffic. What factors would you consider?',
      category: 'technical',
      difficulty: 'hard',
      tags: ['system-design', 'scalability', 'architecture'],
      context: 'Tests system design thinking and scalability considerations'
    },
    {
      id: 'tech_fallback_6',
      question: 'Tell me about a technical decision you made that you later regretted. What did you learn from it?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['decision-making', 'learning', 'retrospection'],
      context: 'Evaluates learning from experience and technical judgment evolution'
    },
    {
      id: 'tech_fallback_7',
      question: 'How do you approach code reviews? What do you look for when reviewing others\' code?',
      category: 'technical',
      difficulty: 'easy',
      tags: ['code-review', 'collaboration', 'quality-assurance'],
      context: 'Assesses collaborative development practices and quality standards'
    },
    {
      id: 'tech_fallback_8',
      question: 'Describe your experience with testing. How do you decide what to test and what testing strategies do you employ?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['testing', 'quality-assurance', 'strategy'],
      context: 'Evaluates testing mindset and quality assurance practices'
    }
  ];

  const behavioral: Question[] = [
    {
      id: 'behav_fallback_1',
      question: 'Tell me about a time where you faced a significant challenge in a project. How did you overcome it?',
      category: 'behavioral',
      difficulty: 'medium',
      tags: ['problem-solving', 'resilience', 'challenge'],
      context: 'Essential behavioral question to assess problem-solving abilities and resilience under pressure'
    },
    {
      id: 'behav_fallback_2',
      question: 'Describe a situation where you had to work with a difficult team member or stakeholder. How did you handle it?',
      category: 'behavioral',
      difficulty: 'medium',
      tags: ['teamwork', 'conflict-resolution', 'communication'],
      context: 'Evaluates interpersonal skills and conflict resolution abilities'
    },
    {
      id: 'behav_fallback_3',
      question: 'Tell me about a project you led or contributed to significantly. What was your role and how did you ensure its success?',
      category: 'behavioral',
      difficulty: 'medium',
      tags: ['leadership', 'project-management', 'accountability'],
      context: 'Assesses leadership capabilities and project management skills'
    },
    {
      id: 'behav_fallback_4',
      question: 'Describe a time when you had to learn a new technology or skill quickly to complete a project. How did you approach it?',
      category: 'behavioral',
      difficulty: 'easy',
      tags: ['learning', 'adaptability', 'self-development'],
      context: 'Evaluates learning agility and adaptability to new technologies'
    },
    {
      id: 'behav_fallback_5',
      question: 'Tell me about a time when you disagreed with a technical decision made by your team or manager. How did you handle it?',
      category: 'behavioral',
      difficulty: 'medium',
      tags: ['communication', 'technical-judgment', 'professional-growth'],
      context: 'Tests professional communication and technical decision-making skills'
    },
    {
      id: 'behav_fallback_6',
      question: 'What motivates you in your work, and how do you stay motivated during challenging or repetitive tasks?',
      category: 'behavioral',
      difficulty: 'easy',
      tags: ['motivation', 'resilience', 'self-awareness'],
      context: 'Understands personal motivation and long-term engagement potential'
    }
  ];

  return { technical, behavioral };
}