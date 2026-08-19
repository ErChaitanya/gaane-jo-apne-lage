/**
 * SUBAH 6 BAJE CHAI — Main Application
 * ☀️ Radio for slow mornings.
 *
 * Orchestrates all components: player, stations, song list, atmosphere.
 */

import { stations, getStationById, getDefaultStation } from './data/stations.js';
import { Player } from './components/player.js';
import { RightDrawer } from './components/drawer.js';
import { Atmosphere } from './components/atmosphere.js';
import { getStationFromURL, setStationInURL, updatePageTitle } from './utils/router.js';
import { initDB, getPreference, savePreference, getFavorites, getRecentlyPlayed } from './utils/db.js';

class App {
  constructor() {
    this.player = null;
    this.drawer = null;
    this.atmosphere = null;
    this.currentStation = null;
    this.isStarted = false;
    this.showingLibraryList = null; // 'favorites' or 'recent' or null
    this.librarySongs = [];
  }

  /**
   * Initialize the app (called on DOMContentLoaded)
   */
  async init() {
    // Initialize IndexedDB
    await initDB();

    // Determine which station to load
    const urlStation = getStationFromURL();
    const lastStationId = await getPreference('lastStationId');
    const stationIdToLoad = urlStation || lastStationId;
    
    this.currentStation = stationIdToLoad 
      ? (getStationById(stationIdToLoad) || getDefaultStation())
      : getDefaultStation();

    // Update page title
    updatePageTitle(this.currentStation.name);

    // Set initial background immediately behind splash screen
    this._setBackground(this.currentStation.background || 'assets/hero.jpg');

    // Set up the Start Radio button
    const splashScreen = document.getElementById('splash-screen');
    const startBtn = document.getElementById('start-btn');

    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._startRadio(splashScreen);
      });
    }

    if (splashScreen) {
      splashScreen.addEventListener('click', () => {
        this._startRadio(splashScreen);
      });
    }

    // Focus mode buttons
    const btnFocus = document.getElementById('btn-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    const btnShare = document.getElementById('btn-share');
    
    if (btnFocus) btnFocus.addEventListener('click', () => this.setFocusMode(true));
    if (btnExitFocus) btnExitFocus.addEventListener('click', () => this.setFocusMode(false));
    if (btnShare) btnShare.addEventListener('click', () => this.shareStation(btnShare));
    
    // Global keyboard shortcuts
    this._bindShortcuts();
  }

  /**
   * Start the radio experience
   */
  async _startRadio(splashScreen) {
    if (this.isStarted) return;
    this.isStarted = true;

    // Hide splash
    if (splashScreen) {
      splashScreen.classList.add('hidden');
    }

    // Initialize atmosphere
    this.atmosphere = new Atmosphere();
    this.atmosphere.init();

    // Initialize player
    const playerBar = document.getElementById('player-bar');
    this.player = new Player(playerBar, {
      onSongChange: (song, index) => this._onSongChange(song, index),
      onPlayStateChange: (isPlaying) => this._onPlayStateChange(isPlaying)
    });
    
    // Restore preference
    const mode = await getPreference('playbackMode', 'random');
    await this.player.setMode(mode);

    this.player.show();

    // Initialize Unified Right Drawer
    const drawerEl = document.getElementById('right-drawer');
    const drawerToggle = document.getElementById('drawer-toggle');
    this.drawer = new RightDrawer(
      drawerEl,
      drawerToggle,
      stations,
      {
        onStationChange: (stationId) => this._onStationChange(stationId),
        onFavoritesClick: async () => {
          this.showingLibraryList = 'favorites';
          this.drawer.callbacks.showingFavorites = true;
          this.drawer.callbacks.showingRecent = false;
          const favs = await getFavorites();
          this.librarySongs = favs;
          this.drawer.loadPlaylist(favs);
        },
        onRecentlyPlayedClick: async () => {
          this.showingLibraryList = 'recent';
          this.drawer.callbacks.showingFavorites = false;
          this.drawer.callbacks.showingRecent = true;
          const recent = await getRecentlyPlayed();
          this.librarySongs = recent;
          this.drawer.loadPlaylist(recent);
        },
        onSongSelect: (index) => {
          if (this.showingLibraryList) {
            this.player.playTemporarySong(this.librarySongs[index]);
          } else {
            this.player.playSong(index);
          }
        }
      }
    );

    // Connect player's playlist toggle to open the drawer
    const songListToggle = this.player.getSongListToggle();
    if (songListToggle) {
      songListToggle.addEventListener('click', () => {
        this.drawer.toggleDrawer();
      });
    }

    const btnFocusMobile = document.getElementById('btn-focus-mobile');
    if (btnFocusMobile) {
      btnFocusMobile.addEventListener('click', () => {
        this.drawer.close();
        this.setFocusMode(true);
      });
    }

    // Load the current station
    await this._loadStation(this.currentStation);

    // Show tuning overlay briefly for effect
    this._showTuning(600);
  }

  /**
   * Load a station into the player
   * @param {Object} station
   */
  async _loadStation(station) {
    this.currentStation = station;
    this.showingLibraryList = null;

    // Update URL and title
    setStationInURL(station.id);
    updatePageTitle(station.name);
    await savePreference('lastStationId', station.id);

    // Update drawer UI
    this.drawer.callbacks.showingFavorites = false;
    this.drawer.callbacks.showingRecent = false;
    this.drawer.setActiveStation(station.id);
    this.drawer.loadPlaylist(station.songs);
    
    // Change background
    this._setBackground(station.background || 'assets/hero.jpg');

    // Load into player
    this.player.setStationName(`${station.emoji} ${station.name}`);
    await this.player.loadStation(station.songs, `${station.emoji} ${station.name}`);
  }

  /**
   * Crossfade background images
   * @param {string} bgUrl 
   */
  _setBackground(bgUrl) {
    if (this.currentBgUrl === bgUrl) return;
    this.currentBgUrl = bgUrl;

    const layer1 = document.getElementById('bg-layer-1');
    const layer2 = document.getElementById('bg-layer-2');
    
    // Determine which layer is currently active (opacity 1 or empty meaning default 1)
    const layer1Active = layer1.style.opacity !== '0';
    
    const activeLayer = layer1Active ? layer1 : layer2;
    const nextLayer = layer1Active ? layer2 : layer1;
    
    // Set background of next layer and fade it in
    nextLayer.style.backgroundImage = `url('${bgUrl}')`;
    nextLayer.style.opacity = '1';
    
    // Fade out active layer
    activeLayer.style.opacity = '0';
  }

  /**
   * Handle station change from selector
   * @param {string} stationId
   */
  async _onStationChange(stationId) {
    const station = getStationById(stationId);
    if (!station || station.id === this.currentStation?.id) return;

    // Show tuning animation
    this._showTuning(800);
    this.atmosphere.setRadioState('tuning');

    // Small delay for the tuning feel
    await new Promise(resolve => setTimeout(resolve, 400));

    await this._loadStation(station);
  }

  /**
   * Handle song change
   */
  _onSongChange(song, index) {
    if (!this.showingLibraryList) {
      this.drawer.setPlayingIndex(index);
    }
  }

  /**
   * Handle play state change
   */
  _onPlayStateChange(isPlaying) {
    if (this.atmosphere) {
      this.atmosphere.setRadioState(isPlaying ? 'playing' : 'paused');
    }
  }

  /**
   * Show the tuning overlay briefly
   * @param {number} duration - ms
   */
  _showTuning(duration) {
    const overlay = document.getElementById('tuning-overlay');
    if (!overlay) return;

    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
    }, duration);
  }

  setFocusMode(enabled) {
    const btnFocus = document.getElementById('btn-focus');
    const btnExitFocus = document.getElementById('btn-exit-focus');
    const header = document.querySelector('.brand');
    const controls = document.getElementById('header-controls');
    
    if (enabled) {
      document.body.classList.add('focus-mode');
      if (this.drawer) this.drawer.close();
      if (this.player) this.player.setMinimized(true);
      
      if (header) header.style.opacity = '0';
      if (controls) controls.style.display = 'none';
      if (btnExitFocus) btnExitFocus.style.display = 'block';
    } else {
      document.body.classList.remove('focus-mode');
      if (this.player) this.player.setMinimized(false);
      
      if (header) header.style.opacity = '1';
      if (controls) controls.style.display = 'flex';
      if (btnExitFocus) btnExitFocus.style.display = 'none';
    }
  }

  async shareStation(btnShare) {
    const url = window.location.href;
    const title = this.currentStation ? `${this.currentStation.name} - Gaane Jo Apne Lage` : 'Gaane Jo Apne Lage';
    const text = 'Listening to radio for slow moments.';

    const originalText = btnShare.textContent;
    btnShare.textContent = 'COPIED!';
    setTimeout(() => { btnShare.textContent = originalText; }, 2000);

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.warn('Share failed:', err);
        navigator.clipboard.writeText(url).catch(e => console.error(e));
      }
    } else {
      navigator.clipboard.writeText(url).catch(e => console.error(e));
    }
  }

  _bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      if (!this.player || !this.isStarted) return;

      switch (e.code) {
        case 'Space':
          // prevent scrolling if space is hit on body
          if (e.target === document.body || e.target.tagName === 'BUTTON') {
             e.preventDefault();
          }
          this.player.togglePlay();
          break;
        case 'KeyN':
          this.player.next(false);
          break;
        case 'KeyP':
          this.player.previous();
          break;
        case 'KeyM':
          // Mute not strictly required in ui, but requested in prompt as shortcut
          this.player.toggleMute();
          break;
        case 'KeyF':
          this.player.toggleFavorite();
          break;
        case 'Escape':
          if (document.body.classList.contains('focus-mode')) {
            this.setFocusMode(false);
          } else if (this.drawer && this.drawer.isOpen) {
            this.drawer.close();
          }
          break;
      }
    });
  }
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
