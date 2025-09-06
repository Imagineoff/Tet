// --- Elements ---
const preloader = document.getElementById('preloader');
const enterBtn = document.getElementById('enter-btn');
const mainContent = document.getElementById('main');
const bgMusic = document.getElementById('bg-music');
const discordStatus = document.getElementById('discord-status');

// --- Preloader → Enter ---
enterBtn.addEventListener('click', () => {
  bgMusic.play().catch(err => console.log('Music blocked until user interaction'));
  preloader.style.display = 'none';
  mainContent.style.display = 'flex';
});

// --- Discord status přes Lanyard API ---
const discordUserId = '904431016175894528';

async function fetchDiscordStatus() {
  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`);
    const data = await response.json();
    const status = data.data.discord_status; 
    const activities = data.data.activities;

    // barevný pulzující puntík
    let color = '';
    switch(status) {
      case 'online': color = 'green'; break;
      case 'idle': color = 'orange'; break;
      case 'dnd': color = 'red'; break;
      case 'offline': color = 'gray'; break;
      default: color = 'gray';
    }

    // zobrazení všech aktivit
    let activityText = '';
    if (activities && activities.length > 0) {
      activityText = activities.map(a => {
        // fallback na název, typ hry, Spotify, nebo custom status
        if(a.type === 0) return `Playing: ${a.name}`;
        if(a.type === 1) return `Streaming: ${a.name}`;
        if(a.type === 2) return `Listening to: ${a.name}`;
        if(a.type === 4 && a.state) return `Status: ${a.state}`;
        return a.name;
      }).join(' | ');
    }

    discordStatus.innerHTML = `<span class="discord-dot" style="background:${color}"></span> ${status.charAt(0).toUpperCase() + status.slice(1)}${activityText ? ' - ' + activityText : ''}`;

  } catch(err) {
    console.log('Failed to fetch Discord status', err);
    discordStatus.textContent = 'Discord status unavailable';
  }
}

// Update každých 15s
fetchDiscordStatus();
setInterval(fetchDiscordStatus, 15000);

// --- Accordion functionality ---
const acc = document.getElementsByClassName('accordion');

for (let i = 0; i < acc.length; i++) {
  acc[i].addEventListener('click', function() {
    const panel = this.nextElementSibling;
    panel.classList.toggle('open');
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });
}
