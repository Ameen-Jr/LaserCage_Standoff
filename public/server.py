#!/usr/bin/env python3
"""
Laser Cage Standoff - Authoritative Real-Time Multiplayer Server
Gameplay Mechanics:
  1. Blind Positioning (5 Seconds): Players position themselves and aim in secret (opponents hidden).
  2. Lock & Reveal: Positions and laser paths are frozen and revealed to all players.
  3. Simultaneous Fire: Shots blast along locked laser paths; intersecting players are eliminated!
  4. Shrinking Arena: Active cage shrinks inwards for the survivors; cycle repeats until 1 winner stands!
"""

import asyncio
import json
import math
import os
import random
import string
import time
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Laser Cage Standoff Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- CONSTANTS & CONFIG -----------------
TICK_RATE = 60
TICK_DELTA = 1.0 / TICK_RATE

# Concentric Arena Stage Radii (like Battle Royale zone shrinking)
ARENA_STAGES = [460.0, 340.0, 230.0, 150.0]
BASE_ARENA_RADIUS = ARENA_STAGES[0]

PLAYER_SPEED = 280.0
PLAYER_RADIUS = 22.0
MAX_PLAYERS_PER_ROOM = 10

# Timing
POSITIONING_DURATION = 10.0  # 10-second blind window (requested by user)
LOCK_REVEAL_DURATION = 1.8   # Positions & laser paths locked and revealed
FIRE_DURATION = 1.4          # Simultaneous blast and elimination FX
SHRINK_DURATION = 2.4        # Arena shrinks to next ring
GAME_OVER_DURATION = 5.0     # Victory screen before next standoff

# 12 Guaranteed Distinct, High-Contrast Neon Laser Colors (no duplicates)
UNIQUE_COLORS = [
    "#00f0ff",  # 0: Neon Cyan / Electric Blue (Player 1)
    "#00ff66",  # 1: Laser Green (Player 2)
    "#ff003c",  # 2: Crimson Laser Red (Player 3)
    "#ffd000",  # 3: Cyber Gold / Amber (Player 4)
    "#9d4edd",  # 4: Electric Violet (Player 5)
    "#ff6200",  # 5: Solar Blaze Orange (Player 6)
    "#ff0099",  # 6: Hot Magenta Pink (Player 7)
    "#3a86ff",  # 7: Deep Cobalt Sapphire (Player 8)
    "#b4ff00",  # 8: Acid Volt Lime (Player 9)
    "#00f5d4",  # 9: Aquamarine Turquoise (Player 10)
    "#ffffff",  # 10: Platinum Ice
    "#e0aaff",  # 11: Electric Lilac
]

PLAYER_PRESETS = [
    {"color": "#00f0ff", "shape": "avatar", "name": "Player 1", "avatarIndex": 0},
    {"color": "#00ff66", "shape": "avatar", "name": "Player 2", "avatarIndex": 2},
    {"color": "#ff003c", "shape": "avatar", "name": "Player 3", "avatarIndex": 1},
    {"color": "#ffd000", "shape": "avatar", "name": "Player 4", "avatarIndex": 3},
    {"color": "#9d4edd", "shape": "avatar", "name": "Player 5", "avatarIndex": 0},
    {"color": "#ff6200", "shape": "avatar", "name": "Player 6", "avatarIndex": 3},
    {"color": "#ff0099", "shape": "avatar", "name": "Player 7", "avatarIndex": 1},
    {"color": "#3a86ff", "shape": "avatar", "name": "Player 8", "avatarIndex": 0},
    {"color": "#b4ff00", "shape": "avatar", "name": "Player 9", "avatarIndex": 2},
    {"color": "#00f5d4", "shape": "avatar", "name": "Player 10", "avatarIndex": 3},
]

def generate_octagon(radius: float) -> List[tuple]:
    vertices = []
    for i in range(8):
        angle = (math.pi / 8.0) + (i * math.pi / 4.0)
        vertices.append((
            radius * math.cos(angle),
            radius * math.sin(angle)
        ))
    return vertices

def line_intersection(p1, p2, p3, p4):
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    x4, y4 = p4
    denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
    if abs(denom) < 1e-6:
        return None
    ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
    ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom
    if 0.0 <= ua <= 1.0 and 0.0 <= ub <= 1.0:
        return (x1 + ua * (x2 - x1), y1 + ua * (y2 - y1), ua)
    return None

