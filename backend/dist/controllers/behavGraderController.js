import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const gradeBehavioral = async (req, res) => {
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

Focus ONLY on content analysis - answer quality, structure, examples, relevance.
DO NOT comment on delivery, vocal patterns, visual appearance, or behavioral aspects.

Provide structured feedback in JSON format with arrays of bullet points with concise bullet points for each category.
Give actionable suggestions for improvement in the suggestions field. Limit your responses to 3-5 bullet points per section.
The JSON should have the following fields:
{
  "strengths": ["content strength 1", "content strength 2"],
  "areasForImprovement": ["content improvement area 1", "content improvement area 2"], 
  "suggestions": ["content suggestion 1", "content suggestion 2"],
  "score": number (1-10)
}

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
        }
        catch (parseError) {
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
    }
    catch (error) {
        console.error('Error grading behavioral response:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Failed to grade behavioral response' });
    }
};
