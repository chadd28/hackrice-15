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
              className="w-10 h-10 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <img src="/Prepr_logo.png" alt="Prepr Logo" className="w-10 h-10 object-contain" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-100">
              Prepr
            </h1>
          </div>
          <div className="hidden md:flex gap-6 items-center">
            <a href="#features" className="text-slate-300 hover:text-white font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white font-medium transition-colors">How it Works</a>
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
            <motion.div 
              className="inline-block mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="text-lg md:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Introducing Prepr:
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300">
              Master Every Interview with AI-Powered Practice
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Upload your resume, get tailored technical and behavioral questions, and receive instant AI feedback. 
              Transform your interview skills and land your dream job with confidence.
            </p>
            <div className="flex justify-center">
              <DarkGlowButton 
                to="/register" 
                text="Start Your AI Interview" 
                icon={<Mic className="w-5 h-5" />}
                width="300px"
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
            Complete Interview Simulation Platform
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Our AI-powered platform provides realistic full interview experiences with resume-tailored behavioral questions and technical assessments.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard 
            icon={<Mic className="w-6 h-6" />}
            title="Resume-Tailored Questions"
            description="Upload your resume and get personalized behavioral questions based on your experience. Practice with realistic scenarios tailored to your background."
            delay={0.1}
          />
          <FeatureCard 
            icon={<Brain className="w-6 h-6" />}
            title="Technical Assessment"
            description="Answer technical questions relevant to your target role. Get evaluated using semantic analysis and keyword matching against curated ideal answers."
            delay={0.2}
          />
          <FeatureCard 
            icon={<Users className="w-6 h-6" />}
            title="AI-Powered Feedback"
            description="Receive detailed feedback on both behavioral and technical responses with actionable suggestions for improvement and overall scoring."
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
            Complete 4-question interview simulation: 2 behavioral + 2 technical questions tailored to your profile.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <WorkflowStep 
            number="1"
            title="Upload & Setup"
            description="Upload your resume and specify your target job position. Optionally add job posting URL or company details for tailored questions."
            delay={0.1}
          />
          <WorkflowStep 
            number="2"
            title="AI Question Generation"
            description="Our AI generates 2 behavioral questions from your resume and 2 technical questions relevant to your target role using web scraping."
            delay={0.2}
          />
          <WorkflowStep 
            number="3"
            title="Complete Interview"
            description="Answer behavioral questions via voice recording and technical questions via text. Experience realistic interview conditions."
            delay={0.3}
          />
          <WorkflowStep 
            number="4"
            title="Get Comprehensive Feedback"
            description="Receive detailed AI evaluation for all responses with scores, strengths, weaknesses, and actionable improvement suggestions."
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
              Join job seekers who have improved their interview skills with our comprehensive AI-powered platform. 
              Practice both behavioral and technical questions tailored to your profile and target role.
            </p>
            <div className="flex justify-center">
              <DarkGlowButton 
                to="/register" 
                text="Begin Your AI Interview" 
                icon={<Play className="w-5 h-5" />}
                width="300px"
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
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/Prepr_logo.png" alt="Prepr Logo" className="w-8 h-8 object-contain" />
              </div>
              <h3 className="text-xl font-bold">Prepr</h3>
            </div>
            <p className="text-slate-400 text-center md:text-right">
              © {new Date().getFullYear()} Prepr. Built for HackRice 15.
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
