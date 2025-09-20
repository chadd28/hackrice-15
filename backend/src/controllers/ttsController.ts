import { Request, Response } from "express";
import axios from "axios";

export const testTTS = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_TTS_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google TTS API key not found in environment variables");
    }

    console.log("API Key found:", API_KEY.substring(0, 10) + "...");

    const text = "Hello! Welcome to your interview. My name is John, and I’ll be asking you a few questions today.";

    console.log("Making request to Google TTS API...");

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

    console.log("Response status:", response.status);
    console.log("Response data keys:", Object.keys(response.data));

    const audioContent = response.data.audioContent;

    if (!audioContent) {
      console.error("No audioContent in response:", response.data);
      throw new Error("No audio returned from TTS API");
    }

    console.log("Audio content length:", audioContent.length);

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
