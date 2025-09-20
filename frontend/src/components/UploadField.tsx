import React, { useState, useRef } from 'react';
import { Upload, FileText, Link, X, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadData, UploadMethod, UploadFieldError } from '../types/interview.types';

interface UploadFieldProps {
  label: string;
  value: UploadData | null;
  onChange: (data: UploadData | null) => void;
  error?: UploadFieldError;
  placeholder?: {
    text?: string;
    url?: string;
  };
  required?: boolean;
  contentType?: string; // Type of content for character limit determination
}

/**
 * Reusable upload field component that supports three input methods:
 * 1. File upload (PDF only)
 * 2. Text input
 * 3. URL input
 */
export const UploadField: React.FC<UploadFieldProps> = ({
  label,
  value,
  onChange,
  error,
  placeholder = {},
  required = false,
  contentType = 'other'
}) => {
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod | null>(
    value?.method || null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle method selection
  const handleMethodSelect = (method: UploadMethod) => {
    setSelectedMethod(method);
    // Clear existing data when switching methods
    onChange({
      method,
      content: '',
      file: undefined,
      url: ''
    });
  };

  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      onChange({
        method: 'file',
        file: undefined
      });
      return;
    }

    onChange({
      method: 'file',
      file
    });
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle text input
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      method: 'text',
      content: event.target.value
    });
  };

  // Handle URL input
  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      method: 'url',
      url: event.target.value
    });
  };

  // Clear the field
  const handleClear = () => {
    setSelectedMethod(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check if the field has valid content
  const hasContent = () => {
    if (!value) return false;
    switch (value.method) {
      case 'file':
        return !!value.file;
      case 'text':
        return !!value.content?.trim();
      case 'url':
        return !!value.url?.trim();
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-200">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {hasContent() && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
        {selectedMethod && !hasContent() && (
          <button
            onClick={() => setSelectedMethod(null)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            ← Back to options
          </button>
        )}
      </div>

      {/* Method Selection */}
      {!selectedMethod && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleMethodSelect('file')}
            className="flex flex-col items-center p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-700/50 transition-colors bg-slate-800/50"
          >
            <Upload className="w-6 h-6 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-200">Upload PDF</span>
            <span className="text-xs text-slate-400">Browse or drag & drop</span>
          </button>

          <button
            onClick={() => handleMethodSelect('text')}
            className="flex flex-col items-center p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-700/50 transition-colors bg-slate-800/50"
          >
            <FileText className="w-6 h-6 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-200">Enter Text</span>
            <span className="text-xs text-slate-400">Type directly</span>
          </button>

          <button
            onClick={() => handleMethodSelect('url')}
            className="flex flex-col items-center p-4 border border-slate-600 rounded-lg hover:border-blue-400 hover:bg-slate-700/50 transition-colors bg-slate-800/50"
          >
            <Link className="w-6 h-6 text-slate-300 mb-2" />
            <span className="text-sm font-medium text-slate-200">From URL</span>
            <span className="text-xs text-slate-400">Web link</span>
          </button>
        </div>
      )}

      {/* File Upload Interface */}
      {selectedMethod === 'file' && (
        <div className="space-y-3">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-500/10'
                : value?.file
                ? 'border-green-400 bg-green-500/10'
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {value?.file ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  {value.file.name}
                </span>
                <span className="text-xs text-slate-400">
                  ({(value.file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">
                  Drop your PDF here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    browse files
                  </button>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF files only, max 10MB
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {error?.file && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error.file}
            </div>
          )}
        </div>
      )}

      {/* Text Input Interface */}
      {selectedMethod === 'text' && (
        <div className="space-y-3">
          <textarea
            value={value?.content || ''}
            onChange={handleTextChange}
            placeholder={placeholder.text || `Enter your ${label.toLowerCase()} here...`}
            rows={8}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-vertical bg-slate-800/50 text-slate-200 placeholder-slate-400"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{value?.content?.length || 0} characters</span>
            <span>Max {contentType === 'resume' ? '10,000' : '20,000'} characters</span>
          </div>

          {error?.content && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error.content}
            </div>
          )}
        </div>
      )}

      {/* URL Input Interface */}
      {selectedMethod === 'url' && (
        <div className="space-y-3">
          <div className="relative">
            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="url"
              value={value?.url || ''}
              onChange={handleUrlChange}
              placeholder={placeholder.url || `Enter URL for ${label.toLowerCase()}...`}
              className="w-full pl-10 pr-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-slate-800/50 text-slate-200 placeholder-slate-400"
            />
          </div>
          <p className="text-xs text-slate-400">
            We'll extract content from the provided URL
          </p>

          {error?.url && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error.url}
            </div>
          )}
        </div>
      )}

      {/* General error */}
      {error?.method && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error.method}
        </div>
      )}
    </div>
  );
};

export default UploadField;