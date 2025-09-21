import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, Target, Lightbulb, User, Brain, Star } from 'lucide-react';

interface BehavioralFeedback {
  score?: number;
  strengths?: string;
  suggestions?: string[] | string; // Handle both array and string formats
}

interface TechnicalFeedback {
  questionId: number;
  similarity: number;
  score: number;
  feedback: string;
  isCorrect: boolean;
  keywordMatches: string[];
  suggestions: string[];
}

interface FeedbackData {
  questionIndex: number;
  question: string;
  answer: string;
  feedback: BehavioralFeedback | TechnicalFeedback | null;
  questionType: 'behavioral' | 'technical';
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

  const { duration, feedbackData, completedAt } = results;
  
  // Debug: Log specific feedback data
  console.log('📋 Feedback data array:', feedbackData);
  console.log('📊 Number of feedback items:', feedbackData?.length || 0);

  // Calculate average score - handle both behavioral and technical feedback
  const validScores = (feedbackData || [])
    .map(item => {
      if (!item.feedback) return null;
      if (item.questionType === 'behavioral') {
        return (item.feedback as BehavioralFeedback).score;
      } else {
        return (item.feedback as TechnicalFeedback).score;
      }
    })
    .filter((score): score is number => typeof score === 'number');
  
  const averageScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length * 10) / 10
    : null;

  // Get score display helper - handles both 1-10 (technical) and behavioral scores
  const getScoreDisplay = (score: number) => {
    // For technical questions (1-10 scale)
    if (score <= 10) {
      if (score >= 8.5) return { color: 'text-green-400', emoji: '🎉', label: 'Excellent!' };
      if (score >= 7) return { color: 'text-blue-400', emoji: '✅', label: 'Good' };
      if (score >= 5) return { color: 'text-yellow-400', emoji: '⚠️', label: 'Partial' };
      return { color: 'text-red-400', emoji: '❌', label: 'Needs Improvement' };
    }
    // For behavioral questions (0-100 scale, but typically displayed as x/10)
    if (score >= 85) return { color: 'text-green-400', emoji: '🎉', label: 'Excellent!' };
    if (score >= 70) return { color: 'text-blue-400', emoji: '✅', label: 'Good' };
    if (score >= 50) return { color: 'text-yellow-400', emoji: '⚠️', label: 'Partial' };
    return { color: 'text-red-400', emoji: '❌', label: 'Needs Improvement' };
  };

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
              <p className="text-slate-400">Mock Interview Session</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{duration}</div>
              <div className="text-sm text-slate-400">Minutes</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {averageScore !== null ? `${averageScore}/10` : 'N/A'}
              </div>
              <div className="text-sm text-slate-400">Avg Score</div>
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
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      Question {item.questionIndex + 1}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.questionType === 'behavioral' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {item.questionType === 'behavioral' ? 'Behavioral' : 'Technical'}
                    </span>
                  </div>
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
                    AI Feedback - {item.questionType === 'behavioral' ? 'Behavioral' : 'Technical'} Question
                  </h4>
                  
                  {item.questionType === 'behavioral' ? (
                    // Behavioral feedback rendering
                    <>
                      {/* Score */}
                      {(item.feedback as BehavioralFeedback).score && (
                        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-300 font-medium">Overall Score:</span>
                          <span className="text-xl font-bold text-green-400">
                            {(item.feedback as BehavioralFeedback).score}/10
                          </span>
                        </div>
                      )}
                      
                      {/* Strengths */}
                      {(item.feedback as BehavioralFeedback).strengths && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <h5 className="text-green-300 font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Strengths
                          </h5>
                          <p className="text-slate-200 text-sm leading-relaxed">
                            {(item.feedback as BehavioralFeedback).strengths}
                          </p>
                        </div>
                      )}
                      
                      {/* Suggestions */}
                      {(item.feedback as BehavioralFeedback).suggestions && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <h5 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Suggestions for Improvement
                          </h5>
                          <div className="text-slate-200 text-sm leading-relaxed">
                            {(() => {
                              const suggestions = (item.feedback as BehavioralFeedback).suggestions;
                              
                              // Handle array format (new format)
                              if (Array.isArray(suggestions)) {
                                return (
                                  <ul className="space-y-1">
                                    {suggestions.map((suggestion, idx) => (
                                      <li key={idx} className="flex items-start">
                                        <span className="text-blue-400 mr-2">•</span>
                                        <span>{suggestion}</span>
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }
                              
                              // Handle string format (fallback for old data)
                              if (typeof suggestions === 'string') {
                                // Check if it contains multiple sentences and format as bullets
                                if (suggestions.includes('.') && suggestions.split('.').length > 2) {
                                  const suggestionList = suggestions
                                    .split('.')
                                    .map(s => s.trim())
                                    .filter(s => s.length > 10);
                                  
                                  return (
                                    <ul className="space-y-1">
                                      {suggestionList.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start">
                                          <span className="text-blue-400 mr-2">•</span>
                                          <span>{suggestion}{suggestion.endsWith('.') ? '' : '.'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                } else {
                                  return <p>{suggestions}</p>;
                                }
                              }
                              
                              return null;
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Technical feedback rendering
                    <>
                      {/* Score Summary Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className={`text-xl font-bold ${getScoreDisplay((item.feedback as TechnicalFeedback).score).color}`}>
                            {(item.feedback as TechnicalFeedback).score}/10
                          </div>
                          <div className="text-xs text-slate-400">Overall Score</div>
                        </div>
                        
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-blue-400">
                            {((item.feedback as TechnicalFeedback).similarity * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-400">Semantic Match</div>
                        </div>
                        
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-green-400">
                            {(item.feedback as TechnicalFeedback).keywordMatches.length}
                          </div>
                          <div className="text-xs text-slate-400">Keywords Found</div>
                        </div>
                        
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="text-xl">
                            {(item.feedback as TechnicalFeedback).isCorrect ? '✅' : '❌'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {(item.feedback as TechnicalFeedback).isCorrect ? 'Correct' : 'Needs Work'}
                          </div>
                        </div>
                      </div>

                      {/* Detailed Technical Feedback */}
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                          <h5 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Detailed Feedback
                          </h5>
                          <p className="text-slate-200 text-sm leading-relaxed">
                            {(item.feedback as TechnicalFeedback).feedback}
                          </p>
                        </div>

                        {(item.feedback as TechnicalFeedback).keywordMatches.length > 0 && (
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <h5 className="text-green-300 font-medium mb-2 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Keywords You Mentioned
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {(item.feedback as TechnicalFeedback).keywordMatches.map((keyword, keywordIndex) => (
                                <span
                                  key={keywordIndex}
                                  className="bg-green-600 text-white px-2 py-1 rounded-full text-xs"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(item.feedback as TechnicalFeedback).suggestions && (item.feedback as TechnicalFeedback).suggestions.length > 0 && (
                          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <h5 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Suggestions for Improvement
                            </h5>
                            <ul className="space-y-1">
                              {(item.feedback as TechnicalFeedback).suggestions.map((suggestion, suggestionIndex) => (
                                <li key={suggestionIndex} className="flex items-start text-slate-200 text-sm">
                                  <span className="text-blue-400 mr-2">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
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
