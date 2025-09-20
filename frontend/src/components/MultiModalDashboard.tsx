import React from 'react';
import { MultiModalAnalysisResult } from '../services/multiModalService';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

/**
 * Simplified Multi-Modal Analysis Dashboard Component
 * 
 * Displays bullet-point feedback on interview presence focusing on:
 * - Passion and enthusiasm
 * - Eye contact and engagement
 * - Gestures and body language
 * - Smile and facial expressions
 * - Overall interviewer engagement
 */

interface MultiModalDashboardProps {
  analysis: MultiModalAnalysisResult | null;
  isAnalyzing?: boolean;
  className?: string;
}

export const MultiModalDashboard: React.FC<MultiModalDashboardProps> = ({ 
  analysis, 
  isAnalyzing = false,
  className = ""
}) => {
  if (isAnalyzing) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300">Analyzing interview presence...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`}>
        <p className="text-slate-400 text-center py-8">No analysis available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Presentation Strengths Section */}
      {analysis.presentationStrengths && analysis.presentationStrengths.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-green-400 font-semibold mb-3">
            <CheckCircle className="w-5 h-5" />
            Presentation Strengths
          </h3>
          <div className="space-y-2">
            {analysis.presentationStrengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span className="text-slate-300 text-sm">{strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presentation Weaknesses Section */}
      {analysis.presentationWeaknesses && analysis.presentationWeaknesses.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-red-400 font-semibold mb-3">
            <AlertTriangle className="w-5 h-5" />
            Presentation Weaknesses
          </h3>
          <div className="space-y-2">
            {analysis.presentationWeaknesses.map((weakness, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span className="text-slate-300 text-sm">{weakness}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths Section */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-green-400 font-semibold mb-3">
            <CheckCircle className="w-5 h-5" />
            Strengths
          </h3>
          <div className="space-y-2">
            {analysis.strengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span className="text-slate-300 text-sm">{strength}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Areas for Improvement Section */}
      {analysis.areasForImprovement && analysis.areasForImprovement.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-yellow-400 font-semibold mb-3">
            <AlertTriangle className="w-5 h-5" />
            Areas for Improvement
          </h3>
          <div className="space-y-2">
            {analysis.areasForImprovement.map((area, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span className="text-slate-300 text-sm">{area}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions Section */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="flex items-center gap-2 text-blue-400 font-semibold mb-3">
            <Lightbulb className="w-5 h-5" />
            Suggestions
          </h3>
          <div className="space-y-2">
            {analysis.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span className="text-slate-300 text-sm">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiModalDashboard;