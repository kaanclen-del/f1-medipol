
"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createClient } from '@/utils/supabase/client';
import KartRushTrack from './KartRushTrack';
import type { KartDifficulty, KartGraphics, KartPace, KartWeather } from './engine';
import s from './kartRush.module.css';

type Room = {
  id: string;
  code: string;
  title: string;
  host_id: string;
  is_public: boolean;
  status: 'lobby' | 'racing';
  max_players: number;
  member_count: number;
  created_at: string;
  started_at: string | null;
  kr_championship_enabled?: boolean;
  kr_target_points?: number;
  kr_round?: number;
  kr_round_scored?: boolean;
  kr_champion_user_id?: string | null;
  kr_weather?: KartWeather;
};

type Racer = {
  room_id: string;
  user_id: string;
  nickname: string;
  color: string;
  ready: boolean;
  joined_at: string;
  finish_ms: number | null;
  best_lap_ms: number | null;
  kr_points?: number;
  kr_last_award?: number;
};

const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;

type SoloCareer = {
  round: number;
  points: number;
  results: number[];
  active: boolean;
  botPoints?: Record<string, number>;
};

const SOLO_CAREER_KEY = 'f1-medipol-kart-rush-career-v1';

// Garaj renkleri mevcut veritabanıyla uyumludur.
// Takım renklerinden ilham alan, resmî logo ve sponsor işareti içermeyen tasarımlar.
const GARAGE = [
  { color: '#E32636', name: 'FERRARI', team: 'Scuderia Ferrari', tag: 'SCUDERIA', secondary: '#F5D34F' },
  { color: '#FF8000', name: 'McLAREN', team: 'McLaren Formula 1 Team', tag: 'PAPAYA', secondary: '#60C6E8' },
  { color: '#00D2BE', name: 'MERCEDES', team: 'Mercedes-AMG F1', tag: 'SILVER ARROW', secondary: '#E8F3F6' },
  { color: '#173B8A', name: 'RED BULL RACING', team: 'Oracle Red Bull Racing', tag: 'RACING', secondary: '#F3C846' },
  { color: '#006A4E', name: 'ASTON MARTIN', team: 'Aston Martin F1', tag: 'RACING GREEN', secondary: '#C4D0A1' },
  { color: '#2B7BFF', name: 'WILLIAMS', team: 'Williams Racing', tag: 'BLUE', secondary: '#EFF3F8' },
  { color: '#FF6DAE', name: 'ALPINE', team: 'BWT Alpine F1', tag: 'PINK & BLUE', secondary: '#2875C8' },
  { color: '#C4CFD8', name: 'HAAS', team: 'Haas F1 Team', tag: 'GRAPHITE', secondary: '#D63746' },
  { color: '#F4F5F7', name: 'RACING BULLS', team: 'Racing Bulls', tag: 'WHITE & BLUE', secondary: '#476AD6' },
  { color: '#B11F26', name: 'AUDI', team: 'Audi F1 Team', tag: 'BLACK & RED', secondary: '#C6C9CD' },
  { color: '#B4AA78', name: 'CADILLAC', team: 'Cadillac Formula 1 Team', tag: 'GOLD & BLACK', secondary: '#F2E9CE' },
] as const;

const COLORS: string[] = GARAGE.map(car => car.color);

const LEGACY_COLORS: Record<string, string> = {
  '#EF263E': '#E32636',
  '#FFB225': '#FF8000',
  '#289FEA': '#2B7BFF',
  '#42C68A': '#006A4E',
  '#A981FF': '#FF6DAE',
  '#F7F7F7': '#F4F5F7',
};

const teamAccent = (color: string) =>
  GARAGE.find(car => car.color === color)?.secondary || '#DFE5EB';

