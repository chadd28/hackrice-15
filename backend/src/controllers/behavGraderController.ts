import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const { question, answer } = req.body;

    if (!question || !answer) {
      console.log('Missing required fields:', { question: !!question, answer: !!answer });
      return res.status(400).json({ error: 'Missing question or answer' });
    }

    console.log('API key available:', !!process.env.GEMINI_API_KEY);
    
    // Behavioral content analysis only
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an interview coach analyzing CONTENT ONLY (not delivery or behavior).
Evaluate the following behavioral interview answer for content quality.

Question: "${question}"
Answer: "${answer}"


Provide concise feedback in JSON format. For suggestions, provide 1-3 specific improvements based on answer quality:
- Strong answers: 1-2 minor refinements
- Weak answers: 2-3 key improvements

IMPORTANT: Return ONLY valid JSON with this structure:
{
  "strengths": "What the candidate did well (1-2 sentence)",
  "weaknesses": "Main areas for improvement (1-2 sentence)", 
  "suggestions": ["Most important suggestion", "Second suggestion if needed", "Third only if answer needs major work"],
  "score": "number from 1-10"
}

Each suggestion should be actionable and under 40 words.
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log('Gemini response received, length:', responseText.length);
        console.log('Gemini response preview:', responseText.substring(0, 200));

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
        strengths: [],
        areasForImprovement: ["Unable to analyze response due to technical issue"],
        suggestions: ["Use the STAR method for better structure"],
        score: 5
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
