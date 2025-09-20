import multer from 'multer';
import fs from 'fs/promises';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PDFExtract } from 'pdf-extract';
// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
// In-memory session storage (in production, use Redis or database)
const sessions = new Map();
/**
 * Extract text content from uploaded PDF file
 */
async function extractPDFText(filePath) {
    return new Promise((resolve, reject) => {
        const pdfExtract = new PDFExtract();
        pdfExtract.extract(filePath, {}, (err, data) => {
            if (err) {
                reject(new Error(`PDF extraction failed: ${err.message}`));
                return;
            }
            try {
                // Extract text from all pages
                const text = (data?.pages || [])
                    .map((page) => (page.content || [])
                    .map((item) => item.str)
                    .join(' '))
                    .join('\n\n');
                if (!text.trim()) {
                    reject(new Error('No text content found in PDF'));
                    return;
                }
                resolve(text.trim());
            }
            catch (extractError) {
                reject(new Error('Failed to process PDF content'));
            }
        });
    });
}
/**
 * Extract content from a URL
 */
async function extractUrlContent(url) {
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
        // Fetch the webpage
        const response = await axios.get(normalizedUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; InterviewBot/1.0)',
            },
        });
        // Parse HTML and extract text content
        const $ = cheerio.load(response.data);
        // Remove script and style elements
        $('script, style, nav, footer, aside, .advertisement').remove();
        // Try to find main content areas
        let content = '';
        const mainSelectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '.job-description',
            '.job-details',
            '#content',
            '.post-content'
        ];
        for (const selector of mainSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text().trim();
                if (content.length > 100)
                    break; // Found substantial content
            }
        }
        // Fallback to body content if no main content found
        if (!content || content.length < 100) {
            content = $('body').text().trim();
        }
        // Clean up the text
        content = content
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
            .trim();
        if (!content || content.length < 50) {
            throw new Error('Could not extract meaningful content from the URL');
        }
        return content;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to extract content from URL: ${error.message}`);
        }
        throw new Error('Failed to extract content from URL');
    }
}
/**
 * Clean up temporary files
 */
async function cleanupFile(filePath) {
    try {
        await fs.unlink(filePath);
    }
    catch (error) {
        console.error('Error cleaning up file:', error);
    }
}
/**
 * Handle file upload and text extraction
 */
export const uploadFile = [
    upload.single('file'),
    async (req, res) => {
        try {
            const { type } = req.body;
            const sessionId = req.headers['x-session-id'];
            const file = req.file;
            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                    error: 'File is required'
                });
            }
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session ID required',
                    error: 'Session ID must be provided in headers'
                });
            }
            // Extract text from PDF
            const content = await extractPDFText(file.path);
            // Clean up the uploaded file
            await cleanupFile(file.path);
            // Store in session
            if (!sessions.has(sessionId)) {
                sessions.set(sessionId, { uploads: {} });
            }
            const session = sessions.get(sessionId);
            session.uploads[type] = {
                method: 'file',
                content,
                filename: file.originalname,
                uploadedAt: new Date().toISOString()
            };
            res.json({
                success: true,
                message: 'File uploaded and processed successfully',
                content
            });
        }
        catch (error) {
            // Clean up file on error
            if (req.file) {
                await cleanupFile(req.file.path);
            }
            console.error('File upload error:', error);
            res.status(500).json({
                success: false,
                message: 'File processing failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
];
/**
 * Handle text input
 */
export const uploadText = async (req, res) => {
    try {
        const { text, type } = req.body;
        const sessionId = req.headers['x-session-id'];
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
    }
    catch (error) {
        console.error('Text upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Text processing failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Handle URL content extraction
 */
export const uploadUrl = async (req, res) => {
    try {
        const { url, type } = req.body;
        const sessionId = req.headers['x-session-id'];
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
    }
    catch (error) {
        console.error('URL upload error:', error);
        res.status(500).json({
            success: false,
            message: 'URL processing failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Get session data
 */
export const getSession = async (req, res) => {
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
    }
    catch (error) {
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
export const updateSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionData = req.body;
        // Update or create session
        if (sessions.has(sessionId)) {
            const existingSession = sessions.get(sessionId);
            sessions.set(sessionId, { ...existingSession, ...sessionData });
        }
        else {
            sessions.set(sessionId, sessionData);
        }
        res.json({
            success: true,
            message: 'Session updated successfully'
        });
    }
    catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update session',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
