/**
 * SUBAH 6 BAJE CHAI — Atmospheric Details
 * Small nostalgic badges, morning messages, ambient effects
 */

import { randomFrom, getListenerCount, getFormattedTime, getTimeContext, MORNING_MESSAGES, randomInt } from '../utils/helpers.js';

export class Atmosphere {
  constructor() {
    this.listenerCount = getListenerCount();
    this.messageTimer = null;
    this.timeTimer = null;
    this.listenerTimer = null;
    this.currentMessageIndex = -1;
    this.currentPeriod = null;
    this.isActive = false;
  }

  /**
   * Create all atmospheric elements and inject them into the DOM
   */
  init() {
    this._createAtmosphere();
    this._createMorningMessage();
    this._createAmbientEffects();
    this.isActive = true;
  }

  _createAtmosphere() {
    const container = document.createElement('div');
    container.className = 'atmosphere';
    container.id = 'atmosphere';
    container.setAttribute('aria-hidden', 'true');

    // On Air badge
    container.innerHTML += `
      <div class="atmo-badge atmo-badge--onair" id="atmo-onair">
        <span class="on-air-dot" id="onair-dot"></span>
        <span class="atmo-value" id="onair-text">RADIO ON AIR</span>
      </div>
    `;

    // Time badge
    container.innerHTML += `
      <div class="atmo-badge atmo-badge--time">
        <span class="atmo-label">TIME</span>
        <span class="atmo-value" id="atmo-time">${getFormattedTime()}</span>
      </div>
    `;

    const timeContext = getTimeContext();
    this.currentPeriod = timeContext.period;

    // Chai badge
    container.innerHTML += `
      <div class="atmo-badge atmo-badge--chai">
        <span class="atmo-label">☕</span>
        <span class="atmo-value" id="atmo-chai-text" style="transition: opacity 0.5s ease;">${timeContext.chaiLabel}</span>
      </div>
    `;

    // Mausam badge
    container.innerHTML += `
      <div class="atmo-badge atmo-badge--mausam">
        <span class="atmo-label">☀️</span>
        <span class="atmo-value">Mausam: Suhana</span>
      </div>
    `;

    // Mood badge
    container.innerHTML += `
      <div class="atmo-badge atmo-badge--mood">
        <span class="atmo-label">🙂</span>
        <span class="atmo-value" id="atmo-mood-text" style="transition: opacity 0.5s ease;">Mood: ${timeContext.mood}</span>
      </div>
    `;

    // Listeners badge
    container.innerHTML += `
      <div class="atmo-badge atmo-badge--listeners">
        <span class="atmo-label">👥</span>
        <span class="atmo-value" id="atmo-listeners">${this.listenerCount} at the chai stall</span>
      </div>
    `;

    document.body.appendChild(container);

    // Start updating time and context
    this.timeTimer = setInterval(() => {
      const el = document.getElementById('atmo-time');
      if (el) el.textContent = getFormattedTime();
      this._checkTimeContext();
    }, 30000); // Update every 30 seconds

    // Slowly change listener count
    this.listenerTimer = setInterval(() => {
      this.listenerCount += randomInt(-3, 4);
      this.listenerCount = Math.max(12, Math.min(65, this.listenerCount));
      const el = document.getElementById('atmo-listeners');
      if (el) el.textContent = `${this.listenerCount} at the chai stall`;
    }, 25000);
  }

  _createMorningMessage() {
    const wrapper = document.createElement('div');
    wrapper.className = 'morning-message';
    wrapper.id = 'morning-message';
    wrapper.setAttribute('aria-hidden', 'true');

    const text = document.createElement('p');
    text.className = 'morning-message-text hindi-text';
    text.id = 'morning-message-text';
    wrapper.appendChild(text);

    document.body.appendChild(wrapper);

    // Rotate messages every 18-25 seconds
    this._showNextMessage();
    this.messageTimer = setInterval(() => {
      this._showNextMessage();
    }, randomInt(18000, 25000));
  }

  _showNextMessage() {
    const el = document.getElementById('morning-message-text');
    if (!el) return;

    // Fade out
    el.classList.remove('visible');

    setTimeout(() => {
      // Pick a new message (avoid repeats)
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * MORNING_MESSAGES.length);
      } while (newIndex === this.currentMessageIndex && MORNING_MESSAGES.length > 1);
      
      this.currentMessageIndex = newIndex;
      el.textContent = MORNING_MESSAGES[newIndex];

      // Fade in
      el.classList.add('visible');
    }, 1500);
  }

  _checkTimeContext() {
    const newContext = getTimeContext();
    if (newContext.period !== this.currentPeriod) {
      this.currentPeriod = newContext.period;
      
      const chaiEl = document.getElementById('atmo-chai-text');
      const moodEl = document.getElementById('atmo-mood-text');
      
      if (chaiEl) chaiEl.style.opacity = '0';
      if (moodEl) moodEl.style.opacity = '0';
      
      setTimeout(() => {
        if (chaiEl) {
          chaiEl.textContent = newContext.chaiLabel;
          chaiEl.style.opacity = '1';
        }
        if (moodEl) {
          moodEl.textContent = `Mood: ${newContext.mood}`;
          moodEl.style.opacity = '1';
        }
        
        // Let's also forcefully show the context quote immediately 
        // to match the new period if the time just rolled over
        const msgEl = document.getElementById('morning-message-text');
        if (msgEl) {
          msgEl.classList.remove('visible');
          setTimeout(() => {
            msgEl.textContent = newContext.quote;
            msgEl.classList.add('visible');
          }, 600);
        }
      }, 600);
    }
  }

  _createAmbientEffects() {
    // Film grain
    const grain = document.createElement('div');
    grain.className = 'film-grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);

    // Steam wisps
    const steam = document.createElement('div');
    steam.className = 'steam-container';
    steam.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const wisp = document.createElement('div');
      wisp.className = 'steam-wisp';
      steam.appendChild(wisp);
    }
    document.body.appendChild(steam);

    // Dust particles
    const dust = document.createElement('div');
    dust.className = 'dust-container';
    dust.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';
      dust.appendChild(particle);
    }
    document.body.appendChild(dust);

    // Flicker
    const flicker = document.createElement('div');
    flicker.className = 'flicker-overlay';
    flicker.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flicker);
  }

  /**
   * Update ON AIR status
   * @param {'playing'|'paused'|'tuning'} state
   */
  setRadioState(state) {
    const dot = document.getElementById('onair-dot');
    const text = document.getElementById('onair-text');
    if (!dot || !text) return;

    switch (state) {
      case 'playing':
        dot.classList.remove('paused');
        text.textContent = 'RADIO ON AIR';
        break;
      case 'paused':
        dot.classList.add('paused');
        text.textContent = 'RADIO PAUSED';
        break;
      case 'tuning':
        dot.classList.remove('paused');
        text.textContent = 'TUNING...';
        break;
    }
  }

  /**
   * Clean up timers
   */
  destroy() {
    if (this.messageTimer) clearInterval(this.messageTimer);
    if (this.timeTimer) clearInterval(this.timeTimer);
    if (this.listenerTimer) clearInterval(this.listenerTimer);
    this.isActive = false;
  }
}
