/**
 * SUBAH 6 BAJE CHAI — Unified Right Drawer
 * Manages Stations, Library (Favorites/Recent), and Current Playlist
 */

export class RightDrawer {
  constructor(drawerEl, toggleEl, stations, callbacks) {
    this.drawer = drawerEl;
    this.toggle = toggleEl;
    this.stations = stations;
    this.callbacks = callbacks || {};
    
    // state
    this.isOpen = false;
    this.activeStationId = null;
    this.playlistSongs = [];
    this.currentIndex = -1;

    this._build();
    this._bindEvents();
  }

  _build() {
    this.drawer.innerHTML = `
      <div class="right-drawer-inner">
        <div class="drawer-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <button id="btn-focus-mobile" style="
            display: none;
            font-family: var(--font-mono); 
            font-size: var(--text-xs); 
            color: var(--color-golden);
            background: transparent;
            border: var(--border-vintage);
            padding: var(--space-xs) var(--space-md);
            border-radius: var(--radius-xl);
            cursor: pointer;
            letter-spacing: 0.1em;
          " aria-label="Enter Focus Mode">⛶ FOCUS</button>
          <button class="drawer-close" aria-label="Close drawer" style="margin-left: auto;">✕</button>
        </div>
        <div class="drawer-content">
          
          <div class="drawer-section-header">
            <span class="dial-icon"></span>
            <span>ROTATIONS</span>
          </div>
          <div class="drawer-cards" id="drawer-stations"></div>

          <div class="drawer-section-header">
            <span class="dial-icon"></span>
            <span>LIBRARY</span>
          </div>
          <div class="drawer-cards" id="drawer-library">
            <div class="drawer-card" id="btn-my-favorites" tabindex="0">
              <span class="drawer-card-emoji">❤️</span>
              <div class="drawer-card-title">My Favorites</div>
              <div class="drawer-card-desc hindi-text">Aapke pasandeeda gaane</div>
            </div>
            <div class="drawer-card" id="btn-recently-played" tabindex="0">
              <span class="drawer-card-emoji">🕒</span>
              <div class="drawer-card-title">Recently Played</div>
              <div class="drawer-card-desc hindi-text">Jo abhi sune</div>
            </div>
          </div>

          <div class="drawer-section-header">
            <span class="dial-icon"></span>
            <span>CURRENT PLAYLIST</span>
          </div>
          <div id="drawer-playlist"></div>

        </div>
      </div>
    `;

    this._renderStations();
  }

  _renderStations() {
    const container = this.drawer.querySelector('#drawer-stations');
    container.innerHTML = '';
    
    this.stations.forEach(station => {
      const card = document.createElement('div');
      card.className = 'drawer-card station-card';
      card.dataset.stationId = station.id;
      card.setAttribute('tabindex', '0');
      
      card.innerHTML = `
        <span class="drawer-card-emoji">${station.emoji}</span>
        <div class="drawer-card-title">${station.name}</div>
        <div class="drawer-card-desc hindi-text">${station.descriptionHindi || station.description}</div>
      `;
      
      card.addEventListener('click', () => {
        if (station.id !== this.activeStationId) {
          this.setActiveStation(station.id);
          if (this.callbacks.onStationChange) this.callbacks.onStationChange(station.id);
        }
        if (window.innerWidth <= 768) this.close();
      });
      
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
      
      container.appendChild(card);
    });
  }