def raycast_octagon(start_x: float, start_y: float, dir_x: float, dir_y: float, radius: float):
    """Raycast from player position to the current octagonal boundary wall."""
    max_dist = radius * 2.5
    end_x = start_x + dir_x * max_dist
    end_y = start_y + dir_y * max_dist
    vertices = generate_octagon(radius)
    closest_dist = max_dist
    hit_x = end_x
    hit_y = end_y

    for i in range(8):
        v1 = vertices[i]
        v2 = vertices[(i + 1) % 8]
        hit = line_intersection((start_x, start_y), (end_x, end_y), v1, v2)
        if hit:
            ix, iy, frac = hit
            d = frac * max_dist
            if d < closest_dist:
                closest_dist = d
                hit_x = ix
                hit_y = iy

    return {"x": round(hit_x, 1), "y": round(hit_y, 1), "distance": round(closest_dist, 1)}

def constrain_to_octagon(x: float, y: float, radius: float, player_r: float = PLAYER_RADIUS):
    vertices = generate_octagon(radius)
    for i in range(8):
        v1 = vertices[i]
        v2 = vertices[(i + 1) % 8]
        edge_x = v2[0] - v1[0]
        edge_y = v2[1] - v1[1]
        edge_len = math.hypot(edge_x, edge_y)
        nx = -edge_y / edge_len
        ny = edge_x / edge_len
        if (nx * v1[0] + ny * v1[1]) > 0:
            nx = -nx
            ny = -ny
        dist_from_wall = (x - v1[0]) * nx + (y - v1[1]) * ny
        if dist_from_wall < player_r:
            pen = player_r - dist_from_wall
            x += nx * pen
            y += ny * pen
    return x, y

def distance_point_to_segment(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    dx = x2 - x1
    dy = y2 - y1
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq < 1e-6:
        return math.hypot(px - x1, py - y1)
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / seg_len_sq))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)


# ----------------- PLAYER & ROOM MODELS -----------------
class Player:
    def __init__(self, player_id: str, slot_index: int, name: str, color: Optional[str] = None):
        self.id = player_id
        self.slot = slot_index
        preset = PLAYER_PRESETS[slot_index % len(PLAYER_PRESETS)]
        self.avatar_index = preset.get("avatarIndex", slot_index % 4)
        self.color = color if color else preset["color"]
        self.shape = preset["shape"]
        self.name = name or preset["name"]
        self.is_alive = True
        self.wins = 0

        # Spawning coordinates
        spawn_angle = (slot_index * (2 * math.pi / MAX_PLAYERS_PER_ROOM)) + (math.pi / 4.0)
        spawn_dist = BASE_ARENA_RADIUS * 0.65
        self.x = spawn_dist * math.cos(spawn_angle)
        self.y = spawn_dist * math.sin(spawn_angle)
        self.aim_angle = math.atan2(-self.y, -self.x)

        self.input_dx = 0.0
        self.input_dy = 0.0

        # Locked values at end of 5s positioning
        self.locked_x = self.x
        self.locked_y = self.y
        self.locked_aim = self.aim_angle
        self.locked_laser_hit = {"x": 0.0, "y": 0.0}

    def reset_for_match(self, arena_radius: float):
        self.is_alive = True
        spawn_angle = (self.slot * (2 * math.pi / MAX_PLAYERS_PER_ROOM)) + (math.pi / 4.0)
        spawn_dist = arena_radius * 0.65
        self.x = spawn_dist * math.cos(spawn_angle)
        self.y = spawn_dist * math.sin(spawn_angle)
        self.aim_angle = math.atan2(-self.y, -self.x)
        self.locked_x = self.x
        self.locked_y = self.y
        self.locked_aim = self.aim_angle

    def to_dict(self, hide_position: bool = False):
        if hide_position and self.is_alive:
            return {
                "id": self.id,
                "name": self.name,
                "slot": self.slot,
                "avatarIndex": self.avatar_index,
                "color": self.color,
                "shape": self.shape,
                "alive": self.is_alive,
                "wins": self.wins,
                "hidden": True,  # Opponent position hidden during 5s positioning
            }
        return {
            "id": self.id,
            "name": self.name,
            "slot": self.slot,
            "avatarIndex": self.avatar_index,
            "color": self.color,
            "shape": self.shape,
            "x": round(self.x, 1),
            "y": round(self.y, 1),
            "aim": round(self.aim_angle, 3),
            "alive": self.is_alive,
            "wins": self.wins,
            "hidden": False,
            "lockedHit": self.locked_laser_hit,
        }


