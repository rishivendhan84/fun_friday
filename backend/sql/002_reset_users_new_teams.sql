-- Reset all user data and switch to the new team structure.
TRUNCATE matches, activity, redemptions, user_achievements, users RESTART IDENTITY CASCADE;

DELETE FROM departments;
INSERT INTO departments (name, color) VALUES
  ('Marketing', '#f59e0b'),
  ('Development', '#8b5cf6'),
  ('Data', '#06b6d4');