function GaragePreview({ color }: { color: string }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      className={s.garageSvg}
      viewBox="0 0 500 250"
      fill="none"
      role="img"
      aria-label="Seçili Formula yarış aracının yandan görünümü"
    >
      <defs>
        <linearGradient id={id + 'body'} x1="0" y1="0" x2="0.75" y2="1">
          <stop stopColor="#ffffff" stopOpacity=".45" />
          <stop offset=".23" stopColor={color} />
          <stop offset=".76" stopColor={color} />
          <stop offset="1" stopColor="#0c1018" />
        </linearGradient>
        <linearGradient id={id + 'wing'} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#344152" />
          <stop offset=".64" stopColor="#080d14" />
          <stop offset="1" stopColor="#101720" />
        </linearGradient>
        <radialGradient id={id + 'tyre'} cx=".38" cy=".25" r=".78">
          <stop stopColor="#363b42" />
          <stop offset=".62" stopColor="#13171d" />
          <stop offset="1" stopColor="#05080c" />
        </radialGradient>
        <radialGradient id={id + 'backdrop'} cx=".5" cy=".5" r=".5">
          <stop stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="251" cy="126" rx="235" ry="112" fill={'url(#' + id + 'backdrop)'} />
      <ellipse cx="253" cy="209" rx="211" ry="19" fill="#01040a" opacity=".62" />
      <path d="M28 204H475" stroke="#8f9ca9" strokeOpacity=".22" strokeWidth="2" strokeDasharray="13 10" />
      <path d="M51 128 L58 88 L67 86 L73 132 L77 158 L65 162 L56 153Z" fill={'url(#' + id + 'wing)'} stroke="#778795" strokeOpacity=".5" />
      <path d="M39 86 H90 L96 100 H42Z" fill="#111823" stroke="#8c9aa6" strokeOpacity=".52" />
      <path d="M55 109 H84 L96 128 H73Z" fill={color} />
      <path d="M70 164 L94 148 L135 141 L192 114 L244 112 L279 138 L365 147 L425 166 L452 171 L437 190 H92 L69 183Z" fill={'url(#' + id + 'body)'} stroke="#d7e1e9" strokeOpacity=".4" strokeWidth="2" />
      <path d="M125 144 Q155 112 205 119 L252 130 Q275 147 318 152 L375 161 L224 167 L142 157Z" fill={color} stroke="#f3f5fa" strokeOpacity=".4" strokeWidth="1.5" />
      <path d="M185 145 L218 112 L252 108 L276 120 L283 144Z" fill="#0a111c" stroke="#798da0" strokeOpacity=".5" />
      <path d="M217 111 Q242 79 258 102 L280 141" stroke="#1a2330" strokeWidth="10" strokeLinecap="round" />
      <path d="M217 111 Q242 79 258 102 L280 141" stroke="#87929d" strokeOpacity=".55" strokeWidth="2.6" />
      <path d="M151 151 L166 126 Q174 116 189 122 L192 155Z" fill="#121d28" />
      <path d="M171 126 H196" stroke={color} strokeWidth="3" />
      <path d="M258 157 L338 161 L384 171 L399 181 H282 L265 173Z" fill="#101820" stroke="#bac3cc" strokeOpacity=".32" />
      <path d="M226 158 Q286 156 330 160 L388 174" stroke="#f6f8fa" strokeOpacity=".70" strokeWidth="3" />
      <path d="M279 173 H400" stroke={color} strokeWidth="5" />
      <path d="M88 176 L155 150 L193 140" stroke={teamAccent(color)} strokeWidth="5" opacity=".90" />
      <path d="M235 164 L362 173" stroke={teamAccent(color)} strokeWidth="7" opacity=".90" />
      <path d="M391 180 H457" stroke={teamAccent(color)} strokeWidth="4" opacity=".90" />
      <path d="M361 171 L438 174 L448 178 L448 190 L387 190Z" fill="#202d3b" />
      <path d="M379 181 L468 179 L478 188 L468 193 H377Z" fill="#131b24" stroke="#98a9b7" strokeOpacity=".5" />
      <path d="M388 175 L468 175" stroke="#e8eef3" strokeOpacity=".7" strokeWidth="2" />

      {[122, 361].map((cx, i) => (
        <g key={cx}>
          <circle cx={cx} cy={174} r={i ? 30 : 35} fill={'url(#' + id + 'tyre)'} stroke="#58626d" strokeOpacity=".62" strokeWidth="2" />
          <circle cx={cx} cy={174} r={i ? 23 : 27} stroke="#262e38" strokeWidth="3" />
          <circle cx={cx} cy={174} r={i ? 15 : 18} fill="#3c4653" stroke="#adbac6" strokeWidth="2" />
          {Array.from({ length: 8 }, (_, k) => (
            <path
              key={k}
              d={`M${cx} 174 L${cx + Math.cos(k * Math.PI / 4) * (i ? 15 : 18)} ${174 + Math.sin(k * Math.PI / 4) * (i ? 15 : 18)}`}
              stroke="#afbbc6"
              strokeWidth="2"
            />
          ))}
          <circle cx={cx} cy={174} r="6" fill={color} stroke="#d4dae2" strokeOpacity=".65" />
          <path
            d={`M${cx - (i ? 23 : 27)} 172 A${i ? 23 : 27} ${i ? 23 : 27} 0 0 1 ${cx + (i ? 23 : 27)} 172`}
            stroke="#ffd351"
            strokeWidth="3.5"
            strokeOpacity=".94"
          />
        </g>
      ))}

      <path d="M226 181 L300 181" stroke="#0b111b" strokeWidth="6" />
      <path d="M290 138 L343 146" stroke="#f2f4f6" strokeWidth="3" strokeOpacity=".80" />
    </svg>
  );
}

const makeName = (u: { email?: string; user_metadata?: Record<string, unknown> }) =>
  String(u.user_metadata?.display_name || u.user_metadata?.username || u.email?.split('@')[0] || 'Racer').slice(0, 24);

