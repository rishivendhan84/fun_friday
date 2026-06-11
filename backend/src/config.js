import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in production');
}

export const config = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://funfriday:funfriday_dev@localhost:5432/funfriday',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  funFriday: {
    // IANA timezone the office operates in
    timezone: process.env.FUN_FRIDAY_TZ || 'Asia/Kolkata',
    // Window: Friday 17:00 - 17:30
    startHour: 17,
    startMinute: 0,
    endHour: 17,
    endMinute: 30,
    // Dev/testing escape hatch: treat the window as always open
    alwaysOpen: process.env.FUN_FRIDAY_ALWAYS_OPEN === 'true',
  },
};
