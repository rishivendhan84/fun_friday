const COLORS = ['R', 'G', 'B', 'Y'];

function buildDeck() {
  const deck = [];
  let id = 0;
  for (const color of COLORS) {
    deck.push({ id: id++, color, value: '0' });
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: id++, color, value: String(n) });
      deck.push({ id: id++, color, value: String(n) });
    }
    for (const v of ['skip', 'rev', '+2']) {
      deck.push({ id: id++, color, value: v });
      deck.push({ id: id++, color, value: v });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: 'W', value: 'wild' });
    deck.push({ id: id++, color: 'W', value: '+4' });
  }
  return deck;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Head-to-head (2 player) UNO. Server-authoritative; hands never leave the server. */
export function createUnoGame(playerA, playerB) {
  const deck = shuffle(buildDeck());
  const hands = { [playerA.id]: deck.splice(0, 7), [playerB.id]: deck.splice(0, 7) };

  // First discard must be a plain number card
  let first = deck.pop();
  while (first.color === 'W' || !/^\d$/.test(first.value)) {
    deck.unshift(first);
    shuffle(deck);
    first = deck.pop();
  }

  const game = {
    type: 'uno',
    players: [playerA, playerB],
    deck,
    discard: [first],
    hands,
    turn: playerA.id,
    currentColor: first.color,
    currentValue: first.value,
    drewThisTurn: false,
    winnerId: null,
    startedAt: Date.now(),
  };
  return game;
}

const opponentOf = (game, userId) => game.players.find((p) => p.id !== userId);

function isPlayable(game, card) {
  return (
    card.color === 'W' ||
    card.color === game.currentColor ||
    card.value === game.currentValue
  );
}

function takeFromDeck(game, count) {
  const taken = [];
  for (let i = 0; i < count; i++) {
    if (game.deck.length === 0) {
      // Reshuffle the discard pile (minus its top card) back into the deck
      const top = game.discard.pop();
      game.deck = shuffle(game.discard);
      game.discard = [top];
    }
    if (game.deck.length === 0) break;
    taken.push(game.deck.pop());
  }
  return taken;
}

export function unoPlay(game, userId, cardId, chosenColor) {
  if (game.winnerId) return { error: 'Game is over' };
  if (game.turn !== userId) return { error: 'Not your turn' };
  const hand = game.hands[userId];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return { error: 'Card not in your hand' };
  const card = hand[idx];
  if (!isPlayable(game, card)) return { error: 'That card cannot be played' };
  if (card.color === 'W' && !COLORS.includes(chosenColor)) {
    return { error: 'Pick a color for the wild card' };
  }

  hand.splice(idx, 1);
  game.discard.push(card);
  game.currentColor = card.color === 'W' ? chosenColor : card.color;
  game.currentValue = card.value;
  game.drewThisTurn = false;

  if (hand.length === 0) {
    game.winnerId = userId;
    return { ok: true };
  }

  const opp = opponentOf(game, userId);
  // Two-player rules: skip/reverse give an extra turn; draw cards also skip
  if (card.value === 'skip' || card.value === 'rev') {
    game.turn = userId;
  } else if (card.value === '+2') {
    game.hands[opp.id].push(...takeFromDeck(game, 2));
    game.turn = userId;
  } else if (card.value === '+4') {
    game.hands[opp.id].push(...takeFromDeck(game, 4));
    game.turn = userId;
  } else {
    game.turn = opp.id;
  }
  return { ok: true };
}

export function unoDraw(game, userId) {
  if (game.winnerId) return { error: 'Game is over' };
  if (game.turn !== userId) return { error: 'Not your turn' };
  if (game.drewThisTurn) return { error: 'You already drew this turn' };

  const [card] = takeFromDeck(game, 1);
  if (!card) {
    game.turn = opponentOf(game, userId).id;
    return { ok: true };
  }
  game.hands[userId].push(card);
  if (isPlayable(game, card)) {
    game.drewThisTurn = true; // may play the drawn card or pass
  } else {
    game.turn = opponentOf(game, userId).id;
    game.drewThisTurn = false;
  }
  return { ok: true };
}

export function unoPass(game, userId) {
  if (game.winnerId) return { error: 'Game is over' };
  if (game.turn !== userId) return { error: 'Not your turn' };
  if (!game.drewThisTurn) return { error: 'Draw a card before passing' };
  game.drewThisTurn = false;
  game.turn = opponentOf(game, userId).id;
  return { ok: true };
}

/** What a given player is allowed to see. */
export function unoView(game, userId) {
  return {
    game: 'uno',
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      cards: game.hands[p.id].length,
    })),
    yourHand: game.hands[userId] ?? [],
    discardTop: game.discard[game.discard.length - 1],
    currentColor: game.currentColor,
    currentValue: game.currentValue,
    turnUserId: game.turn,
    mayPass: game.turn === userId && game.drewThisTurn,
    deckCount: game.deck.length,
    winnerId: game.winnerId,
  };
}
