/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Wifi, 
  Volume2, 
  VolumeX, 
  Settings, 
  Download, 
  Copy, 
  Check, 
  Smartphone, 
  Monitor, 
  ShieldAlert, 
  Terminal, 
  RotateCcw,
  Zap,
  Crosshair,
  Crown,
  Users,
  Clock,
  MousePointer,
  Crosshair as CrosshairIcon
} from 'lucide-react';

/* =========================================================================
   SYNTHESIZED SOUND ENGINE (Web Audio API)
   ========================================================================= */
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCountdownTick(isFinal: boolean = false) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 540, now);
    gain.gain.setValueAtTime(isFinal ? 0.28 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.22 : 0.08));
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.22 : 0.08));
  }

  playLockClank() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playSimultaneousFire() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playElimination() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playZoneShrink() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.6);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  playVictory() {
    if (this.muted || !this.ctx) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  }
}

const soundEngine = new SoundEngine();

/* =========================================================================
   GEOMETRY & ARENA SHRINKING CONSTANTS
   ========================================================================= */
const ARENA_STAGES = [460, 340, 230, 150];
const BASE_RADIUS = ARENA_STAGES[0];
const PLAYER_SPEED = 280;
const PLAYER_SIZE = 34; // Mech chassis width
const PLAYER_HIT_RADIUS = 20;

// 12 Guaranteed Distinct, High-Contrast Neon Laser Colors (no duplicates)
export const UNIQUE_COLORS: string[] = [
  '#00f0ff', // 0: Neon Cyan / Electric Blue (Player 1)
  '#00ff66', // 1: Laser Green (Player 2)
  '#ff003c', // 2: Crimson Laser Red (Player 3)
  '#ffd000', // 3: Cyber Gold / Amber (Player 4)
  '#9d4edd', // 4: Electric Violet (Player 5)
  '#ff6200', // 5: Solar Blaze Orange (Player 6)
  '#ff0099', // 6: Hot Magenta Pink (Player 7)
  '#3a86ff', // 7: Deep Cobalt Sapphire (Player 8)
  '#b4ff00', // 8: Acid Volt Lime (Player 9)
  '#00f5d4', // 9: Aquamarine Turquoise (Player 10)
  '#ffffff', // 10: Platinum Ice
  '#e0aaff', // 11: Electric Lilac
];

// 10 Player Presets matching the 3D Avatars (Blue: 0, Red: 1, Green: 2, Yellow: 3)
const PLAYER_PRESETS = [
  { color: '#00f0ff', name: 'Player 1', avatarIndex: 0 },
  { color: '#00ff66', name: 'Player 2', avatarIndex: 2 },
  { color: '#ff003c', name: 'Player 3', avatarIndex: 1 },
  { color: '#ffd000', name: 'Player 4', avatarIndex: 3 },
  { color: '#9d4edd', name: 'Player 5', avatarIndex: 0 },
  { color: '#ff6200', name: 'Player 6', avatarIndex: 3 },
  { color: '#ff0099', name: 'Player 7', avatarIndex: 1 },
  { color: '#3a86ff', name: 'Player 8', avatarIndex: 0 },
  { color: '#b4ff00', name: 'Player 9', avatarIndex: 2 },
  { color: '#00f5d4', name: 'Player 10', avatarIndex: 3 },
];

function getOctagonVertices(radius: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI / 8 + (i * Math.PI) / 4;
    pts.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }
  return pts;
}

function lineIntersection(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, p4: { x: number; y: number }) {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-6) return null;
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
      fraction: ua,
    };
  }
  return null;
}

function raycastOctagon(startX: number, startY: number, dirX: number, dirY: number, radius: number) {
  const maxDist = radius * 2.5;
  const endX = startX + dirX * maxDist;
  const endY = startY + dirY * maxDist;
  const vertices = getOctagonVertices(radius);
  let closestDist = maxDist;
  let hitX = endX;
  let hitY = endY;

  for (let i = 0; i < 8; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % 8];
    const hit = lineIntersection({ x: startX, y: startY }, { x: endX, y: endY }, v1, v2);
    if (hit) {
      const d = hit.fraction * maxDist;
      if (d < closestDist) {
        closestDist = d;
        hitX = hit.x;
        hitY = hit.y;
      }
    }
  }
  return { x: hitX, y: hitY, distance: closestDist };
}

function constrainToOctagon(pos: { x: number; y: number }, radius: number, playerR: number = PLAYER_HIT_RADIUS) {
  const vertices = getOctagonVertices(radius);
  for (let i = 0; i < 8; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % 8];
    const edgeX = v2.x - v1.x;
    const edgeY = v2.y - v1.y;
    const edgeLen = Math.hypot(edgeX, edgeY);
    let nx = -edgeY / edgeLen;
    let ny = edgeX / edgeLen;
    if (nx * v1.x + ny * v1.y > 0) {
      nx = -nx;
      ny = -ny;
    }
    const distFromWall = (pos.x - v1.x) * nx + (pos.y - v1.y) * ny;
    if (distFromWall < playerR) {
      const pen = playerR - distFromWall;
      pos.x += nx * pen;
      pos.y += ny * pen;
    }
  }
}

function distancePointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / segLenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

interface PlayerState {
  id: string;
  slot: number;
  avatarIndex?: number;
  name: string;
  color: string;
  x: number;
  y: number;
  aim: number;
  alive: boolean;
  wins: number;
  lockedX?: number;
  lockedY?: number;
  lockedAim?: number;
  lockedHit?: { x: number; y: number };
  isBot?: boolean;
  botTargetX?: number;
  botTargetY?: number;
}

interface LaserBeam {
  shooterId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

interface MovingBullet {
  id: string;
  shooterId: string;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  speed: number;
  delay: number;
  hasImpacted: boolean;
  angle: number;
}

interface WinnerData {
  name: string;
  color: string;
  avatarIndex: number;
  isDraw: boolean;
  totalRounds: number;
  survivorsCount: number;
}

interface KillEvent {
  id: string;
  killer: string;
  victim: string;
  color: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI state
  const [playMode, setPlayMode] = useState<'bots' | 'multiplayer'>('bots');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'guide' | 'download'>('play');
  const [downloadTarget, setDownloadTarget] = useState<'server' | 'html'>('server');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Connection settings
  const [serverHost, setServerHost] = useState('localhost:8000');
  const [roomCode, setRoomCode] = useState('CAGE');
  const [playerName, setPlayerName] = useState('Player 1');
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [ping, setPing] = useState<number | null>(null);

  // Gameplay HUD
  const [phaseState, setPhaseState] = useState<'BLIND_POSITIONING' | 'LOCKED_REVEAL' | 'SIMULTANEOUS_FIRE' | 'ZONE_SHRINK' | 'GAME_OVER'>('BLIND_POSITIONING');
  const [countdownTimer, setCountdownTimer] = useState<number>(10.0); // 10s default
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);
  const [playersList, setPlayersList] = useState<PlayerState[]>([]);
  const [matchPlayerCount, setMatchPlayerCount] = useState<number>(10); // 10 players maximum supported
  const [initialPlayerCount, setInitialPlayerCount] = useState<number>(10);
  const [winnerData, setWinnerData] = useState<WinnerData | null>(null);

