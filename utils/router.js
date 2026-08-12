/**
 * SUBAH 6 BAJE CHAI — URL Router
 * Handles ?station= query param for shareable station links
 */

/**
 * Get station ID from URL query parameter
 * @returns {string|null} Station ID or null
 */
export function getStationFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('station') || null;
}

/**
 * Update URL to reflect current station (without page reload)
 * @param {string} stationId - Station ID to set
 */
export function setStationInURL(stationId) {
  const url = new URL(window.location.href);
  url.searchParams.set('station', stationId);
  window.history.replaceState({}, '', url.toString());
}

/**
 * Update the page title based on station
 * @param {string} stationName - Human-readable station name
 */
export function updatePageTitle(stationName) {
  if (stationName) {
    document.title = `Subah 6 Baje Chai — ${stationName}`;
  } else {
    document.title = 'Subah 6 Baje Chai — Radio for Slow Mornings';
  }
}

/**
 * Update Open Graph meta for dynamic sharing
 * @param {string} stationName
 * @param {string} description
 */
export function updateMeta(stationName, description) {
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  
  if (ogTitle && stationName) {
    ogTitle.setAttribute('content', `Subah 6 Baje Chai — ${stationName}`);
  }
  if (ogDesc && description) {
    ogDesc.setAttribute('content', description);
  }
}
