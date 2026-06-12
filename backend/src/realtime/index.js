import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db.js';
import { getFunFridayStatus } from '../funFriday.js';
import { createUnoGame, unoPlay, unoDraw, unoPass, unoView } from './unoEngine.js';
import { createChessGame, chessMove, chessResign, chessView } from './chessEngine.js';
import { persistMultiplayerResult } from './persist.js';

const INVITE_TTL_MS = 60_000;
const FORFEIT_GRACE_MS = 30_000;

const online = new Map(); // userId -> { user, sockets:Set<socket> }
const invites = new Map(); // inviteId -> { id, from, to, game, timer }
const rooms = new Map(); // roomId -> { id, slug, state, finished, forfeitTimers:Map }
const userRoom = new Map(); // userId -> roomId

let io;

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())];
    })
  );
}

function presencePayload() {
  return {
    users: [...online.values()].map(({ user }) => ({
      id: user.id,
      name: user.name,
      avatarColor: user.avatar_color,
      department: user.department,
      inGame: userRoom.has(user.id),
    })),
  };
}

const broadcastPresence = () => io.emit('presence:update', presencePayload());

function emitToUser(userId, event, payload) {
  const entry = online.get(userId);
  if (!entry) return;
  for (const s of entry.sockets) s.emit(event, payload);
}

const viewFor = (room, userId) =>
  room.slug === 'uno' ? unoView(room.state, userId) : chessView(room.state, userId);

function sendState(room) {
  for (const p of room.state.players) {
    emitToUser(p.id, 'game:state', { roomId: room.id, state: viewFor(room, p.id) });
  }
}

async function finishGame(room, { winnerId, draw, reason }) {
  if (room.finished) return;
  room.finished = true;
  for (const t of room.forfeitTimers.values()) clearTimeout(t);

  const [a, b] = room.state.players;
  const duration = (Date.now() - room.state.startedAt) / 1000;

  const scoreFor = (p) => {
    if (draw) return 120;
    const won = p.id === winnerId;
    if (room.slug === 'uno') {
      const oppCards = room.state.hands[p.id === a.id ? b.id : a.id].length;
      return won ? Math.min(400, 200 + 10 * oppCards) : 50;
    }
    return won ? 300 : 50;
  };

  let rewards = new Map();
  try {
    rewards = await persistMultiplayerResult(
      room.slug,
      [
        { user: a, score: scoreFor(a), won: !draw && a.id === winnerId, draw, opponentName: b.name },
        { user: b, score: scoreFor(b), won: !draw && b.id === winnerId, draw, opponentName: a.name },
      ],
      duration
    );
  } catch (err) {
    console.error('Failed to persist multiplayer result:', err);
  }

  for (const p of room.state.players) {
    emitToUser(p.id, 'game:over', {
      roomId: room.id,
      winnerId: winnerId ?? null,
      draw: !!draw,
      reason,
      state: viewFor(room, p.id),
      rewards: rewards.get(p.id) ?? null,
    });
    userRoom.delete(p.id);
  }
  rooms.delete(room.id);
  broadcastPresence();
}

function startGame(slug, playerA, playerB) {
  const id = crypto.randomUUID();
  const make = slug === 'uno' ? createUnoGame : createChessGame;
  const room = { id, slug, state: make(playerA, playerB), finished: false, forfeitTimers: new Map() };
  rooms.set(id, room);
  userRoom.set(playerA.id, id);
  userRoom.set(playerB.id, id);
  for (const p of room.state.players) {
    emitToUser(p.id, 'game:start', { roomId: id, game: slug, state: viewFor(room, p.id) });
  }
  broadcastPresence();
}

