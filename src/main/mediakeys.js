'use strict';

const { execFile } = require('node:child_process');
const { runScript } = require('./powershell');

// Virtuelle tastkoder for Windows' medietaster.
const VK = {
  playpause: 0xb3,
  stop: 0xb2,
  previous: 0xb1,
  next: 0xb0,
};

// MPRIS-metoder for de samme taster på Linux.
const MPRIS = {
  playpause: 'PlayPause',
  stop: 'Stop',
  previous: 'Previous',
  next: 'Next',
};

/** Linux: kalder Spotify-appens MPRIS-interface over D-Bus, som medietasterne gør i skrivebordet. */
function sendMpris(method) {
  return new Promise((resolve, reject) => {
    execFile(
      'dbus-send',
      ['--session', '--print-reply', '--dest=org.mpris.MediaPlayer2.spotify', '/org/mpris/MediaPlayer2', `org.mpris.MediaPlayer2.Player.${method}`],
      { timeout: 5000 },
      (err, stdout) => (err ? reject(err) : resolve(stdout))
    );
  });
}

/**
 * Sender en medietast til Windows, præcis som tasterne på et multimedie-tastatur.
 * Spotify-appen (og de fleste andre afspillere) reagerer på dem, også uden Premium.
 * Selve tastetrykket ligger i src/main/ps/mediakey.ps1.
 * @param {'playpause'|'stop'|'previous'|'next'} name
 */
async function sendMediaKey(name, { run = runScript, mpris = sendMpris, platform = process.platform } = {}) {
  const vk = VK[name];
  if (vk === undefined) throw new Error(`Unknown media key: ${name}`);
  if (platform === 'linux') {
    await mpris(MPRIS[name]);
    return;
  }
  if (platform !== 'win32') throw new Error('Media keys are only supported on Windows and Linux.');
  await run('mediakey.ps1', ['-Vk', vk]);
}

module.exports = { sendMediaKey, VK, MPRIS };
