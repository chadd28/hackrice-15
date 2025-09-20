import React, { useEffect, useRef, useState } from 'react'

type StatusType = 'info' | 'recording' | 'loading' | 'success' | 'error' | 'warning'

function SpeechToTextPage(): React.ReactElement {
  const envApiKey = (import.meta.env as any).VITE_GOOGLE_API_KEY || ''
  const [status, setStatus] = useState<{ msg: string; type: StatusType }>({ msg: 'Ready to record.', type: 'info' })
  const [transcript, setTranscript] = useState('Your transcribed text will appear here...')
  const [isRecording, setIsRecording] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    // initial status
    setStatus({ msg: 'Ready to record.', type: 'info' })
  }, [])

  const updateStatus = (message: string, type: StatusType = 'info') => {
    setStatus({ msg: message, type })
  }

  const blobToBase64 = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1] || '')
      }
      reader.onerror = (err) => reject(err)
    })
  }

  async function startRecording() {
    if (!envApiKey) {
      updateStatus('Missing Google API key in env (VITE_GOOGLE_API_KEY).', 'error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new (window as any).MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        await sendAudioToAPI()
      }

      audioChunksRef.current = []
      mediaRecorder.start()
      setIsRecording(true)
      updateStatus('Recording in progress...', 'recording')
    } catch (error) {
      console.error('Error accessing microphone:', error)
      updateStatus('Could not access microphone. Please grant permission.', 'error')
    }
  }

  function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    updateStatus('Processing audio...', 'loading')
  }

  async function sendAudioToAPI() {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
    try {
      const base64Audio = await blobToBase64(audioBlob)
  const apiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${envApiKey}`

      const requestBody = {
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
        },
        audio: {
          content: base64Audio,
        },
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const err = await response.json()
        console.error('API Error:', err)
        throw new Error(err?.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.results && data.results.length > 0) {
        const t = data.results[0].alternatives[0].transcript
        setTranscript(t)
        updateStatus('Transcription successful!', 'success')
      } else {
        setTranscript('No speech was detected.')
        updateStatus('No speech detected.', 'warning')
      }
    } catch (error: any) {
      console.error('Error sending audio to API:', error)
      setTranscript('Failed to transcribe audio. Please check the console and your API key.')
      updateStatus(`Error: ${error?.message || 'Unknown'}`, 'error')
    }
  }

  const statusColor = () => {
    switch (status.type) {
      case 'recording':
        return 'text-red-500'
      case 'loading':
        return 'text-blue-500'
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      case 'warning':
        return 'text-yellow-500'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">Speech-to-Text</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Record your voice and see the magic of transcription.</p>
          </div>

          {/* API key is read from Vite env (VITE_GOOGLE_API_KEY) - no input shown */}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
              Stop Recording
            </button>
          </div>

          <div id="status" className="text-center h-6 mb-4 text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            {status.type === 'recording' && <span className="status-dot bg-red-500" style={{ height: 10, width: 10, borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />}
            <p className={`${statusColor()}`}>{status.msg}</p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 min-h-[150px] shadow-inner">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
        <footer className="text-center mt-6 text-sm text-gray-400 dark:text-gray-500">
          <p>Powered by Google Cloud Speech-to-Text API</p>
        </footer>
      </div>
    </div>
  )
}

export default SpeechToTextPage
