import { Request, Response } from "express";
import axios from "axios";

export const testTTS = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_TTS_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google TTS API key not found in environment variables");
    }


    const text = "Hello! Welcome to your interview. My name is John, and I’ll be asking you a few questions today.";


    // Call Google TTS REST API
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        input: { text },
        voice: { languageCode: "en-US", 
                  name: "en-US-Wavenet-D",    // change voice 
                  ssmlGender: "MALE" },
        audioConfig: { audioEncoding: "MP3" },
      }
    );


    const audioContent = response.data.audioContent;

    if (!audioContent) {
      console.error("No audioContent in response:", response.data);
      throw new Error("No audio returned from TTS API");
    }


    // Return base64 audio to frontend
    res.json({
      message: "TTS synthesis successful",
      audioContent,
    });
  } catch (error) {
    console.error("TTS Error:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response?.data);
      console.error("Axios error status:", error.response?.status);
    }
    
    res.status(500).json({
      message: "TTS synthesis failed",
      error: (error as Error).message,
    });
  }
};

export const generateIntroduction = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_TTS_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google TTS API key not found in environment variables");
    }

    // Extract parameters from request body
    const { position, company, interviewerName } = req.body;

    // Validate required parameters
    if (!position || !company || !interviewerName) {
      return res.status(400).json({
        message: "Missing required parameters",
        required: ["position", "company", "interviewerName"]
      });
    }

    // Generate personalized introduction text
    const introText = `Hi! Welcome to your interview for the ${position} position at ${company}. My name is ${interviewerName}, and I'll be asking you a few questions today. Let's begin with some behavioral questions to better understand your experience and approach to different situations.`;


    // Call Google TTS REST API
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        input: { text: introText },
        voice: { 
          languageCode: "en-US", 
          name: "en-US-Wavenet-D",
          ssmlGender: "MALE" 
        },
        audioConfig: { 
            audioEncoding: "MP3",
            speakingRate: 4, // 1.0 is normal
        },
      }
    );

    const audioContent = response.data.audioContent;

    if (!audioContent) {
      console.error("No audioContent in response:", response.data);
      throw new Error("No audio returned from TTS API");
    }


    // Return base64 audio to frontend
    res.json({
      message: "Introduction TTS synthesis successful",
      audioContent,
      introText
    });
  } catch (error) {
    console.error("Introduction TTS Error:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response?.data);
      console.error("Axios error status:", error.response?.status);
    }
    
    res.status(500).json({
      message: "Introduction TTS synthesis failed",
      error: (error as Error).message,
    });
  }
};

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_TTS_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google TTS API key not found in environment variables");
    }

    // Extract question from request body
    const { question } = req.body;

    // Validate required parameter
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        message: "Missing required parameter",
        required: ["question"],
        error: "Question must be a non-empty string"
      });
    }


    // Call Google TTS REST API
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        input: { text: question },
        voice: { 
          languageCode: "en-US", 
          name: "en-US-Wavenet-D",
          ssmlGender: "MALE" 
        },
        audioConfig: { 
            audioEncoding: "MP3",
            speakingRate: 4, // 1.0 is normal
         },
      }
    );

    const audioContent = response.data.audioContent;

    if (!audioContent) {
      console.error("No audioContent in response:", response.data);
      throw new Error("No audio returned from TTS API");
    }


    // Return base64 audio to frontend
    res.json({
      message: "Question TTS synthesis successful",
      audioContent,
      question
    });
  } catch (error) {
    console.error("Question TTS Error:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response?.data);
      console.error("Axios error status:", error.response?.status);
    }
    
    res.status(500).json({
      message: "Question TTS synthesis failed",
      error: (error as Error).message,
    });
  }
};
