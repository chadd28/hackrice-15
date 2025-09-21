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

      const prompt = `Analyze this interview video frame for presentation skills. Provide BALANCED and CONSTRUCTIVE feedback focusing on professional development.

CRITICAL RULE: NEVER contradict yourself. If you mention eye contact as a strength, do NOT mention lack of eye contact as a weakness. Choose ONE perspective per trait.

IMPORTANT: Always provide encouraging and balanced feedback. Look for genuine positives and frame improvements as growth opportunities.

ANALYSIS APPROACH:
1. Observe the person's presentation objectively
2. Identify 2-3 genuine strengths to acknowledge
3. Identify 1-2 areas for growth (without contradicting strengths)
4. Frame all feedback constructively

POSITIVE BEHAVIORS (choose those that are genuinely present):
- Maintains good eye contact with camera
- Shows genuine smiles and positive expressions
- Demonstrates professional appearance and posture
- Displays engaged and attentive positioning
- Exhibits calm and composed demeanor
- Professional setup and background
- Confident and relaxed body language
- Good head positioning and framing

AREAS FOR GROWTH (only mention if NOT already praised as strength):
- Could enhance eye contact consistency (only if eye contact was NOT listed as strength)
- Opportunity for more expressive engagement (only if expressions were NOT praised)
- Potential to optimize posture (only if posture was NOT a strength)
- Room for enhanced enthusiasm visibility
- Opportunity for more animated delivery

CONSISTENCY RULES:
- If eye contact is good → list as strength, do NOT mention eye contact in weaknesses
- If posture is professional → list as strength, do NOT mention posture improvements
- If expressions are positive → list as strength, do NOT suggest more expression
- Focus on different aspects for strengths vs areas for improvement

Return ONLY a JSON object with exactly this format:
{
  "presentationStrengths": ["specific genuine strength 1", "different genuine strength 2", "another genuine strength 3"],
  "presentationWeaknesses": ["growth opportunity 1 (different from strengths)", "growth opportunity 2 (different from strengths)"]
}

CRITICAL: Ensure NO contradictions between strengths and weaknesses. Each trait should only appear in ONE category.`;

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
        console.log('📊 Parsed strengths:', analysis.presentationStrengths);
        console.log('📊 Parsed weaknesses:', analysis.presentationWeaknesses);

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

  console.log('🎯 Final presentation analysis results:');
  console.log('📈 Final strengths:', uniqueStrengths);
  console.log('📉 Final weaknesses:', uniqueWeaknesses);

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