class GameRoom:
    def __init__(self, code: str):
        self.code = code
        self.players: Dict[str, Player] = {}
        self.sockets: Dict[str, WebSocket] = {}

        # Game Phase Flow
        # "WAITING" -> "BLIND_POSITIONING" -> "LOCKED_REVEAL" -> "SIMULTANEOUS_FIRE" -> "ZONE_SHRINK" -> ... -> "GAME_OVER"
        self.state = "WAITING"
        self.timer = 0.0
        self.round_num = 1
        self.stage_index = 0
        self.current_radius = ARENA_STAGES[0]
        self.target_radius = ARENA_STAGES[0]
        self.winner_id: Optional[str] = None
        self.events: List[dict] = []
        self.last_tick = time.time()
        self.task: Optional[asyncio.Task] = None

    def add_player(self, player_id: str, websocket: WebSocket, name: str) -> Player:
        used_slots = {p.slot for p in self.players.values()}
        used_colors = {p.color for p in self.players.values()}
        slot = 0
        while slot in used_slots:
            slot += 1

        # Guaranteed unique color
        chosen_color = None
        for c in UNIQUE_COLORS:
            if c not in used_colors:
                chosen_color = c
                break
        if not chosen_color:
            chosen_color = UNIQUE_COLORS[slot % len(UNIQUE_COLORS)]

        player = Player(player_id, slot, name, color=chosen_color)
        self.players[player_id] = player
        self.sockets[player_id] = websocket

        if len(self.players) >= 2 and self.state == "WAITING":
            self.start_new_match()

        return player

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]
        if player_id in self.sockets:
            del self.sockets[player_id]

        if len(self.players) < 2 and self.state != "WAITING":
            self.state = "WAITING"
            self.events.append({"type": "waiting_players"})

    def start_new_match(self):
        self.round_num = 1
        self.stage_index = 0
        self.current_radius = ARENA_STAGES[0]
        self.target_radius = ARENA_STAGES[0]
        self.winner_id = None
        self.initial_player_count = len(self.players)
        for p in self.players.values():
            p.reset_for_match(self.current_radius)
        self.start_blind_positioning()

    def start_blind_positioning(self):
        self.state = "BLIND_POSITIONING"
        self.timer = POSITIONING_DURATION
        # Constrain surviving players into current zone radius and clear previous round locked hit
        for p in self.players.values():
            if p.is_alive:
                p.x, p.y = constrain_to_octagon(p.x, p.y, self.current_radius, PLAYER_RADIUS)
                p.locked_laser_hit = None
                p.locked_x = None
                p.locked_y = None
                p.locked_aim = None
        self.events.append({
            "type": "phase_positioning",
            "round": self.round_num,
            "duration": POSITIONING_DURATION,
            "radius": self.current_radius
        })

    def lock_and_reveal(self):
        self.state = "LOCKED_REVEAL"
        self.timer = LOCK_REVEAL_DURATION
        # Snapshot locked positions and raycast hits
        for p in self.players.values():
            if p.is_alive:
                p.locked_x = p.x
                p.locked_y = p.y
                p.locked_aim = p.aim_angle
                dir_x = math.cos(p.aim_angle)
                dir_y = math.sin(p.aim_angle)
                p.locked_laser_hit = raycast_octagon(p.x, p.y, dir_x, dir_y, self.current_radius)

        self.events.append({
            "type": "phase_locked",
            "duration": LOCK_REVEAL_DURATION
        })

    def simultaneous_fire(self):
        self.state = "SIMULTANEOUS_FIRE"
        self.timer = FIRE_DURATION

        alive_players = [p for p in self.players.values() if p.is_alive]
        beams = []
        eliminations = []

        # Collect all active laser paths
        for shooter in alive_players:
            beams.append({
                "shooterId": shooter.id,
                "x1": shooter.locked_x,
                "y1": shooter.locked_y,
                "x2": shooter.locked_laser_hit["x"],
                "y2": shooter.locked_laser_hit["y"],
                "color": shooter.color
            })

        # Test laser intersections on opponents
        for victim in alive_players:
            is_hit = False
            killer_id = None
            killer_color = "#ffffff"

            # 1. Did any opponent's beam intersect victim's locked position?
            for beam in beams:
                if beam["shooterId"] == victim.id:
                    continue
                d = distance_point_to_segment(
                    victim.locked_x, victim.locked_y,
                    beam["x1"], beam["y1"],
                    beam["x2"], beam["y2"]
                )
                if d <= (PLAYER_RADIUS + 8.0):
                    is_hit = True
                    killer_id = beam["shooterId"]
                    killer_color = beam["color"]
                    break

            # 2. Was player standing outside the current arena safe zone?
            dist_to_center = math.hypot(victim.locked_x, victim.locked_y)
            if dist_to_center > (self.current_radius + 5.0):
                is_hit = True
                killer_id = "ZONE"

            if is_hit:
                victim.is_alive = False
                eliminations.append({
                    "victimId": victim.id,
                    "victimName": victim.name,
                    "killerId": killer_id,
                    "x": victim.locked_x,
                    "y": victim.locked_y,
                    "color": killer_color
                })

        self.events.append({
            "type": "simultaneous_fire",
            "beams": beams,
            "eliminations": eliminations
        })

    def check_survivors_and_advance(self):
        alive_players = [p for p in self.players.values() if p.is_alive]

        if len(alive_players) <= 1:
            # Match Concluded!
            self.state = "GAME_OVER"
            self.timer = GAME_OVER_DURATION
            winner = alive_players[0] if alive_players else None
            self.winner_id = winner.id if winner else None
            winner_name = winner.name if winner else "MUTUAL DRAW"
            winner_color = winner.color if winner else "#ffd700"
            winner_avatar = winner.avatar_index if winner else 0
            if winner:
                winner.wins += 1

            self.events.append({
                "type": "game_over",
                "winnerId": self.winner_id,
                "winnerName": winner_name,
                "winnerColor": winner_color,
                "winnerAvatar": winner_avatar,
                "totalRounds": self.round_num
            })
        else:
            # More than 1 player survived -> shrink the zone!
            self.state = "ZONE_SHRINK"
            self.timer = SHRINK_DURATION
            self.round_num += 1
            if self.stage_index < len(ARENA_STAGES) - 1:
                self.stage_index += 1
            self.target_radius = ARENA_STAGES[self.stage_index]
            self.events.append({
                "type": "zone_shrinking",
                "fromRadius": self.current_radius,
                "toRadius": self.target_radius,
                "duration": SHRINK_DURATION
            })

    def tick(self, dt: float):
        # 1. State Machine Updates
        if self.state == "BLIND_POSITIONING":
            self.timer -= dt

            # Handle live movement for alive players
            for p in self.players.values():
                if p.is_alive and (p.input_dx != 0.0 or p.input_dy != 0.0):
                    mag = math.hypot(p.input_dx, p.input_dy)
                    norm_dx = (p.input_dx / mag) if mag > 1.0 else p.input_dx
                    norm_dy = (p.input_dy / mag) if mag > 1.0 else p.input_dy
                    p.x += norm_dx * PLAYER_SPEED * dt
                    p.y += norm_dy * PLAYER_SPEED * dt
                    p.x, p.y = constrain_to_octagon(p.x, p.y, self.current_radius, PLAYER_RADIUS)

            if self.timer <= 0.0:
                self.lock_and_reveal()

        elif self.state == "LOCKED_REVEAL":
            self.timer -= dt
            if self.timer <= 0.0:
                self.simultaneous_fire()

        elif self.state == "SIMULTANEOUS_FIRE":
            self.timer -= dt
            if self.timer <= 0.0:
                self.check_survivors_and_advance()

        elif self.state == "ZONE_SHRINK":
            self.timer -= dt
            # Smoothly interpolate arena radius
            progress = 1.0 - max(0.0, self.timer / SHRINK_DURATION)
            start_r = ARENA_STAGES[max(0, self.stage_index - 1)]
            self.current_radius = start_r + (self.target_radius - start_r) * progress

            if self.timer <= 0.0:
                self.current_radius = self.target_radius
                self.start_blind_positioning()

        elif self.state == "GAME_OVER":
            self.timer -= dt
            if self.timer <= 0.0:
                self.start_new_match()

    def serialize_for_player(self, recipient_player_id: str) -> dict:
        """During BLIND_POSITIONING, opponents' positions and aims are hidden from recipient!"""
        is_blind = (self.state == "BLIND_POSITIONING")
        players_data = []

        for p in self.players.values():
            if is_blind and p.id != recipient_player_id:
                players_data.append(p.to_dict(hide_position=True))
            else:
                players_data.append(p.to_dict(hide_position=False))

        return {
            "t": round(time.time(), 3),
            "state": self.state,
            "timer": round(max(0.0, self.timer), 2),
            "round": self.round_num,
            "arenaRadius": round(self.current_radius, 1),
            "arenaStage": self.stage_index,
            "winnerId": self.winner_id,
            "initialPlayerCount": getattr(self, "initial_player_count", len(self.players)),
            "players": players_data,
            "events": self.events.copy()
        }


