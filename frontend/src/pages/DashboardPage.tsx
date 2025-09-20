import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, MessageSquare, BarChart3 } from 'lucide-react';
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
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Pitch AI Interviewer
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
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
            <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 py-2 rounded-lg text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200">
              Start Single Question
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
              <div>
                <h2 className="text-2xl font-semibold text-white">Mock Interview</h2>
                <p className="text-slate-300">Complete 4-question interview simulation with comprehensive feedback</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400 mb-1">4</div>
                <div className="text-sm text-slate-300">Questions</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-green-400 mb-1">~15</div>
                <div className="text-sm text-slate-300">Minutes</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-400 mb-1">AI</div>
                <div className="text-sm text-slate-300">Feedback</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-pink-400 mb-1">★</div>
                <div className="text-sm text-slate-300">Score</div>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 rounded-lg text-white font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-lg">
              Start Mock Interview
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default DashboardPage;
