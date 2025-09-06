// --- Elements ---
const preloader = document.getElementById('preloader');
const enterBtn = document.getElementById('enter-btn');
const mainContent = document.getElementById('main');
const bgMusic = document.getElementById('bg-music');
const discordStatus = document.getElementById('discord-status');

// --- Preloader → Enter ---
enterBtn.addEventListener('click', () => {
  bgMusic.play().catch(() => console.log('Music blocked until user interaction'));
  preloader.style.display = 'none';
  mainContent.style.display = 'flex';
});

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
    const activities = data.data
