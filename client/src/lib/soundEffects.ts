/**
 * Sound Effects Manager
 * Generates and plays audio effects for user interactions
 */

// Cache for generated audio contexts and sounds
const audioContextCache = new Map<string, AudioContext>();
const soundCache = new Map<string, AudioBuffer>();

/**
 * Get or create an AudioContext
 */
function getAudioContext(): AudioContext {
  if (audioContextCache.has('default')) {
    return audioContextCache.get('default')!;
  }
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  audioContextCache.set('default', audioContext);
  return audioContext;
}

/**
 * Generate a "cha-ching" money sound using Web Audio API
 * Creates a pleasant ascending tone sequence
 */
function generateChaChingSound(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const duration = 0.6; // 600ms total
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  // Create a sequence of tones: low, high, very high (ascending)
  const notes = [
    { freq: 523.25, start: 0, duration: 0.15 },      // C5 (cha)
    { freq: 783.99, start: 0.15, duration: 0.15 },   // G5 (ching)
    { freq: 1046.5, start: 0.3, duration: 0.2 },     // C6 (money!)
    { freq: 783.99, start: 0.5, duration: 0.1 },     // G5 (fade)
  ];

  notes.forEach(note => {
    const startSample = Math.floor(note.start * sampleRate);
    const endSample = Math.floor((note.start + note.duration) * sampleRate);
    
    for (let i = startSample; i < endSample; i++) {
      const t = (i - startSample) / sampleRate;
      const phase = 2 * Math.PI * note.freq * t;
      
      // Envelope: attack, sustain, release
      let envelope = 1;
      const attackTime = 0.02;
      const releaseTime = 0.05;
      
      if (t < attackTime) {
        envelope = t / attackTime; // Attack
      } else if (t > note.duration - releaseTime) {
        envelope = (note.duration - t) / releaseTime; // Release
      }
      
      data[i] = Math.sin(phase) * envelope * 0.3; // 0.3 = volume
    }
  });

  return buffer;
}

/**
 * Play the cha-ching success sound
 */
export function playChaChingSound(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = getAudioContext();
      
      // Resume audio context if suspended (required by browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playSound(audioContext);
          resolve();
        }).catch(reject);
      } else {
        playSound(audioContext);
        resolve();
      }
    } catch (error) {
      console.warn('Failed to play sound effect:', error);
      reject(error);
    }
  });

  function playSound(audioContext: AudioContext) {
    const buffer = generateChaChingSound(audioContext);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  }
}

/**
 * Check if audio is supported in the browser
 */
export function isAudioSupported(): boolean {
  return !!(window.AudioContext || (window as any).webkitAudioContext);
}

/**
 * Get user's sound preference from localStorage
 */
export function getSoundPreference(): boolean {
  const stored = localStorage.getItem('soundEffectsEnabled');
  // Default to true if not set
  return stored === null ? true : stored === 'true';
}

/**
 * Set user's sound preference
 */
export function setSoundPreference(enabled: boolean): void {
  localStorage.setItem('soundEffectsEnabled', String(enabled));
}

/**
 * Play sound if user has enabled it
 */
export async function playOptionalSound(): Promise<void> {
  if (!isAudioSupported() || !getSoundPreference()) {
    return;
  }
  
  try {
    await playChaChingSound();
  } catch (error) {
    // Silently fail - don't interrupt user experience for audio issues
    console.debug('Sound effect playback failed:', error);
  }
}