export default function KartRushClient() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('Racer');
  const [color, setColor] = useState(COLORS[0]);
  const [difficulty, setDifficulty] = useState<KartDifficulty>('normal');
  const [laps, setLaps] = useState(3);
  const [pace, setPace] = useState<KartPace>('standard');
  const [graphics, setGraphics] = useState<KartGraphics>('balanced');
  const [weather, setWeather] = useState<KartWeather>('clear');
  const [volume, setVolume] = useState(.45);
  const [careerRace, setCareerRace] = useState(false);
  const [soloCareer, setSoloCareer] = useState<SoloCareer>({
    round: 1,
    points: 0,
    results: [],
    active: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOLO_CAREER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SoloCareer;
        if (Array.isArray(parsed.results) && parsed.results.length <= 5) setSoloCareer(parsed);
      }
    } catch {}
  }, []);

  const careerFinish = useCallback((rank: number, rivals: { id: string; name: string; progress: number }[]) => {
    setSoloCareer(previous => {
      if (!previous.active || previous.results.length >= 5) return previous;

      const botPoints = { ...(previous.botPoints || {}) };
      const order = [...rivals].sort((a, b) => b.progress - a.progress);

      for (let i = 0; i < order.length; i++) {
        const driver = order[i];
        if (driver.id === 'practice') continue;
        botPoints[driver.name] = (botPoints[driver.name] || 0) + (RACE_POINTS[i] || 0);
      }

      const next = {
        ...previous,
        round: Math.min(5, previous.round + 1),
        points: previous.points + (RACE_POINTS[rank - 1] || 0),
        results: [...previous.results, rank],
        botPoints,
      };

      try {
        localStorage.setItem(SOLO_CAREER_KEY, JSON.stringify(next));
      } catch {}

      return next;
    });
  }, []);

  const [menuTab, setMenuTab] = useState<'home' | 'garage' | 'settings' | 'online'>('home');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('f1-kr-graphics');
      if (saved === 'low' || saved === 'balanced' || saved === 'high' || saved === 'ultra') {
        setGraphics(saved);
      } else if (window.matchMedia('(pointer:coarse)').matches) {
        setGraphics('high');
      }

      const v = Number(window.localStorage.getItem('f1-kr-volume'));
      if (Number.isFinite(v) && window.localStorage.getItem('f1-kr-volume') !== null) {
        setVolume(Math.max(0, Math.min(1, v)));
      }

      const c = window.localStorage.getItem('f1-kr-car');
      if (c) {
        const legacyColor = LEGACY_COLORS[c] || c;
        if (COLORS.includes(legacyColor)) setColor(legacyColor);
      }

      const storedLaps = Number(window.localStorage.getItem('f1-kr-laps'));
      if ([1, 2, 3, 5].includes(storedLaps)) setLaps(storedLaps);

      const savedWeather = window.localStorage.getItem('f1-kr-weather');
      if (savedWeather === 'rain') setWeather('rain');

      const savedPace = window.localStorage.getItem('f1-kr-pace');
      if (savedPace === 'fast' || savedPace === 'standard' || savedPace === 'long') setPace(savedPace);
    } catch {}
  }, []);

  const changeGraphics = useCallback((value: KartGraphics) => {
    setGraphics(value);
    try {
      window.localStorage.setItem('f1-kr-graphics', value);
    } catch {}
  }, []);

  const changeVolume = useCallback((v: number) => {
    const value = Math.max(0, Math.min(1, v));
    setVolume(value);
    try {
      window.localStorage.setItem('f1-kr-volume', String(value));
    } catch {}
  }, []);

  const changeColor = useCallback((c: string) => {
    setColor(c);
    try {
      window.localStorage.setItem('f1-kr-car', c);
    } catch {}
  }, []);

  const [lobbyName, setLobbyName] = useState('Medipol Grand Prix');
  const [privateRoom, setPrivateRoom] = useState(false);
  const [code, setCode] = useState('');
  const [championshipEnabled, setChampionshipEnabled] = useState(true);
  const [pointsTarget, setPointsTarget] = useState(50);
  const autoFinalized = useRef<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Racer[]>([]);
  const [view, setView] = useState<'hub' | 'practice' | 'online'>('hub');
  const [practiceStart, setPracticeStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('f1_kr_rooms')
      .select('id,code,title,host_id,is_public,status,max_players,member_count,created_at,started_at')
      .eq('is_public', true)
      .eq('status', 'lobby')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error) {
      setRooms((data || []) as Room[]);
    } else if (error.code === '42P01' || error.code === 'PGRST205') {
      setError('Lobi tabloları henüz kurulmamış. ZIP içindeki SQL dosyasını Supabase SQL Editor’da çalıştır.');
    }
  }, [supabase]);

  const loadRoom = useCallback(async (id: string) => {
    const [{ data: r, error: e }, { data: m }] = await Promise.all([
      supabase.from('f1_kr_rooms').select('*').eq('id', id).maybeSingle(),
      supabase.from('f1_kr_members').select('*').eq('room_id', id).order('joined_at', { ascending: true }),
    ]);

    if (e) {
      setError(e.message);
      return;
    }

    if (!r) {
      setError('Lobi bulunamadı veya erişim izni yok.');
      setRoom(null);
      setView('hub');
      return;
    }

    setRoom(r as Room);
    setMembers((m || []) as Racer[]);
  }, [supabase]);

  useEffect(() => {
    let disposed = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (disposed) return;
      const u = data.user;
      if (u) {
        setUserId(u.id);
        setName(makeName(u));
      }
      setLoading(false);
    });

    void loadRooms();

    return () => {
      disposed = true;
    };
  }, [supabase, loadRooms]);

  useEffect(() => {
    if (!room?.id) return;

    const id = room.id;
    const interval = setInterval(() => {
      void loadRoom(id);
    }, 2700);

    const c = supabase.channel('f1-kr-lobby-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'f1_kr_rooms', filter: 'id=eq.' + id }, () => {
        void loadRoom(id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'f1_kr_members', filter: 'room_id=eq.' + id }, () => {
        void loadRoom(id);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(c);
    };
  }, [room?.id, supabase, loadRoom]);

  const op = useCallback(async (
    fn: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
    after?: (data: unknown) => void,
  ) => {
    setBusy(true);
    setError('');

    try {
      const { data, error } = await fn();
      if (error) throw Error(error.message);
      after?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  }, []);

  const createRoom = () => {
    if (!userId) {
      setError('Çevrim içi lobi kurmak için giriş yapmalısın.');
      return;
    }

    void op(async () => {
      const created = await supabase.rpc('f1_kr_create_room', {
        p_title: lobbyName.trim(),
        p_nickname: name.trim(),
        p_color: color,
        p_public: !privateRoom,
        p_max_players: 8,
      });

      if (created.error) return { data: null, error: created.error };

      const id = String(created.data);
      const configured = await supabase.rpc('f1_kr_configure_championship', {
        p_room_id: id,
        p_enabled: championshipEnabled,
        p_target: pointsTarget,
      });

      if (configured.error) {
        return {
          data: null,
          error: {
            message: 'Şampiyona ayarları kaydedilemedi. Önce ZIP içindeki SUPABASE_CHAMPIONSHIP.sql dosyasını SQL Editor üzerinde bir kez çalıştır. Teknik bilgi: ' + configured.error.message,
          },
        };
      }

      if (weather === 'rain') {
        const applied = await supabase.rpc('f1_kr_set_weather', {
          p_room_id: id,
          p_weather: weather,
        });

        if (applied.error) {
          return {
            data: null,
            error: {
              message: 'Yağmurlu lobi için paketteki SUPABASE_WEATHER.sql dosyasını Supabase üzerinde çalıştır: ' + applied.error.message,
            },
          };
        }
      }

      return { data: id, error: null };
    }, id => {
      const v = String(id);
      setRoom({
        id: v,
        code: '',
        title: lobbyName,
        host_id: userId,
        is_public: !privateRoom,
        status: 'lobby',
        max_players: 8,
        member_count: 1,
        created_at: new Date().toISOString(),
        started_at: null,
        kr_championship_enabled: championshipEnabled,
        kr_target_points: pointsTarget,
        kr_round: 1,
        kr_round_scored: false,
        kr_champion_user_id: null,
        kr_weather: weather,
      });
      setView('online');
      void loadRoom(v);
    });
  };

  const joinRoom = (joinCode: string) => {
    if (!userId) {
      setError('Lobiye katılmak için giriş yapmalısın.');
      return;
    }

    void op(
      () => supabase.rpc('f1_kr_join_room', {
        p_code: joinCode.trim().toUpperCase(),
        p_nickname: name.trim(),
        p_color: color,
      }),
      id => {
        const v = String(id);
        setRoom({
          id: v,
          code: joinCode.toUpperCase(),
          title: 'Lobi',
          host_id: '',
          is_public: false,
          status: 'lobby',
          max_players: 8,
          member_count: 1,
          created_at: new Date().toISOString(),
          started_at: null,
        });
        setView('online');
        void loadRoom(v);
      },
    );
  };

  const leaveRoom = () => {
    if (!room) {
      setView('hub');
      return;
    }

    const id = room.id;

    void op(() => supabase.rpc('f1_kr_leave_room', { p_room_id: id }), () => {
      setRoom(null);
      setMembers([]);
      setView('hub');
      void loadRooms();
    });
  };

  useEffect(() => {
    if (
      !room?.id ||
      room.status !== 'racing' ||
      !room.kr_championship_enabled ||
      room.kr_round_scored ||
      room.kr_champion_user_id ||
      room.host_id !== userId
    ) return;

    if (members.length < 2 || !members.every(x => x.finish_ms !== null)) return;

    const key = room.id + ':' + (room.kr_round || 1);
    if (autoFinalized.current === key) return;

    autoFinalized.current = key;

    void supabase.rpc('f1_kr_finalize_championship_round', { p_room_id: room.id }).then(({ error }) => {
      if (error) {
        setError('Puanlar hesaplanamadı: ' + error.message);
        return;
      }
      void loadRoom(room.id);
    });
  }, [room, members, userId, supabase, loadRoom]);

  const finalizePoints = () => {
    if (!room) return;
    void op(
      () => supabase.rpc('f1_kr_finalize_championship_round', { p_room_id: room.id }),
      () => { void loadRoom(room.id); },
    );
  };

  const nextChampionshipRound = () => {
    if (!room) return;
    void op(
      () => supabase.rpc('f1_kr_next_championship_round', { p_room_id: room.id }),
      () => {
        autoFinalized.current = null;
        void loadRoom(room.id);
      },
    );
  };

  const me = members.find(x => x.user_id === userId);
  const everyoneReady = members.length >= 2 && members.every(x => x.ready);
  const started = room?.status === 'racing' && room.started_at;

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div className={s.heroGrid}>
          <div>
            <h1>KART <em>RUSH</em> <span>3D</span></h1>
            <p>
              22 araçlık Grand Prix. Direksiyon, gaz ve fren tamamen sende.
              Kendi Formula aracını seç, start gridine gir ve damalı bayrağa ulaş.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className={s.error} role="alert">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {view === 'practice' && (
        <KartRushTrack
          key={practiceStart}
          supabase={supabase}
          roomId={null}
          userId="practice"
          displayName={name}
          color={color}
          startAt={practiceStart}
          members={[]}
          difficulty={difficulty}
          laps={laps}
          pace={pace}
          weather={weather}
          graphics={graphics}
          onGraphicsChange={changeGraphics}
          volume={volume}
          onVolumeChange={changeVolume}
          onSoloFinish={careerRace ? careerFinish : undefined}
          onRetry={() => setPracticeStart(Date.now() + 6200)}
          onExit={() => setView('hub')}
          onReload={() => {}}
        />
      )}

      {view === 'online' && room && started && (
        <KartRushTrack
          key={room.id + '-' + room.started_at}
          supabase={supabase}
          roomId={room.id}
          userId={userId}
          displayName={name}
          color={me?.color || color}
          startAt={Date.parse(started)}
          members={members}
          weather={room.kr_weather === 'rain' ? 'rain' : 'clear'}
          graphics={graphics}
          onGraphicsChange={changeGraphics}
          volume={volume}
          onVolumeChange={changeVolume}
          isHost={room.host_id === userId}
          championshipEnabled={Boolean(room.kr_championship_enabled)}
          pointsTarget={room.kr_target_points || 50}
          roundNo={room.kr_round || 1}
          roundScored={Boolean(room.kr_round_scored)}
          championId={room.kr_champion_user_id || null}
          onFinalize={finalizePoints}
          onNextRound={nextChampionshipRound}
          onExit={leaveRoom}
          onReset={() => {
            void op(
              () => supabase.rpc('f1_kr_reset_room', { p_room_id: room.id }),
              () => { void loadRoom(room.id); },
            );
          }}
          onReload={() => { void loadRoom(room.id); }}
        />
      )}

      {view === 'online' && room && !started && (
        <div className={s.lobbyPanel}>
          <div className={s.lobbyHead}>
            <div>
              <span>YARIŞ LOBİSİ</span>
              <h2>{room.title}</h2>
              <p>Arkadaşlarına şu kodu gönder:</p>
              <div className={s.bigCode}>{room.code || '······'}</div>
            </div>
            <div className={s.status}>{members.length}/{room.max_players} OYUNCU</div>
          </div>

          {room.kr_championship_enabled && (
            <section style={{ padding: '16px', margin: '12px 0', border: '1px solid #64748b70', borderRadius: 14, background: 'rgba(10,19,32,.72)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong>🏆 ŞAMPİYONA PUANLARI · HEDEF {room.kr_target_points || 50}</strong>
                <span>YARIŞ {room.kr_round || 1}</span>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                {[...members].sort((a, b) => (b.kr_points || 0) - (a.kr_points || 0)).map((m, i) => (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.055)' }}>
                    <b style={{ width: 24 }}>{i + 1}.</b>
                    <span style={{ display: 'inline-block', width: 9, height: 9, background: m.color, borderRadius: 99 }} />
                    <span style={{ flex: 1 }}>{m.nickname}</span>
                    <strong>{m.kr_points || 0} PUAN</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className={s.memberGrid}>
            {members.map(x => (
              <div key={x.user_id} className={s.member}>
                <span className={s.colorDot} style={{ background: x.color }} />
                <strong>{x.nickname}</strong>
                {x.user_id === room.host_id && <small>👑 KURUCU</small>}
                <b className={x.ready ? s.ready : s.notReady}>{x.ready ? 'HAZIR' : 'BEKLİYOR'}</b>
              </div>
            ))}
          </div>

          <p className={s.hint}>
            Hava: {room.kr_weather === 'rain' ? '🌧️ YAĞMURLU · KAYGAN PİST' : '🌙 KURU PİST'}
          </p>

          <div className={s.lobbyActions}>
            <button
              disabled={busy}
              onClick={() => void op(
                () => supabase.rpc('f1_kr_ready', { p_room_id: room.id, p_ready: !me?.ready }),
                () => { void loadRoom(room.id); },
              )}
            >
              {me?.ready ? 'Hazırım ✓ (Geri al)' : 'Hazırım ✓'}
            </button>

            {room.host_id === userId && (
              <button
                disabled={busy || !everyoneReady}
                className={s.primaryBtn}
                onClick={() => void op(
                  () => supabase.rpc('f1_kr_start', { p_room_id: room.id }),
                  () => { void loadRoom(room.id); },
                )}
              >
                🏁 Yarışı başlat
              </button>
            )}

            <button className={s.secondaryBtn} disabled={busy} onClick={leaveRoom}>
              Lobiden çık
            </button>
          </div>

          <p className={s.hint}>
            En az 2 kişi ve herkesin hazır olması gerekir. Yarış 5 saniyelik geri sayımla başlar.{' '}
            {room.kr_championship_enabled
              ? 'Şampiyonada 1. 25, 2. 18, 3. 15 puan alır. Hedefe ilk ulaşan oyuncu şampiyon olur.'
              : 'Bu lobi tek yarışlık Grand Prix olarak ayarlandı.'}
          </p>
        </div>
      )}

      {view === 'hub' && (
        <div className={s.mainMenu}>
          <div className={s.menuNav}>
            {([
              { id: 'home', title: '🏁 ANA MENÜ' },
              { id: 'garage', title: '🏎️ GARAJ' },
              { id: 'settings', title: '⚙️ AYARLAR' },
              { id: 'online', title: '🌐 ÇEVRİM İÇİ' },
            ] as const).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMenuTab(t.id)}
                className={menuTab === t.id ? s.menuActive : ''}
              >
                {t.title}
              </button>
            ))}
          </div>

          {menuTab === 'home' && (
            <div style={{ margin: '14px 0', padding: 16, border: '1px solid #687b91', borderRadius: 14, background: 'rgba(10,20,33,.9)', color: '#fff', display: 'grid', gap: 9 }}>
              <strong>🏆 BOT KARİYERİ · 5 YARIŞ</strong>
              <span>
                {soloCareer.active
                  ? `Yarış ${Math.min(5, soloCareer.results.length + 1)} / 5 · ${soloCareer.points} puan · Sonuçlar: ${soloCareer.results.map(r => 'P' + r).join(', ') || 'Henüz yarışılmadı'}`
                  : 'Beş yarışlık puanlı tek oyunculu şampiyona.'}
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={s.primaryBtn}
                  onClick={() => {
                    const next: SoloCareer = { round: 1, points: 0, results: [], active: true, botPoints: {} };
                    setSoloCareer(next);
                    try { localStorage.setItem(SOLO_CAREER_KEY, JSON.stringify(next)); } catch {}
                    setCareerRace(true);
                    setPracticeStart(Date.now() + 6200);
                    setView('practice');
                  }}
                >
                  🏁 YENİ KARİYER
                </button>

                {soloCareer.active && soloCareer.results.length < 5 && (
                  <button
                    type="button"
                    className={s.secondaryBtn}
                    onClick={() => {
                      setCareerRace(true);
                      setPracticeStart(Date.now() + 6200);
                      setView('practice');
                    }}
                  >
                    ▶ SIRADAKİ YARIŞ
                  </button>
                )}

                {soloCareer.results.length === 5 && (
                  <strong>🏆 SEZON TAMAMLANDI · {soloCareer.points} PUAN</strong>
                )}
              </div>

              {soloCareer.active && Object.keys(soloCareer.botPoints || {}).length > 0 && (
                <div style={{ display: 'grid', gap: 3, fontSize: 11 }}>
                  <strong>ŞAMPİYONA PUAN DURUMU</strong>
                  {[
                    { name: 'SEN', points: soloCareer.points },
                    ...Object.entries(soloCareer.botPoints || {}).map(([name, points]) => ({ name, points })),
                  ]
                    .sort((a, b) => b.points - a.points)
                    .slice(0, 8)
                    .map((driver, i) => (
                      <span key={driver.name}>{i + 1}. {driver.name} · {driver.points} P</span>
                    ))}
                </div>
              )}
            </div>
          )}

          {menuTab === 'home' && (
            <div className={s.menuHome}>
              <section className={s.launchStage}>
                <div className={s.launchHeading}>
                  <h2>PİSTE <span>ÇIK.</span><strong>SINIRLARI ZORLA.</strong></h2>
                  <p>Direksiyon sende. Rakiplerini geç ve damalı bayrağa ulaş.</p>
                </div>

                <div className={s.launchConfig}>
                  <div className={s.launchConfigHeader}><strong>YARIŞ AYARLARI</strong></div>
                  <div className={s.launchConfigGrid}>
                    <label style={{ display: 'grid', gap: 8 }}>
                      HAVA DURUMU
                      <div className={s.difficultyChoices}>
                        {([
                          { id: 'clear', name: '🌙 KURU PİST', desc: 'Normal yol tutuşu' },
                          { id: 'rain', name: '🌧️ YAĞMURLU', desc: 'Kaygan pist · uzun fren' },
                        ] as const).map(x => (
                          <button
                            type="button"
                            key={x.id}
                            aria-pressed={weather === x.id}
                            className={weather === x.id ? s.difficultyActive : ''}
                            onClick={() => {
                              setWeather(x.id);
                              try { localStorage.setItem('f1-kr-weather', x.id); } catch {}
                            }}
                          >
                            <strong>{x.name}</strong><small>{x.desc}</small>
                          </button>
                        ))}
                      </div>
                    </label>

                    <label>
                      TUR SAYISI
                      <div className={s.raceSetupChoices}>
                        {([1, 2, 3, 5] as const).map(n => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={laps === n}
                            className={laps === n ? s.raceSetupSelected : ''}
                            onClick={() => {
                              setLaps(n);
                              try { localStorage.setItem('f1-kr-laps', String(n)); } catch {}
                            }}
                          >
                            {n} <small>TUR</small>
                          </button>
                        ))}
                      </div>
                    </label>
                  </div>
                </div>

                <div className={s.launchActions}>
                  <button
                    className={s.launchRaceBtn}
                    onClick={() => {
                      setError('');
                      setCareerRace(false);
                      setPracticeStart(Date.now() + 6200);
                      setView('practice');
                    }}
                  >
                    <span>START GRAND PRIX</span>
                    <b>YARIŞI BAŞLAT <span>↗</span></b>
                  </button>

                  <div className={s.launchInviteCard}>
                    <div className={s.launchInviteText}>
                      <small>STEAM TARZI DAVET</small>
                      <strong>ARKADAŞINI DAVET ET</strong>
                      <p>Hızlıca bir lobi kur, arkadaşlarını çağır ve aynı yarışa birlikte gir.</p>
                    </div>
                    <div className={s.launchInviteActions}>
                      <button
                        type="button"
                        className={s.launchInvitePrimary}
                        onClick={() => {
                          if (userId) {
                            createRoom();
                          } else {
                            setMenuTab('online');
                            setError('Arkadaş daveti ve lobi kurmak için giriş yapmalısın.');
                          }
                        }}
                      >
                        + LOBİ KUR
                      </button>
                      <button type="button" className={s.launchInviteGhost} onClick={() => setMenuTab('online')}>
                        ARKADAŞ EKLE / DAVET ET
                      </button>
                    </div>
                  </div>

                  <button type="button" className={s.launchSecondaryBtn} onClick={() => setMenuTab('online')}>
                    ÇEVRİM İÇİ LOBİ <span>→</span>
                  </button>
                </div>
              </section>

              <aside className={s.launchGarage}>
                <div className={s.launchGarageHeader}><span>RACE CAR / 01</span></div>
                <div className={s.launchCarScene} style={{ '--car-accent': color } as CSSProperties}>
                  <div className={s.launchCarGlow} />
                  <div className={s.launchCarArtwork}><GaragePreview color={color} /></div>
                  <div className={s.launchCarBaseline} />
                </div>
                <div className={s.launchCarInfo}>
                  <span>SEÇİLİ ARAÇ</span>
                  <h3>{GARAGE.find(x => x.color === color)?.name}</h3>
                </div>
                <button className={s.launchGarageButton} type="button" onClick={() => setMenuTab('garage')}>
                  KAPLAMAYI DEĞİŞTİR <span>↗</span>
                </button>
                <div className={s.launchControls}>
                  <strong>KONTROLLER</strong>
                  <p>W <span>GAZ</span> · S <span>FREN</span> · A/D <span>DİREKSİYON</span></p>
                  <p>V <span>KAMERA</span> · C <span>ARKAYA BAK</span></p>
                </div>
              </aside>
            </div>
          )}

          {menuTab === 'garage' && (
            <section className={s.menuPanel}>
              <span className={s.sectionTag}>F1 MEDİPOL · RACE CAR STUDIO</span>
              <h2>FORMULA GARAJI</h2>
              <p className={s.menuIntro}>
                11 gerçek F1 takımının renklerinden ilham alan kaplamalar. Seçimin yarışta ve çevrim içi lobide görünür. Resmî takım logoları kullanılmaz.
              </p>
              <div className={s.garageGrid}>
                {GARAGE.map(car => (
                  <button
                    key={car.color}
                    type="button"
                    aria-pressed={car.color === color}
                    className={`${s.garageChoice} ${car.color === color ? s.garageSelected : ''}`}
                    onClick={() => changeColor(car.color)}
                  >
                    <div className={s.carVisual} style={{ '--car-accent': car.color } as CSSProperties}>
                      <GaragePreview color={car.color} />
                    </div>
                    <strong>{car.name}</strong>
                    <small>{car.team}</small>
                    <span>{car.color === color ? '✓ SEÇİLİ ARAÇ' : car.tag}</span>
                  </button>
                ))}
              </div>
              <button className={s.practiceBtn} onClick={() => setMenuTab('home')}>
                ← ANA MENÜYE DÖN <span>{GARAGE.find(x => x.color === color)?.name}</span>
              </button>
            </section>
          )}

          {menuTab === 'settings' && (
            <section className={s.menuPanel}>
              <span className={s.sectionTag}>PERFORMANS / SES / SÜRÜŞ</span>
              <h2>OYUN AYARLARI</h2>
              <div className={s.settingsGrid}>
                <div className={s.settingsGroup}>
                  <h3>GRAFİK KALİTESİ</h3>
                  <p>Detay seviyesi ve çözünürlük seçimi</p>
                  <div className={s.preGameGraphics}>
                    {([
                      { id: 'low', name: 'DÜŞÜK', desc: 'Daha fazla FPS' },
                      { id: 'balanced', name: 'DENGELİ', desc: 'Önerilen' },
                      { id: 'high', name: 'YÜKSEK', desc: 'Güçlü detay' },
                      { id: 'ultra', name: 'ULTRA', desc: 'Maksimum doku / tribün / gökyüzü' },
                    ] as const).map(x => (
                      <button
                        key={x.id}
                        aria-pressed={graphics === x.id}
                        type="button"
                        className={graphics === x.id ? s.graphicsChosen : ''}
                        onClick={() => changeGraphics(x.id)}
                      >
                        <strong>{x.name}</strong><small>{x.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={s.settingsGroup}>
                  <h3>SES AYARLARI</h3>
                  <p>Motor, güç ve çarpışma efektleri</p>
                  <p style={{ fontSize: 12, opacity: .72, marginTop: 6 }}>
                    Gerçek F1 V8 kaydı:{' '}
                    <a href="https://commons.wikimedia.org/wiki/File:Williams-Cosworth_FW32_(2010).ogg" target="_blank" rel="noopener noreferrer">Edvvc (Ed Pond)</a>
                    {' · '}
                    <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>
                    {' · '}Ses döngüye uygun düzenlenmiştir.
                  </p>
                  <label className={s.menuVolume}>
                    SES DÜZEYİ <b>{Math.round(volume * 100)}%</b>
                    <input type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={e => changeVolume(Number(e.target.value) / 100)} />
                  </label>
                  <button className={s.secondaryBtn} onClick={() => changeVolume(volume === 0 ? .45 : 0)}>
                    {volume > 0 ? '◼ SESİ KAPAT' : '♫ SESİ AÇ'}
                  </button>
                </div>

                <div className={s.settingsGroup}>
                  <h3>YARIŞ TEMPOSU</h3>
                  <p>Tur süresi hedefini belirle.</p>
                  <div className={s.difficultyChoices}>
                    {([
                      { id: 'fast', name: 'HIZLI', time: '2:00' },
                      { id: 'standard', name: 'NORMAL', time: '2:30' },
                      { id: 'long', name: 'UZUN', time: '3:00' },
                    ] as const).map(x => (
                      <button
                        key={x.id}
                        type="button"
                        aria-pressed={pace === x.id}
                        className={pace === x.id ? s.difficultyActive : ''}
                        onClick={() => {
                          setPace(x.id);
                          try { localStorage.setItem('f1-kr-pace', x.id); } catch {}
                        }}
                      >
                        <strong>{x.name}</strong><small>{x.time}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={s.settingsGroup}>
                  <h3>BOT ZORLUĞU</h3>
                  <p>Tek oyunculu yarış için</p>
                  <div className={s.difficultyChoices}>
                    {([
                      { id: 'easy', title: 'KOLAY', desc: 'Sakin' },
                      { id: 'normal', title: 'ORTA', desc: 'Dengeli' },
                      { id: 'hard', title: 'ZOR', desc: 'Rekabetçi' },
                    ] as const).map(x => (
                      <button
                        type="button"
                        key={x.id}
                        aria-pressed={difficulty === x.id}
                        className={difficulty === x.id ? s.difficultyActive : ''}
                        onClick={() => setDifficulty(x.id)}
                      >
                        <strong>{x.title}</strong><small>{x.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={s.settingsGroup}>
                  <h3>KONTROLLER</h3>
                  <p>Gaz: W / ↑ · Fren: S / ↓ · Yön: A / D · Güç: E / SPACE · Duraklat: ESC · Tam ekran: F</p>
                  <p>Mobilde ekrandaki GAZ ve FREN düğmelerine basılı tut.</p>
                </div>
              </div>
              <button className={s.practiceBtn} onClick={() => setMenuTab('home')}>
                ✓ AYARLARI KAYDET VE DÖN <span>HAZIR →</span>
              </button>
            </section>
          )}

          {menuTab === 'online' && (
            <div className={s.hub}>
              <section className={s.setup}>
                <span className={s.sectionTag}>ÇEVRİM İÇİ GARAJ</span>
                <label>
                  Yarışçı adın
                  <input value={name} maxLength={24} onChange={e => setName(e.target.value)} />
                </label>
                <p className={s.label}>Seçili araç: {GARAGE.find(x => x.color === color)?.team}</p>
                <div className={s.colors}>
                  {GARAGE.map(car => (
                    <button
                      type="button"
                      aria-label={'Takım ' + car.name}
                      title={car.team}
                      aria-pressed={color === car.color}
                      key={car.color}
                      className={color === car.color ? s.chosenColor : ''}
                      style={{ background: car.color }}
                      onClick={() => changeColor(car.color)}
                    />
                  ))}
                </div>
                <button className={s.secondaryBtn} onClick={() => setMenuTab('garage')}>Garajı aç →</button>
                <p className={s.hint}>Lobi yarışlarında araç renkleri senkronize edilir. Her sürücünün gaz/fren kontrolü bağımsızdır.</p>
              </section>

              <section className={s.setup}>
                <span className={s.sectionTag}>ARKADAŞLARINLA YARIŞ</span>
                <label>
                  Lobi adı
                  <input maxLength={45} value={lobbyName} onChange={e => setLobbyName(e.target.value)} />
                </label>

                <label style={{ display: 'grid', gap: 8 }}>
                  HAVA DURUMU
                  <div className={s.difficultyChoices}>
                    {([
                      { id: 'clear', name: '🌙 KURU PİST', desc: 'Normal yol tutuşu' },
                      { id: 'rain', name: '🌧️ YAĞMURLU', desc: 'Kaygan pist · uzun fren' },
                    ] as const).map(x => (
                      <button
                        type="button"
                        key={x.id}
                        aria-pressed={weather === x.id}
                        className={weather === x.id ? s.difficultyActive : ''}
                        onClick={() => {
                          setWeather(x.id);
                          try { localStorage.setItem('f1-kr-weather', x.id); } catch {}
                        }}
                      >
                        <strong>{x.name}</strong><small>{x.desc}</small>
                      </button>
                    ))}
                  </div>
                </label>

                <label className={s.checkLine}>
                  <input type="checkbox" checked={privateRoom} onChange={e => setPrivateRoom(e.target.checked)} />
                  Özel lobi (yalnızca kodla girilebilir)
                </label>

                <div style={{ padding: '13px 14px', border: '1px solid #66738b65', borderRadius: 12, background: 'rgba(0,0,0,.16)', display: 'grid', gap: 10 }}>
                  <strong>🏆 LOBİ YARIŞ TÜRÜ</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={s.secondaryBtn}
                      style={{ borderColor: !championshipEnabled ? '#e5344b' : undefined, flex: 1 }}
                      onClick={() => setChampionshipEnabled(false)}
                    >
                      🏁 TEK GRAND PRIX
                    </button>
                    <button
                      type="button"
                      className={s.secondaryBtn}
                      style={{ borderColor: championshipEnabled ? '#e5344b' : undefined, flex: 1 }}
                      onClick={() => setChampionshipEnabled(true)}
                    >
                      🏆 PUANLI ŞAMPİYONA
                    </button>
                  </div>

                  {championshipEnabled && (
                    <>
                      <label>
                        Şampiyonluk hedefi
                        <select
                          value={pointsTarget}
                          onChange={e => setPointsTarget(Number(e.target.value))}
                          style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 8, background: '#172232', color: '#f4f6fa', border: '1px solid #637086' }}
                        >
                          {[25, 50, 75, 100, 150, 200].map(n => (
                            <option key={n} value={n}>
                              {n} PUAN · {n === 50 ? 'ÖNERİLEN' : n === 25 ? 'ÇOK KISA' : 'ŞAMPİYONA'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className={s.hint}>
                        F1 puanları: {RACE_POINTS.join(' / ')} · Sıralama yarışlar arasında korunur. {pointsTarget} puana ulaşılınca lobi şampiyonası tamamlanır.
                      </p>
                    </>
                  )}
                </div>

                <button disabled={busy || loading} className={s.primaryBtn} onClick={createRoom}>
                  + Yeni lobi kur
                </button>

                <div className={s.joinInput}>
                  <input
                    placeholder="6 haneli lobi kodu"
                    value={code}
                    maxLength={6}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                  />
                  <button disabled={busy || code.trim().length !== 6} onClick={() => joinRoom(code)}>
                    Katıl →
                  </button>
                </div>

                {!userId && (
                  <p className={s.notice}>
                    Çevrim içi yarış için F1 SOCIAL hesabına giriş yapmalısın. <a href="/login">Giriş yap ↗</a>
                  </p>
                )}
              </section>

              <section className={s.roomList}>
                <div className={s.listTitle}>
                  <span className={s.sectionTag}>AÇIK LOBİLER</span>
                  <button onClick={() => void loadRooms()}>↻ Yenile</button>
                </div>

                {!rooms.length ? (
                  <p className={s.hint}>Şu anda açık lobi görünmüyor. İlk lobiyi sen aç!</p>
                ) : (
                  rooms.map(r => (
                    <div key={r.id} className={s.roomItem}>
                      <div>
                        <strong>{r.title}</strong>
                        <small>{r.member_count}/{r.max_players} oyuncu · KOD: {r.code}</small>
                      </div>
                      <button disabled={busy} onClick={() => joinRoom(r.code)}>Katıl →</button>
                    </div>
                  ))
                )}

                <p className={s.hint}>Çevrim içi yarışlar mevcut Supabase lobi altyapısını kullanır. Anti-hile henüz yoktur.</p>
              </section>
            </div>
          )}
        </div>
      )}

      <div className={s.howTo}>
        <div>
          <span>01</span>
          <strong>⚡ TURBO</strong>
          <p>Bir anda hızlan, düzlükte rakiplerini geç.</p>
        </div>
        <div>
          <span>02</span>
          <strong>🛡️ KALKAN</strong>
          <p>EMP saldırılarından korun.</p>
        </div>
        <div>
          <span>03</span>
          <strong>💥 EMP</strong>
          <p>Diğer yarışçıları kısa süre yavaşlat.</p>
        </div>
        <div>
          <span>04</span>
          <strong>🔧 ONARIM</strong>
          <p>Aracının hasarını azalt, yarışa devam et.</p>
        </div>
        <div>
          <span>05</span>
          <strong>📡 PULSE</strong>
          <p>Yakındaki rakiplere darbe gönder.</p>
        </div>
        <div>
          <span>06</span>
          <strong>🧲 MAGNET</strong>
          <p>Güç kapsüllerini uzaktan topla.</p>
        </div>
      </div>
    </div>
  );
}
