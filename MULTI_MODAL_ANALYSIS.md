# Multi-Modal Sentiment Analysis System

## Overview

The Multi-Modal Sentiment Analysis system provides comprehensive interview performance evaluation by analyzing multiple data streams simultaneously:

- **Audio Analysis**: Speech patterns, pace, tone, filler words
- **Visual Analysis**: Facial expressions, micro-expressions, posture, eye contact
- **Text Analysis**: Word choice, sentiment, communication style

This system generates confidence scores and personality trait assessments for interview performance evaluation.

## Features

### 🎤 Audio Sentiment Analysis
- **Speech Pattern Recognition**: Analyzes speaking pace (words per minute)
- **Filler Word Detection**: Counts "um", "uh", "like", etc.
- **Tone Quality Assessment**: Confident, nervous, calm, energetic
- **Speech Clarity Scoring**: Based on transcription confidence
- **Pause Analysis**: Detects excessive pauses and hesitation

### 👁️ Visual Sentiment Analysis
- **Facial Expression Recognition**: Joy, confidence, stress, engagement levels
- **Micro-Expression Detection**: Genuine smiles, tension, focused attention
- **Posture Assessment**: Confident, nervous, relaxed, tense classifications
- **Eye Contact Measurement**: Engagement and attentiveness scoring

### 📝 Text Sentiment Analysis
- **Overall Sentiment Scoring**: Positive/negative/neutral classification
- **Communication Style Detection**: Assertive, passive, collaborative, defensive
- **Keyword Analysis**: Confidence indicators vs uncertainty markers
- **Word Choice Evaluation**: Positive/negative language patterns

### 🧠 Personality Trait Assessment
- **Approachable**: Warmth and welcoming nature
- **Likeable**: Positive impression and charm
- **Team Player**: Collaborative skills and teamwork
- **Easy to Work With**: Interpersonal compatibility
- **Willing to Learn**: Growth mindset and openness
- **Leadership**: Natural leadership presence
- **Analytical Thinking**: Problem-solving approach

## API Endpoints

### POST `/api/multi-modal/analyze`
Performs comprehensive multi-modal sentiment analysis.

**Request Body:**
```json
{
  "audioContent": "base64_encoded_audio",  // Optional
  "imageData": "base64_encoded_image",     // Optional
  "transcriptText": "text_to_analyze"     // Optional
}
```

**Response:**
```json
{
  "message": "Multi-modal sentiment analysis completed",
  "analysis": {
    "overallConfidence": 0.85,
    "personalityTraits": {
      "approachable": 0.78,
      "likeable": 0.82,
      "teamPlayer": 0.75,
      "easyToWorkWith": 0.80,
      "willingToLearn": 0.88,
      "leadership": 0.72,
      "analyticalThinking": 0.79
    },
    "audioSentiment": {
      "confidence": 0.87,
      "pace": 142,
      "fillerWordCount": 3,
      "tonalQuality": "confident",
      "speechClarity": 0.89,
      "pauseAnalysis": {
        "avgPauseLength": 0.8,
        "excessivePauses": false
      }
    },
    "visualSentiment": {
      "confidence": 0.83,
      "facialExpressions": {
        "joy": 0.75,
        "confidence": 0.81,
        "stress": 0.12,
        "engagement": 0.86
      },
      "microExpressions": ["genuine_smile", "focused_attention"],
      "posture": "confident",
      "eyeContact": 0.84
    },
    "textSentiment": {
      "overallSentiment": 0.6,
      "confidence": 0.78,
      "keywordAnalysis": {
        "positiveWords": ["excellent", "passionate", "achieve"],
        "negativeWords": [],
        "confidenceIndicators": ["definitely", "experienced"],
        "uncertaintyIndicators": ["maybe"]
      },
      "communicationStyle": "assertive"
    },
    "recommendations": [
      "Practice reducing filler words to sound more confident",
      "Maintain good eye contact to show engagement"
    ],
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  "dataSourcesUsed": {
    "audio": true,
    "visual": true,
    "text": true
  }
}
```

### GET `/api/multi-modal/test`
Health check endpoint to verify API configuration.

