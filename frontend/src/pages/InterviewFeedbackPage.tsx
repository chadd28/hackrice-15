import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, Target, Lightbulb, User } from 'lucide-react';

interface FeedbackData {
  questionIndex: number;
  question: string;
  answer: string;
  feedback: {
    score?: number;
    strengths?: string;
    suggestions?: string;
  } | null;
}

interface InterviewResults {
  duration: number;
  questionsAnswered: number;
  totalQuestions: number;
  feedbackData: FeedbackData[];
  completedAt: string;
}

/**
 * Interview Feedback Page - Shows detailed feedback for completed behavioral interview
 */
function InterviewFeedbackPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get results from navigation state
  const results = location.state as InterviewResults;

  // Debug: Log the received data
  console.log('📊 Feedback page received data:', results);

  // Redirect to dashboard if no results data
  if (!results) {
    console.log('❌ No results data found, redirecting to dashboard');
    navigate('/dashboard');
    return <div></div>;
  }

  const { duration, questionsAnswered, totalQuestions, feedbackData, completedAt } = results;
  
  // Debug: Log specific feedback data
  console.log('📋 Feedback data array:', feedbackData);
  console.log('📊 Number of feedback items:', feedbackData?.length || 0);

  // Calculate average score
  const validScores = (feedbackData || [])
    .map(item => item.feedback?.score)
    .filter((score): score is number => typeof score === 'number');
  const averageScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length * 10) / 10
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Interview Feedback
            </h1>
          </div>
          <div className="text-sm text-slate-400">
            Completed {new Date(completedAt).toLocaleString()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Interview Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Interview Complete!</h2>
              <p className="text-slate-400">Behavioral Interview Session</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{duration}</div>
              <div className="text-sm text-slate-400">Minutes</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <User className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{questionsAnswered}/{totalQuestions}</div>
              <div className="text-sm text-slate-400">Questions</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {averageScore !== null ? `${averageScore}/10` : 'N/A'}
              </div>
              <div className="text-sm text-slate-400">Avg Score</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">Complete</div>
              <div className="text-sm text-slate-400">Status</div>
            </div>
          </div>
        </motion.div>

        {/* Question Feedback */}
        <div className="space-y-6">
          {(feedbackData || []).length > 0 ? (
            feedbackData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + (index * 0.1) }}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6"
            >
              {/* Question Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{item.questionIndex + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Question {item.questionIndex + 1}
                  </h3>
                  <p className="text-slate-300 mb-4 leading-relaxed">
                    {item.question}
                  </p>
                </div>
              </div>

              {/* Your Answer */}
              <div className="mb-6">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Answer
                </h4>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-200 leading-relaxed">
                    {item.answer || 'No transcription available'}
                  </p>
                </div>
              </div>

              {/* AI Feedback */}
              {item.feedback ? (
                <div className="space-y-4">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI Feedback
                  </h4>
                  
                  {/* Score */}
                  {item.feedback.score && (
                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-slate-300 font-medium">Overall Score:</span>
                      <span className="text-xl font-bold text-green-400">
                        {item.feedback.score}/10
                      </span>
                    </div>
                  )}
                  
                  {/* Strengths */}
                  {item.feedback.strengths && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <h5 className="text-green-300 font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Strengths
                      </h5>
                      <p className="text-slate-200 text-sm leading-relaxed">
                        {item.feedback.strengths}
                      </p>
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {item.feedback.suggestions && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h5 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Suggestions for Improvement
                      </h5>
                      <p className="text-slate-200 text-sm leading-relaxed">
                        {item.feedback.suggestions}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <p className="text-slate-400 text-sm">No feedback available for this question.</p>
                </div>
              )}
            </motion.div>
          ))
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
              <p className="text-slate-400">No feedback data available.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 flex gap-4 justify-center"
        >
          <button
            onClick={() => navigate('/interview/setup')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Practice Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export default InterviewFeedbackPage;
