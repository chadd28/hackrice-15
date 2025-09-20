import { Request, Response } from 'express';
import axios from 'axios';

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

    if (text.length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Text content too long',
        error: 'Text must be less than 50,000 characters'
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
 * Extract content from a URL using a simple approach
 */
async function extractUrlContent(url: string): Promise<string> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    // For now, return a placeholder - in production you'd implement web scraping
    // This is a simplified version to avoid complex dependencies
    return `Content extracted from ${url}. This is a placeholder - in production, this would contain the actual scraped content from the webpage.`;

  } catch (error) {
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
    const content = await extractUrlContent(url);

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
    console.error('URL upload error:', error);
    res.status(500).json({
      success: false,
      message: 'URL processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Handle file upload - simplified version without actual file processing
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

    // For now, return a placeholder for file processing
    // In production, you'd implement actual PDF text extraction
    const content = 'This is placeholder content extracted from the uploaded PDF file. In production, this would contain the actual text extracted from the PDF.';

    // Store in session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { uploads: {} });
    }
    
    const session = sessions.get(sessionId);
    session.uploads[type] = {
      method: 'file',
      content,
      filename: 'uploaded-file.pdf',
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'File uploaded and processed successfully',
      content
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