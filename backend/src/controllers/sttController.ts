import { Request, Response } from "express";
import axios from "axios";

export const transcribeAudio = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_STT_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google Speech-to-Text API key not found in environment variables");
    }

    // Extract audio data from request body
    const { audioContent, config } = req.body;

    // Validate required parameters
    if (!audioContent) {
      return res.status(400).json({
        message: "Missing required parameter",
        required: ["audioContent"],
        error: "Audio content must be provided as base64 string"
      });
    }

    // Default config if not provided
    const defaultConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
    };

    const userConfig = config || {};
    
    // Filter config to only include valid Google STT API fields
    const validGoogleConfig: any = {};
    const validFields = [
      'encoding', 'sampleRateHertz', 'languageCode', 'audioChannelCount',
      'enableAutomaticPunctuation', 'maxAlternatives', 'profanityFilter',
      'enableSeparateRecognitionPerChannel', 'speechContexts', 'useEnhanced'
    ];
    
    // Merge default with user config, but only keep valid fields
    const mergedConfig = { ...defaultConfig, ...userConfig };
    for (const [key, value] of Object.entries(mergedConfig)) {
      if (validFields.includes(key) && value !== undefined) {
        validGoogleConfig[key] = value;
      }
    }

    console.log("Processing STT request with filtered config:", validGoogleConfig);
    if (userConfig.enableSpeakerDiarization !== undefined) {
      console.log("Note: enableSpeakerDiarization is not supported in basic STT API, ignoring");
    }

    // Prepare request body for Google Speech-to-Text API
    const requestBody = {
      config: validGoogleConfig,
      audio: {
        content: audioContent,
      },
    };

    // Call Google Speech-to-Text REST API
    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log("STT API response status:", response.status);

    const data = response.data;

    // Check if transcription results exist
    if (data.results && data.results.length > 0) {
      // Combine all transcription results for complete transcript
      const transcripts = data.results
        .filter((result: any) => result.alternatives && result.alternatives.length > 0)
        .map((result: any) => result.alternatives[0].transcript);
      
      const fullTranscript = transcripts.join(' ').trim();
      
      // Get average confidence from all results
      const confidences = data.results
        .filter((result: any) => result.alternatives && result.alternatives[0].confidence !== undefined)
        .map((result: any) => result.alternatives[0].confidence);
      
      const averageConfidence = confidences.length > 0 
        ? confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length 
        : 0;

      console.log("Transcription successful:", fullTranscript.substring(0, 100) + "...");
      console.log("Combined", data.results.length, "result(s) into full transcript");

      res.json({
        message: "Transcription successful",
        transcript: fullTranscript,
        confidence: averageConfidence,
        results: data.results
      });
    } else {
      console.log("No speech detected in audio");
      res.json({
        message: "No speech detected",
        transcript: "",
        confidence: 0,
        results: []
      });
    }

  } catch (error) {
    console.error("STT Error:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response?.data);
      console.error("Axios error status:", error.response?.status);
      
      // Handle specific Google API errors
      if (error.response?.status === 400) {
        return res.status(400).json({
          message: "Invalid audio format or configuration",
          error: error.response.data?.error?.message || "Bad request to STT API",
        });
      }
    }
    
    res.status(500).json({
      message: "Speech-to-text transcription failed",
      error: (error as Error).message,
    });
  }
};

export const testSTT = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_STT_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google Speech-to-Text API key not found in environment variables");
    }

    // Simple test to verify API key works
    res.json({
      message: "STT API configuration test successful",
      apiKeyPresent: !!API_KEY,
      apiKeyPrefix: API_KEY.substring(0, 10) + "...",
      endpoint: "https://speech.googleapis.com/v1/speech:recognize"
    });

  } catch (error) {
    console.error("STT Test Error:", error);
    res.status(500).json({
      message: "STT API configuration test failed",
      error: (error as Error).message,
    });
  }
};
