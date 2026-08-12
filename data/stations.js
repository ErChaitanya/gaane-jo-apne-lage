/**
 * SUBAH 6 BAJE CHAI — Station Definitions
 * Extensible station registry. Add new stations by adding objects here.
 */

import { marathiSongs } from './marathi-songs.js';
import { ghazalSongs } from './ghazal-songs.js';

export const stations = [
  {
    id: 'marathi-premachi-sakal',
    name: 'Marathi Premachi Sakal',
    emoji: '🌸',
    description: 'Soft, romantic, pleasant Marathi songs for a peaceful morning.',
    descriptionHindi: 'थोडं प्रेम, थोडी हवा, आणि हातात गरम चहा.',
    background: 'assets/marathi-premachi-sakal.jpg',
    songs: marathiSongs
  },
  {
    id: 'ghazal-ki-subah',
    name: 'Ghazal Ki Subah',
    emoji: '🎙️',
    description: 'Classic, famous and beautiful ghazals for a peaceful morning.',
    descriptionHindi: 'Chai garam rakho. Ghazal khatam hone mein waqt lagega.',
    background: 'assets/ghazal-ki-subah.jpg',
    songs: ghazalSongs
  }
];

/**
 * Find a station by ID
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getStationById(id) {
  return stations.find(s => s.id === id);
}

/**
 * Get the default station
 * @returns {Object}
 */
export function getDefaultStation() {
  return stations.find(s => s.id === 'marathi-premachi-sakal') || stations[0];
}
