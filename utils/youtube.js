/**
 * SUBAH 6 BAJE CHAI — YouTube IFrame API Wrapper
 * Single-instance player management with event delegation
 */

export class YouTubePlayer {
  constructor(containerId) {
    this.containerId = containerId;
    this.player = null;
    this.isReady = false;
    this.isAPILoaded = false;
    this.pendingVideoId = null;
    this.progressInterval = null;

    // Callbacks
    this.onReady = null;
    this.onPlay = null;
    this.onPause = null;
    this.onEnd = null;
    this.onBuffer = null;
    this.onError = null;
    this.onProgress = null;
  }

  /**
   * Load the YouTube IFrame API script
   * @returns {Promise} Resolves when API is ready
   */
  loadAPI() {
    return new Promise((resolve, reject) => {
      if (this.isAPILoaded && window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Check if script already exists
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const checkReady = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkReady);
            this.isAPILoaded = true;
            resolve();
          }
        }, 100);
        return;
      }

      // Set up the global callback
      window.onYouTubeIframeAPIReady = () => {
        this.isAPILoaded = true;
        resolve();
      };

      // Load the standard YouTube IFrame API script
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => reject(new Error('Failed to load YouTube API'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize the player with a video
   * @param {string} videoId - YouTube video ID
   */
  async init(videoId) {
    await this.loadAPI();
    return new Promise((resolve) => {
      if (this.player && this.isReady) {
        this.player.loadVideoById(videoId);
        resolve();
        return;
      }

      this.player = new YT.Player(this.containerId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          autohide: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          widget_referrer: window.location.origin
        },
        events: {
          onReady: (event) => {
            this.isReady = true;
            this._startProgressTracking();
            this._startAdGuardTimer();
            if (this.onReady) this.onReady(event);
            resolve();
          },
          onStateChange: (event) => this._handleStateChange(event),
          onError: (event) => {
            console.warn('YouTube player error:', event.data);
            if (this.onError) this.onError(event.data);
          }
        }
      });
    });
  }

  /**
   * High-Frequency (100ms) Real-Time Ad-Blocker Guard
   */
  _checkAndSuppressAd() {
    if (!this.player || !this.isReady) return;
    try {
      // 1. YouTube IFrame API explicit ad methods
      const isAdState = (typeof this.player.getAdState === 'function' && this.player.getAdState() > 0) ||
                        (typeof this.player.isAdPlaying === 'function' && this.player.isAdPlaying());
      
      // 2. Video metadata ad check
      let isAdMeta = false;
      if (typeof this.player.getVideoData === 'function') {
        const data = this.player.getVideoData();
        if (data && (data.isAd || data.ad || (data.author && data.author.toLowerCase().includes('ad')))) {
          isAdMeta = true;
        }
      }

      const isAd = isAdState || isAdMeta;
      
      if (isAd) {
        this.isSuppressingAd = true;
        // Step 1: Mute ad audio immediately
        if (typeof this.player.mute === 'function' && typeof this.player.isMuted === 'function' && !this.player.isMuted()) {
          this.player.mute();
        }
        // Step 2: 16x playback speed boost
        if (typeof this.player.setPlaybackRate === 'function') {
          this.player.setPlaybackRate(16);
        }
        // Step 3: Playhead seek past ad block
        const duration = this.getDuration();
        if (duration > 0 && typeof this.player.seekTo === 'function') {
          this.player.seekTo(duration, true);
        }
      } else {
        if (this.isSuppressingAd) {
          this.isSuppressingAd = false;
          // Restore playback speed to normal (1.0)
          if (typeof this.player.setPlaybackRate === 'function') {
            this.player.setPlaybackRate(1);
          }
          // Restore audio
          if (typeof this.player.unMute === 'function') {
            this.player.unMute();
          }
        }
      }
    } catch (e) {
      // Safe fallback for transient state transitions
    }
  }

  _startAdGuardTimer() {
    if (this.adGuardInterval) return;
    this.adGuardInterval = setInterval(() => {
      this._checkAndSuppressAd();
    }, 100);
  }

  _stopAdGuardTimer() {
    if (this.adGuardInterval) {
      clearInterval(this.adGuardInterval);
      this.adGuardInterval = null;
    }
  }

  /**
   * Handle player state changes
   */
  _handleStateChange(event) {
    this._checkAndSuppressAd();
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        this._startProgressTracking();
        if (this.onPlay) this.onPlay();
        break;
      case YT.PlayerState.PAUSED:
      case -1: /* UNSTARTED */
      case 5:  /* CUED */
        this._stopProgressTracking();
        if (this.onPause) this.onPause();
        break;
      case YT.PlayerState.ENDED:
        this._stopProgressTracking();
        if (this.onEnd) this.onEnd();
        break;
      case YT.PlayerState.BUFFERING:
        if (this.onBuffer) this.onBuffer();
        break;
    }
  }

  /**
   * Load a new video (reuses existing player instance)
   * @param {string} videoId
   */
  loadVideo(videoId) {
    if (!this.player || !this.isReady) {
      this.pendingVideoId = videoId;
      return;
    }
    this.player.loadVideoById(videoId);
  }

  /**
   * Play / Resume
   */
  play() {
    if (this.player && this.isReady) {
      this.player.playVideo();
    }
  }

  /**
   * Pause
   */
  pause() {
    if (this.player && this.isReady) {
      this.player.pauseVideo();
    }
  }

  /**
   * Toggle play/pause
   * @returns {boolean} true if now playing, false if paused
   */
  togglePlay() {
    if (!this.player || !this.isReady) return false;
    const state = this.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  /**
   * Check if currently playing
   */
  isPlaying() {
    if (!this.player || !this.isReady) return false;
    return this.player.getPlayerState() === YT.PlayerState.PLAYING;
  }

  /**
   * Get current time in seconds
   */
  getCurrentTime() {
    if (!this.player || !this.isReady) return 0;
    return this.player.getCurrentTime() || 0;
  }

  /**
   * Get total duration in seconds
   */
  getDuration() {
    if (!this.player || !this.isReady) return 0;
    return this.player.getDuration() || 0;
  }

  /**
   * Get progress as 0-1 fraction
   */
  getProgress() {
    const duration = this.getDuration();
    if (duration <= 0) return 0;
    return this.getCurrentTime() / duration;
  }

  /**
   * Seek to a position
   * @param {number} fraction - 0 to 1
   */
  seekTo(fraction) {
    if (!this.player || !this.isReady) return;
    const duration = this.getDuration();
    if (duration > 0) {
      this.player.seekTo(fraction * duration, true);
    }
  }

  /**
   * Set volume (0-100)
   */
  setVolume(vol) {
    if (this.player && this.isReady) {
      this.player.setVolume(vol);
    }
  }

  /**
   * Start progress tracking via requestAnimationFrame
   */
  _startProgressTracking() {
    this._stopProgressTracking();
    const track = () => {
      this._checkAndSuppressAd();
      if (this.onProgress && this.player && this.isReady) {
        const current = this.getCurrentTime();
        const duration = this.getDuration();
        const progress = duration > 0 ? current / duration : 0;
        this.onProgress(current, duration, progress);
      }
      this.progressInterval = requestAnimationFrame(track);
    };
    this.progressInterval = requestAnimationFrame(track);
  }

  /**
   * Stop progress tracking
   */
  _stopProgressTracking() {
    if (this.progressInterval) {
      cancelAnimationFrame(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Destroy the player
   */
  destroy() {
    this._stopProgressTracking();
    this._stopAdGuardTimer();
    if (this.player) {
      try {
        this.player.destroy();
      } catch (e) {
        // Player may already be destroyed
      }
      this.player = null;
      this.isReady = false;
    }
  }
}
