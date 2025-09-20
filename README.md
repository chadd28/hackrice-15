# Pitch AI Interviewer

An AI-powered interviewing platform built for HackRice 15.

## 🚀 Features

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **AI Integration**: Google Text-to-Speech API
- **Modern UI**: Tailwind CSS with smooth animations

## 📁 Project Structure

```
pitch-ai-interviewer/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── index.ts
│   └── package.json
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Google Cloud account with TTS API enabled

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chadd28/hackrice-15.git
   cd hackrice-15
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables:**

   Create `backend/.env`:
   ```env
   PORT=3000
   GOOGLE_TTS_API_KEY=your_google_tts_api_key_here
   ```

   Create `frontend/.env`:
   ```env
   VITE_BACKEND_URL=http://localhost:3000
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - TTS Test: http://localhost:5173/test-tts

## 🔧 Google TTS API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Cloud Text-to-Speech API"
4. Create an API key in "APIs & Services" > "Credentials"
5. Add the API key to your `backend/.env` file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 👥 Team

- [Your Name] - [@chadd28](https://github.com/chadd28)

## 📄 License

This project is licensed under the MIT License.