  // 3D Avatar Sprite Sheet from /public/assets/aistudio/image_b426ad66.png
  const avatarSpriteRef = useRef<HTMLImageElement | null>(null);
  const [, setAvatarLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/aistudio/image_b426ad66.png';
    img.onload = () => {
      avatarSpriteRef.current = img;
      setAvatarLoaded(true);
    };
    img.onerror = () => {
      img.src = 'assets/aistudio/image_b426ad66.png';
    };
  }, []);

  // Refs for animation loop
  const socketRef = useRef<WebSocket | null>(null);
  const localPlayerIdRef = useRef<string>('p_local');
  const playModeRef = useRef<'bots' | 'multiplayer'>('bots');
  playModeRef.current = playMode;

  const inputRef = useRef({
    moveX: 0,
    moveY: 0,
    aimAngle: 0,
    keys: { w: false, a: false, s: false, d: false },
    mouse: { x: 0, y: 0 },
  });

  // Touch virtual sticks
  const [leftStick, setLeftStick] = useState<{ active: boolean; x: number; y: number; thumbX: number; thumbY: number }>({
    active: false,
    x: 0,
    y: 0,
    thumbX: 0,
    thumbY: 0,
  });
  const [rightStick, setRightStick] = useState<{ active: boolean; x: number; y: number; thumbX: number; thumbY: number }>({
    active: false,
    x: 0,
    y: 0,
    thumbX: 0,
    thumbY: 0,
  });

  const touchIdsRef = useRef<{ moveId: number | null; aimId: number | null }>({
    moveId: null,
    aimId: null,
  });

  // Local Game Loop Engine (Offline Bot Match)
  const engineRef = useRef({
    state: 'BLIND_POSITIONING' as 'BLIND_POSITIONING' | 'LOCKED_REVEAL' | 'SIMULTANEOUS_FIRE' | 'ZONE_SHRINK' | 'GAME_OVER',
    timer: 10.0, // 10-second window
    lastSecond: 10,
    round: 1,
    stageIndex: 0,
    currentRadius: ARENA_STAGES[0],
    targetRadius: ARENA_STAGES[0],
    winner: null as string | null,
    players: [] as PlayerState[],
    beams: [] as LaserBeam[],
    bullets: [] as MovingBullet[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; maxLife: number }[],
    screenShake: 0,
    redFlash: 0,
  });

  const addKillMessage = useCallback((killer: string, victim: string, color: string) => {
    const id = Math.random().toString();
    setKillFeed((prev) => [...prev.slice(-3), { id, killer, victim, color }]);
    setTimeout(() => {
      setKillFeed((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  // Helper to spawn high-speed kinetic plasma bullets along laser paths
  const spawnBullets = useCallback((beams: LaserBeam[]) => {
    const bullets: MovingBullet[] = [];
    beams.forEach((beam, idx) => {
      const angle = Math.atan2(beam.y2 - beam.y1, beam.x2 - beam.x1);
      // Bullet 1: Lead projectile
      bullets.push({
        id: `${beam.shooterId}_b1_${idx}`,
        shooterId: beam.shooterId,
        color: beam.color,
        x1: beam.x1,
        y1: beam.y1,
        x2: beam.x2,
        y2: beam.y2,
        progress: 0,
        speed: 3.3, // completes path in ~0.30s
        delay: 0,
        hasImpacted: false,
        angle,
      });
      // Bullet 2: Rapid secondary pulse
      bullets.push({
        id: `${beam.shooterId}_b2_${idx}`,
        shooterId: beam.shooterId,
        color: beam.color,
        x1: beam.x1,
        y1: beam.y1,
        x2: beam.x2,
        y2: beam.y2,
        progress: 0,
        speed: 3.3,
        delay: 0.08,
        hasImpacted: false,
        angle,
      });
      // Bullet 3: Third trailing bolt
      bullets.push({
        id: `${beam.shooterId}_b3_${idx}`,
        shooterId: beam.shooterId,
        color: beam.color,
        x1: beam.x1,
        y1: beam.y1,
        x2: beam.x2,
        y2: beam.y2,
        progress: 0,
        speed: 3.3,
        delay: 0.16,
        hasImpacted: false,
        angle,
      });
    });
    engineRef.current.bullets = bullets;
  }, []);

  // Initialize bot match with 10s positioning and guaranteed unique colors per player
  const initBotMatch = useCallback((playerCount?: number) => {
    const total = Math.min(10, Math.max(2, playerCount ?? matchPlayerCount));
    const bots: PlayerState[] = [];
    const usedColors = new Set<string>();

    for (let i = 0; i < total; i++) {
      let color = UNIQUE_COLORS[i % UNIQUE_COLORS.length];
      let offset = 0;
      while (usedColors.has(color) && offset < UNIQUE_COLORS.length) {
        offset++;
        color = UNIQUE_COLORS[(i + offset) % UNIQUE_COLORS.length];
      }
      usedColors.add(color);

      const preset = PLAYER_PRESETS[i % PLAYER_PRESETS.length];
      bots.push({
        id: i === 0 ? 'p_local' : `bot_${i}`,
        slot: i,
        avatarIndex: preset.avatarIndex,
        name: i === 0 ? (playerName || 'Player 1') : `Player ${i + 1}`,
        color: color,
        x: 0,
        y: 0,
        aim: 0,
        alive: true,
        wins: 0,
        isBot: i !== 0,
      });
    }

    engineRef.current.round = 1;
    engineRef.current.stageIndex = 0;
    engineRef.current.currentRadius = ARENA_STAGES[0];
    engineRef.current.targetRadius = ARENA_STAGES[0];
    engineRef.current.state = 'BLIND_POSITIONING';
    engineRef.current.timer = 10.0;
    engineRef.current.lastSecond = 10;
    engineRef.current.beams = [];
    engineRef.current.bullets = [];
    engineRef.current.players = bots;

    bots.forEach((p) => {
      p.lockedHit = undefined;
      p.lockedX = undefined;
      p.lockedY = undefined;
      p.lockedAim = undefined;
      const angle = (p.slot * (2 * Math.PI / total)) + (Math.PI / total) + (Math.random() - 0.5) * 0.2;
      const dist = ARENA_STAGES[0] * (0.60 + Math.random() * 0.18);
      p.x = dist * Math.cos(angle);
      p.y = dist * Math.sin(angle);
      p.aim = Math.atan2(-p.y, -p.x) + (Math.random() - 0.5) * 0.25;
      if (p.isBot) {
        const a = Math.random() * Math.PI * 2;
        p.botTargetX = Math.cos(a) * ARENA_STAGES[0] * 0.65;
        p.botTargetY = Math.sin(a) * ARENA_STAGES[0] * 0.65;
      }
    });

    setWinnerData(null);
    setInitialPlayerCount(total);
    setPhaseState('BLIND_POSITIONING');
    setCountdownTimer(10.0);
    setPlayersList([...bots]);
    soundEngine.playZoneShrink();
  }, [playerName, matchPlayerCount]);

  // Connect to FastAPI server
  const connectMultiplayer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const host = serverHost.trim() || 'localhost:8000';
    const room = (roomCode.trim() || 'CAGE').toUpperCase();
    const name = playerName.trim() || 'Player 1';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws/${room}?name=${encodeURIComponent(name)}`;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('online');
        soundEngine.playVictory();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            localPlayerIdRef.current = data.playerId;
          } else if (data.type === 'pong') {
            setPing(Math.round(performance.now() - data.time));
          } else if (data.players) {
            setPhaseState(data.state);
            setCountdownTimer(data.timer);
            setPlayersList(data.players);
            if (typeof data.initialPlayerCount === 'number') {
              setInitialPlayerCount(data.initialPlayerCount);
            }

            if (data.events) {
              data.events.forEach((evt: { type: string; beams?: LaserBeam[]; eliminations?: { x: number; y: number; color: string; killerId: string; victimName: string }[]; winnerId?: string; winnerName?: string; winnerColor?: string; winnerAvatar?: number; totalRounds?: number }) => {
                if (evt.type === 'phase_locked') {
                  soundEngine.playLockClank();
                  setWinnerData(null);
                } else if (evt.type === 'simultaneous_fire') {
                  soundEngine.playSimultaneousFire();
                  engineRef.current.redFlash = 0.8;
                  engineRef.current.screenShake = 24;
                  engineRef.current.beams = evt.beams || [];
                  spawnBullets(evt.beams || []);
                  if (evt.eliminations) {
                    evt.eliminations.forEach((el) => {
                      soundEngine.playElimination();
                      addKillMessage(el.killerId || 'Laser', el.victimName, el.color);
                    });
                  }
                } else if (evt.type === 'zone_shrinking') {
                  soundEngine.playZoneShrink();
                  setWinnerData(null);
                } else if (evt.type === 'game_over') {
                  soundEngine.playVictory();
                  setWinnerData({
                    name: evt.winnerName || 'CHAMPION',
                    color: evt.winnerColor || '#ffd700',
                    avatarIndex: evt.winnerAvatar ?? 0,
                    isDraw: !evt.winnerId,
                    totalRounds: evt.totalRounds || 1,
                    survivorsCount: evt.winnerId ? 1 : 0,
                  });
                }
              });
            }
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        setConnectionStatus('offline');
        setPing(null);
      };

      ws.onerror = () => {
        setConnectionStatus('offline');
        setPing(null);
      };
    } catch {
      setConnectionStatus('offline');
    }
  }, [serverHost, roomCode, playerName, addKillMessage]);

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    soundEngine.init();
    const halfWidth = window.innerWidth / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < halfWidth && touchIdsRef.current.moveId === null) {
        touchIdsRef.current.moveId = touch.identifier;
        setLeftStick({
          active: true,
          x: touch.clientX,
          y: touch.clientY,
          thumbX: touch.clientX,
          thumbY: touch.clientY,
        });
      } else if (touch.clientX >= halfWidth && touchIdsRef.current.aimId === null) {
        touchIdsRef.current.aimId = touch.identifier;
        setRightStick({
          active: true,
          x: touch.clientX,
          y: touch.clientY,
          thumbX: touch.clientX,
          thumbY: touch.clientY,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const STICK_MAX = 52;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdsRef.current.moveId) {
        setLeftStick((prev) => {
          const dx = touch.clientX - prev.x;
          const dy = touch.clientY - prev.y;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, STICK_MAX);
          const angle = Math.atan2(dy, dx);
          inputRef.current.moveX = (clamped / STICK_MAX) * Math.cos(angle);
          inputRef.current.moveY = (clamped / STICK_MAX) * Math.sin(angle);
          return {
            ...prev,
            thumbX: prev.x + Math.cos(angle) * clamped,
            thumbY: prev.y + Math.sin(angle) * clamped,
          };
        });
      } else if (touch.identifier === touchIdsRef.current.aimId) {
        setRightStick((prev) => {
          const dx = touch.clientX - prev.x;
          const dy = touch.clientY - prev.y;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, STICK_MAX);
          const angle = Math.atan2(dy, dx);
          if (dist > 8) {
            inputRef.current.aimAngle = angle;
          }
          return {
            ...prev,
            thumbX: prev.x + Math.cos(angle) * clamped,
            thumbY: prev.y + Math.sin(angle) * clamped,
          };
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdsRef.current.moveId) {
        touchIdsRef.current.moveId = null;
        inputRef.current.moveX = 0;
        inputRef.current.moveY = 0;
        setLeftStick((prev) => ({ ...prev, active: false }));
      } else if (touch.identifier === touchIdsRef.current.aimId) {
        touchIdsRef.current.aimId = null;
        setRightStick((prev) => ({ ...prev, active: false }));
      }
    }
  };

  // Keyboard and Mouse listeners
  useEffect(() => {
    initBotMatch();

    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.keys.w = true;
      if (k === 'a' || k === 'arrowleft') inputRef.current.keys.a = true;
      if (k === 's' || k === 'arrowdown') inputRef.current.keys.s = true;
      if (k === 'd' || k === 'arrowright') inputRef.current.keys.d = true;
      if (k === 'r') initBotMatch();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.keys.w = false;
      if (k === 'a' || k === 'arrowleft') inputRef.current.keys.a = false;
      if (k === 's' || k === 'arrowdown') inputRef.current.keys.s = false;
      if (k === 'd' || k === 'arrowright') inputRef.current.keys.d = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouse.x = e.clientX;
      inputRef.current.mouse.y = e.clientY;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      inputRef.current.aimAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [initBotMatch]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      const dt = 1 / 60;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minDim = Math.min(width, height);
      const scale = Math.min(1.0, (minDim * 0.94) / (BASE_RADIUS * 2.2));

      // 1. Keyboard movement
      if (touchIdsRef.current.moveId === null) {
        let dx = 0;
        let dy = 0;
        if (inputRef.current.keys.w) dy -= 1;
        if (inputRef.current.keys.s) dy += 1;
        if (inputRef.current.keys.a) dx -= 1;
        if (inputRef.current.keys.d) dx += 1;
        const mag = Math.hypot(dx, dy);
        inputRef.current.moveX = mag > 0 ? dx / mag : 0;
        inputRef.current.moveY = mag > 0 ? dy / mag : 0;
      }

      // 2. Offline Bot State Machine
      if (playModeRef.current === 'bots') {
        const eng = engineRef.current;

        if (eng.state === 'BLIND_POSITIONING') {
          eng.timer -= dt;
          const sec = Math.ceil(eng.timer);
          if (sec !== eng.lastSecond && sec > 0) {
            eng.lastSecond = sec;
            soundEngine.playCountdownTick(sec <= 3);
          }
          setCountdownTimer(Math.max(0, eng.timer));

          eng.players.forEach((p) => {
            if (!p.alive) return;
            let dx = 0;
            let dy = 0;

            if (!p.isBot) {
              dx = inputRef.current.moveX;
              dy = inputRef.current.moveY;
              p.aim = inputRef.current.aimAngle;
            } else {
              const toX = (p.botTargetX || 0) - p.x;
              const toY = (p.botTargetY || 0) - p.y;
              const d = Math.hypot(toX, toY);
              if (d > 10) {
                dx = toX / d;
                dy = toY / d;
              } else {
                const a = Math.random() * Math.PI * 2;
                p.botTargetX = Math.cos(a) * (eng.currentRadius * 0.65);
                p.botTargetY = Math.sin(a) * (eng.currentRadius * 0.65);
              }
              p.aim += (Math.random() - 0.5) * 0.08;
            }

            const mag = Math.hypot(dx, dy);
            if (mag > 0.05) {
              const ndx = mag > 1 ? dx / mag : dx;
              const ndy = mag > 1 ? dy / mag : dy;
              p.x += ndx * PLAYER_SPEED * dt;
              p.y += ndy * PLAYER_SPEED * dt;
              const pos = { x: p.x, y: p.y };
              constrainToOctagon(pos, eng.currentRadius, PLAYER_HIT_RADIUS);
              p.x = pos.x;
              p.y = pos.y;
            }
          });

          if (eng.timer <= 0) {
            eng.state = 'LOCKED_REVEAL';
            eng.timer = 1.8;
            soundEngine.playLockClank();
            setPhaseState('LOCKED_REVEAL');

            eng.players.forEach((p) => {
              if (p.alive) {
                p.lockedX = p.x;
                p.lockedY = p.y;
                p.lockedAim = p.aim;
                p.lockedHit = raycastOctagon(p.x, p.y, Math.cos(p.aim), Math.sin(p.aim), eng.currentRadius);
              }
            });
          }
        } else if (eng.state === 'LOCKED_REVEAL') {
          eng.timer -= dt;
          if (eng.timer <= 0) {
            eng.state = 'SIMULTANEOUS_FIRE';
            eng.timer = 1.4;
            soundEngine.playSimultaneousFire();
            eng.redFlash = 0.8;
            eng.screenShake = 24;
            setPhaseState('SIMULTANEOUS_FIRE');

            const alive = eng.players.filter((p) => p.alive);
            eng.beams = [];

            alive.forEach((shooter) => {
              const muzzleDist = 26;
              const sx = (shooter.lockedX || shooter.x) + Math.cos(shooter.lockedAim || shooter.aim) * muzzleDist;
              const sy = (shooter.lockedY || shooter.y) + Math.sin(shooter.lockedAim || shooter.aim) * muzzleDist;

              eng.beams.push({
                shooterId: shooter.id,
                x1: sx,
                y1: sy,
                x2: shooter.lockedHit?.x || shooter.x,
                y2: shooter.lockedHit?.y || shooter.y,
                color: shooter.color,
              });
            });

            // Spawn moving kinetic plasma bullets along laser paths
            spawnBullets(eng.beams);

            alive.forEach((victim) => {
              let hit = false;
              let killer: PlayerState | undefined;

              for (const beam of eng.beams) {
                if (beam.shooterId === victim.id) continue;
                const dist = distancePointToSegment(
                  victim.lockedX || victim.x,
                  victim.lockedY || victim.y,
                  beam.x1,
                  beam.y1,
                  beam.x2,
                  beam.y2
                );
                if (dist <= PLAYER_HIT_RADIUS + 8.0) {
                  hit = true;
                  killer = eng.players.find((p) => p.id === beam.shooterId);
                  break;
                }
              }

              if (hit) {
                victim.alive = false;
                soundEngine.playElimination();
                addKillMessage(killer ? killer.name : 'Laser', victim.name, killer ? killer.color : '#fff');
                // Spark shatter explosion at victim
                for (let k = 0; k < 28; k++) {
                  const a = Math.random() * Math.PI * 2;
                  const spd = 60 + Math.random() * 240;
                  eng.particles.push({
                    x: victim.lockedX || victim.x,
                    y: victim.lockedY || victim.y,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    color: victim.color,
                    size: 3 + Math.random() * 3.5,
                    life: 0.65,
                    maxLife: 0.65,
                  });
                }
              }
            });
          }
        } else if (eng.state === 'SIMULTANEOUS_FIRE') {
          eng.timer -= dt;
          if (eng.timer <= 0) {
            const alive = eng.players.filter((p) => p.alive);
            if (alive.length <= 1) {
              eng.state = 'GAME_OVER';
              eng.timer = 6.5;
              const winnerPlayer = alive[0] || null;
              const win = winnerPlayer ? winnerPlayer.name : 'MUTUAL DRAW';
              if (winnerPlayer) winnerPlayer.wins++;
              eng.winner = win;
              setPhaseState('GAME_OVER');
              setWinnerData({
                name: win,
                color: winnerPlayer ? winnerPlayer.color : '#ffd700',
                avatarIndex: winnerPlayer ? (winnerPlayer.avatarIndex ?? 0) : 0,
                isDraw: !winnerPlayer,
                totalRounds: eng.round,
                survivorsCount: alive.length,
              });
              soundEngine.playVictory();
            } else {
              eng.state = 'ZONE_SHRINK';
              eng.timer = 2.4;
              eng.round++;
              if (eng.stageIndex < ARENA_STAGES.length - 1) eng.stageIndex++;
              eng.targetRadius = ARENA_STAGES[eng.stageIndex];
              setPhaseState('ZONE_SHRINK');
              soundEngine.playZoneShrink();
            }
          }
        } else if (eng.state === 'ZONE_SHRINK') {
          eng.timer -= dt;
          const progress = 1.0 - Math.max(0, eng.timer / 2.4);
          const startR = ARENA_STAGES[Math.max(0, eng.stageIndex - 1)];
          eng.currentRadius = startR + (eng.targetRadius - startR) * progress;

          eng.players.forEach((p) => {
            if (p.alive) {
              const pos = { x: p.x, y: p.y };
              constrainToOctagon(pos, eng.currentRadius, PLAYER_HIT_RADIUS);
              p.x = pos.x;
              p.y = pos.y;
            }
          });

          if (eng.timer <= 0) {
            eng.currentRadius = eng.targetRadius;
            eng.state = 'BLIND_POSITIONING';
            eng.timer = 10.0;
            eng.beams = [];
            eng.bullets = [];
            setWinnerData(null);
            eng.players.forEach((p) => {
              p.lockedHit = undefined;
              p.lockedX = undefined;
              p.lockedY = undefined;
              p.lockedAim = undefined;
            });
            setPhaseState('BLIND_POSITIONING');
            soundEngine.playZoneShrink();
          }
        } else if (eng.state === 'GAME_OVER') {
          eng.timer -= dt;
          if (eng.timer <= 0) {
            setWinnerData(null);
            initBotMatch();
          }
        }

        setPlayersList([...eng.players]);
      } else {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'input',
              dx: Number(inputRef.current.moveX.toFixed(2)),
              dy: Number(inputRef.current.moveY.toFixed(2)),
              aim: Number(inputRef.current.aimAngle.toFixed(3)),
            })
          );
        }
      }

      // Update moving kinetic plasma bullets along laser paths
      for (let i = 0; i < engineRef.current.bullets.length; i++) {
        const b = engineRef.current.bullets[i];
        if (b.delay > 0) {
          b.delay -= dt;
          continue;
        }
        if (b.progress < 1.0) {
          b.progress = Math.min(1.0, b.progress + b.speed * dt);
          const bx = b.x1 + (b.x2 - b.x1) * b.progress;
          const by = b.y1 + (b.y2 - b.y1) * b.progress;

          // Trail sparks along the laser line
          if (Math.random() < 0.6) {
            const spd = 40 + Math.random() * 60;
            const a = b.angle + Math.PI + (Math.random() - 0.5) * 0.5;
            engineRef.current.particles.push({
              x: bx,
              y: by,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              color: b.color,
              size: 2.2 + Math.random() * 2,
              life: 0.16,
              maxLife: 0.16,
            });
          }

          if (b.progress >= 1.0 && !b.hasImpacted) {
            b.hasImpacted = true;
            // Spark impact explosion at target
            for (let k = 0; k < 14; k++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 60 + Math.random() * 180;
              engineRef.current.particles.push({
                x: b.x2,
                y: b.y2,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                color: b.color,
                size: 2.5 + Math.random() * 2.5,
                life: 0.35,
                maxLife: 0.35,
              });
            }
          }
        }
      }

      // Update particles
      for (let i = engineRef.current.particles.length - 1; i >= 0; i--) {
        const p = engineRef.current.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          engineRef.current.particles.splice(i, 1);
        }
      }

      // 3. Clear canvas & Screen Shake
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, width, height);

      if (engineRef.current.redFlash > 0) {
        ctx.fillStyle = `rgba(239, 35, 60, ${engineRef.current.redFlash * 0.45})`;
        ctx.fillRect(0, 0, width, height);
        engineRef.current.redFlash = Math.max(0, engineRef.current.redFlash - dt * 2.0);
      }

      ctx.save();
      const shake = engineRef.current.screenShake;
      const shakeX = (Math.random() - 0.5) * shake;
      const shakeY = (Math.random() - 0.5) * shake;
      engineRef.current.screenShake = Math.max(0, shake - dt * 28);

      ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
      ctx.scale(scale, scale);

      const activeRadius = playModeRef.current === 'bots' ? engineRef.current.currentRadius : BASE_RADIUS;
      const currentPhase = playModeRef.current === 'bots' ? engineRef.current.state : phaseState;
      const currentPlayers = playModeRef.current === 'bots' ? engineRef.current.players : playersList;

      // 1. Surrounding Industrial Environment (Crates & Wall Lights)
      const cratePositions = [
        { x: -520, y: -340, w: 90, h: 70 },
        { x: 450, y: -330, w: 85, h: 65 },
        { x: 460, y: 260, w: 95, h: 75 },
        { x: -540, y: 270, w: 90, h: 70 },
      ];

      cratePositions.forEach((c) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(c.x + 8, c.y + 10, c.w, c.h);
        ctx.fillStyle = '#1e2430';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        // Hazard stripes
        ctx.save();
        ctx.beginPath();
        ctx.rect(c.x + 8, c.y + 8, c.w - 16, c.h - 16);
        ctx.clip();
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(c.x + 8, c.y + 8, c.w - 16, c.h - 16);
        ctx.fillStyle = '#0f172a';
        for (let i = -100; i < 200; i += 22) {
          ctx.beginPath();
          ctx.moveTo(c.x + i, c.y);
          ctx.lineTo(c.x + i + 14, c.y);
          ctx.lineTo(c.x + i - 14, c.y + c.h);
          ctx.lineTo(c.x + i - 28, c.y + c.h);
          ctx.fill();
        }
        ctx.restore();
      });

      // Industrial Wall Lamps (Inverted T)
      const lampPositions = [{ x: -280, y: -450 }, { x: 280, y: -450 }];
      lampPositions.forEach((l) => {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.fillRect(-18, -6, 36, 5);
        ctx.fillRect(-3, -6, 6, 20);
        ctx.restore();
      });

      // 2. Realistic Concrete Arena Floor & Concentric Hexagons
      const octPts = getOctagonVertices(BASE_RADIUS);
      ctx.beginPath();
      octPts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = '#1a1e27';
      ctx.fill();

      if (activeRadius < BASE_RADIUS) {
        ctx.fillStyle = 'rgba(239, 35, 60, 0.08)';
        ctx.fill();
      }

      // Middle Hexagon
      const hexRad1 = activeRadius * 0.65;
      const hexRad2 = activeRadius * 0.32;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = hexRad1 * Math.cos(a);
        const hy = hexRad1 * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center Hexagon Core
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = hexRad2 * Math.cos(a);
        const hy = hexRad2 * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Octagonal Cage Fence & Glowing Red LED Light Bars
      const vertices = getOctagonVertices(activeRadius);
      ctx.beginPath();
      vertices.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.strokeStyle = '#0b0f17';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % 8];
        const midX = (v1.x + v2.x) / 2;
        const midY = (v1.y + v2.y) / 2;
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const len = Math.hypot(dx, dy);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(midX - (dx / len) * 32, midY - (dy / len) * 32);
        ctx.lineTo(midX + (dx / len) * 32, midY + (dy / len) * 32);
        ctx.strokeStyle = '#ef233c';
        ctx.shadowColor = '#ef233c';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(v1.x, v1.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(v1.x, v1.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef233c';
        ctx.shadowColor = '#ef233c';
        ctx.shadowBlur = 12;
        ctx.fill();
      }

      // 4. Laser Sight Lines
      const isBlind = currentPhase === 'BLIND_POSITIONING';
      const isLocked = currentPhase === 'LOCKED_REVEAL';

      currentPlayers.forEach((p) => {
        if (!p.alive) return;
        if (isBlind && p.id !== localPlayerIdRef.current) return;

        const posX = isLocked ? p.lockedX || p.x : p.x;
        const posY = isLocked ? p.lockedY || p.y : p.y;
        const aim = isLocked ? (p.lockedAim !== undefined ? p.lockedAim : p.aim) : p.aim;

        const muzzleDist = 26;
        const sx = posX + Math.cos(aim) * muzzleDist;
        const sy = posY + Math.sin(aim) * muzzleDist;

        const hit = (isLocked && p.lockedHit) ? p.lockedHit : raycastOctagon(sx, sy, Math.cos(aim), Math.sin(aim), activeRadius);
        const color = p.color || '#1e88e5';

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(hit.x, hit.y);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isLocked ? 24 : 14;
        ctx.lineWidth = isLocked ? 5.5 : 3;
        ctx.globalAlpha = isLocked ? 0.95 : 0.85;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(hit.x, hit.y);
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.lineWidth = isLocked ? 2 : 1.2;
        ctx.globalAlpha = 0.95;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(hit.x, hit.y, isLocked ? 7 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fill();
      });

      // 5. Simultaneous Beams
      const beams = engineRef.current.beams;
      if (beams.length > 0) {
        beams.forEach((beam) => {
          ctx.beginPath();
          ctx.moveTo(beam.x1, beam.y1);
          ctx.lineTo(beam.x2, beam.y2);
          ctx.strokeStyle = beam.color || '#ef233c';
          ctx.shadowColor = beam.color || '#ef233c';
          ctx.shadowBlur = 32;
          ctx.lineWidth = 10;
          ctx.globalAlpha = 0.95;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(beam.x1, beam.y1);
          ctx.lineTo(beam.x2, beam.y2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.globalAlpha = 1.0;
          ctx.stroke();
        });
      }

      // 5b. Moving Bullets along Laser Paths
      engineRef.current.bullets.forEach((b) => {
        if (b.delay > 0 || b.progress >= 1.0) return;

        const bx = b.x1 + (b.x2 - b.x1) * b.progress;
        const by = b.y1 + (b.y2 - b.y1) * b.progress;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(b.angle);

        // Radiant trailing energy streak
        const grad = ctx.createLinearGradient(-38, 0, 8, 0);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.35, b.color);
        grad.addColorStop(1, '#ffffff');

        ctx.beginPath();
        ctx.moveTo(-38, 0);
        ctx.lineTo(12, 0);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 5;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 20;
        ctx.stroke();

        // High-energy plasma bullet head (capsule)
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Superheated white-hot core
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(2, 0, 9, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kinetic muzzle-forward glow tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 6. Realistic Tactical Combat Mechs / Turrets
      currentPlayers.forEach((p) => {
        if (!p.alive) {
          ctx.save();
          ctx.translate(p.lockedX || p.x, p.lockedY || p.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-10, -10);
          ctx.lineTo(10, 10);
          ctx.moveTo(10, -10);
          ctx.lineTo(-10, 10);
          ctx.stroke();
          ctx.restore();
          return;
        }

        if (isBlind && p.id !== localPlayerIdRef.current) return;

        const px = isLocked ? (p.lockedX !== undefined ? p.lockedX : p.x) : p.x;
        const py = isLocked ? (p.lockedY !== undefined ? p.lockedY : p.y) : p.y;
        const aim = isLocked ? (p.lockedAim !== undefined ? p.lockedAim : p.aim) : p.aim;

        ctx.save();
        ctx.translate(px, py);

        // 1. Drop shadow onto concrete floor
        ctx.beginPath();
        ctx.ellipse(0, 8, 28, 20, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fill();

        // 2. Glowing Team Energy Ring at feet (Matches avatar ring from reference screenshot)
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isLocked ? 20 : 12;
        ctx.lineWidth = isLocked ? 3.5 : 2.5;
        ctx.stroke();

        // 3. 3D Character Avatar cropped from sprite sheet (4 Quadrants: 0=Blue, 1=Red, 2=Green, 3=Yellow)
        const quadIdx = (p.avatarIndex !== undefined ? p.avatarIndex : p.slot) % 4;
        const qcx = quadIdx % 2 === 0 ? 384 : 1152;
        const qcy = quadIdx < 2 ? 256 : 768;
        const cropBox = 320;
        const renderSize = 58;

        const sprite = avatarSpriteRef.current;
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          ctx.save();
          // The rifle's native direction in the sprite is ~62 degrees (1.08 radians)
          ctx.rotate(aim - 1.08);

          // Circular clip to smoothly blend 3D character into the dark concrete arena floor
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.clip();

          ctx.drawImage(
            sprite,
            qcx - cropBox / 2,
            qcy - cropBox / 2,
            cropBox,
            cropBox,
            -renderSize / 2,
            -renderSize / 2,
            renderSize,
            renderSize
          );
          ctx.restore();
        } else {
          // Tactical combat fallback
          ctx.save();
          ctx.rotate(aim);
          ctx.beginPath();
          ctx.roundRect(-16, -16, 32, 32, 6);
          ctx.fillStyle = '#0f1420';
          ctx.fill();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }

        // 4. Floating colored Directional Chevron (Arrow pointing along aim)
        ctx.save();
        ctx.rotate(aim);
        ctx.beginPath();
        ctx.moveTo(35, 0);
        ctx.lineTo(24, -6.5);
        ctx.lineTo(24, 6.5);
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // 5. Tactical Name Tag
        ctx.save();
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tag = p.id === localPlayerIdRef.current ? 'YOU' : `P${p.slot + 1}`;
        const tagW = ctx.measureText(tag).width + 8;
        ctx.fillStyle = 'rgba(8, 14, 24, 0.85)';
        ctx.beginPath();
        ctx.roundRect(-tagW / 2, -38, tagW, 14, 4);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(tag, 0, -31);
        ctx.restore();

        ctx.restore();
      });

      // 7. Dynamic Sparks and Particle Effects
      engineRef.current.particles.forEach((p) => {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [playersList, phaseState, initBotMatch, addKillMessage]);

  const toggleSound = () => {
    soundEngine.init();
    soundEngine.muted = !soundEngine.muted;
    setIsMuted(soundEngine.muted);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const secVal = Math.max(0, Math.ceil(countdownTimer));
  const formattedTimer = `00:${secVal < 10 ? '0' : ''}${secVal}`;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#080a0f] text-slate-100 select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Dynamic Left Virtual Joystick (Mobile) */}
      {leftStick.active && (
        <>
          <div
            className="absolute rounded-full border-2 border-cyan-400/40 bg-cyan-950/30 shadow-[0_0_20px_rgba(0,240,255,0.2)] pointer-events-none z-10 -ml-[55px] -mt-[55px]"
            style={{ width: 110, height: 110, left: leftStick.x, top: leftStick.y }}
          />
          <div
            className="absolute rounded-full border-2 border-white bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_15px_#00f0ff] pointer-events-none z-20 -ml-[24px] -mt-[24px]"
            style={{ width: 48, height: 48, left: leftStick.thumbX, top: leftStick.thumbY }}
          />
        </>
      )}

      {/* Dynamic Right Aim Joystick (Mobile) */}
      {rightStick.active && (
        <>
          <div
            className="absolute rounded-full border-2 border-pink-500/40 bg-pink-950/30 shadow-[0_0_20px_rgba(255,0,127,0.25)] pointer-events-none z-10 -ml-[55px] -mt-[55px]"
            style={{ width: 110, height: 110, left: rightStick.x, top: rightStick.y }}
          />
          <div
            className="absolute rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-rose-600 shadow-[0_0_18px_#ff007f] pointer-events-none z-20 -ml-[24px] -mt-[24px]"
            style={{ width: 48, height: 48, left: rightStick.thumbX, top: rightStick.thumbY }}
          />
        </>
      )}

      {/* Realistic Reference UI HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-5">
        {/* Top Header Row */}
        <div className="flex justify-between items-start w-full">
          {/* Top Left Logo (Matching Reference UI) */}
          <div className="flex flex-col relative pointer-events-auto cursor-pointer" onClick={() => setShowSettings(true)}>
            <div className="text-xl sm:text-2xl font-black italic tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
              LASER CAGE
            </div>
            <div className="text-lg sm:text-xl font-black italic tracking-widest text-[#ef233c] drop-shadow-[0_0_15px_rgba(239,35,60,0.8)] leading-none mt-0.5">
              STANDOFF
            </div>
          </div>

          {/* Top Center Timer Capsule (Matching Reference UI with 10s window) */}
          <div className="flex flex-col items-center bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-cyan-400 px-6 sm:px-9 py-1.5 shadow-[0_0_20px_rgba(0,240,255,0.35)] [clip-path:polygon(14%_0%,86%_0%,100%_100%,0%_100%)] min-w-[190px]">
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
              {phaseState === 'BLIND_POSITIONING' ? 'POSITION YOURSELF' : phaseState === 'LOCKED_REVEAL' ? 'POSITIONS LOCKED' : phaseState === 'SIMULTANEOUS_FIRE' ? 'ALL LASERS FIRED' : phaseState === 'ZONE_SHRINK' ? 'ZONE SHRINKING' : 'WINNER ANNOUNCED!'}
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider drop-shadow-[0_0_12px_rgba(0,240,255,0.6)] leading-none">
              {phaseState === 'BLIND_POSITIONING' ? formattedTimer : phaseState === 'LOCKED_REVEAL' ? 'LOCKED!' : phaseState === 'SIMULTANEOUS_FIRE' ? 'FIRE!' : phaseState === 'ZONE_SHRINK' ? 'SHRINK' : 'VICTORY!'}
            </div>
          </div>

          {/* Top Right Player Roster Card (Supports up to 10 players gracefully) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/25 rounded-xl px-3 py-1.5 grid grid-cols-2 gap-x-3 gap-y-1 max-w-[280px] max-h-[175px] overflow-y-auto shadow-lg text-[11px]">
              {playersList.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 font-bold truncate" style={{ opacity: p.alive ? 1 : 0.35 }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                  <span className={`truncate ${p.alive ? 'text-white' : 'text-slate-500'}`}>{p.name}</span>
                  <span
                    className="ml-auto w-4 h-1 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: p.alive ? p.color : 'rgba(255,255,255,0.1)', boxShadow: p.alive ? `0 0 5px ${p.color}` : 'none' }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={toggleSound}
              className="p-2 bg-slate-900/85 hover:bg-slate-800 border border-white/15 rounded-xl text-slate-200 text-xs backdrop-blur-md transition-all active:scale-95"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>

        {/* Left Side Tactical Info Card (Matching Reference UI) */}
        <div className="hidden md:flex flex-col gap-2.5 max-w-[210px] pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Players</span>
              <span className="text-sm font-black font-mono text-white">
                {playersList.filter((p) => p.alive).length} / {initialPlayerCount || playersList.length}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-sky-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Next Round In</span>
              <span className="text-sm font-black font-mono text-white">{formattedTimer}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col gap-2 text-xs text-slate-300">
            <div className="flex items-start gap-2 text-[11px] leading-tight">
              <span className="w-4 h-4 rounded-full bg-white/15 text-[9px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span>Position your character in the arena</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] leading-tight">
              <span className="w-4 h-4 rounded-full bg-white/15 text-[9px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span>Lasers will be locked after 10 seconds</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] leading-tight">
              <span className="w-4 h-4 rounded-full bg-white/15 text-[9px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span>Shots will be fired!</span>
            </div>
          </div>

          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2.5 flex items-center gap-2 text-[11px] font-bold text-rose-300">
            <CrosshairIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Aim with your laser. Shoot to eliminate!</span>
          </div>
        </div>

        {/* Kill Feed */}
        <div className="absolute top-20 right-4 sm:right-6 flex flex-col gap-1 items-end pointer-events-none">
          {killFeed.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded border-l-4 text-xs font-bold text-slate-200 shadow-md animate-fade-in"
              style={{ borderLeftColor: item.color }}
            >
              <span className="text-white">{item.killer}</span>
              <span className="text-rose-400 mx-1.5">⚡</span>
              <span className="text-slate-300">{item.victim}</span>
            </div>
          ))}
        </div>

        {/* Bottom Row (Controls on Left, Last Player Standing Banner on Right) */}
        <div className="flex justify-between items-end w-full">
          {/* Bottom Left Controls Bar (Matching Reference UI) */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3.5 text-xs font-bold text-slate-400 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aim</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              <span>Shoot</span>
            </div>
            <button onClick={() => initBotMatch()} className="flex items-center gap-1.5 hover:text-white transition-all cursor-pointer">
              <span className="bg-white/15 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">R</span>
              <span>Reset Position</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer">
              <Settings className="w-3.5 h-3.5" />
              <span>Lobby</span>
            </button>
          </div>

          {/* Bottom Right Victory Championship Banner (Matching Reference UI) */}
          <div className="bg-gradient-to-br from-amber-950/90 to-yellow-950/95 border border-amber-500 [clip-path:polygon(10%_0%,100%_0%,90%_100%,0%_100%)] px-6 sm:px-8 py-2 flex flex-col items-center text-center shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <Crown className="w-4 h-4 text-amber-400 mb-0.5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">LAST PLAYER STANDING</span>
            <span className="text-xl sm:text-2xl font-black uppercase text-amber-400 tracking-wider drop-shadow-[0_0_12px_rgba(250,204,21,0.8)] leading-none">
              WINS!
            </span>
          </div>
        </div>
      </div>

      {/* Winner Announcement Overlay Modal */}
      {winnerData && phaseState === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400/70 rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(255,183,3,0.4)] flex flex-col items-center text-center overflow-hidden">
            {/* Ambient Gold Glow Behind Crown */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Winner Crown / Icon */}
            <div className="relative mb-3 flex items-center justify-center">
              <div className="p-3 bg-amber-500/20 border border-amber-400/50 rounded-full shadow-[0_0_25px_rgba(255,183,3,0.5)]">
                <Crown className="w-10 h-10 text-amber-400 animate-bounce" />
              </div>
            </div>

            {/* Headline */}
            <div className="text-[11px] font-black tracking-widest uppercase text-amber-400 drop-shadow-[0_0_10px_rgba(255,183,3,0.8)]">
              {winnerData.isDraw ? 'MUTUAL CROSSFIRE' : 'STANDOFF CHAMPION'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-wide text-white mt-1 drop-shadow-md">
              {winnerData.isDraw ? 'NO SURVIVORS' : winnerData.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {winnerData.isDraw
                ? 'All final combatants eliminated simultaneously in the laser standoff!'
                : 'Outlasted all opponents in the shrinking octagonal cage!'}
            </p>

            {/* Winner Spotlight Avatar with Team Color Aura */}
            {!winnerData.isDraw && (
              <div className="my-5 relative flex flex-col items-center">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center border-3 relative overflow-hidden bg-slate-900 shadow-2xl"
                  style={{
                    borderColor: winnerData.color,
                    boxShadow: `0 0 30px ${winnerData.color}`,
                  }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      backgroundImage: 'url(/assets/aistudio/image_b426ad66.png)',
                      backgroundSize: '200% 200%',
                      backgroundPosition: `${(winnerData.avatarIndex % 2) * 100}% ${Math.floor(winnerData.avatarIndex / 2) * 100}%`,
                    }}
                  />
                </div>
                <div
                  className="mt-2 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider text-black font-mono shadow-md"
                  style={{ backgroundColor: winnerData.color }}
                >
                  Victory Confirmed
                </div>
              </div>
            )}

            {/* Match Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 w-full my-4">
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-2.5 flex flex-col items-center">
                <span className="text-[10px] text-slate-400 uppercase font-black">Rounds Survived</span>
                <span className="text-lg font-black font-mono text-white mt-0.5">{winnerData.totalRounds}</span>
              </div>
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-2.5 flex flex-col items-center">
                <span className="text-[10px] text-slate-400 uppercase font-black">Total Contenders</span>
                <span className="text-lg font-black font-mono text-cyan-400 mt-0.5">{initialPlayerCount}</span>
              </div>
            </div>

            {/* Next Match Timer & Restart Button */}
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  setWinnerData(null);
                  initBotMatch();
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(255,183,3,0.5)] transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-slate-950" />
                <span>Start Next Standoff Now</span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono">
                Auto-starting next standoff in {Math.max(1, Math.ceil(countdownTimer))}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)] flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-cyan-300">
                  Laser Cage Standoff • 10-Second Standoff
                </h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('play')}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
                  activeTab === 'play' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Match Mode
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'guide' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Wi-Fi Guide
              </button>
              <button
                onClick={() => setActiveTab('download')}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'download' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Download Files
              </button>
            </div>

            {activeTab === 'play' && (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-xs text-slate-300 leading-relaxed space-y-1">
                  <div className="font-bold text-cyan-300 uppercase">10-Second Standoff Rules:</div>
                  <div>1. <strong>10s Positioning:</strong> Players cannot see each other while choosing a spot and aim angle.</div>
                  <div>2. <strong>Lock &amp; Reveal:</strong> Positions and laser lines freeze and become visible to all.</div>
                  <div>3. <strong>Simultaneous Fire:</strong> Shots blast along locked paths; intersecting players are eliminated!</div>
                  <div>4. <strong>Shrinking Zone:</strong> Arena contracts for survivors until 1 winner stands!</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPlayMode('bots')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      playMode === 'bots'
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-md'
                        : 'border-white/10 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-black uppercase">Solo vs AI Bots</div>
                    <div className="text-[11px] text-slate-400 mt-1">Practice with up to 9 tactical bots (10 players max).</div>
                  </button>

                  <button
                    onClick={() => setPlayMode('multiplayer')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      playMode === 'multiplayer'
                        ? 'border-pink-500 bg-pink-950/40 text-pink-200 shadow-md'
                        : 'border-white/10 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-black uppercase">FastAPI Multiplayer</div>
                    <div className="text-[11px] text-slate-400 mt-1">Authoritative 60 TPS up to 10 players.</div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pilot Name</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                      maxLength={14}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Standoff Players</label>
                    <select
                      value={matchPlayerCount}
                      onChange={(e) => {
                        const count = Number(e.target.value);
                        setMatchPlayerCount(count);
                        initBotMatch(count);
                      }}
                      className="bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                    >
                      <option value={10}>10 Players (Full Standoff - Supported Max)</option>
                      <option value={8}>8 Players</option>
                      <option value={6}>6 Players</option>
                      <option value={4}>4 Players</option>
                    </select>
                  </div>
                </div>

                {playMode === 'multiplayer' && (
                  <div className="flex flex-col gap-3 p-3 bg-slate-950 rounded-xl border border-white/10">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Server Host</label>
                      <input
                        type="text"
                        value={serverHost}
                        onChange={(e) => setServerHost(e.target.value)}
                        className="bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                        placeholder="localhost:8000"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Room Code</label>
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        className="bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-pink-400 font-mono font-bold uppercase focus:outline-none focus:border-pink-500"
                        placeholder="CAGE"
                        maxLength={6}
                      />
                    </div>

                    <button
                      onClick={connectMultiplayer}
                      className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-98"
                    >
                      Connect to Python Room
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      if (playMode === 'bots') initBotMatch();
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-98"
                  >
                    Deploy to Standoff
                  </button>
                  <button
                    onClick={() => initBotMatch()}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl border border-white/10 flex items-center gap-1.5"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="flex flex-col gap-3 text-xs text-slate-300">
                <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/20 space-y-2">
                  <div className="font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    Local Wi-Fi Cross-Device Setup
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Play between your phone and PC over local Wi-Fi with synchronized 60 TPS authoritative 10-second blind rounds.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-slate-800/40 rounded-xl border border-white/10">
                    <div className="font-bold text-white mb-1">1. Run Server</div>
                    <div className="font-mono text-[11px] bg-black/60 p-2 rounded text-emerald-400">
                      python server.py
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-800/40 rounded-xl border border-white/10">
                    <div className="font-bold text-white mb-1">2. Open on Smartphone</div>
                    <div className="text-[11px] text-slate-300 mb-1">Open your phone browser and go to:</div>
                    <div className="font-mono text-xs bg-black/70 p-2 rounded text-cyan-300 font-bold">
                      http://&lt;YOUR_PC_IP&gt;:8000
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'download' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-white/10">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setDownloadTarget('server')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        downloadTarget === 'server' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      server.py
                    </button>
                    <button
                      onClick={() => setDownloadTarget('html')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        downloadTarget === 'html' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      index.html (Single File)
                    </button>
                  </div>
                  <a
                    href="/standalone_game.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 rounded-lg text-slate-200"
                  >
                    Direct Preview
                  </a>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const res = await fetch(downloadTarget === 'server' ? '/server.py' : '/standalone_game.html');
                      const text = await res.text();
                      downloadFile(
                        downloadTarget === 'server' ? 'server.py' : 'index.html',
                        text,
                        downloadTarget === 'server' ? 'text/x-python' : 'text/html'
                      );
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Download {downloadTarget === 'server' ? 'server.py' : 'index.html'}
                  </button>

                  <button
                    onClick={async () => {
                      const res = await fetch(downloadTarget === 'server' ? '/server.py' : '/standalone_game.html');
                      const text = await res.text();
                      copyToClipboard(text, downloadTarget);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-500/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {copiedText === downloadTarget ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedText === downloadTarget ? 'Copied!' : `Copy ${downloadTarget === 'server' ? 'server.py' : 'index.html'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
