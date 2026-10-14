// AutoCare Voice Assistant Service
// Seamless Web Speech API Speech-to-Text & Web Speech Synthesis API Text-to-Speech

export type VoiceState = 'idle' | 'listening' | 'understanding' | 'responding' | 'speaking' | 'error';

export interface VoiceAssistantOptions {
  onStateChange: (state: VoiceState) => void;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onError: (errorMessage: string) => void;
}

// Global references
let currentAudio: HTMLAudioElement | null = null;
let recognitionInstance: any = null;
let mediaRecorderInstance: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let cachedVoices: SpeechSynthesisVoice[] = [];

// Initialize voices cache when voices are available
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  };
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Checks if the browser environment supports microphone speech recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition ||
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
}

/**
 * Checks if Web Speech Synthesis API is supported
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Selects a professional, natural-sounding English voice from available synthesis voices
 */
export function getProfessionalVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Look for high-quality natural/online voices
  const preferredVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') ||
        v.name.includes('Online') ||
        v.name.includes('Google US English') ||
        v.name.includes('Samantha') ||
        v.name.includes('Microsoft Jenny') ||
        v.name.includes('Microsoft Aria') ||
        v.name.includes('Microsoft Zira') ||
        v.name.includes('Karen') ||
        v.name.includes('Victoria'))
  );

  if (preferredVoice) return preferredVoice;

  // 2. Any English voice
  const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  // 3. Fallback
  return voices[0] || null;
}

/**
 * Cleans text of markdown and emojis so speech synthesis pronounces it naturally
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove markdown links but keep anchor text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown bold, italic, strikethrough, headers
    .replace(/[*#_`~>]/g, '')
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Clean multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Text-to-speech functionality using the Web Speech Synthesis API
 */
export function speakWithWebSpeech(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onError?: (err: any) => void;
  }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onEnd?.();
    return;
  }

  // Cancel any ongoing speech first
  stopSpeech();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    callbacks?.onEnd?.();
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const professionalVoice = getProfessionalVoice();
    if (professionalVoice) {
      utterance.voice = professionalVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = professionalVoice?.lang || 'en-US';

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      callbacks?.onEnd?.();
    };

    utterance.onpause = () => {
      callbacks?.onPause?.();
    };

    utterance.onresume = () => {
      callbacks?.onResume?.();
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        callbacks?.onEnd?.();
      } else {
        callbacks?.onError?.(e);
        callbacks?.onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    callbacks?.onError?.(err);
    callbacks?.onEnd?.();
  }
}

/**
 * Pause active speech synthesis playback
 */
export function pauseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech synthesis playback
 */
export function resumeSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
}

/**
 * Stop any ongoing audio playback and cancel Web Speech Synthesis
 */
export function stopSpeech(): void {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch (err) {
    console.warn('Error stopping speech playback:', err);
  }
}

// Backward compatibility alias
export const stopSpeaking = stopSpeech;

/**
 * Play AI spoken response using Web Speech Synthesis API
 */
export async function playSpokenResponse(
  text: string, 
  audioBase64?: string | null,
  onStart?: () => void,
  onEnd?: () => void,
  onPause?: () => void,
  onResume?: () => void
): Promise<void> {
  // Always stop previous speech first
  stopSpeech();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    onEnd?.();
    return;
  }

  // 1. If audioBase64 from Gemini TTS is available, we can play it
  if (audioBase64) {
    try {
      const audioUrl = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onplay = () => onStart?.();
      audio.onended = () => {
        currentAudio = null;
        onEnd?.();
      };
      audio.onerror = () => {
        currentAudio = null;
        speakWithWebSpeech(cleanText, { onStart, onEnd, onPause, onResume });
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn('Audio element play failed, falling back to Web Speech Synthesis:', err);
      currentAudio = null;
    }
  }

  // 2. Direct Web Speech Synthesis API execution
  speakWithWebSpeech(cleanText, { onStart, onEnd, onPause, onResume });
}

/**
 * Start listening to microphone input via the Web Speech API (SpeechRecognition)
 */
