import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import multer, { MulterError } from 'multer';

// Polyfills for Node.js environment when using pdfjs-dist
// These are required because pdfjs-dist expects browser APIs
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-ignore
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

if (typeof globalThis.Path2D === 'undefined') {
  // @ts-ignore
  globalThis.Path2D = class Path2D {
    constructor() {}
  };
}

if (typeof globalThis.OffscreenCanvas === 'undefined') {
  // @ts-ignore
  globalThis.OffscreenCanvas = class OffscreenCanvas {
    constructor() {}
  };
}

// Extend Request interface to include file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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

    // Set character limits based on content type
    const isResume = type === 'resume';
    const maxLength = isResume ? 10000 : 20000;
    const limitDescription = isResume ? '10,000' : '20,000';

    if (text.length > maxLength) {
      return res.status(400).json({
        success: false,
        message: 'Text content too long',
        error: `Text must be less than ${limitDescription} characters`
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
async function extractUrlContent(url: string, type: string): Promise<string> {
  try {
    // Normalize URL - add https:// if no protocol is provided
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch (urlError) {
      console.error(`❌ Invalid URL format: ${normalizedUrl}`, urlError);
      throw new Error(`Invalid URL format: ${normalizedUrl}`);
    }
    
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }
    // Fetch the webpage with more robust error handling
    let response;
    try {
      response = await axios.get(normalizedUrl, {
        timeout: 15000, // Increased timeout to 15 seconds
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });
    } catch (fetchError) {
      console.error(`❌ Failed to fetch URL: ${normalizedUrl}`, fetchError);
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('timeout')) {
          throw new Error('Website took too long to respond. Please try a different URL.');
        } else if (fetchError.message.includes('ENOTFOUND')) {
          throw new Error('Website not found. Please check the URL and try again.');
        } else if (fetchError.message.includes('ECONNREFUSED')) {
          throw new Error('Connection refused. The website may be temporarily unavailable.');
        } else {
          throw new Error(`Failed to access website: ${fetchError.message}`);
        }
      }
      throw new Error('Failed to access the website');
    }

    // Parse HTML content
    let $;
    try {
      $ = cheerio.load(response.data);
    } catch (parseError) {
      console.error(`❌ Failed to parse HTML content`, parseError);
      throw new Error('Failed to parse webpage content. The page may not be valid HTML.');
    }

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

    // Set character limits based on content type
    const isResume = type === 'resume';
    const maxLength = isResume ? 10000 : 20000;
    
    // Limit content length to prevent overwhelming the AI
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '... [Content truncated]';
    }

    if (!content || content.length < 50) {
      throw new Error('Unable to extract meaningful content from the webpage. The page may be empty or contain only images/videos.');
    }

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
    const { url, type } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'URL is required',
        error: 'URL must be provided'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required',
        error: 'Session ID must be provided in headers'
      });
    }

    // Extract content from URL
    const content = await extractUrlContent(url, type);

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
async function extractPdfContent(buffer: Buffer, filename: string, type: string): Promise<{content: string, metadata: {totalPages: number, successfulPages: number, allPageTexts: any[]}}> {
  try {
    // Use pdfjs-dist legacy build for Node.js compatibility
    let pdfjsLib;
    try {
      // Import the legacy build specifically for Node.js
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      // Configure worker for legacy build (not needed in Node.js but prevents warnings)
      if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
      }
    } catch (importError) {
      console.error('❌ Failed to import pdfjs-dist legacy:', importError);
      throw new Error('PDF processing library is not available');
    }
    
    // Configure the library for Node.js environment
    // Note: Worker is not needed in Node.js environment for basic text extraction
    
    // Load the PDF document with legacy-compatible options
    let loadingTask;
    try {
      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        verbosity: 0, // Reduce console output
        stopAtErrors: false // Continue processing even if some pages have errors
      });
    } catch (loadError) {
      console.error('❌ Failed to create PDF loading task:', loadError);
      throw new Error('Failed to initialize PDF processing');
    }
    
    let pdfDocument;
    try {
      pdfDocument = await loadingTask.promise;
    } catch (loadError) {
      console.error('❌ Failed to load PDF document:', loadError);
      if (loadError instanceof Error) {
        if (loadError.message.includes('Invalid PDF')) {
          throw new Error('The uploaded file is not a valid PDF');
        } else if (loadError.message.includes('password')) {
          throw new Error('Password-protected PDFs are not supported');
        } else {
          throw new Error(`Failed to load PDF: ${loadError.message}`);
        }
      }
      throw new Error('Failed to load PDF document');
    }
    
    const numPages = pdfDocument.numPages;
    
    if (numPages === 0) {
      throw new Error('PDF appears to be empty (0 pages)');
    }
    
    let fullText = '';
    let successfulPages = 0;
    let allPageTexts = []; // Store text from each page for detailed debugging
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      
      try {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .filter((item: any) => item.str && typeof item.str === 'string')
          .map((item: any) => item.str.trim())
          .filter((text: string) => text.length > 0)
          .join(' ');
        
        // Store individual page text for debugging
        allPageTexts.push({
          pageNumber: pageNum,
          rawText: pageText,
          itemCount: textContent.items.length,
          filteredItemCount: textContent.items.filter((item: any) => item.str && typeof item.str === 'string' && item.str.trim().length > 0).length
        });
        
        if (pageText.trim()) {
          // Add page separator for multi-page documents
          if (pageNum > 1) {
            fullText += '\n\n--- PAGE ' + pageNum + ' ---\n\n';
          }
          fullText += pageText + '\n\n';
          successfulPages++;
        }
        
      } catch (pageError) {
        console.warn(`⚠️  Warning: Could not process page ${pageNum}:`, pageError);
        allPageTexts.push({
          pageNumber: pageNum,
          error: pageError instanceof Error ? pageError.message : 'Unknown error',
          rawText: '',
          itemCount: 0,
          filteredItemCount: 0
        });
        continue; // Skip this page and continue with others
      }
    }
    
    // Clean up the content
    let content = fullText.trim();
    
    if (!content || content.length < 20) {
      throw new Error(`PDF appears to contain no extractable text. Processed ${successfulPages}/${numPages} pages successfully. The PDF might be image-based, scanned, or protected.`);
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();

    // Set character limits based on content type
    const isResume = type === 'resume';
    const maxLength = isResume ? 10000 : 20000;
    const limitDescription = isResume ? '10,000' : '20,000';

    // Limit content to prevent overwhelming the system
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + `\n\n[Content truncated - original was ${fullText.length} characters from ${successfulPages} pages]`;
    }

    
    return {
      content,
      metadata: {
        totalPages: numPages,
        successfulPages,
        allPageTexts
      }
    };

  } catch (error) {
    console.error(`❌ PDF extraction failed for ${filename}:`, error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF') || error.message.includes('not a valid PDF')) {
        throw new Error('The uploaded file is not a valid PDF or is corrupted');
      } else if (error.message.includes('password')) {
        throw new Error('Password-protected PDFs are not supported');
      } else if (error.message.includes('image-based') || error.message.includes('no extractable text')) {
        throw new Error('This PDF appears to be image-based or scanned. Please use a PDF with selectable text or try OCR software first.');
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
export const uploadFile = async (req: MulterRequest, res: Response) => {
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
    const pdfResult = await extractPdfContent(file.buffer, filename, type);
    const content = pdfResult.content;
    const { totalPages, successfulPages, allPageTexts } = pdfResult.metadata;
    

    // Log the extracted content for debugging with enhanced details
    
    // Count key resume elements for validation
    const resumeKeywords = {
      'email': (content.match(/@[\w\.-]+\.\w+/g) || []).length,
      'phone': (content.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []).length,
      'education': (content.toLowerCase().match(/\b(university|college|degree|bachelor|master|phd|education)\b/g) || []).length,
      'experience': (content.toLowerCase().match(/\b(experience|work|job|position|role|company)\b/g) || []).length,
      'skills': (content.toLowerCase().match(/\b(skills|technologies|programming|software|tools)\b/g) || []).length,
      'dates': (content.match(/\b(19|20)\d{2}\b/g) || []).length
    };
    
    Object.entries(resumeKeywords).forEach(([category, count]) => {
      console.log(`📊 Resume element '${category}': ${count} occurrences`);
    });
    

    // Store in session with detailed logging
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { uploads: {} });
    }
    
    const session = sessions.get(sessionId);
    const uploadData = {
      method: 'file',
      content,
      filename,
      uploadedAt: new Date().toISOString(),
      metadata: {
        originalSize: file.size,
        extractedLength: content.length,
        processingTime: Date.now() - Date.now(), // Will be updated below
        pagesProcessed: successfulPages,
        totalPages: totalPages
      }
    };
    
    session.uploads[type] = uploadData;
    
    
    // Log session content for verification


    res.json({
      success: true,
      message: 'File uploaded and processed successfully',
      content: content // Return full content, not truncated
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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