**Response:**
```json
{
  "message": "Multi-modal analysis setup check",
  "apiKeysConfigured": {
    "speechToText": true,
    "vision": true,
    "naturalLanguage": true
  },
  "systemReady": true,
  "features": {
    "audioSentiment": true,
    "visualSentiment": true,
    "textSentiment": true
  }
}
```

## Frontend Integration

### Components

#### MultiModalDashboard
Real-time dashboard component showing analysis results.

```tsx
import MultiModalDashboard from '../components/MultiModalDashboard';

<MultiModalDashboard 
  analysis={currentAnalysis}
  isAnalyzing={isAnalyzing}
  className="bg-white rounded-lg shadow-sm border p-6"
/>
```

#### RealTimeAnalyzer
Service class for continuous analysis during interviews.

```tsx
import { RealTimeAnalyzer } from '../services/multiModalService';

const analyzer = new RealTimeAnalyzer(
  videoElement,
  (result) => {
    // Handle analysis result
    console.log('Analysis result:', result);
  }
);

await analyzer.startAnalysis(15); // Analyze every 15 seconds
```

### Usage in Interview Session

```tsx
// Initialize analysis
const [currentAnalysis, setCurrentAnalysis] = useState(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

// Start analysis when recording begins
const startAnalysis = async () => {
  const analyzer = new RealTimeAnalyzer(
    videoRef.current,
    (result) => setCurrentAnalysis(result)
  );
  await analyzer.startAnalysis();
  setIsAnalyzing(true);
};
```

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Google Cloud API Keys
GOOGLE_STT_API_KEY=your_speech_to_text_api_key
GOOGLE_VISION_API_KEY=your_vision_api_key
GOOGLE_NLP_API_KEY=your_natural_language_api_key
```

## Scoring Algorithm

### Overall Confidence Score
Weighted combination of all analysis components:
- Audio sentiment: 30%
- Visual sentiment: 40% 
- Text sentiment: 30%

### Personality Traits Calculation
Each trait combines multiple factors:

**Approachable** = (joy × 0.4) + (collaborative_style × 0.3) + (calm_tone × 0.3)

**Leadership** = (audio_confidence × 0.4) + (visual_confidence × 0.3) + (assertive_style × 0.3)

## Performance Optimizations

1. **Parallel Processing**: Audio, visual, and text analysis run concurrently
2. **Error Handling**: Graceful degradation if individual APIs fail
3. **Caching**: Results cached for performance
4. **Real-time Updates**: 15-second intervals for live feedback

## Recommendations Engine

The system provides actionable feedback based on analysis results:

- **Audio Issues**: "Practice reducing filler words (um, uh, like) to sound more confident"
- **Visual Concerns**: "Practice relaxation techniques before interviews to reduce visible stress"
- **Text Problems**: "Use more definitive language to express confidence in your abilities"

## Technical Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Tailwind CSS
- **APIs**: Google Cloud Speech-to-Text, Vision API, Natural Language API
- **Real-time**: WebRTC for camera access, MediaRecorder for audio

## Browser Requirements

- Camera access permission
- Microphone access permission
- Modern browser with WebRTC support
- JavaScript enabled

## Security Considerations

- Audio/video data processed client-side before transmission
- Base64 encoding for secure data transfer
- API keys stored securely in environment variables
- No persistent storage of sensitive biometric data

## Future Enhancements

1. **Machine Learning Models**: Custom trained models for interview-specific analysis
2. **Comparative Analysis**: Compare against successful interview patterns
3. **Industry-Specific Metrics**: Tailored scoring for different job roles
4. **Historical Tracking**: Progress tracking across multiple interview sessions
5. **Advanced Micro-expressions**: More sophisticated facial analysis
6. **Voice Stress Analysis**: Advanced audio processing for stress detection

## Troubleshooting

### Common Issues

1. **Camera Access Denied**: Ensure browser permissions are granted
2. **API Key Errors**: Verify all Google Cloud APIs are enabled
3. **High CPU Usage**: Reduce analysis frequency from 15 to 30 seconds
4. **Network Timeouts**: Check internet connection and API rate limits

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Multi-modal analysis debug mode enabled');
```

This comprehensive Multi-Modal Sentiment Analysis system provides unprecedented insights into interview performance, combining cutting-edge AI with practical, actionable feedback for interview improvement.