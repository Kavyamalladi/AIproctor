import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVolumeHigh,
  FaVolumeXmark,
  FaArrowRight,
  FaCheck,
  FaStop
} from "react-icons/fa6";
import { ClipLoader } from "react-spinners";


function CertificationInterview() {
  // Move useParams/useNavigate to the top
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Proctoring state
  const [violationCount, setViolationCount] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const violationLimit = 5;
  // Modal state for block/redirect
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockCountdown, setBlockCountdown] = useState(3);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [retakeDisabled, setRetakeDisabled] = useState(false);

  // Helper to record a violation
  const recordViolation = useCallback((type, message) => {
    setViolationCount((prev) => prev + 1);
    setWarnings((prev) => [...prev, { type, message, time: new Date() }]);
    toast.warning(message);
  }, []);

  // Copy/paste/shortcut/Right-click disable
  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      recordViolation('copy', 'Copying is not allowed!');
    };
    const handlePaste = (e) => {
      e.preventDefault();
      recordViolation('paste', 'Pasting is not allowed!');
    };
    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation('right_click', 'Right-click is not allowed!');
    };
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c','v','x','a','f','p','s'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        recordViolation('shortcut', 'Keyboard shortcuts are not allowed!');
      }
    };
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recordViolation]);

  // Tab switch/blur detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'Tab switch or window lost focus!');
      }
    };
    const handleBlur = () => {
      recordViolation('blur', 'Window lost focus!');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [recordViolation]);

  // Fullscreen enforcement and check every 3 seconds
  useEffect(() => {
    // Request fullscreen on mount
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
    const checkFullscreen = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen_exit', 'Fullscreen is required! Please return to fullscreen.');
      }
    };
    const interval = setInterval(checkFullscreen, 3000);
    // Listen for manual fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen_exit', 'Fullscreen is required! Please return to fullscreen.');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [recordViolation]);

  // Auto warning: if violation limit exceeded, block UI, show modal, and auto-redirect
  useEffect(() => {
    // Only trigger block modal and countdown once
    if (violationCount > violationLimit && !showBlockModal && !hasRedirected) {
      setShowBlockModal(true);
      setBlockCountdown(3);
      toast.error('You have exceeded the allowed number of warnings. The interview will be terminated.');
    }
  }, [violationCount, showBlockModal, hasRedirected]);

  // Countdown and auto-redirect to dashboard
  useEffect(() => {
    let timer;
    if (showBlockModal && blockCountdown > 0 && !hasRedirected) {
      timer = setTimeout(() => setBlockCountdown((c) => c - 1), 1000);
    } else if (showBlockModal && blockCountdown === 0 && !hasRedirected) {
      setHasRedirected(true);
      // Exit fullscreen if active before navigating home
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      navigate("/");
    }
    return () => clearTimeout(timer);
  }, [showBlockModal, blockCountdown, hasRedirected, navigate]);

  // Handler to re-enable fullscreen
  const handleEnableFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [questionData, setQuestionData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muteVoice, setMuteVoice] = useState(false);
  const [autoSubmitOnStop, setAutoSubmitOnStop] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  useEffect(() => {
    setupMediaAndFetchQuestion();
    return () => {
      cleanup();
    };
  }, [sessionId]);

  // Attach stream to video element once loading completes and video is rendered
  useEffect(() => {
    if (!loading && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [loading]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
    }
  };

  const setupMediaAndFetchQuestion = async () => {
    try {
      // Setup camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Fetch current question
      await fetchCurrentQuestion();
    } catch (error) {
      console.error("Error setting up media:", error);
      toast.error("Failed to access camera/microphone");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentQuestion = async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/api/certification/question/${sessionId}`,
        { withCredentials: true }
      );
      setQuestionData(response.data);
      setAnswer("");
      setFeedback(null);
      
      // Speak the question
      speakQuestion(response.data.question);
    } catch (error) {
      console.error("Error fetching question:", error);
      if (error.response?.status === 400) {
        // Interview already completed
        navigate(`/certification-result/${sessionId}`);
      } else {
        toast.error(error.response?.data?.message || "Failed to fetch question");
      }
    }
  };

  const speakQuestion = (text, forcePlay = false) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      // Don't speak if muted (unless force play clicked)
      if (muteVoice && !forcePlay) return;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMute = () => {
    if (!muteVoice) {
      // Muting - stop current speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setMuteVoice(true);
      toast.info("Question voice muted");
    } else {
      // Unmuting - resume/play the question
      setMuteVoice(false);
      toast.info("Question voice enabled");
      // Play the current question
      speakQuestion(questionData?.question, true);
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    let finalTranscript = answer;

    recognitionRef.current.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      setAnswer(finalTranscript + interimTranscript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== 'no-speech') {
        toast.error("Speech recognition error: " + event.error);
      }
    };

    recognitionRef.current.onend = () => {
      if (isRecording) {
        // Restart if still recording (auto-stopped due to silence)
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Recognition restart skipped");
        }
      }
    };

    recognitionRef.current.start();
    setIsRecording(true);
    toast.success("Recording started - speak your answer");
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    
    // Auto-submit after a short delay to capture final transcript
    if (autoSubmitOnStop) {
      toast.info("Processing your answer...");
      // Small delay to ensure final transcript is captured
      setTimeout(() => {
        if (answer.trim()) {
          handleSubmitAnswer();
        } else {
          toast.warning("No answer recorded. Please try again.");
        }
      }, 500);
    } else {
      toast.info("Recording stopped");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Please provide an answer before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${serverUrl}/api/certification/submit-answer`,
        { sessionId, answer: answer.trim() },
        { withCredentials: true }
      );

      if (response.data.isComplete) {
        // Interview completed
        toast.success("Interview completed!");
        navigate(`/certification-result/${sessionId}`);
      } else {
        // Show feedback briefly then move to next question
        setFeedback({
          score: response.data.score,
          feedback: response.data.feedback
        });

        toast.success(`Answer recorded! Score: ${response.data.score}/10`);

        // Wait 2 seconds then fetch next question
        setTimeout(() => {
          setQuestionData({
            questionNumber: response.data.questionNumber,
            totalQuestions: response.data.totalQuestions,
            question: response.data.nextQuestion,
            isLastQuestion: response.data.isLastQuestion
          });
          setAnswer("");
          setFeedback(null);
          speakQuestion(response.data.nextQuestion);
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error(error.response?.data?.message || "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ClipLoader size={50} color="#fff" />
          <p className="text-white mt-4">Setting up your interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      {/* Block Modal Overlay */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Interview Blocked</h2>
            <p className="text-gray-800 mb-2">You have exceeded the allowed number of warnings.</p>
            <p className="text-gray-600 mb-4">You will be redirected to the homepage in <span className="font-bold">{blockCountdown}</span> seconds.</p>
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
              onClick={() => {
                setRetakeDisabled(true);
                setHasRedirected(true);
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                }
                navigate("/");
              }}
              disabled={retakeDisabled}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      )}
      <div className={`max-w-7xl mx-auto ${showBlockModal ? 'pointer-events-none select-none opacity-30' : ''}`}>
        {/* Proctoring Warnings UI */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <span className="text-yellow-400 font-bold">Warnings: {violationCount} / 5</span>
            {violationCount > violationLimit && (
              <span className="text-red-500 font-bold">Interview Blocked</span>
            )}
          </div>
          {warnings.length > 0 && (
            <ul className="text-yellow-300 text-sm mt-2">
              {warnings.slice(-3).map((w, i) => (
                <li key={i} className="flex items-center gap-2">
                  [{w.type}] {w.message}
                </li>
              ))}
            </ul>
          )}
          {/* Show only one Enable Fullscreen button if any fullscreen_exit warning exists */}
          {warnings.some(w => w.type === 'fullscreen_exit') && !showBlockModal && (
            <button
              onClick={handleEnableFullscreen}
              className="mt-2 px-2 py-1 bg-blue-700 text-white rounded text-xs hover:bg-blue-800"
            >
              Enable Fullscreen
            </button>
          )}
        </div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            AI Certification Interview
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              Question {questionData?.questionNumber} of {questionData?.totalQuestions}
            </span>
          </div>
        </div>

        {/* Block all main UI if interview is blocked */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${violationCount > violationLimit ? 'pointer-events-none opacity-50 select-none' : ''}`}>
          {/* Left Panel - Question */}
          <div className="space-y-6">
            {/* Question Navigation */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: questionData?.totalQuestions || 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                    i + 1 === questionData?.questionNumber
                      ? "bg-blue-600 text-white"
                      : i + 1 < questionData?.questionNumber
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {i + 1 < questionData?.questionNumber ? (
                    <FaCheck className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
              ))}
            </div>

            {/* Question Card */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg text-white font-medium">
                  Question #{questionData?.questionNumber}
                </h2>
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg transition-all ${
                    muteVoice 
                      ? "bg-red-600 text-white" 
                      : isSpeaking
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  title={muteVoice ? "Unmute question voice" : "Mute question voice"}
                >
                  {muteVoice ? <FaVolumeXmark className="w-5 h-5" /> : <FaVolumeHigh className="w-5 h-5" />}
                </button>
              </div>
              
              <p className="text-xl text-white leading-relaxed">
                {questionData?.question}
              </p>
            </div>

            {/* Answer Section */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-white font-medium mb-3">Your Answer</h3>
              
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Speak or type your answer here..."
                className="w-full h-40 bg-gray-700 text-white rounded-lg p-4 resize-none border-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={submitting}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    submitting
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : isRecording
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <FaStop className="w-4 h-4" /> Stop &amp; Submit
                    </>
                  ) : (
                    <>
                      <FaMicrophone className="w-4 h-4" /> Record Answer
                    </>
                  )}
                </button>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !answer.trim()}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    submitting || !answer.trim()
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {submitting ? (
                    <>
                      <ClipLoader size={16} color="#fff" /> Evaluating...
                    </>
                  ) : (
                    <>
                      <FaArrowRight className="w-4 h-4" />
                      {questionData?.isLastQuestion ? "Submit & Finish" : "Next Question"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Note Box */}
            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                💡 How it works:
              </h3>
              <p className="text-blue-300 text-sm">
                <strong>Voice:</strong> Click "Record Answer" to speak. When you click "Stop &amp; Submit", your answer will be automatically evaluated.<br/>
                <strong>Type:</strong> You can also type your answer and click "Next Question" to submit.<br/>
                <strong>Mute:</strong> Use the mute button to silence question audio.
              </p>
            </div>

            {/* Feedback Display */}
            {feedback && (
              <div className="bg-gray-800 rounded-xl p-6 border-2 border-green-500">
                <h3 className="text-white font-medium mb-2">
                  Score: <span className="text-green-400">{feedback.score}/10</span>
                </h3>
                <p className="text-gray-300 text-sm">{feedback.feedback}</p>
              </div>
            )}
          </div>

          {/* Right Panel - Camera */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
              />
            </div>

            {/* Recording Status */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    isRecording ? "bg-red-500 animate-pulse" : "bg-gray-500"
                  }`} />
                  <span className="text-white">
                    {isRecording ? "Recording..." : "Ready to record"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <FaMicrophone className="text-red-500 w-5 h-5 animate-pulse" />
                  ) : (
                    <FaMicrophoneSlash className="text-gray-500 w-5 h-5" />
                  )}
                  <FaVideo className="text-green-500 w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Progress</span>
                <span>
                  {questionData?.questionNumber} / {questionData?.totalQuestions}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ 
                    width: `${((questionData?.questionNumber || 1) / (questionData?.totalQuestions || 10)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CertificationInterview;
