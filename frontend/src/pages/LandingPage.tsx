import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Brain, Users, Play } from 'lucide-react';
import DarkGlowButton from '../components/DarkGlowButton';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

interface WorkflowStepProps {
  number: string;
  title: string;
  description: string;
  delay: number;
}

function LandingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-lg flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Brain className="w-6 h-6 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Pitch AI Interviewer
            </h1>
          </div>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#features" className="text-slate-300 hover:text-white font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white font-medium transition-colors">How it Works</a>
            <a href="/test-tts" className="text-slate-300 hover:text-white font-medium transition-colors">Test TTS</a>
          </div>
          <div className="flex gap-3 items-center">
            <a 
              href="/login" 
              className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-all duration-200 hover:bg-slate-800/50 rounded-lg"
            >
              Login
            </a>
            <a 
              href="/register"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
            >
              Sign Up
            </a>
          </div>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300">
              Master Your Interview Skills with AI
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Practice behavioral interviews with our AI-powered platform. Get instant feedback, 
              improve your responses, and land your dream job with confidence.
            </p>
            <div className="flex justify-center">
              <DarkGlowButton 
                to="/register" 
                text="Start Behavioral Practice" 
                icon={<Mic className="w-5 h-5" />}
                width="280px"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-16 md:py-24">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
            Comprehensive Behavioral Interview Training
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Our AI-powered platform provides realistic behavioral interview simulations with professional feedback.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard 
            icon={<Mic className="w-6 h-6" />}
            title="Voice Practice"
            description="Practice behavioral questions with AI-generated scenarios. Record your responses and get detailed feedback on communication and clarity."
            delay={0.1}
          />
          <FeatureCard 
            icon={<Brain className="w-6 h-6" />}
            title="AI-Powered Feedback"
            description="Advanced semantic analysis compares your responses against curated ideal answers for precise, actionable feedback."
            delay={0.2}
          />
          <FeatureCard 
            icon={<Users className="w-6 h-6" />}
            title="Professional Voice"
            description="Questions are read aloud using Google Cloud's natural WaveNet voices for a realistic interview experience."
            delay={0.3}
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-16 md:py-24">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-300">
            How It Works
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Simple, effective, and AI-driven interview practice in just a few steps.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <WorkflowStep 
            number="1"
            title="Select Practice Session"
            description="Choose from various behavioral interview scenarios and question types tailored to your industry."
            delay={0.1}
          />
          <WorkflowStep 
            number="2"
            title="Listen & Respond"
            description="AI reads behavioral questions aloud with natural voice. Record your verbal response and share your experiences."
            delay={0.2}
          />
          <WorkflowStep 
            number="3"
            title="AI Analysis"
            description="Our AI evaluates your response using semantic matching against ideal behavioral answer patterns."
            delay={0.3}
          />
          <WorkflowStep 
            number="4"
            title="Get Feedback"
            description="Receive detailed feedback on communication skills, answer structure, and specific improvement suggestions."
            delay={0.4}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <motion.div 
          className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-10 md:p-16 relative overflow-hidden border border-slate-800"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
              Ready to Ace Your Next Interview?
            </h2>
            <p className="text-lg mb-8 text-slate-300">
              Join thousands of job seekers who have improved their behavioral interview skills with our AI-powered platform. 
              Start practicing today and land your dream job with confidence.
            </p>
            <div className="flex justify-center">
              <DarkGlowButton 
                to="/register" 
                text="Start Behavioral Practice" 
                icon={<Play className="w-5 h-5" />}
                width="280px"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">Pitch AI Interviewer</h3>
            </div>
            <p className="text-slate-400 text-center md:text-right">
              © {new Date().getFullYear()} Pitch AI Interviewer. Built for HackRice 15.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Component Definitions
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => (
  <motion.div 
    className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-colors h-full"
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <motion.div 
      className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-lg inline-block mb-4"
      whileHover={{ scale: 1.1, rotate: 5 }}
    >
      {icon}
    </motion.div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

const WorkflowStep: React.FC<WorkflowStepProps> = ({ number, title, description, delay }) => (
  <motion.div 
    className="text-center"
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <motion.div 
      className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4"
      whileHover={{ scale: 1.1 }}
    >
      {number}
    </motion.div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export default LandingPage;
