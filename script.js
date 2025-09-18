document.addEventListener('DOMContentLoaded', () => {
    const enterBtn = document.getElementById('enter-btn');
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main');
    const bgMusic = document.getElementById('bg-music');
    const discordStatusDiv = document.getElementById('discord-status');
    const onlineCountSpan = document.getElementById('online-count');
    const totalCountSpan = document.getElementById('total-count');

    let audioContext;
    let analyser;
    let dataArray;
    let source;
    let isPlaying = false;

    // Funkce pro získání a nastavení stavu Discordu
    const getDiscordStatus = async () => {
        // ... (původní kód pro Discord zůstává stejný) ...
    };

    // Funkce pro vizualizaci hudby
    const visualize = () => {
        requestAnimationFrame(visualize);

        if (!isPlaying) {
            return;
        }

        analyser.getByteFrequencyData(dataArray);

        let sum = dataArray.reduce((acc, val) => acc + val, 0);
        let average = sum / dataArray.length;

        // Mapování průměrné hodnoty na barvu
        let hue = Math.floor(average * 1.5); // Změna odstínu
        let saturation = 70; // Udržení sytosti
        let lightness = 50 + (average * 0.1); // Změna jasu

        // Animace barvy pozadí
        document.body.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    // Kliknutí na tlačítko "Enter"
    enterBtn.addEventListener('click', async () => {
        preloader.style.display = 'none';
        mainContent.style.display = 'block';

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            source = audioContext.createMediaElementSource(bgMusic);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        }

        // Spuštění hudby
        bgMusic.play();
        isPlaying = true;
        visualize();
    });

    // Původní kód pro Accordion
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        accordion.addEventListener('click', function() {
            // ... (původní kód pro accordion) ...
        });
    });

    // Původní kód pro Discord status
    getDiscordStatus();
    setInterval(getDiscordStatus, 30000);
});

