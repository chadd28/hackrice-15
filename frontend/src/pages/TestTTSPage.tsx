import React from 'react';
import { motion } from 'framer-motion';
import DarkGlowButton from '../components/DarkGlowButton';

function TestTTSPage(): React.ReactElement {
  const playTTS = async (): Promise<void> => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      console.log('Making request to:', `${backendUrl}/api/tts/test`);
      
      const res = await fetch(`${backendUrl}/api/tts/test`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.audioContent) {
        const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
        audio.play();
        console.log('Audio should be playing now');
      } else {
        console.error('No audio content received');
      }
    } catch (error) {
      console.error('Error playing TTS:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      <div className="container mx-auto px-6 py-16">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            TTS Test Page
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-md mx-auto">
            Test the Google Text-to-Speech API integration with our backend.
          </p>
          
          <motion.div 
            className="bg-slate-800 rounded-xl p-8 border border-slate-700 max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">Test Google TTS</h2>
            <p className="text-slate-300 mb-6">
              Click the button below to test the TTS functionality. It will say: "Hello, we are testing Google TTS!"
            </p>
            
            <button
              onClick={playTTS}
              className="relative w-full flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-3 px-6 rounded-lg text-white font-medium hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-200"
            >
              <span className="mr-3">Play TTS</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </button>
          </motion.div>

          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <DarkGlowButton 
              to="/" 
              text="Back to Home" 
              width="200px"
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default TestTTSPage;
