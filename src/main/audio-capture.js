'use strict';

const { desktopCapturer } = require('electron');

// Tilladelser rendereren må få. Alt andet (notifikationer, geolokation, mikrofon osv.) afvises.
const ALLOWED_PERMISSIONS = new Set(['display-capture', 'media', 'fullscreen', 'clipboard-sanitized-write']);

/**
 * Når rendereren kalder navigator.mediaDevices.getDisplayMedia(), svarer vi med Windows' systemlyd
 * (WASAPI loopback fra standard-afspilningsenheden). Lyden går direkte til Web Audio i rendereren,
 * den gemmes aldrig og forlader aldrig maskinen.
 *
 * Chromium kræver også en videokilde. Vi giver vores eget vindue, så brugerens skærm aldrig optages,
 * og rendereren stopper videosporet med det samme.
 */
function installLoopbackCapture(ses, { log = console } = {}) {
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });

  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    let video = request.frame;
    try {
      if (!video) {
        const [screen] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
        video = screen;
      }
      if (process.platform !== 'win32') {
        log.warn('System audio (loopback) is only supported on Windows.');
        callback({ video });
        return;
      }
      callback({ video, audio: 'loopback' });
    } catch (err) {
      log.error('Could not start audio capture:', err);
      try {
        callback({ video });
      } catch (inner) {
        log.error('Could not end the request either:', inner);
      }
    }
  });
}

/**
 * Linux: Chromium's loopback findes ikke, og getDisplayMedia hænger på Wayland. I stedet læser rendereren
 * "mikrofonen" med getUserMedia, og standard-input peges på monitoren af standard-afspilningsenheden.
 * Skal kaldes, før Chromiums lydtjeneste starter.
 */
function useOutputMonitorAsInput(env = process.env, platform = process.platform) {
  if (platform === 'linux' && !env.PULSE_SOURCE) env.PULSE_SOURCE = '@DEFAULT_MONITOR@';
}

module.exports = { installLoopbackCapture, useOutputMonitorAsInput, ALLOWED_PERMISSIONS };
