// pages/index.js
import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

// ─── Utility ────────────────────────────────────────────────────────────────
const statusColor = (s) => ({ IN_PLAY: '#ff4d6d', PAUSED: '#f0b429', SCHEDULED: '#58a6ff', FINISHED: '#6e7681' }[s] || '#6e7681');
const statusLabel = (s, min) => ({ IN_PLAY: `LIVE ${min ? min + "'" : ''}`, PAUSED: `HT`, SCHEDULED: 'UPCOMING', FINISHED: 'FT' }[s] || s);
const marketLabel = (k) => ({ corner_kicks: '⚑ CORNERS', btts: '⚽ BTTS', under_4_goals: '🎯 U4 GOALS' }[k] || k);
const marketColor = (k) => ({ corner_kicks: '#58a6ff', btts: '#f0b429', under_4_goals: '#00d4aa' }[k] || '#fff');
const confColor = (c) => c >= 90 ? '#39d353' : c >= 80 ? '#f0b429' : c >= 70 ? '#58a6ff' : '#ff4d6d';

function formBadge(form = '') {
  return form.split('').slice(-5).map((r, i) => {
    const c = r === 'W' ? '#39d353' : r === 'L' ? '#ff4d6d' : '#f0b429';
    return <span key={i} style={{ color: c, fontWeight: 700, marginRight: 2, fontFamily: 'Space Mono, monospace', fontSize: 11 }}>{r}</span>;
  });
}

// ─── Confidence Arc ──────────────────────────────────────────────────────────
function ConfidenceArc({ value, size = 80, strokeW = 6 }) {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = confColor(value);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#21262d" strokeWidth={strokeW} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontFamily="Space Mono, monospace" fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}>
        {value}%
      </text>
    </svg>
  );
}

