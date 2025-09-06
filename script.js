// --- Elements ---
const preloader = document.getElementById('preloader');
const enterBtn = document.getElementById('enter-btn');
const mainContent = document.getElementById('main');
const bgMusic = document.getElementById('bg-music');
const discordStatus = document.getElementById('discord-status');
const accordions = document.querySelectorAll('.accordion');

// --- Preloader: Enter ---
function enterSite() {
  bgMusic.play().catch(() => console.log('Music blocked until user interaction'));
  preloader.style.display = 'none';
  mainContent.style.display = 'flex';
}

enterBtn.addEventListener('click', enterSite);
enterBtn.addEventListener('touchstart', enterSite);

// --- Discord Status ---
const discordUserId = '904431016175894528';

async function fetchDiscordStatus() {
  try {
    const resp = await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`);
    const data = await resp.json();
    if (!data || !data.data) {
      discordStatus.textContent = 'Discord status unavailable';
      return;
    }

    const status = data.data.discord_status || 'offline';
    const activities = data.data.activities || [];

    let color = '';
    switch(status){
      case 'online': color='green'; break;
      case 'idle': color='orange'; break;
      case 'dnd': color='red'; break;
      case 'offline': color='gray'; break;
      default: color='gray';
    }

    let activityText = '';
    if(activities.length > 0){
      activityText = activities.map(a => {
        switch(a.type){
          case 0: return `Playing: ${a.name}`;
          case 1: return `Streaming: ${a.name}`;
          case 2: return `Listening to: ${a.name}`;
          case 4: return a.state ? a.state : a.name;
          default: return a.name;
        }
      }).join(' | ');
    }

    discordStatus.innerHTML = `<span style="color:${color}; font-weight:bold;">●</span> ${status.charAt(0).toUpperCase()+status.slice(1)}${activityText ? ' - '+activityText : ''}`;
  } catch(e) {
    console.log('Failed to fetch Discord status', e);
    discordStatus.textContent = 'Discord status unavailable';
  }
}

fetchDiscordStatus();
setInterval(fetchDiscordStatus, 15000);

// --- Accordion ---
accordions.forEach(acc => {

  const togglePanel = (e) => {
    e.preventDefault();
    acc.classList.toggle('active');
    const panel = acc.nextElementSibling;
    if(panel.style.maxHeight){
      panel.style.maxHeight = null;
      panel.classList.remove('open');
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
      panel.classList.add('open');
    }
  };

  // Click + touchstart pro mobil
  acc.addEventListener('click', togglePanel);
  acc.addEventListener('touchstart', togglePanel);
});

// --- Neon cursor (PC only) ---
if(!/Mobi|Android/i.test(navigator.userAgent)){
  const cursor = document.createElement('div');
  cursor.style.width = '20px';
  cursor.style.height = '20px';
  cursor.style.borderRadius = '50%';
  cursor.style.position = 'fixed';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = '9999';
  cursor.style.background = '#fdd4ff';
  cursor.style.boxShadow = '0 0 15px #fdd4ff, 0 0 30px #fdd4ff';
  cursor.style.transition = 'transform 0.1s ease';
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', e => {
    cursor.style.transform = `translate(${e.clientX-10}px, ${e.clientY-10}px)`;
  });
}
