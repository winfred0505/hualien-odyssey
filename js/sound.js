/**
 * Web Audio API 程序化音效引擎
 * 無需外部音訊檔案，純純前端合成，提供山風、太平洋海浪、風鈴與按鍵點擊反饋
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // 預設靜音以符合瀏覽器自動播放政策，使用者點擊開啟
    this.waveNode = null;
    this.gainNode = null;
    this.ambientRunning = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.gainNode) {
        this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      }
    } else {
      if (!this.ambientRunning) {
        this.startAmbientWaves();
      }
      if (this.gainNode) {
        this.gainNode.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
      }
      this.playChime(587.33); // D5
    }
    return !this.isMuted;
  }

  // 播放太平洋海浪背景白噪音循環
  startAmbientWaves() {
    if (!this.ctx || this.ambientRunning) return;
    this.ambientRunning = true;

    // 建立 4 秒粉紅/白噪音緩衝區
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // 低通濾波器模擬海浪起伏 (Lowpass Filter Sweeps)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    // LFO 調變海浪呼吸週期 (約 6 秒一個起伏)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.16; // 約 6.25 秒一次海浪
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(filter.frequency);
    lfo.start();

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.isMuted ? 0 : 0.2;

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    whiteNoise.start();
  }

  // 播放清脆的選項敲擊/水滴風鈴音
  playChoice() {
    if (this.isMuted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // 獲得新道具/名產時的和弦提示
  playItemReward() {
    if (this.isMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = this.ctx.currentTime + idx * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  // 典雅古樸風鈴泛音
  playChime(freq = 520) {
    if (this.isMuted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.2);
  }
}

window.soundEngine = new SoundEngine();
