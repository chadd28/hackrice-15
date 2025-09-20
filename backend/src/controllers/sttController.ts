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
      sampleRateHertz: 16000, // Reduced from 48000 to 16000 for smaller file size and better STT performance
      languageCode: 'en-US',
    };

    const userConfig = config || {};
    
    // Log audio file size (base64 string length gives us a rough estimate)
    const estimatedFileSize = (audioContent.length * 3) / 4; // Base64 to bytes conversion estimate
    console.log(`Audio file size estimate: ${estimatedFileSize} bytes (${(estimatedFileSize / 1024 / 1024).toFixed(2)} MB)`);
    
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

    if (userConfig.enableSpeakerDiarization !== undefined) {
    }

    // Prepare request body for Google Speech-to-Text API
    const requestBody = {
      config: validGoogleConfig,
      audio: {
        content: audioContent,
      },
    };

    // Use Long Running Recognize for audio longer than 1 minute (up to 480 minutes)
    console.log("Starting long running transcription...");
    
    // Start the long running operation
    const longRunningResponse = await axios.post(
      `https://speech.googleapis.com/v1/speech:longrunningrecognize?key=${API_KEY}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log("Long running operation started, status:", longRunningResponse.status);
    
    const operationName = longRunningResponse.data.name;
    console.log("Operation name:", operationName);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // Wait up to 5 minutes (5 second intervals)
    let operationComplete = false;
    let finalResult = null;

    while (!operationComplete && attempts < maxAttempts) {
      attempts++;
      
      // Wait before checking status
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      
      try {
        const statusResponse = await axios.get(
          `https://speech.googleapis.com/v1/operations/${operationName}?key=${API_KEY}`
        );
        
        const operation = statusResponse.data;
        console.log(`Polling attempt ${attempts}, operation done: ${operation.done}`);
        
        if (operation.done) {
          operationComplete = true;
          
          if (operation.error) {
            throw new Error(`Long running operation failed: ${operation.error.message}`);
          }
          
          finalResult = operation.response;
        }
      } catch (pollError) {
        console.error("Error polling operation status:", pollError);
        // Continue polling unless we've exceeded max attempts
      }
    }

    if (!operationComplete) {
      return res.status(408).json({
        message: "Transcription timeout - operation took too long to complete",
        operationName: operationName,
        error: "You can check the operation status manually if needed"
      });
    }

    console.log("Long running operation completed!");
    const data = finalResult;

    // Check if transcription results exist
    if (data && data.results && data.results.length > 0) {
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


      res.json({
        message: "Long running transcription successful",
        transcript: fullTranscript,
        confidence: averageConfidence,
        results: data.results,
        operationName: operationName
      });
    } else {
      res.json({
        message: "No speech detected",
        transcript: "",
        confidence: 0,
        results: [],
        operationName: operationName
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

export const transcribeChunk = async (req: Request, res: Response) => {
  try {
    const API_KEY = process.env.GOOGLE_STT_API_KEY;
    
    if (!API_KEY) {
      throw new Error("Google Speech-to-Text API key not found in environment variables");
    }

    // Extract audio data from request body
    const { audioContent, config, chunkIndex } = req.body;

    // Validate required parameters
    if (!audioContent) {
      return res.status(400).json({
        message: "Missing required parameter",
        required: ["audioContent"],
        error: "Audio content must be provided as base64 string"
      });
    }

    // Default config optimized for chunks
    const defaultConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000, // Must match actual WebM OPUS encoding from browser
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      maxAlternatives: 1,
    };

    const userConfig = config || {};
    
    // Log audio chunk size
    const estimatedFileSize = (audioContent.length * 3) / 4;
    const estimatedDurationSeconds = estimatedFileSize / (48000 * 2); // Rough estimate: 48kHz * 2 bytes per sample
    console.log(`Audio chunk ${chunkIndex || 'unknown'} details:`);
    console.log(`- Size estimate: ${estimatedFileSize} bytes (${(estimatedFileSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`- Estimated duration: ${estimatedDurationSeconds.toFixed(1)} seconds`);
    console.log(`- Base64 length: ${audioContent.length} characters`);
    
    if (estimatedDurationSeconds > 60) {
      console.warn(`WARNING: Chunk ${chunkIndex} appears to be longer than 60 seconds (${estimatedDurationSeconds.toFixed(1)}s)`);
      return res.status(400).json({
        message: "Audio chunk too long for sync API",
        error: `Estimated duration: ${estimatedDurationSeconds.toFixed(1)}s (max 60s for sync recognition)`,
        chunkIndex: chunkIndex,
        estimatedDuration: estimatedDurationSeconds
      });
    }
    
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

    console.log(`Processing chunk ${chunkIndex || 'unknown'} with config:`, validGoogleConfig);

    // Prepare request body for Google Speech-to-Text API
    const requestBody = {
      config: validGoogleConfig,
      audio: {
        content: audioContent,
      },
    };

    // Use regular recognize for chunks (faster, no polling needed)
    console.log(`Starting chunk ${chunkIndex || 'unknown'} transcription...`);
    
    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log(`Chunk ${chunkIndex || 'unknown'} transcription completed, status:`, response.status);
    const data = response.data;

    // Check if transcription results exist
    if (data && data.results && data.results.length > 0) {
      // Get the transcript from the first result
      const transcript = data.results[0].alternatives[0].transcript || '';
      const confidence = data.results[0].alternatives[0].confidence || 0;

      console.log(`Chunk ${chunkIndex || 'unknown'} transcription successful:`, transcript);

      res.json({
        message: "Chunk transcription successful",
        transcript: transcript,
        confidence: confidence,
        chunkIndex: chunkIndex,
        results: data.results
      });
    } else {
      console.log(`No speech detected in chunk ${chunkIndex || 'unknown'}`);
      res.json({
        message: "No speech detected in chunk",
        transcript: "",
        confidence: 0,
        chunkIndex: chunkIndex,
        results: []
      });
    }

  } catch (error) {
    console.error(`Chunk ${req.body.chunkIndex || 'unknown'} STT Error:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios error response:", error.response?.data);
      console.error("Axios error status:", error.response?.status);
      
      // Handle specific Google API errors
      if (error.response?.status === 400) {
        return res.status(400).json({
          message: "Invalid audio format or configuration",
          error: error.response.data?.error?.message || "Bad request to STT API",
          chunkIndex: req.body.chunkIndex
        });
      }
    }
    
    res.status(500).json({
      message: "Chunk transcription failed",
      error: (error as Error).message,
      chunkIndex: req.body.chunkIndex
    });
  }
};
