// --- Elements ---
const preloader = document.getElementById('preloader');
const enterBtn = document.getElementById('enter-btn');
const mainContent = document.getElementById('main');
const bgMusic = document.getElementById('bg-music');
const discordStatus = document.getElementById('discord-status');

// --- Preloader → Enter ---
enterBtn.addEventListener('click', () => {
  // spustí hudbu
  bgMusic.play().catch(err => console.log('Music blocked until user interaction'));
  
  // přepne obsah
  preloader.style.display = 'none';
  mainContent.style.display = 'flex';
});

// --- Discord status přes Lanyard API ---
// Zadej svůj Discord user ID
const discordUserId = 'YOUR_DISCORD_ID';

async function fetchDiscordStatus() {
  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`);
    const data = await response.json();
    const status = data.data.discord_status; // online, idle, dnd, offline

    let statusText = '';
    let color = '';

    switch(status) {
      case 'online': statusText = 'Online'; color = 'green'; break;
      case 'idle': statusText = 'Idle'; color = 'orange'; break;
      case 'dnd': statusText = 'Do Not Disturb'; color = 'red'; break;
      case 'offline': statusText = 'Offline'; color = 'gray'; break;
      default: statusText = 'Unknown'; color = 'gray';
    }

    discordStatus.innerHTML = `<span style="color:${color}; font-weight:bold;">●</span> ${statusText}`;
  } catch(err) {
    console.log('Failed to fetch Discord status', err);
    discordStatus.textContent = 'Discord status unavailable';
  }
}

// Update every 15 seconds
fetchDiscordStatus();
setInterval(fetchDiscordStatus, 15000);
