const XP_PER_LEVEL = 500;

export function levelInfo(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    level,
    xp,
    xpIntoLevel: xp % XP_PER_LEVEL,
    xpForNextLevel: XP_PER_LEVEL,
  };
}

export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    department: u.department || null,
    avatarColor: u.avatar_color,
    coins: u.coins,
    ...levelInfo(u.xp),
  };
}
