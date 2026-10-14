// Real-Time Voice Client for Gemini Live API (gemini-3.8-live)
// Features:
// - Bidirectional audio streaming over WebSocket (/live)
// - 16kHz PCM capture from browser microphone
// - 24kHz PCM low-latency playback for Gemini Live
// - Sub-second barge-in / interruption handling
// - Real-time input & output speech transcription streaming
// - Live audio volume analysis for dynamic UI visualizers
// - Hands-free continuous interaction with mute/unmute support
// - Granular error categorization distinguishing iframe permissions, browser NotAllowedError,
//   hardware unavailability, auth failures (401), and API 403 PERMISSION_DENIED

export type LiveVoiceStatus =
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'interrupted'
  | 'disconnected'
  | 'error';

export type LiveVoiceErrorCategory =
  | 'MIC_PERMISSION_DENIED'
  | 'MIC_NOT_FOUND'
  | 'MIC_BUSY'
  | 'MIC_OVERCONSTRAINED'
  | 'MIC_UNSUPPORTED'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'API_KEY_MISSING'
  | 'GEMINI_PERMISSION_DENIED'
  | 'LIVE_CONNECTION_FAILED'
  | 'LIVE_SESSION_ERROR'
  | 'WS_TRANSPORT_ERROR'
  | 'WS_CLOSED';

export interface LiveVoiceErrorDetails {
  category: LiveVoiceErrorCategory;
  rawErrorName?: string;
  rawMessage?: string;
  status?: number;
  isIframe?: boolean;
}

export interface LiveVoiceCallbacks {
  onStatusChange: (status: LiveVoiceStatus) => void;
  onTranscript?: (speaker: 'user' | 'model', text: string, isFinal?: boolean) => void;
  onVolumeChange?: (volume: number, speaker: 'user' | 'model') => void;
  onError?: (error: string, details?: LiveVoiceErrorDetails) => void;
}

export class GeminiLiveVoiceClient {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private scheduledAudioEndTime = 0;
  private isConnected = false;
  private isMuted = false;
  private callbacks: LiveVoiceCallbacks;
  private volumeCheckInterval: any = null;