export function startListening(options: VoiceAssistantOptions): () => void {
  // 1. Immediately stop any AI speech (Voice Interruption)
  stopSpeech();

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  let hasEnded = false;
  let hasReceivedFinal = false;
  let lastRecognizedText = '';

  const cleanup = () => {
    if (hasEnded) return;
    hasEnded = true;

    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
        recognitionInstance.abort();
      } catch {}
      recognitionInstance = null;
    }

    if (mediaRecorderInstance && mediaRecorderInstance.state !== 'inactive') {
      try {
        mediaRecorderInstance.stop();
      } catch {}
      mediaRecorderInstance = null;
    }
  };

  const deliverFinalTranscript = (text: string) => {
    if (hasReceivedFinal) return;
    const cleaned = text.trim();
    if (!cleaned) return;
    hasReceivedFinal = true;
    options.onStateChange('understanding');
    options.onFinalTranscript(cleaned);
  };

  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognitionInstance = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      options.onStateChange('listening');

      recognition.onstart = () => {
        options.onStateChange('listening');
      };

      recognition.onresult = (event: any) => {
        let fullFinal = '';
        let fullInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const part = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            fullFinal += (fullFinal ? ' ' : '') + part.trim();
          } else {
            fullInterim += (fullInterim ? ' ' : '') + part.trim();
          }
        }

        const bestCurrent = (fullFinal ? fullFinal + (fullInterim ? ' ' + fullInterim : '') : fullInterim).trim();
        if (bestCurrent) {
          lastRecognizedText = bestCurrent;
        }

        if (fullInterim) {
          options.onInterimTranscript?.(bestCurrent);
        }

        if (fullFinal && !fullInterim) {
          deliverFinalTranscript(fullFinal);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          options.onStateChange('error');
          options.onError(
            'Microphone access is required for voice input. Please allow microphone access and try again.'
          );
        } else if (event.error === 'no-speech') {
          if (!hasReceivedFinal) {
            if (lastRecognizedText.trim()) {
              deliverFinalTranscript(lastRecognizedText);
            } else {
              options.onStateChange('idle');
              options.onError("I didn't hear anything. Please try again.");
            }
          }
        } else if (event.error === 'network') {
          options.onStateChange('error');
          options.onError(
            'Voice service is temporarily unavailable. You can still use the text assistant.'
          );
        } else {
          options.onStateChange('idle');
          options.onError("I couldn't understand that. Please try again.");
        }
      };

      recognition.onend = () => {
        if (!hasReceivedFinal) {
          if (lastRecognizedText.trim()) {
            deliverFinalTranscript(lastRecognizedText);
          } else {
            options.onStateChange('idle');
          }
        }
      };

      recognition.start();
      return cleanup;
    } catch (err: any) {
      console.warn('SpeechRecognition failed to start, falling back to MediaRecorder:', err);
    }
  }

  // Fallback: MediaRecorder capturing audio and sending to /api/ai/transcribe
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        try {
          recordedChunks = [];
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderInstance = mediaRecorder;

          options.onStateChange('listening');

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            stream.getTracks().forEach((track) => track.stop());
            if (recordedChunks.length === 0) {
              options.onStateChange('idle');
              options.onError("I didn't hear anything. Please try again.");
              return;
            }

            options.onStateChange('understanding');
            const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
            const reader = new FileReader();

            reader.onloadend = async () => {
              const base64Data = (reader.result as string)?.split(',')[1];
              if (!base64Data) {
                options.onStateChange('idle');
                options.onError("I couldn't understand that. Please try again.");
                return;
              }

              try {
                const res = await fetch('/api/ai/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioBase64: base64Data, mimeType: 'audio/webm' }),
                });

                if (res.ok) {
                  const data = await res.json();
                  if (data.transcript && data.transcript.trim()) {
                    options.onFinalTranscript(data.transcript.trim());
                    return;
                  }
                }
                options.onStateChange('idle');
                options.onError("I couldn't understand that. Please try again.");
              } catch (err) {
                options.onStateChange('error');
                options.onError('Voice service is temporarily unavailable. You can still use the text assistant.');
              }
            };

            reader.readAsDataURL(audioBlob);
          };

          mediaRecorder.start();

          // Automatically stop recording after 7 seconds of speaking
          const autoTimer = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, 7000);

          return () => {
            clearTimeout(autoTimer);
            cleanup();
          };
        } catch (err: any) {
          options.onStateChange('error');
          options.onError("I couldn't access the microphone. Please check your browser permissions.");
        }
      })
      .catch((err) => {
        options.onStateChange('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          options.onError(
            'Microphone access is required for voice input. Please allow microphone access and try again.'
          );
        } else {
          options.onError(
            'Voice service is temporarily unavailable. You can still use the text assistant.'
          );
        }
      });

    return cleanup;
  }

  options.onStateChange('error');
  options.onError('Voice input is not supported in this browser. You can still use the text assistant.');
  return () => {};
}
