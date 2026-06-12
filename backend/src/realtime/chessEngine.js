import { Chess } from 'chess.js';

/** Live chess match. White/black assigned randomly. */
export function createChessGame(playerA, playerB) {
  const [white, black] = Math.random() < 0.5 ? [playerA, playerB] : [playerB, playerA];
  return {
    type: 'chess',
    players: [playerA, playerB],
    colors: { w: white.id, b: black.id },
    chess: new Chess(),
    lastMove: null,
    winnerId: null,
    result: null, // 'checkmate' | 'draw' | 'resign' | 'forfeit'
    startedAt: Date.now(),
  };
}

export function chessMove(game, userId, { from, to, promotion }) {
  if (game.result) return { error: 'Game is over' };
  const turnColor = game.chess.turn();
  if (game.colors[turnColor] !== userId) return { error: 'Not your turn' };

  let move;
  try {
    move = game.chess.move({ from, to, promotion: promotion || 'q' });
  } catch {
    return { error: 'Illegal move' };
  }
  game.lastMove = { from: move.from, to: move.to, san: move.san };

  if (game.chess.isCheckmate()) {
    game.result = 'checkmate';
    game.winnerId = userId;
  } else if (game.chess.isDraw() || game.chess.isStalemate()) {
    game.result = 'draw';
  }
  return { ok: true };
}

export function chessResign(game, userId) {
  if (game.result) return { error: 'Game is over' };
  game.result = 'resign';
  game.winnerId = game.players.find((p) => p.id !== userId).id;
  return { ok: true };
}

export function chessView(game, userId) {
  const yourColor = game.colors.w === userId ? 'w' : 'b';
  return {
    game: 'chess',
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      color: game.colors.w === p.id ? 'w' : 'b',
    })),
    fen: game.chess.fen(),
    turn: game.chess.turn(),
    yourColor,
    lastMove: game.lastMove,
    check: game.chess.isCheck(),
    history: game.chess.history(),
    winnerId: game.winnerId,
    result: game.result,
  };
}
