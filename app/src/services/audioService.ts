/**
 * Audio Service for keyboard sounds.
 * Abstracted to allow easy integration with native platforms in the future.
 */

import { CLASSIC_CLICK_BASE64, MODERN_CLICK_BASE64, CLICK_CLICK_BASE64 } from '../assets/audioData';

class AudioService {
  private audioContext: AudioContext | null = null;
  private classicBuffer: AudioBuffer | null = null;
  private modernBuffer: AudioBuffer | null = null;
  private clickBuffer: AudioBuffer | null = null;
  private isLoading: boolean = false;

  private unlockPromise: Promise<void> | null = null;

  constructor() {
    // Set up audio unlock on first user interaction (required for iOS)
    if (typeof document !== 'undefined') {
      const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown'];
      const unlockAudio = () => {
        this.unlockAudioContext();
        // Remove listeners after first interaction
        unlockEvents.forEach(event => {
          document.removeEventListener(event, unlockAudio, { capture: true });
        });
      };
      unlockEvents.forEach(event => {
        document.addEventListener(event, unlockAudio, { capture: true, once: true });
      });
    }
  }

  private async unlockAudioContext(): Promise<void> {
    if (this.unlockPromise) return this.unlockPromise;

    this.unlockPromise = (async () => {
      try {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          await this.loadSounds();
        }
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch (error) {
        console.log('Audio unlock failed:', error);
      }
    })();

    return this.unlockPromise;
  }

  private async initContext() {
    // Ensure audio is unlocked (required for iOS)
    await this.unlockAudioContext();

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadSounds();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private async base64ToBuffer(base64: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;
    try {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return await this.audioContext.decodeAudioData(bytes.buffer);
    } catch (e) {
      console.error('Error decoding audio data', e);
      return null;
    }
  }

  private async loadSounds() {
    if (this.isLoading || !this.audioContext) return;
    
    this.isLoading = true;
    try {
      const [classic, modern, click] = await Promise.all([
        this.base64ToBuffer(CLASSIC_CLICK_BASE64),
        this.base64ToBuffer(MODERN_CLICK_BASE64),
        this.base64ToBuffer(CLICK_CLICK_BASE64)
      ]);
      
      this.classicBuffer = classic;
      this.modernBuffer = modern;
      this.clickBuffer = click;
      console.log('Keyboard sounds loaded successfully from base64');
    } catch (error) {
      console.warn('Could not load keyboard sounds from base64, falling back to synthesized sound:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Plays a mechanical keyboard click sound.
   */
  public playClickSound(variant: 'classic' | 'modern' | 'click' = 'modern') {
    // Use Promise.resolve().then() to ensure synchronous execution starts immediately
    // but still allow async operations for audio loading
    Promise.resolve().then(async () => {
      try {
        await this.initContext();
        if (!this.audioContext) return;

      let buffer: AudioBuffer | null = null;
      if (variant === 'classic') {
        buffer = this.classicBuffer;
      } else if (variant === 'click') {
        buffer = this.clickBuffer;
      } else {
        buffer = this.modernBuffer;
      }

      if (buffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      } else {
        // Fallback to synthesis if MP3 is not available or still loading
        this.playSynthesizedClick();
      }
    } catch (error) {
      console.error('Failed to play click sound:', error);
    }
    });
  }

  private playSynthesizedClick() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // 1. The "Click" (High frequency transient)
    const clickOsc = this.audioContext.createOscillator();
    const clickGain = this.audioContext.createGain();
    
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(4000, now);
    clickOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.02);
    
    clickGain.gain.setValueAtTime(0.15, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    
    clickOsc.connect(clickGain);
    clickGain.connect(this.audioContext.destination);
    
    clickOsc.start(now);
    clickOsc.stop(now + 0.03);

    // 2. The "Clack" (Lower frequency bottom-out)
    const clackOsc = this.audioContext.createOscillator();
    const clackGain = this.audioContext.createGain();
    
    clackOsc.type = 'sine';
    clackOsc.frequency.setValueAtTime(180, now);
    clackOsc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
    
    clackGain.gain.setValueAtTime(0.1, now);
    clackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    clackOsc.connect(clackGain);
    clackGain.connect(this.audioContext.destination);
    
    clackOsc.start(now);
    clackOsc.stop(now + 0.08);

    this.playMechanicalNoise(now);
  }

  private playMechanicalNoise(startTime: number) {
    if (!this.audioContext) return;
    
    const bufferSize = this.audioContext.sampleRate * 0.05; 
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2500, startTime);
    noiseFilter.Q.value = 1;

    noiseGain.gain.setValueAtTime(0.06, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noise.start(startTime);
    noise.stop(startTime + 0.05);
  }
  public async playErrorBeep() {
    try {
      await this.initContext();
      if (!this.audioContext) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (_) {}
  }
}

export const audioService = new AudioService();
