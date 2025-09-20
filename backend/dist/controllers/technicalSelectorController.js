import { GoogleGenerativeAI } from '@google/generative-ai';
import technicalQuestions from '../data/technicalQuestions.json';
// Initialize Gemini AI with API key (reuse existing pattern)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyC5yidGMZZSLYpCwZj_mNM0kHFkZHUrb40');
/**
 * Select two technical questions that best match the provided job description.
 * Accepts the same `processedContent` shape as the existing Gemini controller.
 */
export const selectTechnicalQuestions = async (req, res) => {
    try {
        const { processedContent } = req.body || {};
        const sessionId = req.headers['x-session-id'];
        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID required', error: 'Session ID must be provided in headers' });
        }
        const jobDescContent = (processedContent || []).find(c => c.type === 'jobDescription')?.content || '';
        // Build a prompt that lists available technical questions and asks Gemini to pick exactly 2
        const questionsList = technicalQuestions.map(q => ({ id: q.id, role: q.role, question: q.question, keywords: q.keywords }));
        const prompt = `You are given a job description below and a list of technical interview questions (id, role, question, keywords).
    Your task: Choose exactly 2 question IDs from the list that best match the job description and the role. Do NOT invent or modify questions.
    Return only valid JSON with the shape: { "selected": [ { "id": <number>, "role": "...", "question": "...", "keywords": ["..."] }, ... ] }

    JOB DESCRIPTION:\n${jobDescContent || 'No job description provided'}\n\n
    AVAILABLE QUESTIONS:\n${JSON.stringify(questionsList, null, 2)}\n
    IMPORTANT: If the job description is empty or not specific, select two reasonable, diverse questions for a general software engineering role. Do not include any additional text outside the JSON.`;
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Try to extract JSON from Gemini response
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            let parsed = null;
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
            if (parsed && Array.isArray(parsed.selected) && parsed.selected.length === 2) {
                return res.json({ success: true, selected: parsed.selected, sessionId });
            }
            // If parse failed or not exactly 2, fall through to fallback
            console.warn('Gemini returned unexpected selection, falling back to heuristic selection. Raw response:', text);
            console.error('\n\n***** ALERT: Gemini selection failed or returned invalid format. USING FALLBACK SELECTION. *****\n\n');
        }
        catch (err) {
            console.error('Failed to parse Gemini response for technical selection:', err);
        }
        // Fallback: simple keyword matching between job description and question keywords
        const fallbackSelected = fallbackSelectTwo(jobDescContent, questionsList);
        // Alert in console with details about fallback selection
        console.error('\n\n***** FALLBACK: Selected technical questions via heuristic. Review Gemini/API logs. *****');
        console.error('Session:', sessionId);
        console.error('Job description length:', (jobDescContent || '').length);
        console.error('Selected IDs:', fallbackSelected.map((q) => q.id));
        console.error('Selected roles:', fallbackSelected.map((q) => q.role));
        console.error('Selected questions:', fallbackSelected.map((q) => q.question));
        console.error('**********************************************************\n\n');
        res.json({ success: true, selected: fallbackSelected, sessionId, fallback: true });
    }
    catch (error) {
        console.error('selectTechnicalQuestions error:', error);
        res.status(500).json({ success: false, selected: [], error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
/**
 * Simple heuristic fallback: score questions by keyword overlap with job description
 */
function fallbackSelectTwo(jobDesc, questions) {
    const jd = (jobDesc || '').toLowerCase();
    const scored = questions.map(q => {
        const kw = Array.isArray(q.keywords) ? q.keywords : [];
        const matches = kw.filter(k => jd.includes(String(k).toLowerCase()));
        return { q, score: matches.length };
    });
    // Sort by score desc, role priority to Software Engineer, then random
    scored.sort((a, b) => b.score - a.score);
    // If top scores are zero, pick two diverse questions (prefer Software Engineer role)
    if (scored[0].score === 0) {
        const preferred = questions.filter(q => q.role && q.role.toLowerCase().includes('software')).slice(0, 2);
        if (preferred.length === 2)
            return preferred;
        // otherwise return first two
        return [questions[0], questions[1]];
    }
    const topTwo = scored.slice(0, 2).map(s => s.q);
    // Ensure two distinct
    if (topTwo.length === 1 && questions.length > 1)
        topTwo.push(questions[1]);
    return topTwo;
}
