// lib/footballData.js
// Fetches live matches from football-data.org (free tier)
// Falls back to realistic mock data if no API key provided

const BASE_URL = 'https://api.football-data.org/v4';

const COMPETITIONS = [
  { id: 'PL', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'PD', name: 'La Liga', flag: '🇪🇸' },
  { id: 'BL1', name: 'Bundesliga', flag: '🇩🇪' },
  { id: 'SA', name: 'Serie A', flag: '🇮🇹' },
  { id: 'FL1', name: 'Ligue 1', flag: '🇫🇷' },
  { id: 'CL', name: 'Champions League', flag: '🏆' },
  { id: 'WC', name: 'World Cup', flag: '🌍' },
  { id: 'EC', name: 'Euros', flag: '🇪🇺' },
];

export async function fetchLiveMatches() {
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (!apiKey) {
    return getMockMatches();
  }

  try {
    const today = new Date();
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = dateFrom;

    const res = await fetch(
      `${BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=LIVE,IN_PLAY,PAUSED`,
      {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();

    if (!data.matches || data.matches.length === 0) {
      // No live matches - fetch today's scheduled
      return await fetchScheduledMatches(apiKey, dateFrom);
    }

    return data.matches.map(normalizeMatch);
  } catch (e) {
    console.error('Football API error:', e.message);
    return getMockMatches();
  }
}

async function fetchScheduledMatches(apiKey, dateFrom) {
  try {
    const res = await fetch(
      `${BASE_URL}/matches?dateFrom=${dateFrom}&dateTo=${dateFrom}&status=SCHEDULED,TIMED`,
      { headers: { 'X-Auth-Token': apiKey } }
    );
    const data = await res.json();
    return (data.matches || []).slice(0, 12).map(normalizeMatch);
  } catch {
    return getMockMatches();
  }
}

function normalizeMatch(m) {
  const comp = COMPETITIONS.find(c => c.id === m.competition?.code) || { name: m.competition?.name || 'Unknown', flag: '⚽' };
  return {
    id: String(m.id),
    homeTeam: m.homeTeam?.shortName || m.homeTeam?.name || 'Home',
    awayTeam: m.awayTeam?.shortName || m.awayTeam?.name || 'Away',
    homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null,
    status: m.status,
    minute: m.minute || null,
    competition: comp.name,
    competitionFlag: comp.flag,
    utcDate: m.utcDate,
    homeForm: estimateForm(m.homeTeam),
    awayForm: estimateForm(m.awayTeam),
    venue: 'home',
  };
}

function estimateForm(team) {
  // Seed-based pseudo-random form for API matches without historical data
  const seed = (team?.id || 0) % 5;
  return ['WWDLW', 'WDWWL', 'DDWLW', 'LWWWD', 'WLWDW'][seed] || 'WDWLW';
}

export function getMockMatches() {
  const now = new Date();
  const fmt = (d) => d.toISOString();

  return [
    {
      id: 'mock-1',
      homeTeam: 'Manchester City',
      awayTeam: 'Arsenal',
      homeScore: 1,
      awayScore: 1,
      status: 'IN_PLAY',
      minute: 67,
      competition: 'Premier League',
      competitionFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      utcDate: fmt(now),
      homeForm: 'WWWDW',
      awayForm: 'WDWWL',
      venue: 'home',
      xgHome: 1.8, xgAway: 0.9,
      possession: { home: 58, away: 42 },
      shots: { home: 12, away: 7 },
      corners: { home: 6, away: 3 },
    },
    {
      id: 'mock-2',
      homeTeam: 'Real Madrid',
      awayTeam: 'Barcelona',
      homeScore: 2,
      awayScore: 0,
      status: 'IN_PLAY',
      minute: 34,
      competition: 'La Liga',
      competitionFlag: '🇪🇸',
      utcDate: fmt(now),
      homeForm: 'WWWWD',
      awayForm: 'WDLWW',
      venue: 'home',
      xgHome: 2.1, xgAway: 0.6,
      possession: { home: 52, away: 48 },
      shots: { home: 9, away: 4 },
      corners: { home: 5, away: 2 },
    },
    {
      id: 'mock-3',
      homeTeam: 'Bayern Munich',
      awayTeam: 'Borussia Dortmund',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      minute: null,
      competition: 'Bundesliga',
      competitionFlag: '🇩🇪',
      utcDate: fmt(new Date(now.getTime() + 3600000)),
      homeForm: 'WWDWW',
      awayForm: 'DWWLW',
      venue: 'home',
    },
    {
      id: 'mock-4',
      homeTeam: 'PSG',
      awayTeam: 'Lyon',
      homeScore: 3,
      awayScore: 1,
      status: 'FINISHED',
      minute: 90,
      competition: 'Ligue 1',
      competitionFlag: '🇫🇷',
      utcDate: fmt(new Date(now.getTime() - 7200000)),
      homeForm: 'WWWWW',
      awayForm: 'LDLWL',
      venue: 'home',
    },
    {
      id: 'mock-5',
      homeTeam: 'Inter Milan',
      awayTeam: 'AC Milan',
      homeScore: 0,
      awayScore: 0,
      status: 'IN_PLAY',
      minute: 22,
      competition: 'Serie A',
      competitionFlag: '🇮🇹',
      utcDate: fmt(now),
      homeForm: 'DWWDW',
      awayForm: 'WDWWL',
      venue: 'home',
      xgHome: 0.4, xgAway: 0.3,
      possession: { home: 55, away: 45 },
      shots: { home: 4, away: 3 },
      corners: { home: 2, away: 1 },
    },
    {
      id: 'mock-6',
      homeTeam: 'Chelsea',
      awayTeam: 'Liverpool',
      homeScore: null,
      awayScore: null,
      status: 'SCHEDULED',
      minute: null,
      competition: 'Premier League',
      competitionFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      utcDate: fmt(new Date(now.getTime() + 7200000)),
      homeForm: 'WLDWW',
      awayForm: 'WWWDW',
      venue: 'home',
    },
    {
      id: 'mock-7',
      homeTeam: 'Atletico Madrid',
      awayTeam: 'Sevilla',
      homeScore: 1,
      awayScore: 0,
      status: 'IN_PLAY',
      minute: 78,
      competition: 'La Liga',
      competitionFlag: '🇪🇸',
      utcDate: fmt(now),
      homeForm: 'WDWWW',
      awayForm: 'LWDLD',
      venue: 'home',
      xgHome: 1.3, xgAway: 0.5,
      possession: { home: 47, away: 53 },
      shots: { home: 8, away: 5 },
      corners: { home: 7, away: 4 },
    },
    {
      id: 'mock-8',
      homeTeam: 'Juventus',
      awayTeam: 'Napoli',
      homeScore: 2,
      awayScore: 2,
      status: 'FINISHED',
      minute: 90,
      competition: 'Serie A',
      competitionFlag: '🇮🇹',
      utcDate: fmt(new Date(now.getTime() - 3600000)),
      homeForm: 'DWDWL',
      awayForm: 'WWLWW',
      venue: 'home',
    },
  ];
}