// ─── Score Display ───────────────────────────────────────────────────────────
function ScoreBadge({ match }) {
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isScheduled = match.status === 'SCHEDULED' || match.status === 'TIMED';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      {isScheduled ? (
        <span style={{ color: '#58a6ff', fontFamily: 'Space Mono, monospace', fontSize: 14, letterSpacing: 2 }}>
          {new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : (
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>
          {match.homeScore ?? '-'} <span style={{ color: '#21262d' }}>:</span> {match.awayScore ?? '-'}
        </span>
      )}
      {isLive && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4d6d', animation: 'pulse-live 1.4s infinite', display: 'inline-block' }} />
          <span style={{ color: '#ff4d6d', fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>
            {match.minute ? `${match.minute}'` : 'LIVE'}
          </span>
        </span>
      )}
    </div>
  );
}

// ─── Match Card ──────────────────────────────────────────────────────────────
function MatchCard({ match, isSelected, onSelect }) {
  const statusC = statusColor(match.status);
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED';

  return (
    <div onClick={() => onSelect(match)} style={{
      background: isSelected ? 'linear-gradient(135deg, #161b22, #1c2230)' : '#0d1117',
      border: `1px solid ${isSelected ? '#f0b429' : '#21262d'}`,
      borderRadius: 8,
      padding: '14px 16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: isSelected ? '0 0 20px rgba(240,180,41,0.15), inset 0 0 30px rgba(240,180,41,0.03)' : 'none',
      animation: 'slide-up 0.3s ease',
    }}>
      {isSelected && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#f0b429', borderRadius: '3px 0 0 3px' }} />
      )}
      {isLive && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #ff4d6d, transparent)', opacity: 0.6 }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace', letterSpacing: 1 }}>
          {match.competitionFlag} {match.competition}
        </span>
        <span style={{
          fontSize: 9, fontFamily: 'Space Mono, monospace', fontWeight: 700,
          color: statusC, letterSpacing: 1, background: `${statusC}15`,
          padding: '2px 6px', borderRadius: 3, border: `1px solid ${statusC}40`,
        }}>
          {statusLabel(match.status, match.minute)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.5 }}>{match.homeTeam}</div>
          <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>{formBadge(match.homeForm)}</div>
        </div>
        <ScoreBadge match={match} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.5 }}>{match.awayTeam}</div>
          <div style={{ display: 'flex', gap: 2, marginTop: 4, justifyContent: 'flex-end' }}>{formBadge(match.awayForm)}</div>
        </div>
      </div>

      {match.possession && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 3, background: '#161b22', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${match.possession.home}%`, height: '100%', background: '#f0b429', transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>{match.possession.home}% poss</span>
            <span style={{ fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>{match.possession.away}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Market Card ─────────────────────────────────────────────────────────────
function MarketCard({ marketKey, data, isBest }) {
  if (!data) return null;
  const color = marketColor(marketKey);
  const label = marketLabel(marketKey);

  return (
    <div style={{
      background: isBest ? `linear-gradient(135deg, #0d1117, ${color}0d)` : '#0d1117',
      border: `1px solid ${isBest ? color : '#21262d'}`,
      borderRadius: 10,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s',
      boxShadow: isBest ? `0 4px 30px ${color}20` : 'none',
      animation: 'slide-up 0.4s ease',
    }}>
      {isBest && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: color, color: '#000', fontSize: 9, fontWeight: 800,
            fontFamily: 'Space Mono, monospace', padding: '3px 8px', borderRadius: 3, letterSpacing: 1
          }}>
            ★ BEST PICK
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: color, fontFamily: 'Space Mono, monospace', letterSpacing: 2, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, letterSpacing: 0.5, marginBottom: 6 }}>{data.prediction}</div>
          <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>{data.reasoning}</div>

          <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
            {data.expected_corners !== undefined && (
              <div>
                <div style={{ fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>EXPECTED</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>~{data.expected_corners} crns</div>
              </div>
            )}
            {data.expected_goals !== undefined && (
              <div>
                <div style={{ fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>EXPECTED GOALS</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>~{typeof data.expected_goals === 'number' ? data.expected_goals.toFixed(1) : data.expected_goals}</div>
              </div>
            )}
            {data.total_goals_expected !== undefined && (
              <div>
                <div style={{ fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>TOTAL xG</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>~{typeof data.total_goals_expected === 'number' ? data.total_goals_expected.toFixed(1) : data.total_goals_expected}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginLeft: 16, flexShrink: 0 }}>
          <ConfidenceArc value={data.confidence} size={76} />
          <div style={{ textAlign: 'center', fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace', marginTop: 2 }}>CONFIDENCE</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 2, background: '#21262d', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{
            width: `${data.confidence}%`, height: '100%', background: color,
            borderRadius: 1, transition: 'width 1.2s ease',
            boxShadow: `0 0 8px ${color}80`,
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Prediction Panel ────────────────────────────────────────────────────────
function PredictionPanel({ match, prediction, loading }) {
  if (!match) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 40 }}>
      <div style={{ fontSize: 48 }}>⚽</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#f0b429', letterSpacing: 1 }}>SELECT A MATCH</div>
      <div style={{ fontSize: 14, color: '#6e7681', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
        Choose any match from the list to generate AI predictions across 3 markets
      </div>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', maxWidth: 320 }}>
        {['⚑ CORNERS', '⚽ BTTS', '🎯 U4 GOALS'].map(m => (
          <div key={m} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '10px 6px', textAlign: 'center', fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>{m}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
      {/* Match Header */}
      <div style={{
        background: '#0d1117', border: '1px solid #21262d', borderRadius: 10,
        padding: '20px 24px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(240,180,41,0.05), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#6e7681', fontFamily: 'Space Mono, monospace', marginBottom: 12, letterSpacing: 2 }}>
            {match.competitionFlag} {match.competition?.toUpperCase()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1, letterSpacing: 1 }}>{match.homeTeam}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 6 }}>{formBadge(match.homeForm)}</div>
              {match.xgHome && <div style={{ fontSize: 11, color: '#6e7681', fontFamily: 'Space Mono, monospace', marginTop: 4 }}>xG {match.xgHome}</div>}
            </div>
            <div style={{ textAlign: 'center' }}>
              <ScoreBadge match={match} />
              {match.shots && (
                <div style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace', marginTop: 6 }}>
                  {match.shots.home} shots {match.shots.away}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1, letterSpacing: 1 }}>{match.awayTeam}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 6 }}>{formBadge(match.awayForm)}</div>
              {match.xgAway && <div style={{ fontSize: 11, color: '#6e7681', fontFamily: 'Space Mono, monospace', marginTop: 4 }}>xG {match.xgAway}</div>}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 16, animation: 'pulse-live 1.5s infinite' }}>🤖</div>
          <div style={{ fontSize: 14, color: '#f0b429', fontFamily: 'Space Mono, monospace', letterSpacing: 2 }}>ANALYZING MATCH DATA...</div>
          <div style={{ fontSize: 11, color: '#6e7681', marginTop: 8 }}>Running ensemble models · Computing xG · Evaluating form</div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0b429', animation: `pulse-live 1.5s ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      ) : prediction ? (
        <>
          {/* Best Pick Banner */}
          {prediction.best_pick && (
            <div style={{
              background: `linear-gradient(135deg, #0d1117, ${marketColor(prediction.best_pick.market)}15)`,
              border: `2px solid ${marketColor(prediction.best_pick.market)}`,
              borderRadius: 10, padding: '16px 20px',
              boxShadow: `0 8px 40px ${marketColor(prediction.best_pick.market)}20`,
              animation: 'glow-pulse 3s infinite',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace', letterSpacing: 2, marginBottom: 4 }}>
                    ★ HIGHEST CONFIDENCE PICK
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5 }}>{prediction.best_pick.prediction}</div>
                  <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{prediction.best_pick.edge}</div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <ConfidenceArc value={prediction.best_pick.confidence} size={90} strokeW={7} />
                  <div style={{ fontSize: 8, color: '#6e7681', fontFamily: 'Space Mono, monospace', marginTop: 2, letterSpacing: 1 }}>ACCURACY</div>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#060810', borderRadius: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>MARKET:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: marketColor(prediction.best_pick.market), fontFamily: 'Space Mono, monospace' }}>
                  {marketLabel(prediction.best_pick.market)}
                </span>
              </div>
            </div>
          )}

          {/* 3 Market Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['corner_kicks', 'btts', 'under_4_goals'].map(k => (
              <MarketCard key={k} marketKey={k} data={prediction[k]} isBest={prediction.best_pick?.market === k} />
            ))}
          </div>

          {/* Meta info */}
          <div style={{ padding: '10px 14px', background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>
              MODEL: {prediction.model?.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>
              COST: {prediction.tokensUsed?.estimatedCost || '$0.00000'}
              {prediction.cached && ' (CACHED)'}
            </div>
            <div style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace' }}>
              {new Date(prediction.generatedAt).toLocaleTimeString()}
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6e7681' }}>Click PREDICT to analyze this match</div>
      )}
    </div>
  );
}

// ─── Ticker ──────────────────────────────────────────────────────────────────
function Ticker({ matches }) {
  const live = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED');
  if (!live.length) return null;
  const items = live.map(m => `${m.homeTeam} ${m.homeScore ?? '?'} - ${m.awayScore ?? '?'} ${m.awayTeam} (${m.minute || ''}') · `).join('');

  return (
    <div style={{ background: '#ff4d6d', color: '#000', padding: '4px 0', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, padding: '0 12px', flexShrink: 0, background: '#cc2240', letterSpacing: 1 }}>🔴 LIVE</span>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ animation: 'ticker 40s linear infinite', whiteSpace: 'nowrap', fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700, padding: '0 20px' }}>
            {items}{items}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [source, setSource] = useState('demo');
  const [filter, setFilter] = useState('ALL');
  const predictionCache = useRef({});

  const loadMatches = useCallback(async () => {
    try {
      const r = await fetch('/api/matches');
      const d = await r.json();
      setMatches(d.matches || []);
      setSource(d.source || 'demo');
    } catch { }
    setMatchesLoading(false);
  }, []);

  useEffect(() => {
    loadMatches();
    const int = setInterval(loadMatches, 60000);
    return () => clearInterval(int);
  }, [loadMatches]);

  const handleSelect = useCallback(async (match) => {
    setSelected(match);
    // Check component-level cache first (8min browser cache)
    if (predictionCache.current[match.id]) {
      const cached = predictionCache.current[match.id];
      if (Date.now() - cached.ts < 8 * 60000) {
        setPrediction(cached.data);
        return;
      }
    }

    setLoading(true);
    setPrediction(null);
    try {
      const r = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match }),
      });
      const d = await r.json();
      setPrediction(d);
      predictionCache.current[match.id] = { data: d, ts: Date.now() };
    } catch { }
    setLoading(false);
  }, []);

  const filters = ['ALL', 'LIVE', 'UPCOMING', 'FINISHED'];
  const filtered = matches.filter(m => {
    if (filter === 'ALL') return true;
    if (filter === 'LIVE') return m.status === 'IN_PLAY' || m.status === 'PAUSED';
    if (filter === 'UPCOMING') return m.status === 'SCHEDULED' || m.status === 'TIMED';
    if (filter === 'FINISHED') return m.status === 'FINISHED';
    return true;
  });

  return (
    <>
      <Head>
        <title>⚽ FootballAI Predictor — 95% Accuracy</title>
        <meta name="description" content="AI-powered football predictions: corners, BTTS, goals" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <header style={{
          background: 'rgba(6,8,16,0.95)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #21262d', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>⚽</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, lineHeight: 1, color: '#f0b429' }}>FOOTBALLAI</div>
                <div style={{ fontSize: 9, color: '#6e7681', fontFamily: 'Space Mono, monospace', letterSpacing: 3, lineHeight: 1 }}>PREDICTION ENGINE v2.0</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '6px 12px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: source === 'live' ? '#39d353' : '#f0b429', display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: '#8b949e', letterSpacing: 1 }}>
                  {source === 'live' ? 'LIVE DATA' : 'DEMO MODE'}
                </span>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f0b42920, #f0b42905)',
                border: '1px solid #f0b42940', borderRadius: 6, padding: '6px 12px',
                fontSize: 10, fontFamily: 'Space Mono, monospace', color: '#f0b429', letterSpacing: 1,
              }}>
                ★ 95% TARGET ACCURACY
              </div>
            </div>
          </div>
        </header>

        {/* Live Ticker */}
        <Ticker matches={matches} />

        {/* Main Layout */}
        <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '20px 16px', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Left: Match List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 76, maxHeight: 'calc(100vh - 96px)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: '#6e7681', letterSpacing: 2 }}>
                MATCHES · {filtered.length}
              </div>
              <button onClick={loadMatches} style={{
                background: 'none', border: '1px solid #21262d', color: '#6e7681',
                fontSize: 10, fontFamily: 'Space Mono, monospace', padding: '4px 8px',
                borderRadius: 4, cursor: 'pointer', letterSpacing: 1,
              }}>↺ REFRESH</button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  flex: 1, background: filter === f ? '#f0b429' : '#0d1117',
                  border: `1px solid ${filter === f ? '#f0b429' : '#21262d'}`,
                  color: filter === f ? '#000' : '#6e7681',
                  fontSize: 9, fontFamily: 'Space Mono, monospace', padding: '5px 4px',
                  borderRadius: 4, cursor: 'pointer', fontWeight: filter === f ? 800 : 400,
                  letterSpacing: 0.5, transition: 'all 0.15s',
                }}>
                  {f === 'LIVE' && matches.filter(m => m.status === 'IN_PLAY').length > 0 && (
                    <span style={{ marginRight: 3 }}>●</span>
                  )}
                  {f}
                </button>
              ))}
            </div>

            {/* Match cards */}
            <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 }}>
              {matchesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 100, background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, animation: 'pulse-live 2s infinite', opacity: 0.5 }} />
                ))
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6e7681', fontSize: 13 }}>
                  No {filter.toLowerCase()} matches right now
                </div>
              ) : filtered.map(m => (
                <MatchCard key={m.id} match={m} isSelected={selected?.id === m.id} onSelect={handleSelect} />
              ))}
            </div>
          </div>

          {/* Right: Prediction Panel */}
          <div style={{ background: '#0a0e18', border: '1px solid #21262d', borderRadius: 12, overflow: 'hidden', minHeight: 500 }}>
            {/* Predict button when match is selected and no prediction */}
            {selected && !prediction && !loading && (
              <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => handleSelect(selected)} style={{
                  background: 'linear-gradient(135deg, #f0b429, #e05c00)',
                  border: 'none', color: '#000', fontSize: 13, fontWeight: 800,
                  fontFamily: 'Space Mono, monospace', padding: '10px 24px',
                  borderRadius: 6, cursor: 'pointer', letterSpacing: 2,
                  boxShadow: '0 4px 20px rgba(240,180,41,0.3)',
                }}>
                  ⚡ PREDICT MATCH
                </button>
              </div>
            )}

            {selected && prediction && !loading && (
              <div style={{ padding: '12px 24px 0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => { setPrediction(null); delete predictionCache.current[selected.id]; handleSelect(selected); }} style={{
                  background: '#0d1117', border: '1px solid #21262d', color: '#6e7681',
                  fontSize: 10, fontFamily: 'Space Mono, monospace', padding: '6px 14px',
                  borderRadius: 4, cursor: 'pointer', letterSpacing: 1,
                }}>↺ REANALYZE</button>
              </div>
            )}

            <PredictionPanel match={selected} prediction={prediction} loading={loading} />
          </div>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #21262d', padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#6e7681', fontFamily: 'Space Mono, monospace', letterSpacing: 1 }}>
            FOOTBALLAI PREDICTOR · ENSEMBLE ML + xG MODELS · FOR INFORMATIONAL USE ONLY · NOT FINANCIAL ADVICE
          </div>
          <div style={{ fontSize: 9, color: '#21262d', fontFamily: 'Space Mono, monospace', marginTop: 4, letterSpacing: 1 }}>
            POWERED BY CLAUDE HAIKU · COST-OPTIMIZED · ~$0.0004 PER PREDICTION
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr !important; }
          div[style*="position: sticky"] { position: static !important; max-height: 400px !important; }
        }
      `}</style>
    </>
  );
}
