# Deploying Fun Friday on an office WiFi (Windows host laptop)

This guide runs the whole stack (web app + API + Postgres) on **one Windows
laptop** with Docker. Colleagues on the same WiFi — Windows or Mac — only
need a browser.

## Part 1 — One-time setup on the host laptop (Windows)

### 1. Install Docker Desktop

1. Download from <https://www.docker.com/products/docker-desktop/> (Windows, x64).
2. Run the installer, keep **"Use WSL 2"** checked, and reboot if asked.
3. Launch **Docker Desktop** and wait until the whale icon in the system tray
   stops animating (engine running).
4. If it complains about WSL, open PowerShell **as Administrator** and run
   `wsl --update`, then restart Docker Desktop. If it complains about
   virtualization, enable *Intel VT-x / AMD-V* in the laptop's BIOS.

### 2. Get the code

Either install [Git for Windows](https://git-scm.com/download/win) and run:

```powershell
cd $HOME\Documents
git clone https://github.com/rishivendhan84/fun_friday.git
cd fun_friday
```

…or on GitHub click **Code → Download ZIP**, extract it, and `cd` into the
folder in PowerShell.

### 3. Create the `.env` file

In PowerShell, inside the `fun_friday` folder:

```powershell
Set-Content .env "JWT_SECRET=$([guid]::NewGuid())$([guid]::NewGuid())" -Encoding ascii
```

To let people try the games **before** the real Friday window, also run:

```powershell
Add-Content .env "FUN_FRIDAY_ALWAYS_OPEN=true" -Encoding ascii
```

(Remove that line and re-run step 4 before the real launch — the server then
only accepts scores Friday 17:00–17:30, timezone `FUN_FRIDAY_TZ`,
default Asia/Kolkata.)

### 4. Start the app

```powershell
docker compose up --build -d
```

The first build takes a few minutes. Then check:

```powershell
docker compose ps        # db, api, web should all be "running"
```

Open <http://localhost:3000> on the host laptop — you should see the login
page. Register an account (pick your team: Marketing, Development, or Data).

### 5. Open the firewall for colleagues

PowerShell **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Fun Friday Arena" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### 6. Find the laptop's WiFi IP

```powershell
ipconfig
```

Under **Wireless LAN adapter Wi-Fi**, note the **IPv4 Address**
(e.g. `192.168.1.42`).

### 7. Keep the laptop awake

Settings → System → Power & battery → Screen and sleep →
**"When plugged in, put my device to sleep" → Never**. Keep it on the charger
during Fun Friday.

## Part 2 — Colleagues (Windows and Mac)

Nothing to install. Open a browser (Chrome / Edge / Safari / Firefox) and go to:

```
http://<host-ip>:3000        e.g. http://192.168.1.42:3000
```

Register with name + email + department, and play. Everyone shares one
database, so the leaderboard, teams, and activity feed are live across the
office.

## Part 3 — Day-to-day operation

| Task | Command (PowerShell, in the project folder) |
| --- | --- |
| Stop the app | `docker compose stop` |
| Start it again | `docker compose start` |
| View API logs | `docker compose logs -f api` |
| Update to latest code | `git pull` then `docker compose up --build -d` |
| Back up the database | `docker compose exec db pg_dump -U funfriday -f /tmp/b.sql funfriday` then `docker compose cp db:/tmp/b.sql .\backup.sql` |
| Restore a backup | `docker compose cp .\backup.sql db:/tmp/b.sql` then `docker compose exec db psql -U funfriday -d funfriday -f /tmp/b.sql` |

Game scores survive restarts and reboots (Postgres data lives in a Docker
volume).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Works on the host, colleagues get "can't reach this page" | Firewall rule missing (Part 1 step 5); or the WiFi has **client/AP isolation** (common on guest networks) — use the main office SSID; or they typed the wrong IP. |
| Link works one day, dead the next | The router gave the laptop a new IP. Set a **DHCP reservation** for the laptop in the router admin so the IP never changes. |
| "Arena is closed" when playing | Working as designed outside Friday 17:00–17:30. For demos set `FUN_FRIDAY_ALWAYS_OPEN=true` in `.env` and `docker compose up -d`. |
| Docker Desktop won't start | `wsl --update` in an admin PowerShell; enable virtualization in BIOS. |
| Port 3000 already in use | Change the web port mapping in `docker-compose.yml` to e.g. `'8080:3000'` and share `http://<ip>:8080`. |

## Before the real launch

- Remove `FUN_FRIDAY_ALWAYS_OPEN` from `.env` and `docker compose up -d`.
- This setup is plain HTTP on a trusted office LAN — fine internally. Do not
  port-forward it to the internet; add a reverse proxy + HTTPS first.
