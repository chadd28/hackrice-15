import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Export multer middleware for use in routes
export const uploadMiddleware = upload.single('file');

// In-memory session storage (in production, use Redis or database)
const sessions = new Map<string, any>();

/**
 * Handle text input processing
 */
export const uploadText = async (req: Request, res: Response) => {
  try {
    const { text, type } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Text content is required',
        error: 'Text must be provided'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
        error: 'Session ID must be provided in headers'
      });
    }

    if (text.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Text content too long',
        error: 'Text must be less than 10,000 characters'
      });
    }

    const content = text.trim();

    // Store in session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { uploads: {} });
    }
    
    const session = sessions.get(sessionId);
    session.uploads[type] = {
      method: 'text',
      content,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Text processed successfully',
      content
    });

  } catch (error) {
    console.error('Text upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Text processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Extract content from a URL using web scraping
 */
async function extractUrlContent(url: string): Promise<string> {
  try {
    // Normalize URL - add https:// if no protocol is provided
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Validate URL
    const parsedUrl = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    console.log(`🌐 Extracting content from URL: ${normalizedUrl}`);

    // Fetch the webpage
    const response = await axios.get(normalizedUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Parse HTML content
    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script, style, nav, footer, header, .nav, .footer, .header, .sidebar').remove();

    // Extract main content - try different selectors
    let content = '';
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      '.main-content',
      '.content',
      '.post-content',
      '.article-content',
      '.job-description',
      '.job-details',
      '.company-info',
      'article',
      '.container',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0 && element.text().trim().length > 100) {
        content = element.text().trim();
        break;
      }
    }

    // Fallback to body text if no specific content area found
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();

    // Limit content length to prevent overwhelming the AI
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '... [Content truncated]';
    }

    if (!content || content.length < 50) {
      throw new Error('Unable to extract meaningful content from the webpage');
    }

    console.log(`✅ Successfully extracted ${content.length} characters from URL`);
    return content;

  } catch (error) {
    console.error(`❌ URL extraction failed for ${url}:`, error);
    if (error instanceof Error) {
      throw new Error(`Failed to extract content from URL: ${error.message}`);
    }
    throw new Error('Failed to extract content from URL');
  }
}

/**
 * Handle URL content extraction
 */
export const uploadUrl = async (req: Request, res: Response) => {
  try {
    console.log('🌐 URL upload request received:', req.body);
    
    const { url, type } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    console.log(`🌐 Processing URL: ${url}, Type: ${type}, Session: ${sessionId}`);

    if (!url || typeof url !== 'string') {
      console.log('❌ URL validation failed: missing or invalid URL');
      return res.status(400).json({
        success: false,
        message: 'URL is required',
        error: 'URL must be provided'
      });
    }

    if (!sessionId) {
      console.log('❌ Session validation failed: missing session ID');
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
        error: 'Session ID must be provided in headers'
      });
    }

    // Extract content from URL
    console.log('🌐 Starting URL content extraction...');
    const content = await extractUrlContent(url);
    console.log(`✅ URL content extracted successfully: ${content.length} characters`);

    // Store in session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { uploads: {} });
    }
    
    const session = sessions.get(sessionId);
    session.uploads[type] = {
      method: 'url',
      content,
      url,
      uploadedAt: new Date().toISOString()
    };

    console.log(`✅ URL upload completed successfully for type: ${type}`);

    res.json({
      success: true,
      message: 'URL content extracted successfully',
      content
    });

  } catch (error) {
    console.error('❌ URL upload error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      success: false,
      message: 'URL processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Extract text content from PDF buffer using pdfjs-dist
 */
async function extractPdfContent(buffer: Buffer, filename: string): Promise<string> {
  try {
    console.log(`📄 Extracting text from PDF: ${filename}`);
    
    // Use pdfjs-dist for PDF parsing with proper Node.js configuration
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure the library for Node.js environment
    // Note: Worker is not needed in Node.js environment for basic text extraction
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0, // Reduce console output
      useSystemFonts: true, // Use system fonts for better compatibility
      disableFontFace: true // Disable font face for Node.js
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    console.log(`📄 PDF has ${numPages} pages`);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`📄 Processing page ${pageNum}/${numPages}`);
      
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .filter((item: any) => item.str && typeof item.str === 'string')
          .map((item: any) => item.str.trim())
          .filter(text => text.length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }
        
        console.log(`📄 Page ${pageNum}: extracted ${pageText.length} characters`);
      } catch (pageError) {
        console.warn(`⚠️  Warning: Could not process page ${pageNum}:`, pageError);
        continue; // Skip this page and continue with others
      }
    }
    
    // Clean up the content
    let content = fullText.trim();
    
    if (!content || content.length < 20) {
      throw new Error('PDF appears to be empty or contains no extractable text. The PDF might be image-based or protected.');
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();

    // Limit content to prevent overwhelming the system
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '\n\n[Content truncated - original was ' + fullText.length + ' characters]';
    }

    console.log(`✅ Successfully extracted ${content.length} characters from PDF`);
    console.log(`📋 PDF Content Preview: ${content.substring(0, 200)}...`);
    
    return content;

  } catch (error) {
    console.error(`❌ PDF extraction failed for ${filename}:`, error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('The uploaded file is not a valid PDF or is corrupted');
      } else if (error.message.includes('password')) {
        throw new Error('Password-protected PDFs are not supported');
      } else {
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
      }
    }
    throw new Error('Failed to extract text from PDF: Unknown error occurred');
  }
}

/**
 * Handle file upload with actual PDF text extraction
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
        error: 'Session ID must be provided in headers'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'Please select a file to upload'
      });
    }

    const file = req.file;
    const filename = file.originalname;

    // Validate file type
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: 'Only PDF files are supported'
      });
    }

    // Extract content from PDF
    const content = await extractPdfContent(file.buffer, filename);

    // Log the extracted content for debugging
    console.log('📄 PDF UPLOAD - EXTRACTED CONTENT:');
    console.log('='.repeat(50));
    console.log(`📁 Filename: ${filename}`);
    console.log(`📊 Content Length: ${content.length} characters`);
    console.log(`📝 Content Type: ${type}`);
    console.log('📋 Full Extracted Text:');
    console.log('-'.repeat(30));
    console.log(content);
    console.log('='.repeat(50));

    // Store in session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { uploads: {} });
    }
    
    const session = sessions.get(sessionId);
    session.uploads[type] = {
      method: 'file',
      content,
      filename,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'File uploaded and processed successfully',
      content: content.length > 500 ? content.substring(0, 500) + '...' : content // Return truncated preview
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get session data
 */
export const getSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const session = sessions.get(sessionId);
    res.json(session);

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update session data
 */
export const updateSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const sessionData = req.body;

    // Update or create session
    if (sessions.has(sessionId)) {
      const existingSession = sessions.get(sessionId);
      sessions.set(sessionId, { ...existingSession, ...sessionData });
    } else {
      sessions.set(sessionId, sessionData);
    }

    res.json({
      success: true,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};