/**
 * Audio Engine Adapter
 * Handles Web Audio API, frequency analysis for waveforms, base64 WAV playback,
 * audio interruption, and SpeechRecognition / MediaRecorder capturing.
 */

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private onPlaybackEndCallbacks: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public init(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getAnalyser(): AnalyserNode | null {
    this.init();
    return this.analyser;
  }

  /**
   * Play base64 WAV audio (from Gemini 3.8 TTS)
   */
  public async playWavBase64(base64Wav: string, onEnd?: () => void): Promise<void> {
    this.stopPlayback();
    const ctx = this.init();

    try {
      // Decode base64 to ArrayBuffer
      const cleanBase64 = base64Wav.replace(/^data:[^;]+;base64,/, '');
      const binaryString = window.atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(ctx.destination);
      }

      this.currentSource = source;
      this.isPlaying = true;

      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        if (onEnd) onEnd();
        this.onPlaybackEndCallbacks.forEach((cb) => cb());
        this.onPlaybackEndCallbacks = [];
      };

      source.start(0);
    } catch (err) {
      console.error('AudioEngine decode/playback failed:', err);
      // Fallback: create Audio element
      try {
        const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
        audio.onended = () => {
          this.isPlaying = false;
          if (onEnd) onEnd();
        };
        this.isPlaying = true;
        await audio.play();
      } catch (audioElErr) {
        console.error('Fallback Audio element also failed:', audioElErr);
        if (onEnd) onEnd();
      }
    }
  }

  /**
   * Interrupt current playback immediately
   */
  public stopPlayback(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // Source might already have ended
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public onPlaybackEnd(cb: () => void) {
    this.onPlaybackEndCallbacks.push(cb);
  }

  /**
   * Synthesize with client browser SpeechSynthesis as immediate fallback
   */
  public speakWithBrowserFallback(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      this.isPlaying = false;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      this.isPlaying = false;
      if (onEnd) onEnd();
    };
    this.isPlaying = true;
    window.speechSynthesis.speak(utterance);
  }
}
