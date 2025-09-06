const preloader=document.getElementById('preloader');
const enterBtn=document.getElementById('enter-btn');
const mainContent=document.getElementById('main');
const bgMusic=document.getElementById('bg-music');
const discordStatus=document.getElementById('discord-status');

// Preloader → Enter
enterBtn.addEventListener('click',()=>{
  bgMusic.play().catch(()=>console.log('Music blocked until user interaction'));
  preloader.style.display='none';
  mainContent.style.display='flex';
});

// Discord Status
const discordUserId='904431016175894528';
async function fetchDiscordStatus(){
  try{
    const resp=await fetch(`https://api.lanyard.rest/v1/users/${discordUserId}`);
    const data=await resp.json();
    if(!data || !data.data){
      discordStatus.textContent='Discord status unavailable';
      return;
    }
    const status=data.data.discord_status||'offline';
    const activities=data.data.activities||[];
    let color='';
    switch(status){
      case 'online': color='green'; break;
      case 'idle': color='orange'; break;
      case 'dnd': color='red'; break;
      case 'offline': color='gray'; break;
      default: color='gray';
    }
    let activityText='';
    if(activities.length>0){
      activityText=activities.map(a=>{
        switch(a.type){
          case 0: return `Playing: ${a.name}`;
          case 1: return `Streaming: ${a.name}`;
          case 2: return `Listening to: ${a.name}`;
          case 4: return a.state?a.state:a.name;
          default: return a.name;
        }
      }).join(' | ');
    }
    discordStatus.innerHTML=`<span style="color:${color}; font-weight:bold;">●</span> ${status.charAt(0).toUpperCase()+status.slice(1)}${activityText?' - '+activityText:''}`;
  }catch(e){
    console.log('Failed to fetch Discord status',e);
    discordStatus.textContent='Discord status unavailable';
  }
}
fetchDiscordStatus();
setInterval(fetchDiscordStatus,15000);

// Accordion functionality
const acc=document.get
