// Types for the interview setup and upload functionality

export type UploadMethod = 'file' | 'text' | 'url';

export interface UploadData {
  method: UploadMethod;
  content?: string; // For text input
  file?: File; // For file upload
  url?: string; // For URL input
}

export interface InterviewData {
  resume: UploadData | null;
  jobDescription: UploadData | null;
  companyInfo: UploadData | null;
  otherInfo: UploadData[]; // Array to support multiple "other" entries
}

export interface ProcessedContent {
  type: 'resume' | 'jobDescription' | 'companyInfo' | 'otherInfo' | 'position' | 'company';
  content: string;
  method: UploadMethod;
  filename?: string; // For file uploads
  url?: string; // For URL uploads
}

export interface GeneratedQuestions {
  behavioral: Question[];
}

export interface Question {
  id: string;
  question: string;
  category: 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[]; // e.g., ['leadership', 'teamwork'], ['company-fit', 'motivation']
}

export interface InterviewSession {
  sessionId: string;
  userId?: string;
  createdAt: string;
  status: 'setup' | 'ready' | 'in-progress' | 'completed';
  data: InterviewData;
  processedContent: ProcessedContent[];
  questions: GeneratedQuestions;
  position?: string;
  company?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  content?: string; // Extracted content from file/URL
  error?: string;
}

export interface GenerateQuestionsRequest {
  sessionId: string;
  processedContent: ProcessedContent[];
}

export interface GenerateQuestionsResponse {
  success: boolean;
  questions: GeneratedQuestions;
  error?: string;
}

// Form validation types
export interface UploadFieldError {
  method?: string;
  content?: string;
  file?: string;
  url?: string;
}

export interface InterviewSetupErrors {
  resume?: UploadFieldError;
  jobDescription?: UploadFieldError;
  companyInfo?: UploadFieldError;
  otherInfo?: UploadFieldError[];
  general?: string;
  company?: string; // Error message for manual company input
  position?: string; // Error message for manual position input
}