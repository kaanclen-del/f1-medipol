/**
 * F1 SOCIAL Kart Rush Â· V18 race ambience.
 * All sounds are synthesized locally. No audio downloads and no extra dependencies.
 * Starts only after a real user gesture (required by mobile browsers).
 */

type Rival = { id: string; progress: number; lane?: number; speed?: number };
type RaceHudAudio = {
  speed: number;
  started: boolean;
  throttle?: boolean;
  offroad?: boolean;
  contact?: boolean;
  cornerSpeed?: number;
  progress?: number;
  rivals?: Rival[];
};

type RivalVoice = {
  low: OscillatorNode;
  high: OscillatorNode;
  gain: GainNode;
  pan: StereoPannerNode;
};

const limit = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class KartRushAmbientSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: RivalVoice[] = [];
  private wind: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private volume: number;
  private destroyed = false;
  private paused = false;
  private lastContact = false;
  private lastOffroad = false;
  private lastPassAt = -10000;
  private closestId = '';
  private lastDistance = 99999;
  // HUD rivals contain progress but may omit speed/lane (current V17 engine).
  // Estimate a smooth pitch from progress deltas without modifying the physics engine.
  private samples = new Map<string, { progress: number; time: number; speed: number }>();

  constructor(volume = .45) {
    this.volume = limit(volume, 0, 1);
  }

  activate() {
    if (this.destroyed || typeof window === 'undefined') return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const ctor: typeof AudioContext | undefined = window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!ctor) return;
      const ctx = new ctor();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = this.volume * .76;
      master.connect(ctx.destination);
      this.master = master;

      // Three independently pitched engines; amplitude reflects proximity.
      for (let i = 0; i < 3; i++) {
        const low = ctx.createOscillator();
        const high = ctx.createOscillator();
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        low.type = 'sawtooth';
        high.type = 'triangle';
        low.frequency.value = 95;
        high.frequency.value = 190;
        gain.gain.value = 0;
        low.connect(gain);
        high.connect(gain);
        gain.connect(pan);
        pan.connect(master);
        low.start();
        high.start();
        this.voices.push({ low, high, gain, pan });
      }

      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.8), ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
      const wind = ctx.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 600;
      windFilter.Q.value = .5;
      const windGain = ctx.createGain();
      windGain.gain.value = 0;
      wind.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      wind.start();
      this.wind = wind;
      this.windGain = windGain;
    } catch {
      this.dispose();
    }
  }

  setVolume(volume: number) {
    this.volume = limit(volume, 0, 1);
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.volume * .76, this.ctx.currentTime, .07);
    }
  }

  mute(value: boolean) {
    this.paused = value;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (value) {
      for (const voice of this.voices) voice.gain.gain.setTargetAtTime(0, now, .06);
      this.windGain?.gain.setTargetAtTime(0, now, .06);
    }
  }

  update(hud: RaceHudAudio, ownId: string, metersPerLap: number, stopped: boolean) {
    if (!this.ctx || this.destroyed) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const disabled = this.paused || stopped || !hud.started;
    const speed = limit(hud.speed || 0, 0, 350);
    const myProgress = hud.progress || 0;
    const course = Number.isFinite(metersPerLap) && metersPerLap > 1 ? metersPerLap : 2500;
    const nearby = (hud.rivals || [])
      .filter(r => r.id !== ownId && Number.isFinite(r.progress))
      .map(r => {
        const delta = Math.abs((r.progress - myProgress) * course);
        const ring = delta % course;
        const distance = Math.min(ring, course - ring);
        const previous = this.samples.get(r.id);
        const dt = previous ? t - previous.time : 0;
        const dProgress = previous ? r.progress - previous.progress : 0;
        const estimatedSpeed = previous && dt > .05 && dt < 1.5 && dProgress >= 0
          ? limit(dProgress * course / dt * 3.6, 0, 340)
          : previous?.speed ?? 130;
        const speed = typeof r.speed === 'number' && Number.isFinite(r.speed)
          ? r.speed : estimatedSpeed;
        this.samples.set(r.id, { progress: r.progress, time: t, speed });
        return { ...r, distance, speed };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.voices.length);

    this.voices.forEach((voice, index) => {
      const rival = nearby[index];
      if (!rival || disabled || rival.distance > 130) {
        voice.gain.gain.setTargetAtTime(0, t, .12);
        return;
      }
      const proximity = Math.pow(1 - limit(rival.distance / 130, 0, 1), 2);
      const speedFactor = limit(rival.speed / 280, 0, 1);
      const pitch = 88 + speedFactor * 215 + index * 9;
      voice.low.frequency.setTargetAtTime(pitch, t, .08);
      voice.high.frequency.setTargetAtTime(pitch * 2.03, t, .09);
      voice.gain.gain.setTargetAtTime(.077 * proximity, t, .14);
      const side = limit((rival.lane || 0) / 11 + (index - 1) * .13, -.9, .9);
      voice.pan.pan.setTargetAtTime(side, t, .16);
    });

    const wind = disabled ? 0 : Math.pow(speed / 300, 1.25) * .105;
    this.windGain?.gain.setTargetAtTime(wind, t, .22);

    const nearest = nearby[0];
    if (!disabled && nearest) {
      if (nearest.id === this.closestId && nearest.distance < 14 && this.lastDistance > 24 && t - this.lastPassAt > 2.2) {
        this.oneShot('pass');
        this.lastPassAt = t;
      }
      this.closestId = nearest.id;
      this.lastDistance = nearest.distance;
    }
    if (!disabled && hud.contact && !this.lastContact) this.oneShot('impact');
    if (!disabled && hud.offroad && !this.lastOffroad) this.oneShot('gravel');
    this.lastContact = Boolean(hud.contact);
    this.lastOffroad = Boolean(hud.offroad);
  }

  effect(name: string) {
    if (name === 'collision' || name === 'hit') this.oneShot('impact');
    if (name === 'start') this.oneShot('start');
    if (name === 'boost' || name === 'turbo') this.oneShot('pass');
    if (name === 'pickup') this.oneShot('pickup');
  }

  private oneShot(effect: 'impact' | 'pass' | 'gravel' | 'start' | 'pickup') {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer || this.destroyed || this.paused) return;
    if (this.volume === 0) return;
    const duration = effect === 'gravel' ? .38 : effect === 'pass' ? .25 : effect === 'impact' ? .16 : .12;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = effect === 'impact' ? 'lowpass' : 'bandpass';
    filter.frequency.value = effect === 'impact' ? 300 : effect === 'gravel' ? 1400 : 780;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.linearRampToValueAtTime(effect === 'impact' ? .23 : .14, now + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + duration + .02);
    src.onended = () => { try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch {} };
  }

  dispose() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const voice of this.voices) {
      try { voice.low.stop(); voice.high.stop(); } catch {}
      try { voice.low.disconnect(); voice.high.disconnect(); voice.gain.disconnect(); voice.pan.disconnect(); } catch {}
    }
    try { this.wind?.stop(); this.wind?.disconnect(); } catch {}
    this.voices = [];
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.wind = null;
    this.windGain = null;
    this.noiseBuffer = null;
    this.samples.clear();
    if (ctx) void ctx.close().catch(() => {});
  }
}
