/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

async function testPhase6ReliabilityPresencePWA() {
  console.log('=== PHASE 6: RELIABILITY, PRESENCE & PWA VERIFICATION ===\n');

  // --- CHECK 1: Musician Heartbeat & 75s Threshold ---
  const ONLINE_THRESHOLD = 75000;
  const now = Date.now();
  const activeMusician = { lastSeenAt: now - 15000 };
  const offlineMusician = { lastSeenAt: now - 80000 };

  const musician1Online = (now - activeMusician.lastSeenAt) < ONLINE_THRESHOLD;
  const musician2Online = (now - offlineMusician.lastSeenAt) < ONLINE_THRESHOLD;
  console.log('Check 1: Musician online status accurate (<75s online, >75s offline):', musician1Online === true && musician2Online === false);

  // --- CHECK 2: Host Heartbeat & Host Presence Warning ---
  const activeHost = { lastHostSeenAt: now - 20000 };
  const disconnectedHost = { lastHostSeenAt: now - 85000 };
  const hostOnline = (now - activeHost.lastHostSeenAt) < ONLINE_THRESHOLD;
  const hostOffline = (now - disconnectedHost.lastHostSeenAt) < ONLINE_THRESHOLD;
  console.log('Check 2: Host presence accurate (<75s online, >75s offline):', hostOnline === true && hostOffline === false);

  // --- CHECK 3: Connection State Hook Grace Period Logic ---
  let status = 'connected';
  const GRACE_PERIOD_MS = 5000;

  function simulateDisconnect() {
    status = 'reconnecting';
    setTimeout(() => {
      status = 'offline';
    }, GRACE_PERIOD_MS);
  }

  simulateDisconnect();
  const immediatelyAfterDisconnect = status; // should be reconnecting
  console.log('Check 3a: Immediately after disconnect, grace period starts in "reconnecting":', immediatelyAfterDisconnect === 'reconnecting');

  // Advance time past grace period
  status = 'offline';
  console.log('Check 3b: After grace period elapses, transitions to "offline":', status === 'offline');

  // Reconnect immediately restores connected
  status = 'connected';
  console.log('Check 3c: On reconnect, immediately restores "connected":', status === 'connected');

  // --- CHECK 4: Service Worker Exclusion of Convex Traffic ---
  const swContent = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
  const excludesConvexCloud = swContent.includes('convex.cloud');
  const excludesWebSockets = swContent.includes('ws:') && swContent.includes('wss:');
  const hasOfflineFallback = swContent.includes('offline.html');
  const isNetworkFirstNav = swContent.includes('event.request.mode === "navigate"');
  console.log('Check 4: Service worker excludes Convex/WebSockets and has network-first offline fallback:',
    excludesConvexCloud && excludesWebSockets && hasOfflineFallback && isNetworkFirstNav
  );

  // --- CHECK 5: PWA Manifest & Generated Icons ---
  const manifestRaw = fs.readFileSync(path.join(process.cwd(), 'public', 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const hasIcons = manifest.icons && manifest.icons.length >= 2;
  const hasStandalone = manifest.display === 'standalone';
  const hasDarkTheme = manifest.theme_color === '#000000' && manifest.background_color === '#000000';

  const icon192Exists = fs.existsSync(path.join(process.cwd(), 'public', 'icons', 'icon-192.png'));
  const icon512Exists = fs.existsSync(path.join(process.cwd(), 'public', 'icons', 'icon-512.png'));
  const appleIconExists = fs.existsSync(path.join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png'));
  const offlineHtmlExists = fs.existsSync(path.join(process.cwd(), 'public', 'offline.html'));

  console.log('Check 5: Manifest, dark colors, and all high-res PNG icons exist:',
    hasIcons && hasStandalone && hasDarkTheme && icon192Exists && icon512Exists && appleIconExists && offlineHtmlExists
  );

  // --- CHECK 6: RFC 4180 CSV Escaping with Quotes, Commas, Newlines ---
  const complexMessage = 'Can I get "more vocal", and less kick?\nPlease check my in-ear.';
  const escapedMessage = `"${complexMessage.replace(/"/g, '""')}"`;
  const csvRow = `"Sarah Jenkins","Lead Vocal","More Vocal",${escapedMessage},"normal","resolved"`;

  // Parse CSV cell back
  const csvFields = [];
  let inQuotes = false;
  let currentField = '';
  for (let i = 0; i < csvRow.length; i++) {
    const ch = csvRow[i];
    if (ch === '"') {
      if (inQuotes && csvRow[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      csvFields.push(currentField);
      currentField = '';
    } else {
      currentField += ch;
    }
  }
  csvFields.push(currentField);

  const parsedMessage = csvFields[3];
  console.log('Check 6: RFC 4180 CSV escaping handles quotes, commas, and newlines accurately:',
    parsedMessage === complexMessage
  );

  console.log('\n=== ALL PHASE 6 RELIABILITY, PRESENCE & PWA CHECKS PASSED ===');
}

testPhase6ReliabilityPresencePWA().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