  constructor(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  public get muted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public async start(options: {
    idToken: string;
    vehicleId: string;
    vehicleContextText?: string;
    voiceName?: string;
  }): Promise<void> {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    try {
      this.callbacks.onStatusChange('connecting');

      // 1. Check if mediaDevices API is available
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'Microphone recording API is not available in this browser context (requires HTTPS or secure origin).';
        console.warn('[LiveVoice] mediaDevices not supported:', { isIframe });
        this.callbacks.onError?.(errorMsg, {
          category: 'MIC_UNSUPPORTED',
          isIframe,
          rawErrorName: 'UnsupportedContext',
        });
        this.callbacks.onStatusChange('error');
        this.stop();
        return;
      }

      // 2. Request microphone access with graceful constraint fallback
      let stream: MediaStream | null = null;
      try {
        // Preferred high-clarity constraints with noise suppression
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (firstErr: any) {
        console.warn('[LiveVoice] Initial getUserMedia attempt failed:', {
          name: firstErr?.name,
          message: firstErr?.message,
        });

        if (firstErr?.name === 'OverconstrainedError') {
          // Fallback to basic audio constraint without advanced processing
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (secondErr: any) {
            throw secondErr;
          }
        } else {
          throw firstErr;
        }
      }

      this.mediaStream = stream;

      // 3. Setup AudioContexts (16kHz for mic input, 24kHz for Gemini Live audio playback)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // Setup output analyser for model voice reactivity
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 64;
      this.outputAnalyser.smoothingTimeConstant = 0.5;

      // Setup input analyser for user voice reactivity
      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 64;
      this.inputAnalyser.smoothingTimeConstant = 0.5;

      // Start volume tracking loop for UI visualizers
      this.startVolumeMonitoring();

      // 4. Connect to server WebSocket endpoint at /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send initial handshake setup with auth token, vehicle context and preferred voice
        this.ws?.send(
          JSON.stringify({
            type: 'setup',
            idToken: options.idToken,
            vehicleId: options.vehicleId,
            vehicleContextText: options.vehicleContextText || '',
            voiceName: options.voiceName || 'Zephyr',
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            this.isConnected = true;
            this.callbacks.onStatusChange('connected');
            this.startMicStreaming();
          } else if (msg.audio) {
            // Received model audio chunk (24kHz Mono L16 PCM)
            this.callbacks.onStatusChange('speaking');
            this.playAudioChunk(msg.audio);
          } else if (msg.interrupted) {
            // User interrupted Gemini: immediately cut off audio playback & drain queue
            this.clearAudioQueue();
            this.callbacks.onStatusChange('interrupted');
            setTimeout(() => {
              if (this.isConnected) {
                this.callbacks.onStatusChange('listening');
              }
            }, 100);
          } else if (msg.transcript) {
            this.callbacks.onTranscript?.(
              msg.speaker || 'model',
              msg.transcript,
              Boolean(msg.isFinal)
            );
          } else if (msg.type === 'turn_complete') {
            if (this.scheduledAudioEndTime <= (this.outputAudioCtx?.currentTime || 0)) {
              this.callbacks.onStatusChange('listening');
            }
          } else if (msg.type === 'error' || msg.error) {
            const errorMsg = msg.error || 'Server encountered an error during Live Voice.';
            const category: LiveVoiceErrorCategory = msg.category || 'LIVE_SESSION_ERROR';
            console.warn('[LiveVoice] Server error payload received:', {
              category,
              error: errorMsg,
              status: msg.status,
            });
            this.callbacks.onError?.(errorMsg, {
              category,
              status: msg.status,
              rawMessage: errorMsg,
            });
            this.callbacks.onStatusChange('error');
            this.stop();
          }
        } catch (err) {
          console.warn('[LiveVoice] Error parsing Live WebSocket message:', err);
        }
      };

      this.ws.onerror = (e) => {
        console.error('[LiveVoice] WebSocket transport error:', e);
        this.callbacks.onError?.('Live Voice connection failed. Check your network or server status.', {
          category: 'WS_TRANSPORT_ERROR',
        });
        this.callbacks.onStatusChange('error');
        this.stop();
      };

      this.ws.onclose = (ev) => {
        console.log('[LiveVoice] WebSocket closed with code:', ev.code, 'reason:', ev.reason);
        if (ev.code >= 4400) {
          const category: LiveVoiceErrorCategory =
            ev.code === 4401 ? 'AUTH_INVALID' : ev.code === 4403 ? 'GEMINI_PERMISSION_DENIED' : 'WS_CLOSED';
          this.callbacks.onError?.(ev.reason || `Session closed by server (${ev.code})`, {
            category,
            status: ev.code,
            rawMessage: ev.reason,
          });
        }
        this.isConnected = false;
        this.callbacks.onStatusChange('disconnected');
        this.stop();
      };
    } catch (err: any) {
      console.warn('[LiveVoice] Exception in start():', {
        name: err?.name,
        message: err?.message,
        isIframe,
      });

      let category: LiveVoiceErrorCategory = 'MIC_PERMISSION_DENIED';
      let friendlyMessage = '';

      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        category = 'MIC_PERMISSION_DENIED';
        friendlyMessage = isIframe
          ? 'Microphone access is blocked in the embedded preview frame. Please grant microphone access for Google AI Studio and reload the page.'
          : 'Microphone permission was denied by your browser. Please allow microphone access in site settings and try again.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        category = 'MIC_NOT_FOUND';
        friendlyMessage = 'No microphone device was detected on your computer or mobile device.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        category = 'MIC_BUSY';
        friendlyMessage = 'Microphone is currently in use by another application or blocked by the operating system.';
      } else if (err?.name === 'OverconstrainedError') {
        category = 'MIC_OVERCONSTRAINED';
        friendlyMessage = 'Microphone hardware does not support the requested audio recording format.';
      } else {
        category = 'MIC_UNSUPPORTED';
        friendlyMessage = `Microphone initialization error: ${err?.message || 'Unable to open audio input'}`;
      }

      this.callbacks.onError?.(friendlyMessage, {
        category,
        rawErrorName: err?.name,
        rawMessage: err?.message,
        isIframe,
      });
      this.callbacks.onStatusChange('error');
      this.stop();
    }
  }