rooms: Dict[str, GameRoom] = {}

def get_or_create_room(code: str) -> GameRoom:
    code = code.upper().strip()
    if code not in rooms:
        rooms[code] = GameRoom(code)
    return rooms[code]

async def room_ticker(room: GameRoom):
    while len(room.sockets) > 0:
        now = time.time()
        dt = min(now - room.last_tick, 0.05)
        room.last_tick = now

        room.events.clear()
        room.tick(dt)

        dead_sockets = []
        for pid, ws in list(room.sockets.items()):
            try:
                payload = json.dumps(room.serialize_for_player(pid))
                await ws.send_text(payload)
            except Exception:
                dead_sockets.append(pid)

        for pid in dead_sockets:
            room.remove_player(pid)

        await asyncio.sleep(TICK_DELTA)

    if room.code in rooms and len(room.sockets) == 0:
        del rooms[room.code]


# ----------------- HTTP & WEBSOCKET ROUTES -----------------
@app.get("/api/health")
def health():
    return {"status": "ok", "rooms": len(rooms), "tickRate": TICK_RATE}

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, name: str = "Player"):
    await websocket.accept()
    room = get_or_create_room(room_code)

    if len(room.players) >= MAX_PLAYERS_PER_ROOM:
        await websocket.send_text(json.dumps({"type": "error", "message": "Room is full (max 4 players)"}))
        await websocket.close()
        return

    player_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    player = room.add_player(player_id, websocket, name)

    init_payload = {
        "type": "init",
        "playerId": player_id,
        "room": room.code,
        "slot": player.slot,
        "baseRadius": BASE_ARENA_RADIUS,
        "arenaStages": ARENA_STAGES,
    }
    await websocket.send_text(json.dumps(init_payload))

    if room.task is None or room.task.done():
        room.task = asyncio.create_task(room_ticker(room))

    try:
        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            msg_type = data.get("type")

            if msg_type == "input" and room.state == "BLIND_POSITIONING":
                player.input_dx = float(data.get("dx", 0.0))
                player.input_dy = float(data.get("dy", 0.0))
                if "aim" in data:
                    player.aim_angle = float(data["aim"])
                elif "aim_x" in data and "aim_y" in data:
                    ax = float(data["aim_x"])
                    ay = float(data["aim_y"])
                    if math.hypot(ax, ay) > 0.05:
                        player.aim_angle = math.atan2(ay, ax)

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "time": data.get("time", 0)}))

    except WebSocketDisconnect:
        room.remove_player(player_id)
    except Exception:
        room.remove_player(player_id)


@app.get("/")
def get_index():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    elif os.path.exists("standalone_index.html"):
        return FileResponse("standalone_index.html")
    return HTMLResponse("<h1>Laser Cage Standoff Server</h1><p>Running on port 8000.</p>")


if __name__ == "__main__":
    print("=" * 65)
    print("  LASER CAGE STANDOFF - BLIND STANDOFF & SHRINKING ZONE SERVER")
    print("=" * 65)
    print("  Local URL:        http://localhost:8000")
    print("  Network URL:      http://<YOUR_LOCAL_IP>:8000")
    print("  WebSocket:        ws://<YOUR_LOCAL_IP>:8000/ws/{room_code}")
    print("=" * 65)
    uvicorn.run(app, host="0.0.0.0", port=8000)
