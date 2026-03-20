/**
 * Admin dashboard — serves static HTML/JS inline.
 *
 * No build step, no framework. Just a simple admin panel
 * that connects to the admin API and SSE stream.
 */

import { Router, type Request, type Response } from 'express';

export function createDashboardRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(DASHBOARD_HTML);
  });

  return router;
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ellmud Admin Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: #0a0a0a;
      color: #c0c0c0;
      padding: 20px;
    }
    h1 { color: #ff6b35; margin-bottom: 4px; font-size: 1.4em; }
    h2 { color: #4ecdc4; margin: 16px 0 8px; font-size: 1.1em; }
    .subtitle { color: #666; font-size: 0.85em; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 12px;
    }
    .card h3 { color: #ff6b35; font-size: 0.95em; margin-bottom: 8px; }
    .stat { display: flex; justify-content: space-between; padding: 3px 0; font-size: 0.85em; }
    .stat .label { color: #888; }
    .stat .value { color: #4ecdc4; font-weight: bold; }
    .status-bar {
      display: flex; gap: 16px; padding: 8px 12px;
      background: #1a1a1a; border: 1px solid #333;
      border-radius: 4px; margin-bottom: 16px;
      font-size: 0.85em;
    }
    .status-bar .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .dot.connected { background: #4ecdc4; }
    .dot.disconnected { background: #ff4444; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
    th { text-align: left; color: #888; padding: 6px 8px; border-bottom: 1px solid #333; }
    td { padding: 6px 8px; border-bottom: 1px solid #1a1a1a; }
    .lifecycle { padding: 2px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold; }
    .lifecycle.seeding { background: #333; color: #888; }
    .lifecycle.open { background: #1a3a2a; color: #4ecdc4; }
    .lifecycle.active { background: #1a2a3a; color: #5dade2; }
    .lifecycle.destabilising { background: #3a2a1a; color: #ff6b35; }
    .lifecycle.collapse { background: #3a1a1a; color: #ff4444; }
    button {
      background: #333; color: #c0c0c0; border: 1px solid #555;
      padding: 4px 10px; border-radius: 3px; cursor: pointer;
      font-family: inherit; font-size: 0.8em;
    }
    button:hover { background: #444; }
    button.danger { border-color: #ff4444; color: #ff4444; }
    .actions { display: flex; gap: 6px; margin-top: 8px; }
    #login-form { max-width: 320px; margin: 100px auto; }
    #login-form input {
      width: 100%; padding: 8px; margin: 8px 0;
      background: #1a1a1a; border: 1px solid #333;
      color: #c0c0c0; font-family: inherit; border-radius: 3px;
    }
    #login-form button { width: 100%; padding: 8px; margin-top: 4px; }
    .error { color: #ff4444; font-size: 0.85em; margin-top: 4px; }
    .hidden { display: none; }
    .progress-bar { background: #333; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 4px; }
    .progress-fill { height: 100%; transition: width 0.3s; }
    .progress-fill.good { background: #4ecdc4; }
    .progress-fill.warn { background: #ff6b35; }
    .progress-fill.danger { background: #ff4444; }
  </style>
</head>
<body>
  <!-- Login Form -->
  <div id="login-form">
    <h1>⚔ Ellmud Admin</h1>
    <p class="subtitle">Enter admin token to access the dashboard.</p>
    <input type="password" id="token-input" placeholder="Admin Token" autofocus>
    <button onclick="doLogin()">Authenticate</button>
    <div id="login-error" class="error hidden"></div>
  </div>

  <!-- Dashboard (hidden until auth) -->
  <div id="dashboard" class="hidden">
    <h1>⚔ Ellmud Admin Dashboard</h1>
    <p class="subtitle">Server-authoritative state inspection — Schema consumer (admin only)</p>

    <div class="status-bar">
      <span><span class="dot" id="sse-dot"></span> SSE: <span id="sse-status">connecting...</span></span>
      <span>Uptime: <span id="uptime">--</span></span>
      <span>Rooms: <span id="room-count">--</span></span>
      <span>Players: <span id="player-count">--</span></span>
      <span>Creatures: <span id="creature-count">--</span></span>
    </div>

    <div class="grid">
      <div class="card">
        <h3>LLM Narration Cache</h3>
        <div class="stat"><span class="label">Cache Hit Ratio</span><span class="value" id="cache-ratio">--</span></div>
        <div class="stat"><span class="label">Cache Size</span><span class="value" id="cache-size">--</span></div>
        <div class="stat"><span class="label">Hits / Misses</span><span class="value" id="cache-hits-misses">--</span></div>
        <div class="progress-bar"><div class="progress-fill good" id="cache-bar" style="width:0%"></div></div>
      </div>
      <div class="card">
        <h3>LLM Performance</h3>
        <div class="stat"><span class="label">Total Calls</span><span class="value" id="llm-calls">--</span></div>
        <div class="stat"><span class="label">Avg Latency</span><span class="value" id="llm-latency">--</span></div>
        <div class="stat"><span class="label">Timeouts</span><span class="value" id="llm-timeouts">--</span></div>
        <div class="stat"><span class="label">Fallback Rate</span><span class="value" id="fallback-rate">--</span></div>
      </div>
    </div>

    <h2>Active Rooms</h2>
    <table id="rooms-table">
      <thead>
        <tr>
          <th>Room ID</th>
          <th>Type</th>
          <th>Players</th>
          <th>State</th>
          <th>Stability</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="rooms-tbody"></tbody>
    </table>
    <p id="no-rooms" class="subtitle" style="margin-top:8px">No active rooms</p>

    <h2>Room Detail</h2>
    <div id="room-detail" class="card">
      <p class="subtitle">Click a room row to inspect.</p>
    </div>
  </div>

  <script>
    let TOKEN = '';
    let evtSource = null;

    function doLogin() {
      TOKEN = document.getElementById('token-input').value.trim();
      if (!TOKEN) return;

      fetch('/admin/api/metrics', { headers: { 'Authorization': 'Bearer ' + TOKEN } })
        .then(r => {
          if (!r.ok) throw new Error('Invalid token');
          return r.json();
        })
        .then(() => {
          document.getElementById('login-form').classList.add('hidden');
          document.getElementById('dashboard').classList.remove('hidden');
          startSSE();
        })
        .catch(err => {
          const el = document.getElementById('login-error');
          el.textContent = err.message;
          el.classList.remove('hidden');
        });
    }

    document.getElementById('token-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });

    function startSSE() {
      // SSE doesn't support custom headers, so we pass token as query param
      evtSource = new EventSource('/admin/api/sse?token=' + encodeURIComponent(TOKEN));

      evtSource.onopen = () => {
        document.getElementById('sse-dot').className = 'dot connected';
        document.getElementById('sse-status').textContent = 'connected';
      };

      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateDashboard(data);
      };

      evtSource.onerror = () => {
        document.getElementById('sse-dot').className = 'dot disconnected';
        document.getElementById('sse-status').textContent = 'disconnected';
      };
    }

    function updateDashboard(data) {
      // Status bar
      document.getElementById('uptime').textContent = formatUptime(data.uptime);
      document.getElementById('room-count').textContent = data.rooms.total;
      document.getElementById('player-count').textContent = data.rooms.totalPlayers;
      document.getElementById('creature-count').textContent =
        (data.rooms.livingCreatures || 0) + '/' + (data.rooms.totalCreatures || 0);

      // Cache metrics
      const ratio = (data.narration.cache_hit_ratio * 100).toFixed(1) + '%';
      document.getElementById('cache-ratio').textContent = ratio;
      document.getElementById('cache-size').textContent = data.narration.cache_size + ' entries';
      document.getElementById('cache-hits-misses').textContent =
        data.narration.cache_hits + ' / ' + data.narration.cache_misses;
      const bar = document.getElementById('cache-bar');
      bar.style.width = (data.narration.cache_hit_ratio * 100) + '%';
      bar.className = 'progress-fill ' +
        (data.narration.cache_hit_ratio > 0.7 ? 'good' : data.narration.cache_hit_ratio > 0.4 ? 'warn' : 'danger');

      // LLM metrics
      document.getElementById('llm-calls').textContent = data.narration.llm_calls;
      document.getElementById('llm-latency').textContent = data.narration.avg_llm_latency_ms.toFixed(0) + 'ms';
      document.getElementById('llm-timeouts').textContent = data.narration.llm_timeouts;
      document.getElementById('fallback-rate').textContent =
        (data.narration.fallback_rate * 100).toFixed(1) + '%';

      // Room list
      const tbody = document.getElementById('rooms-tbody');
      const noRooms = document.getElementById('no-rooms');

      if (data.rooms.list.length === 0) {
        tbody.innerHTML = '';
        noRooms.classList.remove('hidden');
        return;
      }

      noRooms.classList.add('hidden');
      tbody.innerHTML = data.rooms.list.map(r => {
        return '<tr onclick="inspectRoom(\\'' + r.roomId + '\\')" style="cursor:pointer">' +
          '<td>' + r.roomId.substring(0, 12) + '...</td>' +
          '<td>' + r.name + '</td>' +
          '<td>' + r.clients + '</td>' +
          '<td>--</td>' +
          '<td>--</td>' +
          '<td>' +
            '<button onclick="event.stopPropagation();pauseRoom(\\'' + r.roomId + '\\')">⏸</button> ' +
            '<button onclick="event.stopPropagation();resumeRoom(\\'' + r.roomId + '\\')">▶</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    function inspectRoom(roomId) {
      fetch('/admin/api/rooms/' + roomId, { headers: { 'Authorization': 'Bearer ' + TOKEN } })
        .then(r => r.json())
        .then(data => {
          const el = document.getElementById('room-detail');
          if (data.error) {
            el.innerHTML = '<p class="error">' + data.error + '</p>';
            return;
          }

          let html = '<h3>' + data.name + ' — ' + data.roomId + '</h3>';
          html += '<div class="stat"><span class="label">Players</span><span class="value">' + (data.playerCount || data.clients) + '</span></div>';
          html += '<div class="stat"><span class="label">Tick</span><span class="value">' + (data.tick || 0) + '</span></div>';
          html += '<div class="stat"><span class="label">Paused</span><span class="value">' + (data.paused ? 'YES' : 'no') + '</span></div>';

          if (data.name === 'shard') {
            html += '<div class="stat"><span class="label">Biome</span><span class="value">' + data.biome + '</span></div>';
            html += '<div class="stat"><span class="label">Lifecycle</span><span class="value"><span class="lifecycle ' + data.lifecycle + '">' + data.lifecycle + '</span></span></div>';
            html += '<div class="stat"><span class="label">Stability</span><span class="value">' + (data.stability * 100).toFixed(1) + '%</span></div>';
            html += '<div class="stat"><span class="label">Collapse Timer</span><span class="value">' + data.collapseTimer + 's</span></div>';
            html += '<div class="progress-bar"><div class="progress-fill ' +
              (data.stability > 0.5 ? 'good' : data.stability > 0.25 ? 'warn' : 'danger') +
              '" style="width:' + (data.stability * 100) + '%"></div></div>';

            if (data.players && data.players.length > 0) {
              html += '<h3 style="margin-top:12px">Players</h3>';
              html += '<table><thead><tr><th>Session</th><th>Room</th><th>Items</th><th>Weight</th></tr></thead><tbody>';
              data.players.forEach(p => {
                html += '<tr><td>' + p.sessionId.substring(0, 10) + '</td><td>' + p.currentRoomId + '</td>' +
                  '<td>' + p.inventoryCount + '</td><td>' + p.currentWeight.toFixed(1) + '/' + p.maxCarryWeight + '</td></tr>';
              });
              html += '</tbody></table>';
            }

            if (data.creatures && data.creatures.length > 0) {
              html += '<h3 style="margin-top:12px">Creatures (' + data.creatures.length + ')</h3>';
              html += '<table><thead><tr><th>Name</th><th>Room</th><th>HP</th><th>State</th><th>Alive</th></tr></thead><tbody>';
              data.creatures.forEach(c => {
                const hpPct = ((c.hp / c.maxHp) * 100).toFixed(0);
                const stateClass = c.behaviorState === 'hostile' ? 'danger' : c.behaviorState === 'fleeing' ? 'warn' : c.behaviorState === 'alert' ? 'warn' : '';
                html += '<tr><td>' + c.name + '</td><td>' + c.currentRoomId + '</td>' +
                  '<td>' + c.hp + '/' + c.maxHp + ' (' + hpPct + '%)</td>' +
                  '<td><span class="lifecycle ' + stateClass + '">' + c.behaviorState + '</span></td>' +
                  '<td>' + (c.isAlive ? '✓' : '✗') + '</td></tr>';
              });
              html += '</tbody></table>';
            }
          }

          html += '<div class="actions">';
          html += '<button onclick="pauseRoom(\\'' + data.roomId + '\\')">⏸ Pause</button>';
          html += '<button onclick="resumeRoom(\\'' + data.roomId + '\\')">▶ Resume</button>';
          html += '<button onclick="spawnPrompt(\\'' + data.roomId + '\\')">🔮 Spawn</button>';
          html += '</div>';

          el.innerHTML = html;
        });
    }

    function pauseRoom(roomId) {
      fetch('/admin/api/rooms/' + roomId + '/pause', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + TOKEN },
      }).then(r => r.json()).then(() => inspectRoom(roomId));
    }

    function resumeRoom(roomId) {
      fetch('/admin/api/rooms/' + roomId + '/resume', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + TOKEN },
      }).then(r => r.json()).then(() => inspectRoom(roomId));
    }

    function spawnPrompt(roomId) {
      const type = prompt('Spawn type: "item" or "creature"');
      if (!type) return;
      const id = prompt('ID (e.g. "rusty_blade", "drowned_revenant"):');
      if (!id) return;

      fetch('/admin/api/rooms/' + roomId + '/spawn', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, id }),
      }).then(r => r.json()).then(data => {
        alert(data.message || data.error);
      });
    }

    function formatUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return h + 'h ' + m + 'm ' + s + 's';
    }
  </script>
</body>
</html>`;
