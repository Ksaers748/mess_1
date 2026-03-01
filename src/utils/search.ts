import type { Track } from '../types';

const ruToEn: Record<string, string> = {
  й:'q',ц:'w',у:'e',к:'r',е:'t',н:'y',г:'u',ш:'i',щ:'o',з:'p',х:'[',ъ:']',
  ф:'a',ы:'s',в:'d',а:'f',п:'g',р:'h',о:'j',л:'k',д:'l',ж:';',э:"'",
  я:'z',ч:'x',с:'c',м:'v',и:'b',т:'n',ь:'m',б:',',ю:'.',
};
const enToRu: Record<string, string> = {};
for (const [k, v] of Object.entries(ruToEn)) enToRu[v] = k;

function convertLayout(str: string): [string, string] {
  let r1 = '', r2 = '';
  for (const c of str.toLowerCase()) {
    r1 += ruToEn[c] || c;
    r2 += enToRu[c] || c;
  }
  return [r1, r2];
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n];
}

export function filterTracks(tracks: Track[], query: string): Track[] {
  if (!query || !query.trim()) return tracks;
  const q = query.toLowerCase().trim();
  const [qEn, qRu] = convertLayout(q);

  return tracks.map(t => {
    const name = t.name.toLowerCase();
    const artist = t.artist.toLowerCase();
    const full = artist + ' ' + name;
    let score = 0;

    if (name === q || artist === q) score = 200;
    else if (name.startsWith(q) || artist.startsWith(q)) score = 150;
    else if (full.includes(q)) score = 100;
    else if (full.includes(qEn) || full.includes(qRu)) score = 80;
    else {
      const qWords = q.split(/\s+/);
      const fWords = full.split(/\s+/);
      let matched = 0;
      for (const qw of qWords) {
        for (const fw of fWords) {
          if (fw.includes(qw)) { matched++; break; }
          const [qwE, qwR] = convertLayout(qw);
          if (fw.includes(qwE) || fw.includes(qwR)) { matched++; break; }
          if (levenshtein(qw, fw.substring(0, qw.length + 2)) <= Math.max(1, Math.floor(qw.length / 3))) {
            matched += 0.7; break;
          }
        }
      }
      score = (matched / qWords.length) * 60;
    }
    return { track: t, score };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.track);
}

export function pluralize(n: number): string {
  const a = Math.abs(n) % 100;
  const n1 = a % 10;
  if (a > 10 && a < 20) return 'ов';
  if (n1 > 1 && n1 < 5) return 'а';
  if (n1 === 1) return '';
  return 'ов';
}

export function formatTime(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
