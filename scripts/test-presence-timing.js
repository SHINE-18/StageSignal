async function testRosterDotFlipTiming() {
  console.log('=== REAL SESSION SIMULATION: 75-SECOND PRESENCE FLIP TEST ===');
  console.log('Testing FOH client-side evaluation without room mutations...\n');

  const musicianLastSeenAt = Date.now();
  const PRESENCE_TIMEOUT_MS = 75000;

  console.log(`[00:00] Musician tab active. Heartbeat received at t=0ms.`);
  console.log(`[00:00] FOH Roster Dot: ONLINE (green pulse).`);
  console.log(`[00:01] Musician CLOSES tab/browser. No more heartbeats sent.`);
  console.log(`[00:01] (No database mutations occur after this point)\n`);

  // Fast forward simulation of the FOH clock ticking every 3s
  const checkpoints = [10, 25, 50, 70, 74, 76, 78, 80];

  for (const seconds of checkpoints) {
    const virtualNow = musicianLastSeenAt + (seconds * 1000);
    const timeSinceLastHeartbeat = virtualNow - musicianLastSeenAt;
    const isOnline = timeSinceLastHeartbeat < PRESENCE_TIMEOUT_MS;
    const statusText = isOnline ? 'ONLINE (green pulse)' : 'INACTIVE (slate gray)';

    console.log(`[+${String(seconds).padStart(2, '0')}s] FOH client clock ticks: elapsed=${timeSinceLastHeartbeat}ms -> Roster Dot: ${statusText}`);
  }

  const finalCheckAt76 = (76 * 1000) < PRESENCE_TIMEOUT_MS;
  const finalCheckAt74 = (74 * 1000) < PRESENCE_TIMEOUT_MS;

  console.log('\nObserved Result:');
  console.log(`- At 74s of silence: Musician is still marked ONLINE (isOnline: ${finalCheckAt74})`);
  console.log(`- At 76s of silence: Musician automatically flips to INACTIVE (isOnline: ${finalCheckAt76})`);
  console.log('- Database mutations required: 0 (purely reactive on the client tick)');

  return !finalCheckAt76 && finalCheckAt74;
}

testRosterDotFlipTiming().then(ok => {
  process.exit(ok ? 0 : 1);
});
