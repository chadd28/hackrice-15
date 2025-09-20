import { GoogleGenerativeAI } from '@google/generative-ai';
// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyC5yidGMZZSLYpCwZj_mNM0kHFkZHUrb40');
/**
 * Generate interview questions using Gemini AI
 */
export const generateQuestions = async (req, res) => {
    try {
        const { processedContent } = req.body;
        const sessionId = req.headers['x-session-id'];
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

**RULE #4: ACTIVELY INTEGRATE ALL PROVIDED CONTENT**
- If job description is provided, YOU MUST create questions that reference specific requirements, technologies, or responsibilities mentioned
- If company information (including a company name) is provided, PREFER framing questions by explicitly referencing the company name when appropriate (e.g., "At [company name], how have you..." or "This role at [company name] asks for..., can you share an example...") rather than generic phrasing like "the job description emphasizes..."
- If additional information is provided, YOU MUST incorporate portfolio projects, certifications, or other details
- Create questions that connect the candidate's background to the specific role requirements
- Make the questions feel tailored to both the candidate AND the position

**UPLOADED CONTENT TO ANALYZE:**

**RESUME CONTENT:**
${resumeContent || 'No resume content provided'}

**JOB DESCRIPTION:**
${jobDescContent || 'No job description provided'}

${companyContent ? `**COMPANY INFORMATION:**\n${companyContent}\n` : ''}

${otherContent ? `**ADDITIONAL INFORMATION:**\n${otherContent}\n` : ''}

**QUESTION GENERATION INSTRUCTIONS:**

Generate exactly 2 behavioral questions.  

**FOR BEHAVIORAL QUESTIONS (STRICT STRUCTURE):**
- **Q1 (Resume-tailored):** Must directly reference the candidate’s resume (e.g., past experiences, internships, achievements, teamwork, leadership, extracurriculars).  
- **Q2 (Job-tailored):** Must directly reference the target job description, focusing on behaviors relevant to success in that role (e.g., problem-solving in role context, alignment with responsibilities, values fit).  
- If resume/job description is missing or incomplete, default to behavorial questions about the job position. Maintain professionalism and relevance, do not start the question with something like " The <COMPANY> job description doesn't provide specific details, ..."  

**FOCUS AREAS FOR RESUME ANALYSIS:**
- PRIORITIZE: Internships, work experience, extracurricular activities, leadership roles, clubs/organizations
- EMPHASIZE: Interpersonal experiences, teamwork, initiative, problem-solving approach, values alignment
- MODERATE: Skills and technologies (important but not the primary focus)
- DE-EMPHASIZE: Projects (only use 1 project question maximum, and focus on collaboration/learning)
- AVOID: Grades, GPA, coursework, academic achievements (unless directly relevant to job requirements)

**FOR BEHAVIORAL QUESTIONS - HEAVILY PRIORITIZE THESE:**
- **COMPANY FIT & VALUES ALIGNMENT:**
  * Why do you want to work at [company name] specifically?
  * How do your personal values align with our company's mission/values?
  * What attracts you most about our company culture/work environment?
  * What unique perspectives and experiences can you bring to our team?
  * What are you hoping to learn or develop during your time with us?
  * How does this role fit into your long-term career goals?
  * What aspects of our company's work/mission excite you most?
- **ROLE ALIGNMENT & SKILLSET FIT:**
  * How do your skills and experiences make you a good fit for this specific role?
  * What challenges mentioned in the job description are you most excited to tackle?
  * How do your past experiences prepare you for the responsibilities in this position?
- **WORK EXPERIENCE & INTERPERSONAL SKILLS:**
  * Tell me about your experience at [internship/job]. What did you enjoy most about that role?
  * Describe a time when you had to learn something completely new. How did you approach it?
  * Can you share an example of how you've contributed to a team environment?
- **PROJECTS (MAXIMUM 1 question - focus on collaboration/learning):**
  * If including any project question, focus on teamwork, learning process, or impact rather than technical implementation
- **IF ADDITIONAL INFORMATION MENTIONS COMPANY VALUES (e.g., "diverse perspectives"):**
  * "In our company, we highly value diverse perspectives. What are some unique perspectives and experiences you can bring to us?"
  * Tailor questions to specific company values or initiatives mentioned
- **IF JOB DESCRIPTION IS PROVIDED, HEAVILY INTEGRATE**:
  * Create questions that directly connect candidate background to specific job requirements
  * Reference specific challenges or responsibilities mentioned in the job posting
- **IF ADDITIONAL INFORMATION IS PROVIDED**: Incorporate portfolio, certifications, or other relevant details
- Focus heavily on motivation, cultural fit, interpersonal skills, and professional growth over technical project details

**EXAMPLES OF CORRECT APPROACH:**

✅ EXCELLENT (company fit - highest priority):
"What specifically attracts you to working at [company name], and how do you see yourself contributing to our mission of [company mission]?"

✅ EXCELLENT (unique perspectives when company values diversity):
"In our company, we highly value diverse perspectives. What are some unique perspectives and experiences you can bring to us?"

✅ EXCELLENT (role alignment):
"Looking at this position's focus on [specific job requirement], how do your experiences prepare you to tackle these challenges?"

✅ EXCELLENT (values alignment):
"Our company values [specific value mentioned]. Can you share an example of how you've demonstrated this value in your academic or professional experience?"

✅ GOOD (work experience focus):
"Tell me about your internship at [company]. What aspects of that role did you find most fulfilling, and how did it shape your career interests?"

✅ GOOD (interpersonal skills):
"I noticed you were involved in [club/organization]. Can you tell me about a leadership experience or challenge you faced in that role?"

✅ GOOD (learning motivation):
"What are you most hoping to learn or develop during your time with our company?"

✅ GOOD (when no specific tech mentioned):
"How do you approach learning new programming languages or frameworks when working in a team environment?"

✅ ACCEPTABLE (project question - if absolutely necessary, focus on collaboration):
"I see you worked on [project name]. What did you learn about collaboration or problem-solving from that experience?"

❌ WRONG (too many project-focused questions):
"Tell me about your project architecture... Walk me through your technical implementation... What was the most challenging coding aspect..." (avoid technical project deep-dives)

❌ WRONG (inventing experience):
"Given your experience at Google..." (when Google isn't mentioned)

❌ WRONG (missing company alignment):
Generating questions without asking about company fit when company information is provided

**OUTPUT FORMAT:**
Return valid JSON with this structure:

{
  "behavioral": [
    {
      "id": "behav_1_resume",
      "question": "Question tailored to resume", 
      "category": "behavioral",
      "difficulty": "easy|medium|hard", 
      "tags": ["resume", "experience"]
    },
    {
      "id": "behav_2_job",
      "question": "Question tailored to target job", 
      "category": "behavioral",
      "difficulty": "easy|medium|hard", 
      "tags": ["job", "role", "values"]
    }
  ]
}

🚨 **FINAL CHECK BEFORE RESPONDING:**
- Are you referencing any companies/projects/technologies NOT in the uploaded content? → REMOVE THEM
- Are you assuming experience levels not stated? → USE GENERIC QUESTIONS  
- Are you inventing details? → STICK TO WHAT'S PROVIDED
- Did you generate exactly 2 behavioral questions (Q1 resume-tailored, Q2 job-tailored)? → ENSURE STRUCTURE
- If job description was provided, did you integrate job requirements into Q2? → ENSURE ALIGNMENT
- If resume was provided, did you integrate resume content into Q1? → ENSURE ALIGNMENT

Generate the interview questions now, following these rules strictly:`;
        // Get the generative model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Generate questions
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Parse the JSON response
        let questions;
        try {
            // Extract JSON from the response (in case there's extra text)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            questions = JSON.parse(jsonMatch[0]);
            // Ensure we have the behavioral array
            if (!questions.behavioral) {
                questions.behavioral = [];
            }
            // Validate that behavioral is actually an array
            if (!Array.isArray(questions.behavioral)) {
                throw new Error('Invalid question structure - behavioral array expected');
            }
            // Ensure we have at least some behavioral questions
            if (questions.behavioral.length === 0) {
                throw new Error('No behavioral questions generated');
            }
        }
        catch (parseError) {
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
    }
    catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({
            success: false,
            questions: { behavioral: [] },
            error: error instanceof Error ? error.message : 'Failed to generate questions'
        });
    }
};
/**
 * Create fallback questions if Gemini API fails
 */
function createFallbackQuestions(resumeContent, jobDescContent) {
    const behavioral = [
        {
            id: 'behav_fallback_1',
            question: 'Tell me about a time where you faced a significant challenge. How did you overcome it?',
            category: 'behavioral',
            difficulty: 'medium',
            tags: ['problem-solving', 'resilience', 'challenge']
        },
        {
            id: 'behav_fallback_2',
            question: 'What attracts you most to this role and this company? How does it align with your career goals?',
            category: 'behavioral',
            difficulty: 'easy',
            tags: ['company-fit', 'motivation', 'career-alignment']
        }
    ];
    return { behavioral };
}
import { GoogleGenerativeAI } from '@google/generative-ai';
// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyC5yidGMZZSLYpCwZj_mNM0kHFkZHUrb40');
/**
 * Generate interview questions using Gemini AI
 */
export const generateQuestions = async (req, res) => {
    try {
        const { processedContent } = req.body;
        const sessionId = req.headers['x-session-id'];
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

**RULE #4: ACTIVELY INTEGRATE ALL PROVIDED CONTENT**
- If job description is provided, YOU MUST create questions that reference specific requirements, technologies, or responsibilities mentioned
- If additional information is provided, YOU MUST incorporate portfolio projects, certifications, or other details
- Create questions that connect the candidate's background to the specific role requirements
- Make the questions feel tailored to both the candidate AND the position

**UPLOADED CONTENT TO ANALYZE:**

**RESUME CONTENT:**
${resumeContent || 'No resume content provided'}

**JOB DESCRIPTION:**
${jobDescContent || 'No job description provided'}

${companyContent ? `**COMPANY INFORMATION:**\n${companyContent}\n` : ''}

${otherContent ? `**ADDITIONAL INFORMATION:**\n${otherContent}\n` : ''}

**QUESTION GENERATION INSTRUCTIONS:**

Generate exactly 6 technical questions and 8 behavioral questions. 

**FOCUS AREAS FOR RESUME ANALYSIS:**
- PRIORITIZE: Internships, work experience, extracurricular activities, leadership roles, clubs/organizations
- EMPHASIZE: Interpersonal experiences, teamwork, initiative, problem-solving approach, values alignment
- MODERATE: Skills and technologies (important but not the primary focus)
- DE-EMPHASIZE: Projects (only use 1-2 project questions maximum - focus on the learning/collaboration aspect rather than technical details)
- AVOID: Grades, GPA, coursework, academic achievements (unless directly relevant to job requirements)

**FOR TECHNICAL QUESTIONS:**
- Focus on practical skills and technologies mentioned in the resume
- Ask about approach to learning and problem-solving
- **IF JOB DESCRIPTION IS PROVIDED**: Reference specific requirements, technologies, or responsibilities mentioned in the job posting
- Only reference technologies/tools mentioned in the uploaded content
- If no specific technologies are mentioned, ask general technical questions
- Emphasize how they apply technical skills in collaborative environments

**FOR BEHAVIORAL QUESTIONS - HEAVILY PRIORITIZE THESE:**
- MUST include these 2 required questions:
  1. "Tell me about a time where you faced a significant challenge. How did you overcome it?"
  2. "Describe a situation where you had to work with a difficult team member or stakeholder. How did you handle it?"
- **COMPANY FIT & VALUES ALIGNMENT (HIGHEST PRIORITY - Include 3-4 of these):**
  * Why do you want to work at [company name] specifically?
  * How do your personal values align with our company's mission/values?
  * What attracts you most about our company culture/work environment?
  * What unique perspectives and experiences can you bring to our team?
  * What are you hoping to learn or develop during your time with us?
  * How does this role fit into your long-term career goals?
  * What aspects of our company's work/mission excite you most?
- **ROLE ALIGNMENT & SKILLSET FIT (Include 2-3 of these):**
  * How do your skills and experiences make you a good fit for this specific role?
  * What challenges mentioned in the job description are you most excited to tackle?
  * How do your past experiences prepare you for the responsibilities in this position?
- **WORK EXPERIENCE & INTERPERSONAL SKILLS (Include 2-3 of these):**
  * Tell me about your experience at [internship/job]. What did you enjoy most about that role?
  * Describe a time when you had to learn something completely new. How did you approach it?
  * Can you share an example of how you've contributed to a team environment?
- **PROJECTS (MAXIMUM 1 question - focus on collaboration/learning):**
  * If including any project question, focus on teamwork, learning process, or impact rather than technical implementation
- **IF ADDITIONAL INFORMATION MENTIONS COMPANY VALUES (e.g., "diverse perspectives"):**
  * "In our company, we highly value diverse perspectives. What are some unique perspectives and experiences you can bring to us?"
  * Tailor questions to specific company values or initiatives mentioned
- **IF JOB DESCRIPTION IS PROVIDED, HEAVILY INTEGRATE**:
  * Create questions that directly connect candidate background to specific job requirements
  * Reference specific challenges or responsibilities mentioned in the job posting
- **IF ADDITIONAL INFORMATION IS PROVIDED**: Incorporate portfolio, certifications, or other relevant details
- Focus heavily on motivation, cultural fit, interpersonal skills, and professional growth over technical project details

**EXAMPLES OF CORRECT APPROACH:**

✅ EXCELLENT (company fit - highest priority):
"What specifically attracts you to working at [company name], and how do you see yourself contributing to our mission of [company mission]?"

✅ EXCELLENT (unique perspectives when company values diversity):
"In our company, we highly value diverse perspectives. What are some unique perspectives and experiences you can bring to us?"

✅ EXCELLENT (role alignment):
"Looking at this position's focus on [specific job requirement], how do your experiences prepare you to tackle these challenges?"

✅ EXCELLENT (values alignment):
"Our company values [specific value mentioned]. Can you share an example of how you've demonstrated this value in your academic or professional experience?"

✅ GOOD (work experience focus):
"Tell me about your internship at [company]. What aspects of that role did you find most fulfilling, and how did it shape your career interests?"

✅ GOOD (interpersonal skills):
"I noticed you were involved in [club/organization]. Can you tell me about a leadership experience or challenge you faced in that role?"

✅ GOOD (learning motivation):
"What are you most hoping to learn or develop during your time with our company?"

✅ GOOD (when no specific tech mentioned):
"How do you approach learning new programming languages or frameworks when working in a team environment?"

✅ ACCEPTABLE (project question - if absolutely necessary, focus on collaboration):
"I see you worked on [project name]. What did you learn about collaboration or problem-solving from that experience?"

❌ WRONG (too many project-focused questions):
"Tell me about your project architecture... Walk me through your technical implementation... What was the most challenging coding aspect..." (avoid technical project deep-dives)

❌ WRONG (inventing experience):
"Given your experience at Google..." (when Google isn't mentioned)

❌ WRONG (missing company alignment):
Generating questions without asking about company fit when company information is provided

**OUTPUT FORMAT:**
Return valid JSON with this structure:

{
  "technical": [
    {
      "id": "tech_1",
      "question": "Question text here",
      "category": "technical", 
      "difficulty": "easy|medium|hard",
      "tags": ["relevant", "tags"]
    }
  ],
  "behavioral": [
    {
      "id": "behav_1",
      "question": "Question text here", 
      "category": "behavioral",
      "difficulty": "easy|medium|hard", 
      "tags": ["relevant", "tags"]
    }
  ]
}

🚨 **FINAL CHECK BEFORE RESPONDING:**
- Are you referencing any companies/projects/technologies NOT in the uploaded content? → REMOVE THEM
- Are you assuming experience levels not stated? → USE GENERIC QUESTIONS  
- Are you inventing details? → STICK TO WHAT'S PROVIDED
- **If job description was provided, did you create questions that specifically reference job requirements?** → ENSURE INTEGRATION
- **If additional information was provided, did you incorporate those details into relevant questions?** → ENSURE USAGE
- Are at least 3-4 questions specifically tailored to connect the candidate's background with the job requirements?

Generate the interview questions now, following these rules strictly:`;
        // Get the generative model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Generate questions
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Parse the JSON response
        let questions;
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
        }
        catch (parseError) {
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
    }
    catch (error) {
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
function createFallbackQuestions(resumeContent, jobDescContent) {
    const technical = [
        {
            id: 'tech_fallback_1',
            question: 'How do you approach learning and staying current with new technologies in your field? Can you give me an example?',
            category: 'technical',
            difficulty: 'easy',
            tags: ['learning', 'technology-trends', 'professional-development']
        },
        {
            id: 'tech_fallback_2',
            question: 'Walk me through your approach to debugging a complex issue. What tools and methodologies do you use?',
            category: 'technical',
            difficulty: 'medium',
            tags: ['debugging', 'problem-solving', 'tools']
        },
        {
            id: 'tech_fallback_3',
            question: 'How do you ensure code quality and maintainability when working on a team? What practices do you follow?',
            category: 'technical',
            difficulty: 'medium',
            tags: ['code-quality', 'best-practices', 'teamwork']
        },
        {
            id: 'tech_fallback_4',
            question: 'Tell me about a technical decision you made that you later regretted. What did you learn from it?',
            category: 'technical',
            difficulty: 'medium',
            tags: ['decision-making', 'learning', 'growth']
        },
        {
            id: 'tech_fallback_5',
            question: 'How do you approach code reviews? What do you look for when reviewing others\' code?',
            category: 'technical',
            difficulty: 'easy',
            tags: ['code-review', 'collaboration', 'quality-assurance']
        },
        {
            id: 'tech_fallback_6',
            question: 'Describe your experience with testing. How do you decide what to test and what testing strategies do you employ?',
            category: 'technical',
            difficulty: 'medium',
            tags: ['testing', 'quality-assurance', 'strategy']
        }
    ];
    const behavioral = [
        {
            id: 'behav_fallback_1',
            question: 'Tell me about a time where you faced a significant challenge. How did you overcome it?',
            category: 'behavioral',
            difficulty: 'medium',
            tags: ['problem-solving', 'resilience', 'challenge']
        },
        {
            id: 'behav_fallback_2',
            question: 'Describe a situation where you had to work with a difficult team member or stakeholder. How did you handle it?',
            category: 'behavioral',
            difficulty: 'medium',
            tags: ['teamwork', 'conflict-resolution', 'communication']
        },
        {
            id: 'behav_fallback_3',
            question: 'What attracts you most to this role and this company? How does it align with your career goals?',
            category: 'behavioral',
            difficulty: 'easy',
            tags: ['company-fit', 'motivation', 'career-alignment']
        },
        {
            id: 'behav_fallback_4',
            question: 'What values are most important to you in a workplace, and how do you demonstrate those values in your work?',
            category: 'behavioral',
            difficulty: 'medium',
            tags: ['values', 'workplace-culture', 'personal-principles']
        },
        {
            id: 'behav_fallback_5',
            question: 'What unique perspectives and experiences can you bring to our team?',
            category: 'behavioral',
            difficulty: 'medium',
            tags: ['diversity', 'unique-perspective', 'value-add']
        },
        {
            id: 'behav_fallback_6',
            question: 'What are you hoping to learn and develop during your time with our company?',
            category: 'behavioral',
            difficulty: 'easy',
            tags: ['learning-goals', 'professional-development', 'growth']
        },
        {
            id: 'behav_fallback_7',
            question: 'Describe a time when you participated in a club, organization, or extracurricular activity. What role did you play and what did you learn?',
            category: 'behavioral',
            difficulty: 'easy',
            tags: ['extracurricular', 'leadership', 'teamwork', 'personal-growth']
        },
        {
            id: 'behav_fallback_8',
            question: 'Tell me about an internship or work experience you\'ve had. What did you enjoy most about that role and what did you learn?',
            category: 'behavioral',
            difficulty: 'easy',
            tags: ['work-experience', 'learning', 'professional-growth', 'reflection']
        }
    ];
    return { technical, behavioral };
}
