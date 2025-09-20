const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/behav-grader`;

export interface GraderFeedback {
  strengths?: string | string[];
  weaknesses?: string | string[];
  areasForImprovement?: string | string[];
  presentationStrengths?: string | string[];
  presentationWeaknesses?: string | string[];
  suggestions?: string | string[];
  score?: number | string;
  raw?: string;
}

export const behavGraderService = {
  gradeBehavioral: async (
    question: string, 
    answer: string, 
    audioContent?: string, 
    imageData?: string
  ): Promise<{ success: boolean; feedback: GraderFeedback }> => {
    const res = await fetch(`${API_URL}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question, 
        answer,
        audioContent,
        imageData
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Behavioral grading failed');
    }

    const data = await res.json();
    return data;
  }
};
