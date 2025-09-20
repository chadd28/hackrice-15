import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const gradeBehavioral = async (req, res) => {
    try {
        console.log('Behavioral grader request received:', {
            hasQuestion: !!req.body.question,
            hasAnswer: !!req.body.answer,
            questionLength: req.body.question?.length,
            answerLength: req.body.answer?.length
        });
        const { question, answer } = req.body;
        if (!question || !answer) {
            console.log('Missing required fields:', { question: !!question, answer: !!answer });
            return res.status(400).json({ error: 'Missing question or answer' });
        }
        console.log('API key available:', !!process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
You are an interview coach. 
Evaluate the following behavioral interview answer.

Question: "${question}"
Answer: "${answer}"

Provide structured feedback in JSON format with concise bullet points for each category.
Give actionable suggestions for improvement in the suggestions field. Limit your responses to 3-5 bullet points per section.
The JSON should have the following fields:
{
  "strengths": "...",
  "weaknesses": "...",
  "suggestions": "...",
  "score": "number from 1-10"
}
    `;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('Gemini response received, length:', responseText.length);
        console.log('Gemini response preview:', responseText.substring(0, 200));
        let feedback;
        try {
            // Try to extract JSON from the response text if it's wrapped in markdown
            let jsonText = responseText;
            if (responseText.includes('```json')) {
                const jsonStart = responseText.indexOf('```json') + 7;
                const jsonEnd = responseText.indexOf('```', jsonStart);
                if (jsonEnd > jsonStart) {
                    jsonText = responseText.substring(jsonStart, jsonEnd).trim();
                }
            }
            feedback = JSON.parse(jsonText);
            console.log('Successfully parsed JSON feedback:', feedback);
        }
        catch (parseError) {
            console.log('Failed to parse JSON, using raw response:', parseError);
            console.log('Response text:', responseText.substring(0, 200));
            feedback = { raw: responseText }; // fallback if not valid JSON
        }
        console.log('Sending response with feedback');
        res.json({ success: true, feedback });
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
