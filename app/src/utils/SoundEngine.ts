class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Only init if window exists (prevent SSR issues)
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  private resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playTick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playSuccess() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(554, t + 0.1); // C#
    osc.frequency.setValueAtTime(659, t + 0.2); // E

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
    gain.gain.setValueAtTime(0.1, t + 0.3);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playPromotion() {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // Low sweeping bass
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(110, t);
    bass.frequency.exponentialRampToValueAtTime(220, t + 1.5);
    bassGain.gain.setValueAtTime(0, t);
    bassGain.gain.linearRampToValueAtTime(0.2, t + 0.5);
    bassGain.gain.exponentialRampToValueAtTime(0.01, t + 2.0);
    bass.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bass.start(t);
    bass.stop(t + 2.0);

    // Arp
    const arp = this.ctx.createOscillator();
    const arpGain = this.ctx.createGain();
    arp.type = 'square';
    
    [440, 554, 659, 880, 1108].forEach((freq, i) => {
      arp.frequency.setValueAtTime(freq, t + i * 0.15);
    });
    
    arpGain.gain.setValueAtTime(0.05, t);
    arpGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
    
    arp.connect(arpGain);
    arpGain.connect(this.ctx.destination);
    arp.start(t);
    arp.stop(t + 1.0);
  }
}

export const soundEngine = new SoundEngine();
