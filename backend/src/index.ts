// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

// Load routes
import ttsRoutes from './routes/ttsRoutes';
import authRoutes from './routes/authRoutes';
import sttRoutes from './routes/sttRoutes';
import interviewRoutes from './routes/interviewRoutes';
import behavGraderRoutes from './routes/behavGraderRoutes';
import jobBriefRoutes from './routes/jobBriefRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/tts', ttsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stt', sttRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/behav-grader', behavGraderRoutes);
app.use("/api/tavily", jobBriefRoutes);



// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
