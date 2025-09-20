import { Request, Response } from "express";
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MultiModalAnalysisResult {
  strengths: string[];
  areasForImprovement: string[];
  suggestions: string[];
  presentationStrengths: string[];
  presentationWeaknesses: string[];
  timestamp: string;
}

export const analyzeInterviewPresence = async (
  audioContent?: string,
  imageData?: string,
  transcriptText?: string
): Promise<MultiModalAnalysisResult> => {
  
  const strengths: string[] = [];
  const areasForImprovement: string[] = [];
  const suggestions: string[] = [];
  const presentationStrengths: string[] = [];
  const presentationWeaknesses: string[] = [];

  console.log('🎯 Starting Gemini visual behavioral analysis...');
  console.log('📷 Image data available:', !!imageData);
  if (imageData) {
    console.log('📷 Image data length:', imageData.length);
    console.log('📷 Image data starts with base64 prefix:', imageData.startsWith('data:image/'));
  }

  if (imageData) {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        presentationWeaknesses.push('Video analysis unavailable - API not configured');
        return {
          strengths,
          areasForImprovement,
          suggestions,
          presentationStrengths,
          presentationWeaknesses,
          timestamp: new Date().toISOString()
        };
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Analyze this interview video frame for presentation skills. Focus HEAVILY on eye contact and visible enthusiasm. Only observable visual behavior, no personality inferences.

IMPORTANT: Always provide balanced feedback. Find at least 1 genuine positive presentation behaviors, even if subtle.

CRITICAL: Be very careful about categorizing observations as STRENGTHS vs WEAKNESSES.

POSITIVE BEHAVIORS (go in presentationStrengths):
- Direct eye contact with camera
- Genuine smiles and positive expressions
- Engaged, enthusiastic facial expressions
- Good posture and professional presence
- Confident body language
- Appropriate warmth and approachability
- Professional appearance and grooming
- Attentive and focused positioning
- Calm and composed demeanor

NEGATIVE BEHAVIORS (go in presentationWeaknesses):
- Looking away from camera or distracted gaze
- Neutral, flat, or unexpressive facial demeanor
- Lack of visible enthusiasm or engagement
- Slouched or unprofessional posture
- Nervous fidgeting or restless behavior
- Overly stiff or overly casual presentation

PRIORITY CRITERIA (Focus heavily on these):

1. Eye Contact / Gaze (HIGH PRIORITY):
- Is the person looking directly at camera vs looking away?
- Face positioning - centered and engaged with viewer?
- Direct gaze vs distracted/avoidant eye contact?
- Professional eye engagement level?

2. Passion / Enthusiasm - Visible (HIGH PRIORITY):
- Observable genuine smiles and positive expressions?
- Facial animation and expression variety?
- Eyes showing engagement vs flat/disinterested?
- Observable energy and enthusiasm through face?
- Expression intensity that shows interest?

3. Professional Yet Approachable Expression:
- Maintains professional baseline with appropriate warmth?
- Balanced serious yet friendly demeanor?
- Avoiding overly exaggerated or inappropriate expressions?

4. Posture / Stability:
- Upright, confident posture vs slouched appearance?
- Stable positioning without excessive movement?
- Professional physical presence?

5. Head Pose & Movement:
- Natural head positioning vs excessive movement?
- Composed vs restless head gestures?

6. Gestures (Hands) - OPTIONAL:
- If hands visible: purposeful vs excessive gesturing?
- Note: Having no visible hands/gestures is perfectly fine and not a weakness

7. Fidgeting / Self-Touch:
- Observable nervous touching or fidgeting?
- Composed vs restless physical behavior?

Return ONLY a JSON object with exactly this format:
{
  "presentationStrengths": ["unique positive behavior 1", "different positive behavior 2"],
  "presentationWeaknesses": ["unique negative behavior 1", "different negative behavior 2"]
}

CRITICAL: "Neutral and unexpressive facial demeanor" is a WEAKNESS, not a strength. Only put genuinely positive behaviors in presentationStrengths, but ensure at least 1 is always included.`;

      const cleanImageData = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      console.log('🧹 Cleaned image data length:', cleanImageData.length);
      console.log('🧹 First 50 chars of cleaned data:', cleanImageData.substring(0, 50));
      
      console.log('🤖 Sending to Gemini API...');
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: cleanImageData,
            mimeType: "image/jpeg"
          }
        }
      ]);

      const responseText = result.response.text();
      console.log('🤖 Gemini visual analysis response:', responseText);
      console.log('🤖 Response length:', responseText.length);

      try {
        let jsonText = responseText;
        if (responseText.includes('```json')) {
          const jsonStart = responseText.indexOf('```json') + 7;
          const jsonEnd = responseText.indexOf('```', jsonStart);
          if (jsonEnd > jsonStart) {
            jsonText = responseText.substring(jsonStart, jsonEnd).trim();
          }
        }

        const analysis = JSON.parse(jsonText);
        
        if (analysis.presentationStrengths && Array.isArray(analysis.presentationStrengths)) {
          presentationStrengths.push(...analysis.presentationStrengths);
        }
        
        if (analysis.presentationWeaknesses && Array.isArray(analysis.presentationWeaknesses)) {
          presentationWeaknesses.push(...analysis.presentationWeaknesses);
        }

        console.log('✅ Gemini visual analysis completed successfully');

      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        presentationWeaknesses.push('Video analysis completed but results could not be processed');
      }

    } catch (error) {
      console.error('Gemini visual analysis failed:', error);
      presentationWeaknesses.push('Video analysis failed due to technical issue');
    }
  } else {
    presentationWeaknesses.push('No video available - cannot assess visual presentation');
  }

  // Remove duplicates from arrays
  const uniqueStrengths = [...new Set(presentationStrengths)];
  const uniqueWeaknesses = [...new Set(presentationWeaknesses)];

  return {
    strengths,
    areasForImprovement,
    suggestions,
    presentationStrengths: uniqueStrengths,
    presentationWeaknesses: uniqueWeaknesses,
    timestamp: new Date().toISOString()
  };
};

export const analyzeMultiModal = async (req: Request, res: Response) => {
  try {
    const { audioContent, imageData, transcriptText } = req.body;
    const result = await analyzeInterviewPresence(audioContent, imageData, transcriptText);
    res.json({ success: true, analysis: result });
  } catch (error) {
    console.error("Multi-modal analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze interview presence",
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
};

export const testMultiModalSetup = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: "Multi-modal analysis service is available",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Service test failed",
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
};
