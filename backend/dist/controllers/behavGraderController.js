import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeInterviewPresence } from './multiModalController';
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

Focus ONLY on content analysis - answer quality, structure, examples, relevance.
DO NOT comment on delivery, vocal patterns, visual appearance, or behavioral aspects.

Provide structured feedback in JSON format with arrays of bullet points:
{
  "strengths": ["content strength 1", "content strength 2"],
  "areasForImprovement": ["content improvement area 1", "content improvement area 2"], 
  "suggestions": ["content suggestion 1", "content suggestion 2"],
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
                    console.log('Failed to parse JSON, using fallback');
                    feedback = {
                        strengths: ["Response addresses the question"],
                        areasForImprovement: ["Could provide more specific details"],
                        suggestions: ["Use the STAR method for better structure"],
                        score: 5
                    };
                }
                return feedback;
            })(),
            // New presentation analysis
            analyzeInterviewPresence(audioContent, imageData, answer)
        ]);
        // Combine both analyses
        const combinedFeedback = {
            ...behavioralResult,
            presentationStrengths: presentationResult.presentationStrengths,
            presentationWeaknesses: presentationResult.presentationWeaknesses,
            // Merge suggestions from both analyses
            suggestions: [
                ...(behavioralResult.suggestions || []),
                ...(presentationResult.suggestions || [])
            ]
        };
        console.log('🎯 Combined feedback result:', {
            strengths: combinedFeedback.strengths?.length || 0,
            areasForImprovement: combinedFeedback.areasForImprovement?.length || 0,
            presentationStrengths: combinedFeedback.presentationStrengths?.length || 0,
            presentationWeaknesses: combinedFeedback.presentationWeaknesses?.length || 0,
            suggestions: combinedFeedback.suggestions?.length || 0
        });
        console.log('Sending combined response with behavioral and presentation feedback');
        res.json({ success: true, feedback: combinedFeedback });
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