  _bindEvents() {
    this.drawer.querySelector('.drawer-close').addEventListener('click', () => this.close());
    
    if (this.toggle) {
      this.toggle.addEventListener('click', () => this.toggleDrawer());
    }

    // Library buttons
    const favBtn = this.drawer.querySelector('#btn-my-favorites');
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        this._clearActiveCards();
        favBtn.classList.add('active');
        if (this.callbacks.onFavoritesClick) this.callbacks.onFavoritesClick();
        if (window.innerWidth <= 768) this.close();
      });
      favBtn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); favBtn.click(); }
      });
    }

    const recBtn = this.drawer.querySelector('#btn-recently-played');
    if (recBtn) {
      recBtn.addEventListener('click', () => {
        this._clearActiveCards();
        recBtn.classList.add('active');
        if (this.callbacks.onRecentlyPlayedClick) this.callbacks.onRecentlyPlayedClick();
        if (window.innerWidth <= 768) this.close();
      });
      recBtn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); recBtn.click(); }
      });
    }

    // Outside click to close (optional, maybe not on desktop to let user keep it open while using site? Actually user said "When clicked: drawer slides in". Let's close on outside click for mobile mostly)
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.drawer.contains(e.target) && this.toggle && !this.toggle.contains(e.target)) {
        // don't aggressively close on desktop if they click player, but do on mobile
        if (window.innerWidth <= 768) this.close();
      }
    });
  }

  _clearActiveCards() {
    this.drawer.querySelectorAll('.drawer-card').forEach(c => c.classList.remove('active'));
  }

  setActiveStation(stationId) {
    this.activeStationId = stationId;
    this._clearActiveCards();
    const card = this.drawer.querySelector(`.station-card[data-station-id="${stationId}"]`);
    if (card) card.classList.add('active');
  }

  loadPlaylist(songs, activeIndex = -1) {
    this.playlistSongs = songs;
    this.currentIndex = activeIndex;
    const container = this.drawer.querySelector('#drawer-playlist');
    container.innerHTML = '';
    
    if (!songs || songs.length === 0) {
      let msg = 'No songs available';
      let sub = '';
      if (this.callbacks.showingFavorites) {
        msg = 'Abhi koi favourite nahi hai.';
        sub = 'Jo gaane dil ko lage, yahan milenge.';
      } else if (this.callbacks.showingRecent) {
        msg = 'Abhi tak koi gaana nahi suna.';
        sub = 'Pehle thodi chai pi lo, aur ek gaana lagao.';
      }
      container.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--color-beige); opacity: 0.7;">
          <div style="font-family: var(--font-display); font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--color-golden);">${msg}</div>
          <div style="font-family: var(--font-hindi); font-size: 0.9rem;">${sub}</div>
        </div>
      `;
      return;
    }

    songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.className = 'drawer-song-row';
      if (i === this.currentIndex) row.classList.add('playing');
      row.setAttribute('tabindex', '0');
      
      const thumbUrl = song.thumbnail || `https://img.youtube.com/vi/${song.youtubeId}/hqdefault.jpg`;
      row.innerHTML = `
        <div class="playing-indicator">
          <span></span><span></span><span></span>
        </div>
        <img src="${thumbUrl}" class="drawer-song-thumb" alt="" loading="lazy" onerror="this.onerror=null; this.src='assets/hero.jpg';">
        <div class="drawer-song-info">
          <div class="drawer-song-title">${song.title}</div>
          <div class="drawer-song-artist">${song.artist}</div>
        </div>
        <button class="drawer-song-play" tabindex="-1" aria-label="Play">▶</button>
      `;
      
      row.addEventListener('click', () => {
        if (this.callbacks.onSongSelect) this.callbacks.onSongSelect(i);
      });
      
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
      });

      container.appendChild(row);
    });
  }

  setPlayingIndex(index) {
    this.currentIndex = index;
    const rows = this.drawer.querySelectorAll('.drawer-song-row');
    rows.forEach((row, i) => {
      const isPlaying = i === index;
      row.classList.toggle('playing', isPlaying);
    });
    
    if (this.isOpen && rows[index]) {
      // smooth scroll to it
      rows[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  open() {
    this.drawer.classList.add('open');
    this.isOpen = true;
  }

  close() {
    this.drawer.classList.remove('open');
    this.isOpen = false;
  }

  toggleDrawer() {
    this.isOpen ? this.close() : this.open();
  }
}
