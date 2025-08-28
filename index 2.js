<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Majk AI Bot</title>
<style>
/* --- Reset --- */
* { margin:0; padding:0; box-sizing:border-box; font-family: 'Segoe UI', sans-serif; }
body { background:#0d0d0d; color:#fff; transition: background 0.5s, color 0.5s; overflow-x:hidden; }

/* --- Light mode --- */
body.light { background:#f2f2f2; color:#111; }

/* --- Animated background gradient --- */
body::before {
  content:"";
  position:fixed;
  top:0; left:0; width:100%; height:100%;
  background: linear-gradient(270deg, #ff00ff, #00f0ff, #ff9900, #00ff77);
  background-size: 800% 800%;
  z-index:-1;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0% {background-position:0% 50%;}
  50% {background-position:100% 50%;}
  100% {background-position:0% 50%;}
}

/* --- Header --- */
header {
  display:flex; justify-content:space-between; align-items:center;
  padding:20px; position:sticky; top:0; background:rgba(0,0,0,0.7); z-index:10;
  backdrop-filter:blur(5px);
}
header h1 {
  font-size:2rem;
  color:#fff;
  text-shadow:0 0 5px #ff00ff,0 0 15px #00f0ff,0 0 30px #ff00ff;
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { text-shadow:0 0 5px #ff00ff,0 0 15px #00f0ff,0 0 30px #ff00ff; }
  to { text-shadow:0 0 20px #ff00ff,0 0 40px #00f0ff,0 0 60px #ff00ff; }
}

/* --- Navbar --- */
nav button {
  background:#111; color:#fff; font-weight:bold;
  padding:10px 20px; border-radius:8px; box-shadow:0 0 10px #00f0ff;
  transition:0.3s, transform 0.3s;
}
nav button:hover {
  transform:scale(1.1);
  box-shadow:0 0 20px #ff00ff, 0 0 40px #00f0ff;
}

/* --- Sections --- */
section { padding:70px 20px; max-width:1000px; margin:auto; }
section h2 {
  font-size:1.8rem; margin-bottom:20px; border-bottom:2px solid #00f0ff; display:inline-block;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { opacity:1; transform: scale(1); }
  50% { opacity:0.7; transform: scale(1.05); }
  100% { opacity:1; transform: scale(1); }
}
section p { font-size:1.1rem; line-height:1.6; margin-bottom:15px; }

/* --- Commands --- */
.commands { display:flex; flex-wrap:wrap; gap:20px; }
.command {
  flex:1 1 200px;
  padding:20px;
  border-radius:12px;
  background:rgba(0,0,0,0.6);
  box-shadow:0 0 15px #ff00ff, 0 0 30px #00f0ff;
  transition:0.3s transform 0.3s, box-shadow 0.3s;
}
.command:hover {
  transform:translateY(-5px) scale(1.05);
  box-shadow:0 0 25px #ff00ff, 0 0 50px #00f0ff, 0 0 70px #00ffcc;
}

/* --- Buttons --- */
.btn-group { margin-top:20px; }
.btn-group a {
  display:inline-block; background:linear-gradient(90deg, #00f0ff, #ff00ff);
  color:#fff; padding:12px 25px; border-radius:10px; margin-right:10px;
  text-shadow:0 0 5px #000; transition:0.3s, transform 0.3s;
}
.btn-group a:hover { transform:scale(1.05); opacity:0.85; }

/* --- Status --- */
#status { font-size:1.2rem; padding:12px; border-radius:10px; display:inline-block;
  box-shadow:0 0 15px #00f0ff, 0 0 30px #ff00ff;
  animation: pulseStatus 2s infinite;
}
@keyframes pulseStatus {
  0% { transform: scale(1); box-shadow:0 0 15px #00f0ff, 0 0 30px #ff00ff; }
  50% { transform: scale(1.05); box-shadow:0 0 25px #ff00ff, 0 0 50px #00f0ff; }
  100% { transform: scale(1); box-shadow:0 0 15px #00f0ff, 0 0 30px #ff00ff; }
}

/* --- Light mode tweaks --- */
body.light .command { background:#eee; color:#111; box-shadow:0 0 15px #0077aa; }
body.light #status { box-shadow:0 0 15px #0077aa; color:#111; }

/* --- Smooth scroll for sections --- */
html { scroll-behavior:smooth; }
</style>
</head>
<body>

<header>
  <h1>Majk AI Bot</h1>
  <nav>
    <button class="toggle-btn" onclick="toggleMode()">Toggle Dark/Light</button>
  </nav>
</header>

<section id="about">
  <h2>About Majk</h2>
  <p>Majk is a Discord AI bot powered by OpenAI. It can respond in friendly or aggressive ways depending on its personality settings. Customize the bot's personality, set up channels for replies, and enjoy interactive AI conversations!</p>
  <div id="status">Status: <span id="botStatus">Online</span> | Servers: <span id="serverCount">0</span></div>
</section>

<section id="commands">
  <h2>Commands</h2>
  <div class="commands">
    <div class="command"><strong>/setupchannel</strong><br>Set the channel where Majk will respond.</div>
    <div class="command"><strong>/uninstallchannel</strong><br>Remove the AI reply channel.</div>
    <div class="command"><strong>/personality</strong><br>Set or update Majk's personality (admin only).</div>
    <div class="command"><strong>/resetpersonality</strong><br>Reset Majk's personality to default (admin only).</div>
    <div class="command"><strong>/help</strong><br>Show available commands.</div>
    <div class="command"><strong>Owner Commands</strong><br>Manage servers, restart, shutdown, view logs.</div>
  </div>
</section>

<section id="features">
  <h2>Features</h2>
  <p>- Responds only in the configured channel.</p>
  <p>- Stores chat history for coherent AI replies.</p>
  <p>- Admin-controlled personality and channel settings.</p>
  <p>- Owner-only commands for blacklist, invite creation, and bot management.</p>
  <p>- Dark/Light mode toggle.</p>
</section>

<section id="links">
  <h2>Links</h2>
  <div class="btn-group">
    <a href="https://top.gg/bot/YOUR_BOT_ID/vote" target="_blank">Vote on Top.gg</a>
    <a href="https://top.gg/bot/YOUR_BOT_ID" target="_blank">Top.gg Page</a>
    <a href="https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID&scope=bot%20applications.commands&permissions=8" target="_blank">Invite Majk</a>
  </div>
</section
