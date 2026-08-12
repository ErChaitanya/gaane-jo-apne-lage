/**
 * SUBAH 6 BAJE CHAI — Helper Utilities
 */

/**
 * Format seconds to mm:ss
 * @param {number} seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Pick a random element from an array
 * @param {Array} arr
 * @returns {*} Random element
 */
export function randomFrom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle array in place (Fisher–Yates)
 * @param {Array} arr
 * @returns {Array} Shuffled array (same reference)
 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} ms - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(null, args), ms);
  };
}

/**
 * Throttle a function
 * @param {Function} fn
 * @param {number} ms - Minimum interval in milliseconds
 * @returns {Function}
 */
export function throttle(fn, ms = 300) {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= ms) {
      lastTime = now;
      fn.apply(null, args);
    }
  };
}

/**
 * Morning messages pool
 */
export const MORNING_MESSAGES = [
  "Pehle chai. Phir duniya.",
  "Subah jaldi uthne ka ek fayda hai — duniya thodi shaant milti hai.",
  "Aaj ka plan: chai.",
  "Phone side mein rakh. Gaana sun.",
  "Ek aur gaana. Phir kaam pakka.",
  "Thoda ruk ja. Subah abhi baaki hai.",
  "Kuch nahi karna hai. Bas sun.",
  "Ye wala gaana — ek baar aur.",
  "Subah ki chai mein jaadu hota hai.",
  "Radio on. Duniya off.",
  "Kal ka sochna band kar. Aaj ki chai pi.",
  "Zindagi mein sukoon chahiye toh subah jaldi utho.",
  "Chai ke bina subah, subah nahi hoti.",
  "Koi jaldi nahi hai. Baith. Sun.",
  "Iss gaane mein kho ja thoda.",
  "Purani yaadein, garam chai, aur thodi dhoop.",
  "Aaj kuch naya hoga. Pehle chai toh pi le.",
  "Subah subah itna accha gaana — din ban gaya.",
];

/**
 * Format listener count with slight randomization for feel
 * @returns {number}
 */
export function getListenerCount() {
  // Base count with gentle randomization
  return randomInt(18, 47);
}

/**
 * Get current time formatted for the atmosphere badge
 * @returns {string} e.g., "06:17 AM"
 */
export function getFormattedTime() {
  const now = new Date();
  let hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
}

/**
 * Get the atmospheric context based on the local time
 * @returns {Object} { period, chaiLabel, mood, quote }
 */
export function getTimeContext() {
  const hour = new Date().getHours();
  
  // 12:00 AM – 3:59 AM
  if (hour >= 0 && hour < 4) {
    return {
      period: 'late-night',
      chaiLabel: '🌙 CHAI: RAAT KI SAATHI',
      mood: '86% BETTER',
      quote: 'Raat lambi hai. Ek chai aur sahi.'
    };
  }
  // 4:00 AM – 6:59 AM
  else if (hour >= 4 && hour < 7) {
    return {
      period: 'early-morning',
      chaiLabel: '🌅 CHAI: SUBAH KI PEHLI PYALI',
      mood: '90% FRESH',
      quote: 'Pehli chai. Pehli roshni.'
    };
  }
  // 7:00 AM – 10:59 AM
  else if (hour >= 7 && hour < 11) {
    return {
      period: 'morning',
      chaiLabel: '☀️ CHAI: GARMA GARAM',
      mood: '87% BETTER',
      quote: 'Subah ka asli plan: chai.'
    };
  }
  // 11:00 AM – 3:59 PM
  else if (hour >= 11 && hour < 16) {
    return {
      period: 'midday',
      chaiLabel: '🌤️ CHAI: EK AUR HO JAYE?',
      mood: '82% BETTER',
      quote: 'Kaam toh chalta rahega. Chai pehle.'
    };
  }
  // 4:00 PM – 6:59 PM
  else if (hour >= 16 && hour < 19) {
    return {
      period: 'evening',
      chaiLabel: '🌇 CHAI: SHAAM KI CUTTING',
      mood: '91% BETTER',
      quote: 'Shaam ho gayi. Ab ek cutting toh banti hai.'
    };
  }
  // 7:00 PM – 11:59 PM
  else {
    return {
      period: 'night',
      chaiLabel: '🌙 CHAI: BAITHO, RAAT BAAKI HAI',
      mood: '88% BETTER',
      quote: 'Thoda ruk. Raat abhi baaki hai.'
    };
  }
}
