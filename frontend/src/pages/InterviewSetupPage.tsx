import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, User, Building, Plus, X, Loader, ArrowRight, ArrowLeft } from 'lucide-react';
import UploadField from '../components/UploadField';
import { 
  InterviewData, 
  UploadData, 
  InterviewSetupErrors, 
  ProcessedContent,
  UploadFieldError
} from '../types/interview.types';
import interviewService from '../services/interviewService';

/**
 * Interview Setup Page - Main page for configuring interview data
 * Allows users to upload:
 * 1. Resume (required)
 * 2. Job Description (optional) 
 * 3. Company Info (optional)
 * 4. Other relevant info (multiple entries, optional)
 */
const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Main form state
  const [interviewData, setInterviewData] = useState<InterviewData>({
    resume: null,
    jobDescription: null,
    companyInfo: null,
    otherInfo: []
  });

  // Form validation errors
  const [errors, setErrors] = useState<InterviewSetupErrors>({});
  
  // Loading and processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  /**
   * Handle changes to resume data
   */
  const handleResumeChange = useCallback((data: UploadData | null) => {
    setInterviewData(prev => ({ ...prev, resume: data }));
    // Clear resume errors when data changes
    if (errors.resume) {
      setErrors(prev => ({ ...prev, resume: undefined }));
    }
  }, [errors.resume]);

  /**
   * Handle changes to job description data
   */
  const handleJobDescriptionChange = useCallback((data: UploadData | null) => {
    setInterviewData(prev => ({ ...prev, jobDescription: data }));
    // Clear job description errors when data changes
    if (errors.jobDescription) {
      setErrors(prev => ({ ...prev, jobDescription: undefined }));
    }
  }, [errors.jobDescription]);

  /**
   * Handle changes to company info data
   */
  const handleCompanyInfoChange = useCallback((data: UploadData | null) => {
    setInterviewData(prev => ({ ...prev, companyInfo: data }));
    // Clear company info errors when data changes
    if (errors.companyInfo) {
      setErrors(prev => ({ ...prev, companyInfo: undefined }));
    }
  }, [errors.companyInfo]);

  /**
   * Handle changes to other info entries
   */
  const handleOtherInfoChange = useCallback((index: number, data: UploadData | null) => {
    setInterviewData(prev => ({
      ...prev,
      otherInfo: prev.otherInfo.map((item, i) => 
        i === index ? (data || {} as UploadData) : item
      )
    }));
    
    // Clear other info errors for this index
    if (errors.otherInfo?.[index]) {
      setErrors(prev => ({
        ...prev,
        otherInfo: prev.otherInfo?.map((error, i) => 
          i === index ? undefined : error
        ).filter(Boolean) as UploadFieldError[]
      }));
    }
  }, [errors.otherInfo]);

  /**
   * Add a new "other info" field (max 3 entries)
   */
  const addOtherInfoField = () => {
    if (interviewData.otherInfo.length >= 3) {
      return; // Don't add more than 3 fields
    }
    setInterviewData(prev => ({
      ...prev,
      otherInfo: [...prev.otherInfo, {} as UploadData]
    }));
  };

  /**
   * Remove an "other info" field
   */
  const removeOtherInfoField = (index: number) => {
    setInterviewData(prev => ({
      ...prev,
      otherInfo: prev.otherInfo.filter((_, i) => i !== index)
    }));
  };

  /**
   * Validate the form before submission
   */
  const validateForm = (): boolean => {
    const newErrors: InterviewSetupErrors = {};

    // Check required fields
    if (!interviewData.resume) {
      newErrors.resume = { method: 'Resume is required' };
    } else {
      // Validate resume content
      const hasResumeContent = 
        (interviewData.resume.method === 'file' && interviewData.resume.file) ||
        (interviewData.resume.method === 'text' && interviewData.resume.content?.trim()) ||
        (interviewData.resume.method === 'url' && interviewData.resume.url?.trim());
      
      if (!hasResumeContent) {
        newErrors.resume = { method: 'Please provide resume content' };
      }
    }

    // Job description is completely optional - no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Process uploaded content and generate questions
   */
  const handleStartInterview = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Uploading your information...');

    try {
      const processed: ProcessedContent[] = [];

      // Process resume
      if (interviewData.resume) {
        setProcessingStep('Processing resume...');
        const result = await interviewService.upload(interviewData.resume, 'resume');
        if (result.success && result.content) {
          processed.push({
            type: 'resume',
            content: result.content,
            method: interviewData.resume.method,
            filename: interviewData.resume.file?.name,
            url: interviewData.resume.url
          });
        } else {
          throw new Error(result.error || 'Failed to process resume');
        }
      }

      // Process job description (optional)
      if (interviewData.jobDescription) {
        setProcessingStep('Processing job description...');
        const result = await interviewService.upload(interviewData.jobDescription, 'jobDescription');
        if (result.success && result.content) {
          processed.push({
            type: 'jobDescription',
            content: result.content,
            method: interviewData.jobDescription.method,
            filename: interviewData.jobDescription.file?.name,
            url: interviewData.jobDescription.url
          });
        }
        // Don't throw error for optional fields
      }

      // Process company info (optional)
      if (interviewData.companyInfo) {
        setProcessingStep('Processing company information...');
        const result = await interviewService.upload(interviewData.companyInfo, 'companyInfo');
        if (result.success && result.content) {
          processed.push({
            type: 'companyInfo',
            content: result.content,
            method: interviewData.companyInfo.method,
            filename: interviewData.companyInfo.file?.name,
            url: interviewData.companyInfo.url
          });
        }
        // Don't throw error for optional fields
      }

      // Process other info (optional)
      for (let i = 0; i < interviewData.otherInfo.length; i++) {
        const otherData = interviewData.otherInfo[i];
        if (otherData && otherData.method) {
          setProcessingStep(`Processing additional information ${i + 1}...`);
          const result = await interviewService.upload(otherData, 'otherInfo');
          if (result.success && result.content) {
            processed.push({
              type: 'otherInfo',
              content: result.content,
              method: otherData.method,
              filename: otherData.file?.name,
              url: otherData.url
            });
          }
          // Don't throw error for optional fields
        }
      }

      // Generate interview questions
      setProcessingStep('Generating personalized interview questions...');
      const questionsResult = await interviewService.generateQuestions(processed);
      
      if (!questionsResult.success) {
        throw new Error(questionsResult.error || 'Failed to generate questions');
      }

      // Store questions in localStorage for persistence and testing
      localStorage.setItem('interview-questions', JSON.stringify(questionsResult.questions));
      localStorage.setItem('current-question-index', '0');

      // Log questions to console for testing purposes
      console.log('🎯 INTERVIEW QUESTIONS GENERATED:');
      console.log('================================');
      console.log('📋 TECHNICAL QUESTIONS:');
      questionsResult.questions.technical.forEach((q, i) => {
        console.log(`${i + 1}. ${q.question}`);
        console.log(`   Difficulty: ${q.difficulty} | Tags: ${q.tags.join(', ')}`);
        console.log('');
      });
      
      console.log('🤝 BEHAVIORAL QUESTIONS:');
      questionsResult.questions.behavioral.forEach((q, i) => {
        console.log(`${i + 1}. ${q.question}`);
        console.log(`   Difficulty: ${q.difficulty} | Tags: ${q.tags.join(', ')}`);
        console.log('');
      });
      
      console.log('================================');

      // Save session state for future use
      await interviewService.saveSession({
        status: 'ready',
        data: interviewData,
        processedContent: processed,
        questions: questionsResult.questions
      });

      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Interview setup error:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Setup Your AI Interview
              </h1>
              <p className="text-slate-300 mt-1">
                Upload your information to generate personalized interview questions
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Resume Section */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Resume</h2>
                <p className="text-sm text-slate-400">Your professional background and experience</p>
              </div>
            </div>
            
            <UploadField
              label="Resume"
              value={interviewData.resume}
              onChange={handleResumeChange}
              error={errors.resume}
              placeholder={{
                text: "Paste your resume content here...",
                url: "https://linkedin.com/in/yourprofile or your online resume"
              }}
              required
              contentType="resume"
            />
          </div>

          {/* Job Description Section */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Job Description</h2>
                <p className="text-sm text-slate-400">The role you're interviewing for (optional)</p>
              </div>
            </div>
            
            <UploadField
              label="Job Description"
              value={interviewData.jobDescription}
              onChange={handleJobDescriptionChange}
              error={errors.jobDescription}
              placeholder={{
                text: "Paste the job description here...",
                url: "Job posting URL from company website or job board"
              }}
              contentType="jobDescription"
            />
          </div>

          {/* Company Info Section */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Company Information</h2>
                <p className="text-sm text-slate-400">Company culture, values, and background (optional)</p>
              </div>
            </div>
            
            <UploadField
              label="Company Information"
              value={interviewData.companyInfo}
              onChange={handleCompanyInfoChange}
              error={errors.companyInfo}
              placeholder={{
                text: "Company mission, values, culture information...",
                url: "Company website, about page, or careers page"
              }}
              contentType="companyInfo"
            />
          </div>

          {/* Other Info Section */}
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Additional Information</h2>
                  <p className="text-sm text-slate-400">Any other relevant information (optional)</p>
                </div>
              </div>
              
              <button
                onClick={addOtherInfoField}
                disabled={interviewData.otherInfo.length >= 3}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  interviewData.otherInfo.length >= 3
                    ? 'text-slate-500 bg-slate-700/50 border-slate-600 cursor-not-allowed'
                    : 'text-blue-300 bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                {interviewData.otherInfo.length >= 3 ? 'Maximum 3 Fields' : 'Add Field'}
              </button>
            </div>

            {interviewData.otherInfo.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Plus className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="text-sm">No additional information added</p>
                <p className="text-xs text-slate-500">Click "Add Field" to include more context</p>
              </div>
            ) : (
              <div className="space-y-6">
                {interviewData.otherInfo.map((data, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-end mb-3">
                      <button
                        onClick={() => removeOtherInfoField(index)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                    
                    <UploadField
                      label={`Additional Information ${index + 1}`}
                      value={data}
                      onChange={(newData) => handleOtherInfoChange(index, newData)}
                      error={errors.otherInfo?.[index]}
                      placeholder={{
                        text: "Portfolio, projects, certifications, or other relevant information...",
                        url: "Portfolio website, GitHub profile, or other relevant links"
                      }}
                      contentType="otherInfo"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400">
                <X className="w-5 h-5" />
                <span className="font-medium">Error:</span>
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 text-slate-400 hover:text-slate-200 font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleStartInterview}
              disabled={isProcessing}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-lg"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {processingStep}
                </>
              ) : (
                <>
                  Start Interview
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetupPage;