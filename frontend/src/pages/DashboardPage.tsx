import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, MessageSquare, BarChart3, FileText, Briefcase, Star } from 'lucide-react';
import { authService } from '../services/authService';

function DashboardPage(): React.ReactElement {
  const [user, setUser] = useState<{ name: string; email: string; firstName?: string } | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
      return;
    }

    const userData = authService.getCurrentUser();
    // Extract first name from full name
    if (userData && userData.name) {
      const firstName = userData.name.split(' ')[0];
      setUser({ ...userData, firstName });
    } else {
      setUser(userData);
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Prepr
            </h1>
            <p className="text-slate-300 mt-1">Welcome back, {user.firstName || user.name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Profile Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{user.firstName || user.name}</h3>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="text-sm text-slate-300">
              <p>Status: <span className="text-green-400">Active</span></p>
              <p className="mt-1">Member since today</p>
            </div>
          </div>

          {/* Behavioral Questions Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white">Behavioral Questions</h3>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Practice one behavioral question at a time with instant AI feedback.
            </p>
            <button 
              onClick={() => window.location.href = '/practice/single'}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 py-2 rounded-lg text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
            >
              Start Single Question
            </button>
          </div>

          {/* Technical Questions Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white">Technical Questions</h3>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Practice technical interviews with AI semantic evaluation and real-time feedback.
            </p>
            <button 
              onClick={() => window.location.href = '/practice/technical'}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-2 rounded-lg text-white font-medium hover:from-purple-600 hover:to-indigo-600 transition-all duration-200"
            >
              Start Technical Practice
            </button>
          </div>
        </motion.div>

        {/* Mock Interview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8"
        >
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="w-full text-center">
                <h2 className="text-2xl font-semibold text-white">AI Interview Simulator</h2>
                <p className="text-slate-300">Upload your info and get personalized technical & behavioral questions</p>
              </div>
            </div>
            
            
              <div className="flex flex-col items-center gap-6 mb-6">
                <div className="flex items-center gap-4 w-full max-w-5xl md:gap-6 md:items-stretch">
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <FileText className="w-8 h-8 text-blue-400 mb-3" />
                    <div className="text-lg font-semibold text-white">Resume & Experience</div>
                    <div className="text-sm text-slate-300 mt-2">Upload your resume or paste experience/skills</div>
                  </div>

                  <div className="hidden md:flex items-center justify-center text-4xl text-slate-400 font-bold">+</div>

                  <div className="flex-1 bg-slate-700/50 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <Briefcase className="w-8 h-8 text-green-400 mb-3" />
                    <div className="text-lg font-semibold text-white">Job Description</div>
                <div className="text-sm text-slate-300 mt-2">Paste job details, select a role, or add a link to the job posting</div>                  </div>

                  <div className="hidden md:flex items-center justify-center text-4xl text-slate-400 font-bold">=</div>

                  <div className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-lg">
                    <Star className="w-8 h-8 text-white mb-3" />
                    <div className="text-lg font-semibold text-white">Personalized Questions</div>
                    <div className="text-sm text-white/90 mt-2">Tech & behavioral questions tailored to your resume and the job</div>
                  </div>
                </div>

                {/* compact mobile row for the equation */}
                <div className="md:hidden w-full max-w-3xl flex items-center justify-between gap-3">
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-white">Resume</div>
                  </div>
                  <div className="text-2xl text-slate-400 font-bold">+</div>
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-white">Job</div>
                  </div>
                  <div className="text-2xl text-slate-400 font-bold">=</div>
                  <div className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg p-3 text-center text-white">
                    <div className="text-sm font-semibold">Personalized Qs</div>
                  </div>
                </div>
              </div>

            <button 
              onClick={() => window.location.href = '/interview/setup'}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 rounded-lg text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-lg">
              Start AI Interview
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default DashboardPage;
