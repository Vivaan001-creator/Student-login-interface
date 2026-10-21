// The shared leaderboard. It stores only a nickname, a class number and scores (never a real name or contact details).
import { db } from "./Firebase.js";
import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const STEP = { points: 1000, stars: 50, badges: 10 };
let busy = false, lastTry = 0;

// Sends the player's totals. The security rules only let totals go up a little at a time, so big jumps are sent in steps.
export async function syncPlayer(player, force = false) {
  if (busy || (!force && Date.now() - lastTry < 15000)) return false;
  busy = true; lastTry = Date.now();
  try {
    const want = { points: player.points, stars: player.stars, badges: Object.keys(player.badges).length };
    const have = player.sync || { points: -1, stars: 0, badges: 0 };
    if (have.points === want.points && have.stars === want.stars && have.badges === want.badges) return true;
    let cur = { ...have };
    const ref = doc(db, "gameLeaderboard", player.id);
    if (cur.points < 0) {
      const snap = await getDoc(ref);
      if (snap.exists()) { const d = snap.data(); cur = { points: d.points, stars: d.stars, badges: d.badges }; }
      else cur = { points: 0, stars: 0, badges: 0 };
      if (!snap.exists()) {
        const first = { points: Math.min(want.points, STEP.points), stars: Math.min(want.stars, STEP.stars), badges: Math.min(want.badges, STEP.badges) };
        await setDoc(ref, { nickname: player.nickname, cls: player.cls, ...first, updatedAt: serverTimestamp() });
        cur = first;
      }
    }
    for (let guard = 0; guard < 60 && (cur.points < want.points || cur.stars < want.stars || cur.badges < want.badges); guard++) {
      const next = {
        points: Math.min(want.points, cur.points + STEP.points), stars: Math.min(want.stars, cur.stars + STEP.stars), badges: Math.min(want.badges, cur.badges + STEP.badges)
      };
      next.points = Math.max(next.points, cur.points); next.stars = Math.max(next.stars, cur.stars); next.badges = Math.max(next.badges, cur.badges);
      const snap = await getDoc(ref);
      await setDoc(ref, { nickname: snap.exists() ? snap.data().nickname : player.nickname, cls: snap.exists() ? snap.data().cls : player.cls, ...next, updatedAt: serverTimestamp() });
      cur = next;
    }
    player.sync = cur;
    return true;
  } catch (e) { console.error("Leaderboard not updated:", e); return false; }
  finally { busy = false; }
}

export async function fetchBoard(n = 100) {
  const snap = await getDocs(query(collection(db, "gameLeaderboard"), orderBy("points", "desc"), limit(n)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitDaily(player, date, score) {
  try {
    await setDoc(doc(db, "gameDaily", date, "scores", player.id), { nickname: player.nickname, cls: player.cls, score, updatedAt: serverTimestamp() });
    return true;
  } catch (e) { console.error("Daily score not sent:", e); return false; }
}

export async function fetchDaily(date, n = 50) {
  const snap = await getDocs(query(collection(db, "gameDaily", date, "scores"), orderBy("score", "desc"), limit(n)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
