import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeInterviewPresence } from './multiModalController';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const gradeBehavioral = async (req: Request, res: Response) => {
  try {
    console.log('Behavioral grader request received:', { 
      hasQuestion: !!req.body.question, 
      hasAnswer: !!req.body.answer,
      hasAudio: !!req.body.audioContent,
      hasVideo: !!req.body.imageData,
      questionLength: req.body.question?.length,
      answerLength: req.body.answer?.length
    });

    const { question, answer, audioContent, imageData } = req.body;

    if (!question || !answer) {
      console.log('Missing required fields:', { question: !!question, answer: !!answer });
      return res.status(400).json({ error: 'Missing question or answer' });
    }

    console.log('API key available:', !!process.env.GEMINI_API_KEY);
    
    // Run behavioral analysis and presentation analysis in parallel
    const [behavioralResult, presentationResult] = await Promise.all([
      // Existing behavioral analysis
      (async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an interview coach analyzing CONTENT ONLY (not delivery or behavior).
Evaluate the following behavioral interview answer for content quality.

Question: "${question}"
Answer: "${answer}"

Analyze both content and provide simulated presentation feedback based on the answer quality and structure.

IMPORTANT: Always provide balanced feedback:
- Include at least 1 genuine strengths (things the candidate did well)
- Limit areas for improvement to constructive, actionable points
- Focus on helping the candidate improve rather than just pointing out flaws
- Even if the answer has issues, find something positive to highlight

Provide structured feedback in JSON format with arrays of bullet points with concise bullet points for each category.
Give actionable suggestions for improvement in the suggestions field. Limit your responses to 3-5 bullet points per section.
The JSON should have the following fields:
{
  "strengths": ["content strength 1", "content strength 2"],
  "areasForImprovement": ["content improvement area 1", "content improvement area 2"], 
  "suggestions": ["content suggestion 1", "content suggestion 2"],
  "presentationAnalysis": {
    "presentationStrengths": ["presentation strength 1", "presentation strength 2"],
    "presentationWeaknesses": ["presentation weakness 1", "presentation weakness 2"]
  },
  "score": number (1-10)
}

For presentation analysis, base it on the answer structure and communication style:
- Clear communication and structure suggests good presentation skills
- Use of specific examples indicates engaging storytelling
- Professional language suggests confident delivery
- Well-organized responses indicate good pace and flow

MANDATORY: The "strengths" and "presentationStrengths" arrays must each contain at least 1 item.
Even for weaker answers, find positive aspects like:
- "Attempted to address the question directly"
- "Used clear and understandable language"
- "Showed willingness to engage with the topic"
- "Demonstrated effort to provide specific details"

CRITICAL: Do NOT repeat any feedback items. Each strength, improvement area, and suggestion must be unique and distinct.

Rate 1-10 based on content quality:
- Answer relevance to the question
- Use of specific examples with details
- Structure and clarity of explanation
- Demonstration of problem-solving skills
- Professional communication style

Return only valid JSON with no additional text.`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('Gemini response received, length:', responseText.length);
    console.log('Gemini response preview:', responseText.substring(0, 200) + '...');

    try {
      // Clean up the response text (remove markdown code blocks if present)
      let cleanResponseText = responseText.trim();
      
      if (cleanResponseText.startsWith('```json')) {
        cleanResponseText = cleanResponseText.slice(7);
      }
      if (cleanResponseText.endsWith('```')) {
        cleanResponseText = cleanResponseText.slice(0, -3);
      }
      
      const feedback = JSON.parse(cleanResponseText.trim());
      
      console.log('Successfully parsed JSON feedback:', feedback);
      
      res.json({ success: true, feedback });

    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', responseText);
      
      // Fallback response if parsing fails
      const fallbackFeedback = {
        strengths: ["Provided a thoughtful response to the behavioral question", "Demonstrated effort to communicate ideas clearly"],
        areasForImprovement: ["Consider adding more specific examples to strengthen your answer"],
        suggestions: ["Use the STAR method (Situation, Task, Action, Result) for better structure", "Include measurable outcomes when possible"],
        presentationAnalysis: {
          presentationStrengths: ["Communicated thoughts in an organized manner", "Showed engagement with the interview process"],
          presentationWeaknesses: ["Consider practicing responses to improve flow and confidence"]
        },
        score: 6
      };
      res.json({ success: true, feedback: fallbackFeedback });
    }

  } catch (error) {
    console.error('Error grading behavioral response:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    res.status(500).json({ error: 'Failed to grade behavioral response' });
  }
};