  private startVolumeMonitoring(): void {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
    }

    const dataArray = new Uint8Array(32);
    this.volumeCheckInterval = setInterval(() => {
      if (!this.isConnected) return;

      // 1. Output (model) volume
      if (this.outputAnalyser && this.outputAudioCtx) {
        this.outputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normVol = Math.min(1, Math.max(0, avg / 128));
        if (normVol > 0.05) {
          this.callbacks.onVolumeChange?.(normVol, 'model');
          return;
        }
      }

      // 2. Input (user) volume
      if (this.inputAnalyser && !this.isMuted) {
        this.inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normVol = Math.min(1, Math.max(0, avg / 128));
        this.callbacks.onVolumeChange?.(normVol, 'user');
      }
    }, 50);
  }

  private startMicStreaming(): void {
    if (!this.inputAudioCtx || !this.mediaStream) return;

    const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    if (this.inputAnalyser) {
      source.connect(this.inputAnalyser);
    }

    // Buffer size 2048 at 16kHz emits ~128ms audio frames
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (this.isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const base64Pcm = this.pcmFloat32ToBase64Int16(inputData);

      this.ws.send(
        JSON.stringify({
          type: 'audio',
          audio: base64Pcm,
        })
      );
    };

    source.connect(this.scriptProcessor);

    // Muted gain node to prevent loopback mic sound into speakers while keeping ScriptProcessor active
    const muteGain = this.inputAudioCtx.createGain();
    muteGain.gain.value = 0;
    this.scriptProcessor.connect(muteGain);
    muteGain.connect(this.inputAudioCtx.destination);

    this.callbacks.onStatusChange('listening');
  }

  private pcmFloat32ToBase64Int16(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  private playAudioChunk(base64Audio: string): void {
    if (!this.outputAudioCtx) return;

    try {
      // Decode base64 to 16-bit PCM (24kHz Mono from Gemini Live)
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.outputAnalyser) {
        source.connect(this.outputAnalyser);
        this.outputAnalyser.connect(this.outputAudioCtx.destination);
      } else {
        source.connect(this.outputAudioCtx.destination);
      }

      const currentTime = this.outputAudioCtx.currentTime;
      const startTime = Math.max(currentTime, this.scheduledAudioEndTime);
      source.start(startTime);
      this.scheduledAudioEndTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0 && this.scheduledAudioEndTime <= this.outputAudioCtx!.currentTime) {
          if (this.isConnected) {
            this.callbacks.onStatusChange('listening');
          }
        }
      };
    } catch (err) {
      console.warn('[LiveVoice] Error playing audio chunk from Gemini Live:', err);
    }
  }

  public clearAudioQueue(): void {
    // Immediately stop any active audio buffers playing
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.scheduledAudioEndTime = this.outputAudioCtx.currentTime;
    }
  }

  public sendTextMessage(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text.trim()) {
      this.ws.send(JSON.stringify({ type: 'text', text: text.trim() }));
    }
  }

  public stop(): void {
    this.isConnected = false;

    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }

    this.clearAudioQueue();

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.send(JSON.stringify({ type: 'end' }));
          this.ws.close();
        }
      } catch {}
      this.ws = null;
    }

    this.scheduledAudioEndTime = 0;
    this.callbacks.onStatusChange('disconnected');
  }
}
