/**
 * SUBAH 6 BAJE CHAI — Vintage Radio Player
 * Main player component managing YouTube playback, controls, and song progression
 */

import { YouTubePlayer } from '../utils/youtube.js';
import { formatTime, shuffleArray } from '../utils/helpers.js';
import { Visualizer } from './visualizer.js';
import { isFavorite, addFavorite, removeFavorite, getPreference, savePreference, addRecentlyPlayed } from '../utils/db.js';

export class Player {
  /**
   * @param {HTMLElement} barEl - The player bar element
   * @param {Object} options
   * @param {Function} options.onSongChange - Callback(song, index)
   * @param {Function} options.onPlayStateChange - Callback(isPlaying)
   */
  constructor(barEl, options = {}) {
    this.bar = barEl;
    this.onSongChange = options.onSongChange || null;
    this.onPlayStateChange = options.onPlayStateChange || null;

    this.yt = null;
    this.visualizer = null;
    this.songs = [];
    this.currentIndex = 0;
    
    // Playback modes
    this.mode = 'random'; // 'random', 'sequence', 'repeat'
    this.shuffleCycle = [];
    this.cycleIndex = 0;

    this.isInitialized = false;
    this.isPlaying = false;
    this.isMinimized = false;

    // Sleep Timer
    this.sleepTimerEndAt = null;
    this.sleepTimerExpired = false;
    this.stopAfterCurrentSong = false;
    this.timerInterval = null;
    this.sleepTimerMinutes = 0; // 0=Off, 15, 30, 45, 60

    this._build();
    this._bindEvents();
    
    // Initialize state from prefs
    this._initPrefs();
  }

  async _initPrefs() {
    const minPref = await getPreference('playerCollapsed', false);
    if (minPref) {
      this.setMinimized(true);
    }
  }

  _build() {
    this.bar.innerHTML = `
      <!-- Song Thumbnail -->
      <div class="player-youtube-wrap" id="player-youtube-wrap">
        <img src="" id="player-thumbnail" alt="Song thumbnail" style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease;">
      </div>

      <!-- Hidden YouTube Player -->
      <div id="yt-player" style="position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;"></div>

      <!-- Song Info -->
      <div class="player-info">
        <div class="player-now-playing">
          <span class="on-air-dot" id="player-onair-dot"></span>
          <span id="player-status-text">NOW PLAYING</span>
        </div>
        <div class="player-song-title" id="player-song-title">—</div>
        <div class="player-song-artist" id="player-song-artist">
          <span id="player-song-artist-text">Select a station to begin</span>
        </div>
      </div>

      <!-- Progress -->
      <div class="player-progress-container">
        <div style="display: flex; justify-content: flex-end; width: 100%;">
          <span id="player-timer-display" style="font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--color-golden); letter-spacing: 0.1em; display: none;"></span>
        </div>
        <div class="player-progress-bar" id="player-progress-bar" role="slider" aria-label="Song progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
          <div class="player-progress-fill" id="player-progress-fill"></div>
        </div>
        <div class="player-progress-times">
          <span id="player-time-current">0:00</span>
          <span id="player-time-total">0:00</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="player-controls">
        <button class="player-btn" id="btn-timer" aria-label="Sleep Timer" title="Sleep Timer: Off">🌙</button>
        <button class="player-btn" id="btn-mode" aria-label="Playback Mode" title="Mode: Random">🔀</button>
        <button class="player-btn" id="btn-prev" aria-label="Previous song" title="Previous">⏮</button>
        <button class="player-btn player-btn-play" id="btn-play" aria-label="Play" title="Play/Pause">▶</button>
        <button class="player-btn" id="btn-next" aria-label="Next song" title="Next">⏭</button>
        <button class="player-btn" id="btn-fav" aria-label="Favorite" title="Favorite">♡</button>
        <a href="#" target="_blank" class="player-btn" id="btn-watch-video" aria-label="Watch Video" title="Watch on YouTube" style="display: none; font-size: var(--text-sm); text-decoration: none;">📺</a>
      </div>

      <!-- Visualizer & Right Controls -->
      <div class="player-station">
        <div class="player-visualizer" id="player-visualizer"></div>
      </div>

      <!-- Layout Toggles -->
      <div class="player-songlist-toggle-wrap" style="display: flex; gap: var(--space-xs); flex-shrink: 0; align-items: center;">
        <button class="player-songlist-toggle" id="btn-songlist-toggle" aria-label="Open drawer" title="Drawer">☰</button>
        <button class="player-songlist-toggle" id="btn-minimize-toggle" aria-label="Minimize player" title="Minimize">⤓</button>
      </div>
    `;

    // Init visualizer
    this.visualizer = new Visualizer(this.bar.querySelector('#player-visualizer'));
  }