const publicPlayer = (user) => ({
  id: user.id,
  name: user.name,
  avatarColor: user.avatar_color,
});

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    path: '/api/socket.io',
    // Next.js 308-redirects trailing-slash paths, which breaks the
    // polling handshake when proxied — so don't use one.
    addTrailingSlash: false,
    transports: ['polling', 'websocket'],
    pingInterval: 10_000,
    pingTimeout: 20_000,
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.ff_token || socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authenticated'));
      const payload = jwt.verify(token, config.jwtSecret);
      const { rows } = await query(
        `SELECT u.id, u.name, u.avatar_color, d.name AS department
         FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = $1`,
        [payload.sub]
      );
      if (rows.length === 0) return next(new Error('User not found'));
      socket.data.user = rows[0];
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    const entry = online.get(user.id) ?? { user, sockets: new Set() };
    entry.sockets.add(socket);
    online.set(user.id, entry);
    broadcastPresence();
    socket.emit('presence:update', presencePayload());

    // Rejoin a live game (e.g. after a page refresh)
    const existingRoomId = userRoom.get(user.id);
    if (existingRoomId && rooms.has(existingRoomId)) {
      const room = rooms.get(existingRoomId);
      const timer = room.forfeitTimers.get(user.id);
      if (timer) {
        clearTimeout(timer);
        room.forfeitTimers.delete(user.id);
      }
      socket.emit('game:start', {
        roomId: room.id,
        game: room.slug,
        state: viewFor(room, user.id),
      });
    }

    socket.on('invite:send', ({ toUserId, game }, cb = () => {}) => {
      const status = getFunFridayStatus();
      if (!status.active) {
        return cb({ error: 'The arena is closed — challenges open Friday 5:00-5:30 PM.' });
      }
      if (!['uno', 'chess'].includes(game)) return cb({ error: 'Unknown game' });
      if (toUserId === user.id) return cb({ error: 'You cannot challenge yourself' });
      const target = online.get(toUserId);
      if (!target) return cb({ error: 'That player is no longer online' });
      if (userRoom.has(toUserId)) return cb({ error: 'That player is already in a game' });
      if (userRoom.has(user.id)) return cb({ error: 'Finish your current game first' });

      const id = crypto.randomUUID();
      const invite = {
        id,
        from: user,
        to: target.user,
        game,
        timer: setTimeout(() => {
          invites.delete(id);
          emitToUser(user.id, 'invite:result', { inviteId: id, accepted: false, reason: 'expired', by: publicPlayer(target.user) });
        }, INVITE_TTL_MS),
      };
      invites.set(id, invite);
      emitToUser(toUserId, 'invite:received', { inviteId: id, game, from: publicPlayer(user) });
      cb({ ok: true, inviteId: id });
    });

    socket.on('invite:accept', ({ inviteId }) => {
      const invite = invites.get(inviteId);
      if (!invite || invite.to.id !== user.id) {
        return socket.emit('game:error', { message: 'This challenge has expired' });
      }
      clearTimeout(invite.timer);
      invites.delete(inviteId);
      if (!online.has(invite.from.id)) {
        return socket.emit('game:error', { message: 'The challenger went offline' });
      }
      if (userRoom.has(invite.from.id) || userRoom.has(user.id)) {
        return socket.emit('game:error', { message: 'One of you is already in a game' });
      }
      startGame(invite.game, publicPlayer(invite.from), publicPlayer(invite.to));
    });

    socket.on('invite:decline', ({ inviteId }) => {
      const invite = invites.get(inviteId);
      if (!invite || invite.to.id !== user.id) return;
      clearTimeout(invite.timer);
      invites.delete(inviteId);
      emitToUser(invite.from.id, 'invite:result', {
        inviteId,
        accepted: false,
        reason: 'declined',
        by: publicPlayer(user),
      });
    });

    const withRoom = (handler) => (payload = {}, cb = () => {}) => {
      const roomId = userRoom.get(user.id);
      const room = roomId && rooms.get(roomId);
      if (!room || room.finished) return cb({ error: 'You are not in a game' });
      handler(room, payload, cb);
    };

    socket.on('uno:play', withRoom((room, { cardId, color }, cb) => {
      if (room.slug !== 'uno') return cb({ error: 'Wrong game' });
      const res = unoPlay(room.state, user.id, cardId, color);
      if (res.error) return cb(res);
      cb({ ok: true });
      if (room.state.winnerId) {
        finishGame(room, { winnerId: room.state.winnerId, reason: 'won' });
      } else {
        sendState(room);
      }
    }));

    socket.on('uno:draw', withRoom((room, _payload, cb) => {
      if (room.slug !== 'uno') return cb({ error: 'Wrong game' });
      const res = unoDraw(room.state, user.id);
      if (res.error) return cb(res);
      cb({ ok: true });
      sendState(room);
    }));

    socket.on('uno:pass', withRoom((room, _payload, cb) => {
      if (room.slug !== 'uno') return cb({ error: 'Wrong game' });
      const res = unoPass(room.state, user.id);
      if (res.error) return cb(res);
      cb({ ok: true });
      sendState(room);
    }));

    socket.on('chess:move', withRoom((room, { from, to, promotion }, cb) => {
      if (room.slug !== 'chess') return cb({ error: 'Wrong game' });
      const res = chessMove(room.state, user.id, { from, to, promotion });
      if (res.error) return cb(res);
      cb({ ok: true });
      if (room.state.result === 'checkmate') {
        finishGame(room, { winnerId: room.state.winnerId, reason: 'checkmate' });
      } else if (room.state.result === 'draw') {
        finishGame(room, { draw: true, reason: 'draw' });
      } else {
        sendState(room);
      }
    }));

    socket.on('chess:resign', withRoom((room, _payload, cb) => {
      if (room.slug !== 'chess') return cb({ error: 'Wrong game' });
      const res = chessResign(room.state, user.id);
      if (res.error) return cb(res);
      cb({ ok: true });
      finishGame(room, { winnerId: room.state.winnerId, reason: 'resign' });
    }));

    socket.on('game:leave', withRoom((room) => {
      const opponent = room.state.players.find((p) => p.id !== user.id);
      finishGame(room, { winnerId: opponent.id, reason: 'forfeit' });
    }));

    socket.on('disconnect', () => {
      const e = online.get(user.id);
      if (e) {
        e.sockets.delete(socket);
        if (e.sockets.size === 0) {
          online.delete(user.id);
          // Give them a grace period to reconnect before forfeiting
          const roomId = userRoom.get(user.id);
          const room = roomId && rooms.get(roomId);
          if (room && !room.finished) {
            room.forfeitTimers.set(
              user.id,
              setTimeout(() => {
                const opponent = room.state.players.find((p) => p.id !== user.id);
                finishGame(room, { winnerId: opponent.id, reason: 'forfeit' });
              }, FORFEIT_GRACE_MS)
            );
          }
        }
      }
      broadcastPresence();
    });
  });

  return io;
}
