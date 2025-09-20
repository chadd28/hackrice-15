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
    const prompt = `
You are an expert technical interviewer tasked with creating personalized interview questions based on the candidate's background and the specific job they're applying for.

**Candidate Resume:**
${resumeContent}

**Job Description:**
${jobDescContent}

${companyContent ? `**Company Information:**\n${companyContent}\n` : ''}

${otherContent ? `**Additional Information:**\n${otherContent}\n` : ''}

Please generate exactly 8 technical questions and 6 behavioral questions that are:

1. **Highly relevant** to both the candidate's experience and the job requirements
2. **Appropriately challenging** based on the role level
3. **Specific** to the technologies, skills, and experiences mentioned
4. **Well-structured** for a realistic interview scenario

For each question, provide:
- The question text
- Category (technical or behavioral)
- Difficulty level (easy, medium, hard)
- Relevant tags/keywords
- Brief context explaining why this question is relevant

Format your response as valid JSON with this exact structure:
{
  "technical": [
    {
      "id": "tech_1",
      "question": "Question text here",
      "category": "technical",
      "difficulty": "medium",
      "tags": ["react", "frontend"],
      "context": "This question tests understanding of React concepts mentioned in the resume and required for the frontend role."
    }
  ],
  "behavioral": [
    {
      "id": "behav_1", 
      "question": "Question text here",
      "category": "behavioral",
      "difficulty": "medium",
      "tags": ["leadership", "teamwork"],
      "context": "This explores leadership experience mentioned in the resume, relevant for the senior role."
    }
  ]
}

Ensure questions are:
- **Technical**: Focus on coding, system design, problem-solving, architecture, specific technologies
- **Behavioral**: Focus on STAR method scenarios, leadership, conflict resolution, team dynamics, past experiences
- **Diverse**: Cover different aspects of the role and candidate's background
- **Realistic**: Questions that would actually be asked in a professional interview

Generate the questions now:`;

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
      question: 'Can you walk me through your approach to solving a complex technical problem you\'ve encountered?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['problem-solving'],
      context: 'General technical problem-solving assessment'
    },
    {
      id: 'tech_fallback_2',
      question: 'How do you ensure code quality and maintainability in your projects?',
      category: 'technical',
      difficulty: 'medium',
      tags: ['code-quality', 'best-practices'],
      context: 'Code quality and development practices'
    },
    {
      id: 'tech_fallback_3',
      question: 'Describe a time when you had to learn a new technology quickly. How did you approach it?',
      category: 'technical',
      difficulty: 'easy',
      tags: ['learning', 'adaptability'],
      context: 'Learning agility and adaptability'
    }
  ];

  const behavioral: Question[] = [
    {
      id: 'behav_fallback_1',
      question: 'Tell me about a challenging project you worked on. What made it challenging and how did you overcome the obstacles?',
      category: 'behavioral',
      difficulty: 'medium',
      tags: ['project-management', 'problem-solving'],
      context: 'Project experience and problem-solving skills'
    },
    {
      id: 'behav_fallback_2',
      question: 'Describe a situation where you had to work with a difficult team member. How did you handle it?',
      category: 'behavioral',
      difficulty: 'medium',
      tags: ['teamwork', 'conflict-resolution'],
      context: 'Team collaboration and conflict resolution'
    },
    {
      id: 'behav_fallback_3',
      question: 'What motivates you in your work, and how do you stay motivated during challenging times?',
      category: 'behavioral',
      difficulty: 'easy',
      tags: ['motivation', 'resilience'],
      context: 'Personal motivation and resilience'
    }
  ];

  return { technical, behavioral };
}