  _bindEvents() {
    // Play/Pause
    this.bar.querySelector('#btn-play').addEventListener('click', () => this.togglePlay());
    
    // Previous
    this.bar.querySelector('#btn-prev').addEventListener('click', () => this.previous());
    
    // Next
    this.bar.querySelector('#btn-next').addEventListener('click', () => this.next());
    
    // Favorite
    this.bar.querySelector('#btn-fav').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const song = this.songs[this.currentIndex];
      if (!song) return;
      
      const currentlyFav = btn.classList.contains('active');
      if (currentlyFav) {
        await removeFavorite(song.id || song.youtubeId);
        btn.textContent = '♡';
        btn.classList.remove('active');
      } else {
        await addFavorite(song);
        btn.textContent = '♥';
        btn.classList.add('active');
      }
    });

    // Mode Toggle
    this.bar.querySelector('#btn-mode').addEventListener('click', () => this._toggleMode());

    // Timer Toggle
    this.bar.querySelector('#btn-timer').addEventListener('click', () => this._toggleTimer());

    // Minimize Toggle
    this.bar.querySelector('#btn-minimize-toggle').addEventListener('click', () => {
      this.setMinimized(!this.isMinimized);
      savePreference('playerCollapsed', this.isMinimized);
    });

    // Progress bar click to seek
    const progressBar = this.bar.querySelector('#player-progress-bar');
    progressBar.addEventListener('click', (e) => {
      if (!this.yt) return;
      const rect = progressBar.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      this.yt.seekTo(Math.max(0, Math.min(1, fraction)));
    });

    // Progress bar keyboard
    progressBar.addEventListener('keydown', (e) => {
      if (!this.yt) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const current = this.yt.getProgress();
        this.yt.seekTo(Math.min(1, current + 0.05));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const current = this.yt.getProgress();
        this.yt.seekTo(Math.max(0, current - 0.05));
      }
    });
  }

  /**
   * Initialize with YouTube API and load first song
   */
  async init(songs, startIndex = 0) {
    this.songs = songs;
    this.currentIndex = startIndex;

    if (!this.yt) {
      this.yt = new YouTubePlayer('yt-player');
    }

    this.yt.onPlay = async () => {
      this.errorCount = 0; // reset on successful play
      this.isPlaying = true;
      this._updatePlayButton(true);
      this._updateStatus('playing');
      this.visualizer.setPlaying(true);
      
      const song = this.songs[this.currentIndex];
      this._updateSongInfo(song);

      // Add to recently played (fire and forget)
      if (song) addRecentlyPlayed(song).catch(e => console.warn(e));

      if (this.onPlayStateChange) this.onPlayStateChange(true);
    };

    this.yt.onPause = () => {
      this.isPlaying = false;
      this._updatePlayButton(false);
      this._updateStatus('paused');
      this.visualizer.setPlaying(false);
      if (this.onPlayStateChange) this.onPlayStateChange(false);
    };

    this.yt.onEnd = () => {
      // Natural Song End Logic
      if (this.stopAfterCurrentSong) {
        this.stopRadio();
        return;
      }

      if (this.mode === 'repeat') {
        this.playSong(this.currentIndex, true);
      } else {
        this.next(true);
      }
    };

    this.yt.onError = (errorCode) => {
      console.warn(`YouTube error ${errorCode} for song: ${this.songs[this.currentIndex]?.title}`);
      this._updateStatus('tuning');
      
      const titleEl = this.bar.querySelector('#player-song-title');
      if (titleEl) {
        titleEl.textContent = "This song isn't available right now.";
      }

      if (this.stopAfterCurrentSong) {
        // Do not auto skip if timer expired
        this.stopRadio();
        return;
      }

      this.errorCount = (this.errorCount || 0) + 1;
      if (this.errorCount > 5) {
        console.warn('Too many consecutive errors, pausing radio.');
        this.stopRadio();
        return;
      }

      // Auto-skip to next on error
      setTimeout(() => this.next(true), 2500);
    };

    this.yt.onProgress = (current, duration, progress) => {
      this._updateProgress(current, duration, progress);
    };

    // Load the song
    const song = this.songs[this.currentIndex];
    if (song) {
      await this._updateSongInfo(song);
      await this.yt.init(song.youtubeId);
      this.isInitialized = true;
    }
  }

  async loadStation(songs, stationName) {
    this.songs = songs;
    this._generateShuffleCycle();
    
    if (this.mode === 'random') {
      this.cycleIndex = 0;
      this.currentIndex = this.shuffleCycle[0] !== undefined ? this.shuffleCycle[0] : 0;
    } else {
      this.currentIndex = 0;
    }

    const song = this.songs[this.currentIndex];
    if (song) {
      await this._updateSongInfo(song);
      if (this.isInitialized && this.yt) {
        this.yt.loadVideo(song.youtubeId);
      } else {
        await this.init(songs, this.currentIndex);
      }
      if (this.onSongChange) this.onSongChange(song, this.currentIndex);
    }
  }

  togglePlay() {
    if (!this.yt || !this.isInitialized) return;
    this.yt.togglePlay();
  }
  
  toggleMute() {
    if (!this.yt || !this.isInitialized) return;
    const isMuted = this.yt.player.isMuted();
    if (isMuted) {
      this.yt.player.unMute();
    } else {
      this.yt.player.mute();
    }
  }
  
  toggleFavorite() {
    const favBtn = this.bar.querySelector('#btn-fav');
    if (favBtn) favBtn.click();
  }

  async playSong(index, isAutoSkip = false) {
    if (index < 0 || index >= this.songs.length) return;
    this.currentIndex = index;
    const song = this.songs[index];
    
    if (this.mode === 'random') {
      const foundIdx = this.shuffleCycle.indexOf(index);
      if (foundIdx !== -1) {
        this.cycleIndex = foundIdx;
      }
    }
    
    if (!isAutoSkip) {
      await this._updateSongInfo(song);
    }
    
    this.visualizer.randomize();
    
    if (this.yt && this.isInitialized) {
      this.yt.loadVideo(song.youtubeId);
    }

    if (this.onSongChange) this.onSongChange(song, index);
  }

  async playTemporarySong(song) {
    await this._updateSongInfo(song);
    this.visualizer.randomize();
    if (this.yt && this.isInitialized) {
      this.yt.loadVideo(song.youtubeId);
    }
  }

  next(isAutoSkip = false) {
    if (this.mode === 'random') {
      this.cycleIndex++;
      if (this.cycleIndex >= this.shuffleCycle.length) {
        this._generateShuffleCycle();
        this.cycleIndex = 0;
      }
      this.playSong(this.shuffleCycle[this.cycleIndex], isAutoSkip);
    } else {
      let nextIndex = this.currentIndex + 1;
      if (nextIndex >= this.songs.length) nextIndex = 0;
      this.playSong(nextIndex, isAutoSkip);
    }
  }

  previous() {
    if (this.yt && this.yt.getCurrentTime() > 3) {
      this.yt.seekTo(0);
      return;
    }

    if (this.mode === 'random') {
      this.cycleIndex--;
      if (this.cycleIndex < 0) {
        this.cycleIndex = this.shuffleCycle.length - 1;
      }
      this.playSong(this.shuffleCycle[this.cycleIndex]);
    } else {
      let prevIndex = this.currentIndex - 1;
      if (prevIndex < 0) prevIndex = this.songs.length - 1;
      this.playSong(prevIndex);
    }
  }
  
  stopRadio() {
    if (this.yt) this.yt.pauseVideo();
    this.isPlaying = false;
    this._updatePlayButton(false);
    this.visualizer.setPlaying(false);
    this._updateStatus('paused');
    
    const display = this.bar.querySelector('#player-timer-display');
    if (display) {
      display.style.display = 'block';
      display.textContent = 'Radio taking a little rest. Good night.';
    }
  }

  setStationName(name) {
    // Not strictly needed in the new minimized UI but kept for compatibility
  }

  show() {
    this.bar.classList.add('visible');
  }

  hide() {
    this.bar.classList.remove('visible');
  }

  setMinimized(minimized) {
    this.isMinimized = minimized;
    if (minimized) {
      this.bar.classList.add('minimized');
      this.bar.querySelector('#btn-minimize-toggle').textContent = '⤒';
      this.bar.querySelector('#btn-minimize-toggle').title = 'Expand';
    } else {
      this.bar.classList.remove('minimized');
      this.bar.querySelector('#btn-minimize-toggle').textContent = '⤓';
      this.bar.querySelector('#btn-minimize-toggle').title = 'Minimize';
    }
  }

  // ---- Private helpers ----

  _generateShuffleCycle() {
    if (!this.songs || this.songs.length === 0) {
      this.shuffleCycle = [];
      return;
    }
    const indices = Array.from({length: this.songs.length}, (_, i) => i);
    const currentActiveIndex = this.shuffleCycle[this.cycleIndex];
    let newCycle = shuffleArray(indices);
    if (newCycle.length > 1 && currentActiveIndex !== undefined && newCycle[0] === currentActiveIndex) {
      [newCycle[0], newCycle[1]] = [newCycle[1], newCycle[0]];
    }
    this.shuffleCycle = newCycle;
  }

  async _toggleMode() {
    if (this.mode === 'random') {
      this.mode = 'sequence';
    } else if (this.mode === 'sequence') {
      this.mode = 'repeat';
    } else {
      this.mode = 'random';
      const foundIdx = this.shuffleCycle.indexOf(this.currentIndex);
      if (foundIdx !== -1) {
        this.cycleIndex = foundIdx;
      }
    }
    await savePreference('playbackMode', this.mode);
    this._updateModeUI();
  }

  async setMode(mode) {
    if (['random', 'sequence', 'repeat'].includes(mode)) {
      this.mode = mode;
      if (mode === 'random') {
        const foundIdx = this.shuffleCycle.indexOf(this.currentIndex);
        if (foundIdx !== -1) {
          this.cycleIndex = foundIdx;
        }
      }
      this._updateModeUI();
    }
  }

  _updateModeUI() {
    const btn = this.bar.querySelector('#btn-mode');
    if (!btn) return;
    switch(this.mode) {
      case 'random':
        btn.textContent = '🔀'; btn.title = 'Mode: Random'; btn.style.opacity = '1';
        break;
      case 'sequence':
        btn.textContent = '📋'; btn.title = 'Mode: Sequence'; btn.style.opacity = '1';
        break;
      case 'repeat':
        btn.textContent = '🔂'; btn.title = 'Mode: Repeat One'; btn.style.opacity = '1';
        break;
    }
  }

  _toggleTimer() {
    const options = [0, 15, 30, 45, 60];
    let idx = options.indexOf(this.sleepTimerMinutes);
    idx = (idx + 1) % options.length;
    this.sleepTimerMinutes = options[idx];
    
    const btn = this.bar.querySelector('#btn-timer');
    const display = this.bar.querySelector('#player-timer-display');
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.sleepTimerMinutes === 0) {
      // Off
      this.sleepTimerEndAt = null;
      this.sleepTimerExpired = false;
      this.stopAfterCurrentSong = false;
      btn.classList.remove('active');
      btn.style.opacity = '1';
      display.style.display = 'none';
      
      // If we were pending stop but song hasn't finished, we resume normal UI
      if (this.isPlaying) {
         this._updateStatus('playing');
      }
    } else {
      // Set new target
      this.sleepTimerEndAt = Date.now() + this.sleepTimerMinutes * 60 * 1000;
      this.sleepTimerExpired = false;
      this.stopAfterCurrentSong = false;
      btn.classList.add('active');
      btn.style.opacity = '1';
      display.style.display = 'block';
      
      this._updateTimerUI();
      this.timerInterval = setInterval(() => this._updateTimerUI(), 1000);
    }
  }

  _updateTimerUI() {
    if (!this.sleepTimerEndAt) return;
    const display = this.bar.querySelector('#player-timer-display');
    
    const remaining = this.sleepTimerEndAt - Date.now();
    if (remaining <= 0) {
      // Expired!
      this.sleepTimerExpired = true;
      this.stopAfterCurrentSong = true;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      
      // We do NOT stop music here. We let the song finish.
      if (this.isPlaying) {
         display.textContent = '🌙 FINISHING SONG';
      }
      return;
    }
    
    // Format mm:ss
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    display.textContent = `🌙 ${m}:${s.toString().padStart(2, '0')}`;
  }

  async _updateSongInfo(song) {
    const titleEl = this.bar.querySelector('#player-song-title');
    const artistTextEl = this.bar.querySelector('#player-song-artist-text');
    const watchBtn = this.bar.querySelector('#btn-watch-video');
    const thumbEl = this.bar.querySelector('#player-thumbnail');
    const favBtn = this.bar.querySelector('#btn-fav');

    if (titleEl) titleEl.textContent = song.title;
    if (artistTextEl) artistTextEl.textContent = song.artist;
    
    if (watchBtn) {
      watchBtn.href = `https://www.youtube.com/watch?v=${song.youtubeId}`;
      watchBtn.style.display = 'inline-block';
    }

    const thumbUrl = song.thumbnail || `https://img.youtube.com/vi/${song.youtubeId}/hqdefault.jpg`;

    if (thumbEl) {
      thumbEl.src = thumbUrl;
      thumbEl.onload = () => thumbEl.style.opacity = '1';
      thumbEl.onerror = () => { thumbEl.onerror = null; thumbEl.src = 'assets/hero.jpg'; thumbEl.style.opacity = '1'; };
    }

    if (favBtn) {
      const isFav = await isFavorite(song.id || song.youtubeId);
      if (isFav) {
        favBtn.textContent = '♥';
        favBtn.classList.add('active');
      } else {
        favBtn.textContent = '♡';
        favBtn.classList.remove('active');
      }
    }

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist,
          artwork: [
            { src: thumbUrl, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      } catch (err) {
        console.warn('Media Session API failed:', err);
      }
    }
  }

  _updatePlayButton(isPlaying) {
    const btn = this.bar.querySelector('#btn-play');
    if (btn) {
      btn.textContent = isPlaying ? '⏸' : '▶';
      btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }
  }

  _updateStatus(state) {
    const statusText = this.bar.querySelector('#player-status-text');
    const dot = this.bar.querySelector('#player-onair-dot');
    const ytWrap = this.bar.querySelector('.player-youtube-wrap');

    switch (state) {
      case 'playing':
        if (statusText) statusText.textContent = 'NOW PLAYING';
        if (dot) dot.classList.remove('paused');
        if (ytWrap) ytWrap.style.opacity = '1';
        break;
      case 'paused':
        if (statusText) statusText.textContent = 'PAUSED';
        if (dot) dot.classList.add('paused');
        break;
      case 'tuning':
        if (statusText) statusText.textContent = 'TUNING...';
        if (dot) dot.classList.add('paused');
        if (ytWrap) ytWrap.style.opacity = '0.3';
        break;
    }
  }

  _updateProgress(current, duration, progress) {
    const fill = this.bar.querySelector('#player-progress-fill');
    const currentTime = this.bar.querySelector('#player-time-current');
    const totalTime = this.bar.querySelector('#player-time-total');
    const progressBar = this.bar.querySelector('#player-progress-bar');

    if (fill) fill.style.width = `${progress * 100}%`;
    if (currentTime) currentTime.textContent = formatTime(current);
    if (totalTime) totalTime.textContent = formatTime(duration);
    if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(progress * 100));
  }

  getSongListToggle() {
    return this.bar.querySelector('#btn-songlist-toggle');
  }

  destroy() {
    if (this.yt) this.yt.destroy();
    if (this.visualizer) this.visualizer.destroy();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.bar.innerHTML = '';
  }
}
