/**
 * SUBAH 6 BAJE CHAI — Waveform Visualizer
 * CSS-based animated bars that respond to play/pause state
 */

export class Visualizer {
  constructor(container) {
    this.container = container;
    this.barCount = 12;
    this.isPlaying = false;
    this._build();
  }

  _build() {
    this.container.classList.add('visualizer');
    this.container.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < this.barCount; i++) {
      const bar = document.createElement('div');
      bar.classList.add('visualizer-bar');
      // Randomize max heights for natural look
      const maxH = 8 + Math.random() * 18;
      bar.style.setProperty('--bar-max-height', `${maxH}px`);
      bar.style.height = '3px';
      this.container.appendChild(bar);
    }
  }

  /**
   * Set playing state
   * @param {boolean} playing
   */
  setPlaying(playing) {
    this.isPlaying = playing;
    if (playing) {
      this.container.classList.add('playing');
      this.container.classList.remove('paused');
    } else {
      this.container.classList.remove('playing');
      this.container.classList.add('paused');
    }
  }

  /**
   * Randomize bar heights for visual variety
   */
  randomize() {
    const bars = this.container.querySelectorAll('.visualizer-bar');
    bars.forEach(bar => {
      const maxH = 6 + Math.random() * 20;
      bar.style.setProperty('--bar-max-height', `${maxH}px`);
    });
  }

  destroy() {
    this.container.innerHTML = '';
    this.container.classList.remove('visualizer', 'playing', 'paused');
  }
}
