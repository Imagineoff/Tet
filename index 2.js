const { Client, GatewayIntentBits, Partials, PermissionsBitField, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const blacklistFile = './blacklist.json';
const messageCache = new Map();
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const ms = require('ms');
const fetch = require('node-fetch');
const cron = require('node-cron');
require('dotenv').config();

// --- Konfigurace klienta a konstanty ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.setMaxListeners(20);

const OWNER_ID = ['904431016175894528'];
const logBuffer = [];
const warns = new Map();
let bannedServers = [];
if (fs.existsSync(blacklistFile)) {
    bannedServers = JSON.parse(fs.readFileSync(blacklistFile, 'utf8'));
}

const updatePresence = (client) => {
    client.user.setPresence({
        status: "dnd",
        activities: [{
            name: `/nexohelp | ${client.guilds.cache.size} serverů`,
            type: 3
        }]
    });
};

// --- Definice Slash příkazů ---
const commands = [
    new SlashCommandBuilder().setName('nexohelp').setDescription('Zobrazí seznam příkazů'),
    new SlashCommandBuilder().setName('nexo').setDescription('Ověří, že bot funguje a je online'),
    new SlashCommandBuilder().setName('nexoinfo').setDescription('Odkaz na web bota'),
    new SlashCommandBuilder()
        .setName('nexogpt')
        .setDescription('Zeptá se ChatGPT na zadaný dotaz')
        .addStringOption(option =>
            option.setName('dotaz').setDescription('Tvůj dotaz pro ChatGPT').setRequired(true)),
    new SlashCommandBuilder().setName('nexopno').setDescription('Hod mincí (panna/orel)'),
    new SlashCommandBuilder().setName('nexocats').setDescription('Pošle náhodný obrázek kočky'),
    new SlashCommandBuilder().setName('nexomeme').setDescription('Pošle náhodný meme z internetu'),
    new SlashCommandBuilder()
        .setName('nexoship')
        .setDescription('Spočítá "lásku" mezi dvěma uživateli')
        .addUserOption(option => option.setName('user1').setDescription('První uživatel').setRequired(true))
        .addUserOption(option => option.setName('user2').setDescription('Druhý uživatel').setRequired(true)),
    new SlashCommandBuilder()
        .setName('nexouser')
        .setDescription('Info o uživateli')
        .addUserOption(option => option.setName('user').setDescription('Uživatel pro zobrazení informací').setRequired(false)),
    new SlashCommandBuilder()
        .setName('nexodeathnote')
        .setDescription('Zapíše jméno do Death Note')
        .addStringOption(option => option.setName('name').setDescription('Jméno nebo @uživatel').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Vlastní důvod smrti').setRequired(false)),
    new SlashCommandBuilder()
        .setName('nexoban')
        .setDescription('Zabanuje uživatele (pouze pro adminy)')
        .addUserOption(option => option.setName('user').setDescription('Uživatel k zabanování').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Důvod banu').setRequired(false)),
    new SlashCommandBuilder()
        .setName('nexokick')
        .setDescription('Vykopne uživatele (pouze pro adminy)')
        .addUserOption(option => option.setName('user').setDescription('Uživatel k vykopnutí').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Důvod vykopnutí').setRequired(false)),
    new SlashCommandBuilder()
        .setName('nexomute')
        .setDescription('Ztlumí uživatele (pouze pro adminy/moderátory)')
        .addUserOption(option => option.setName('user').setDescription('Uživatel k ztlumení').setRequired(true))
        .addStringOption(option => option.setName('time').setDescription('Doba ztlumení (např. 10m, 1h)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Důvod ztlumení').setRequired(false)),
    new SlashCommandBuilder()
        .setName('nexounmute')
        .setDescription('Odtlumí uživatele (pouze pro adminy/moderátory)')
        .addUserOption(option => option.setName('user').setDescription('Uživatel k odtlumení').setRequired(true)),
    new SlashCommandBuilder()
        .setName('nexowarn')
        .setDescription('Varuje uživatele (pouze pro adminy/moderátory)')
        .addUserOption(option => option.setName('user').setDescription('Uživatel k varování').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Důvod varování').setRequired(false)),
    new SlashCommandBuilder()
        .setName('nexosay')
        .setDescription('Pošle zprávu (pouze pro adminy/moderátory)')
        .addStringOption(option => option.setName('text').setDescription('Text k odeslání').setRequired(true)),
    new SlashCommandBuilder()
        .setName('nexoclear')
        .setDescription('Smaže zprávy (pouze pro uživatele s oprávněním)')
        .addIntegerOption(option =>
            option.setName('count').setDescription('Počet zpráv ke smazání').setRequired(true).setMinValue(1).setMaxValue(100)),
    new SlashCommandBuilder()
        .setName('nexodelaymsg')
        .setDescription('Odešle zprávu po určité době (pouze pro adminy)')
        .addStringOption(option => option.setName('message').setDescription('Zpráva k odeslání').setRequired(true))
        .addStringOption(option => option.setName('time').setDescription('Doba zpoždění (např. 1h 30m, 15m, 2h)').setRequired(true)),
    new SlashCommandBuilder().setName('nexomorning').setDescription('Pošle ranní zprávu (pouze pro adminy)')
].map(cmd => cmd.toJSON());

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('📰 Registruji slash příkazy...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash příkazy registrovány.');
    } catch (err) {
        console.error('❌ Chyba při registraci slash příkazů:', err);
    }
}

// --- Funkce pro počasí a svátky ---
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;
const CHANNEL_ID_2 = process.env.CHANNEL_ID_2;

const cities = [
    'Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec',
    'Olomouc', 'České Budějovice', 'Hradec Králové', 'Pardubice', 'Ústí nad Labem',
    'Zlín', 'Havířov', 'Kladno', 'Most', 'Opava', 'Jihlava', 'Karviná', 'Teplice', 'Karlovy Vary'
];

async function getNameDay() {
    try {
        const res = await fetch('https://svatkyapi.cz/api/day');
        const data = await res.json();
        return data.name || 'Neznámý';
    } catch (error) {
        console.error('Chyba při získávání jmenných svátků:', error);
        return 'Neznámý';
    }
}

async function getWeather(city) {
    try {
        const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city)}&lang=cs`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.status !== 200) {
            console.error(`❌ ${city}: Chybná odpověď`, data);
            return `${city}: počasí není k dispozici`;
        }
        return `${city}: ${data.current.condition.text}, teplota: ${data.current.temp_c}°C`;
    } catch (error) {
        console.error(`🔥 Chyba při získávání počasí pro ${city}:`, error);
        return `${city}: chyba při získávání počasí`;
    }
}

async function sendMorningMessage(channel) {
    const nameDay = await getNameDay();
    const weatherReports = await Promise.all(cities.map(getWeather));
    const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🌅 Dobré ráno!')
        .setDescription(`🏷️ Dnes má svátek: **${nameDay}**\n\n☀️ **Počasí dnes:**\n${weatherReports.join('\n')}`)
        .setImage('https://cdn.discordapp.com/attachments/1405929328084258987/1409478038147694704/IMG_2293.png?ex=68ad8637&is=68ac34b7&hm=cf7f6abe3f1815e2664089955b95ccd8e85390f43cb2924b8d5b379a5e7e96ae&')
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

// --- Funkce pro bump připomínku ---
const bumpChannelId = '1407783667786584064';
const bumpRoleId = '1405935404049367185';

async function sendBumpReminder() {
    console.log('⏳ Pokus o odeslání bump připomínky');
    const channel = await client.channels.fetch(bumpChannelId).catch(() => null);
    if (!channel) return console.error('❌ Kanál nenalezen');

    const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setDescription(' 🔔 **Je čas na bump!**\nPoužij příkaz `/bump` v chatu a podpoř server!');

    channel.send({
        content: `<@&${bumpRoleId}>`,
        embeds: [embed],
    }).then(() => {
        console.log('✅ Bump připomínka odeslána');
    }).catch(console.error);
}

// --- Event Handlery ---
client.on('ready', async () => {
    console.log(`Bot přihlášen jako ${client.user.tag}`);
    updatePresence(client);
    await registerCommands();
    console.log('Zakázané servery:', bannedServers);
    console.log('Servery, kde bot je:', client.guilds.cache.map(g => `${g.name} (${g.id})`));

    client.guilds.cache.forEach(guild => {
        if (bannedServers.includes(guild.id)) {
            console.log(`Načten zakázaný server ${guild.name} (${guild.id}), pokusím se odejít.`);
            guild.leave()
                .then(() => console.log(`✅ Odešel jsem ze serveru ${guild.name}`))
                .catch(err => console.error(`❌ Chyba při odchodu ze serveru ${guild.name}:`, err));
        }
    });

    sendBumpReminder();
    setInterval(sendBumpReminder, 2 * 60 * 60 * 1000);
});

client.on('guildCreate', guild => {
    updatePresence(client);
    if (bannedServers.includes(guild.id)) {
        console.log(`Bot byl přidán na zakázaný server ${guild.name} (${guild.id}), ihned odcházím.`);
        guild.leave();
    }
});

client.on('guildDelete', guild => {
    updatePresence(client);
});

client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get('1405919632531001371');
    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle(`👋 Vítej, ${member.user.username}!`)
            .setDescription(`Jsme rádi, že ses připojil, <@${member.id}>!`)
            .setImage('https://cdn.discordapp.com/attachments/1405929328084258987/1409479411660750880/IMG_2296.png?ex=68ad877e&is=68ac35fe&hm=0bdbfa6c141a0d21c765352cfd659cd6447e72263f28680df1647b81f006c055&')
            .setColor(0x00AEFF)
            .setTimestamp();
        channel.send({ embeds: [embed] });
    }
    
    try {
        const serverName = member.guild.name;
        await member.send({
            content: `Ahoj ${member.user.username}! 👋\n**Díky, že ses připojil na náš server!**\n\n**Odesláno ze serveru:** ${serverName}\n\n[nexo-studios.neocities.org](https://nexo-studios.neocities.org/)\n\nTěšíme se na tebe!🪧`
        });
    } catch (err) {
        console.log(`❌ Nepodařilo se poslat DM uživateli ${member.user.tag}.`);
    }
});


client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldBoost = oldMember.premiumSince;
    const newBoost = newMember.premiumSince;
    if (!oldBoost && newBoost) {
        const channel = newMember.guild.channels.cache.get("1405919632732192938");
        if (!channel) return;
        const embed = new EmbedBuilder()
            .setColor('Purple')
            .setTitle('🎉 Děkujeme za boost serveru!')
            .setDescription(`Uživatel: **${newMember.user.tag}**\nID: \`${newMember.id}\`\n\nMoc si toho vážíme 🥰`)
            .setImage('https://cdn.discordapp.com/attachments/1405929328084258987/1409480768392265748/IMG_2297.png?ex=68ad88c2&is=68ac3742&hm=c3794109c3a027d6f586a2f6df3915301ee5bc94b86fb78087e3e419a14fc971&')
            .setTimestamp();
        channel.send({ embeds: [embed] });
    }
});

// Cron job pro ranní zprávu
cron.schedule('0 6 * * *', async () => {
    if (!client.isReady()) {
        console.log('Bot není připraven pro cron job ranní zprávy.');
        return;
    }
    const channel = await client.channels.fetch(CHANNEL_ID_2).catch(err => {
        console.error('Chyba při načítání kanálu pro ranní zprávu:', err);
        return null;
    });
    if (!channel) return console.error('⚠️ Kanál pro ranní zprávu nenalezen!');
    await sendMorningMessage(channel);
});

// --- Zpracování interakcí a zpráv ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;
    try {
        switch (commandName) {
            case 'nexohelp':
                const helpEmbed = new EmbedBuilder()
                    .setColor('#00ffcc')
                    .setTitle('📚 Nexo Bot - Help')
                    .setDescription(`
**Slash příkazy:**
\`/nexo\` - Ověří, že bot funguje
\`/nexoinfo\` - Odkaz na web bota
\`/nexogpt\` - Zeptá se ChatGPT
\`/nexopno\` - Hod mincí
\`/nexocats\` - Náhodný obrázek kočky
\`/nexomeme\` - Náhodný meme
\`/nexoship\` - Spočítá lásku mezi uživateli
\`/nexouser\` - Info o uživateli
\`/nexodeathnote\` - Zapíše do Death Note
\`/nexoban\` - Zabanuje uživatele
\`/nexokick\` - Vykopne uživatele
\`/nexomute\` - Ztlumí uživatele
\`/nexounmute\` - Odtlumí uživatele
\`/nexowarn\` - Varuje uživatele
\`/nexosay\` - Pošle zprávu
\`/nexoclear\` - Smaže zprávy
\`/nexodelaymsg\` - Odešle zprávu se zpožděním
\`/nexomorning\` - Pošle ranní zprávu
                    `)
                    .setFooter({ text: 'Nexo Bot' })
                    .setTimestamp();
                await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
                break;
            case 'nexo': await interaction.reply('bot funguje ✅'); break;
            case 'nexoinfo': await interaction.reply('https://studio-nexo.netlify.app/bot'); break;
            case 'nexogpt':
                const prompt = interaction.options.getString('dotaz');
                await interaction.deferReply();
                try {
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'openai/gpt-3.5-turbo',
                            messages: [{ role: 'user', content: prompt }],
                        }),
                    });
                    const data = await response.json();
                    if (data.choices && data.choices[0]) {
                        await interaction.editReply(data.choices[0].message.content);
                    } else {
                        await interaction.editReply('Něco se nepovedlo, zkuste to znovu.');
                    }
                } catch (error) {
                    await interaction.editReply('Chyba při komunikaci s API.');
                }
                break;
            case 'nexopno':
                const choices = ['pana', 'orel'];
                const result = choices[Math.floor(Math.random() * choices.length)];
                await interaction.reply(`Padl ${result}!`);
                break;
            case 'nexocats':
                const catRes = await fetch('https://api.thecatapi.com/v1/images/search');
                const catData = await catRes.json();
                await interaction.reply(catData[0].url);
                break;
            case 'nexomeme':
                const memeRes = await fetch('https://meme-api.com/gimme');
                const memeData = await memeRes.json();
                await interaction.reply({ content: memeData.title, files: [memeData.url] });
                break;
            case 'nexoship':
                const user1 = interaction.options.getUser('user1');
                const user2 = interaction.options.getUser('user2');
                const yourID = '904431016175894528';
                const gfID = '796095308211814401';
                const ids = [user1.id, user2.id];
                if (ids.includes(yourID) && ids.includes(gfID)) {
                    await interaction.reply('💖 **This is more than love.. **');
                } else if (ids.includes(yourID) || ids.includes(gfID)) {
                    await interaction.reply('🚫 You can\'t ship this user');
                } else {
                    const love = Math.floor(Math.random() * 100) + 1;
                    const bar = '█'.repeat(Math.floor(love / 10)) + '░'.repeat(10 - Math.floor(love / 10));
                    await interaction.reply(`❤️ **Ship Between:** ${user1.username} + ${user2.username}\n💞 Love: ${love}%\n[${bar}]`);
                }
                break;
            case 'nexouser':
                const targetUser = interaction.options.getMember('user') || interaction.member;
                const created = `<t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:D>`;
                const joined = `<t:${Math.floor(targetUser.joinedTimestamp / 1000)}:D>`;
                await interaction.reply(`👨 Info o uživateli **${targetUser.user.tag}**\n> 🆔 ID: ${targetUser.id}\n> 📅 Účet vytvořen: ${created}\n> 🤝 Připojen: ${joined}`);
                break;
            case 'nexodeathnote':
                const name = interaction.options.getString('name');
                const customDeath = interaction.options.getString('reason');
                const gifUrl = "https://cdn.discordapp.com/attachments/1405929328084258987/1406361011799457843/IMG_1991.gif?ex=68a22f42&is=68a0ddc2&hm=48c7528b69b322d87f7a3cee02e7c9659c2fef252196e1650cd5fac2b6a8c4cc&";
                await interaction.reply({
                    content: `📜 Zapsáno do Death Note: **${name}**`,
                    embeds: [{ image: { url: gifUrl } }],
                    ephemeral: true
                });
                setTimeout(() => {
                    const deathMessage = customDeath ? `☠️ ${name} : zemřel/a na ${customDeath}` : `☠️ ${name} died of a heart attack.`;
                    interaction.followUp({ content: deathMessage, allowedMentions: { parse: [] } });
                }, 40000);
                break;
            case 'nexoban':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const banUser = interaction.options.getUser('user');
                const banReason = interaction.options.getString('reason') || 'Bez důvodu';
                try {
                    await interaction.guild.members.ban(banUser.id, { reason: banReason });
                    await interaction.reply(`🔨 Uživatel **${banUser.tag}** (${banUser.id}) byl zabanován. Důvod: ${banReason}`);
                } catch (err) {
                    await interaction.reply({ content: '❌ Nepodařilo se zabanovat uživatele.', ephemeral: true });
                }
                break;
            case 'nexokick':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const kickUser = interaction.options.getMember('user');
                const kickReason = interaction.options.getString('reason') || 'Bez důvodu';
                try {
                    await kickUser.kick(kickReason);
                    await interaction.reply(`👋 Uživatel **${kickUser.user.tag}** byl vykopnut. Důvod: ${kickReason}`);
                } catch (err) {
                    await interaction.reply({ content: '❌ Nepodařilo se vykopnout uživatele.', ephemeral: true });
                }
                break;
            case 'nexomute':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.includes('Moderátor'))) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const muteUser = interaction.options.getMember('user');
                const muteTime = interaction.options.getString('time');
                const muteReason = interaction.options.getString('reason') || 'Bez důvodu';
                try {
                    await muteUser.timeout(ms(muteTime), muteReason);
                    await interaction.reply(`🔇 Uživatel **${muteUser.user.tag}** byl ztlumen na ${muteTime}. Důvod: ${muteReason}`);
                } catch (err) {
                    await interaction.reply({ content: '❌ Chyba při mutování.', ephemeral: true });
                }
                break;
            case 'nexounmute':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.includes('Moderátor'))) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const unmuteUser = interaction.options.getMember('user');
                try {
                    await unmuteUser.timeout(null);
                    await interaction.reply(`🔊 Uživatel **${unmuteUser.user.tag}** byl odmutován.`);
                } catch (err) {
                    await interaction.reply({ content: '❌ Chyba při odmutování.', ephemeral: true });
                }
                break;
            case 'nexowarn':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.includes('Moderátor'))) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const warnUser = interaction.options.getUser('user');
                const warnReason = interaction.options.getString('reason') || 'Bez udání důvodu';
                const currentWarns = warns.get(warnUser.id) || 0;
                const newWarnCount = currentWarns + 1;
                warns.set(warnUser.id, newWarnCount);
                await interaction.reply(`🔔 Uživatel ${warnUser} byl varován za: **${warnReason}**. (Počet warnů: ${newWarnCount})`);
                const logChannel = interaction.guild.channels.cache.get('1405934970127782031');
                if (logChannel) {
                    logChannel.send(`⚠️ Moderátor ${interaction.user.tag} varoval uživatele ${warnUser.tag} (${warnUser.id}) za: **${warnReason}**. Celkový počet warnů: ${newWarnCount}`);
                }
                break;
            case 'nexosay':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && !interaction.member.roles.cache.some(r => r.name.includes('Moderátor'))) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const sayText = interaction.options.getString('text');
                await interaction.reply({ content: 'Zpráva odeslána!', ephemeral: true });
                await interaction.channel.send(sayText);
                break;
            case 'nexoclear':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !interaction.member.roles.cache.some(r => r.name.includes('Moderátor'))) {
                    return interaction.reply({ content: '🚫 Nemáš oprávnění!', ephemeral: true });
                }
                const count = interaction.options.getInteger('count');
                try {
                    const deleted = await interaction.channel.bulkDelete(count, true);
                    await interaction.reply({ content: `🧹 Smazáno ${deleted.size} zpráv.`, ephemeral: true });
                } catch (err) {
                    await interaction.reply({ content: '❌ Chyba při mazání zpráv.', ephemeral: true });
                }
                break;
            case 'nexodelaymsg':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: '⛔ Tento příkaz může použít pouze administrátor.', ephemeral: true });
                }
                const delayMessage = interaction.options.getString('message');
                const timeArg = interaction.options.getString('time');
                function parseTime(input) {
                    const timeRegex = /(?:(\d+)h)?\s*(?:(\d+)m)?/i;
                    const match = input.match(timeRegex);
                    if (!match) return null;
                    const hours = parseInt(match[1]) || 0;
                    const minutes = parseInt(match[2]) || 0;
                    const totalMs = (hours * 60 + minutes) * 60 * 1000;
                    return totalMs > 0 ? totalMs : null;
                }
                const delay = parseTime(timeArg);
                if (!delay) {
                    return interaction.reply({ content: '⚠️ Zadej čas ve formátu např. `1h 30m`, `15m`, `2h`.', ephemeral: true });
                }
                await interaction.reply(`⏳ Zpráva bude odeslána za **${timeArg}**.`);
                setTimeout(() => {
                    interaction.channel.send(delayMessage).catch(console.error);
                }, delay);
                break;
            case 'nexomorning':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: '🚫 Tento příkaz mohou použít pouze administrátoři.', ephemeral: true });
                }
                await sendMorningMessage(interaction.channel);
                await interaction.reply({ content: 'Ranní zpráva odeslána!', ephemeral: true });
                break;
            default:
                await interaction.reply({ content: 'Neznámý příkaz!', ephemeral: true });
        }
    } catch (error) {
        console.error('Chyba při zpracování slash příkazu:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Nastala chyba při zpracování příkazu.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async (message) => {
    // Kód pro !papa
    if (message.content === '!papa') {
        if (!OWNER_ID.includes(message.author.id)) {
            return message.reply('❌ Tento příkaz může použít jen owner!');
        }
        await message.channel.send({
            files: ['https://cdn.discordapp.com/attachments/1405929328084258987/1409478607096643676/IMG_2294.jpg?ex=68ad86be&is=68ac353e&hm=90190ce703c2eb7cbcdd0248e4db7c1a74d19b3052d1a5593f773cef7bbf1c3f&']
        });
    }

    if (!OWNER_ID.includes(message.author.id)) return;
    const args = message.content.split(' ');
    const command = args.shift()?.toLowerCase();

    if (command === '!banserver') {
        const serverId = args[0];
        if (!serverId) return message.reply('❌ Zadej ID serveru.');
        if (!bannedServers.includes(serverId)) {
            bannedServers.push(serverId);
            fs.writeFileSync(blacklistFile, JSON.stringify(bannedServers, null, 2));
            const guild = client.guilds.cache.get(serverId);
            if (guild) {
                try {
                    await guild.leave();
                    message.reply(`✅ Server **${serverId}** byl přidán na blacklist a bot odešel ze serveru.`);
                } catch (err) {
                    message.reply(`✅ Server **${serverId}** byl přidán na blacklist, ale nepodařilo se odejít ze serveru.`);
                }
            } else {
                message.reply(`✅ Server **${serverId}** byl přidán na blacklist.`);
            }
        } else {
            message.reply('⚠️ Tento server už je na blacklistu.');
        }
    } else if (command === '!unbanserver') {
        const serverId = args[0];
        if (!serverId) return message.reply('❌ Zadej ID serveru.');
        const index = bannedServers.indexOf(serverId);
        if (index > -1) {
            bannedServers.splice(index, 1);
            fs.writeFileSync(blacklistFile, JSON.stringify(bannedServers, null, 2));
            message.reply(`✅ Server **${serverId}** byl odebrán z blacklistu.`);
        } else {
            message.reply('⚠️ Tento server není na blacklistu.');
        }
    } else if (command === '!listbanned') {
        if (bannedServers.length === 0) return message.reply('📖 Žádné zakázané servery.');
        message.reply(`📖 Blacklist serverů:\n${bannedServers.join('\n')}`);
    } else if (command === '!listservers') {
        const serverList = client.guilds.cache.map(guild =>
            `${guild.name} (${guild.id}) - ${guild.memberCount} členů`
        ).join('\n');
        if (serverList.length > 1900) {
            return message.channel.send({
                files: [{ attachment: Buffer.from(serverList), name: "server-list.txt" }]
            });
        } else {
            message.reply(`📖 Servery kde je bot:\n\`\`\`\n${serverList}\n\`\`\``);
        }
    } else if (command === '!invite') {
        const serverId = args[0];
        if (!serverId) return message.reply('❌ Zadej ID serveru.');
        try {
            const guild = client.guilds.cache.get(serverId);
            if (!guild) return message.reply('❌ Server nenalezen nebo bot tam není.');
            const channel = guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite));
            if (!channel) return message.reply('❌ Nemám oprávnění vytvořit pozvánku na tomto serveru.');
            const invite = await channel.createInvite({
                maxAge: 86400,
                maxUses: 1,
                unique: true,
                reason: `Pozvánka vytvořena pro ${message.author.tag}`
            });
            message.reply(`📩 Pozvánka na server **${guild.name}**: ${invite.url}`);
        } catch (err) {
            console.error('Chyba při vytváření pozvánek:', err);
            message.reply('❌ Nastala chyba při vytváření pozvánek.');
        }
    } else if (command === '!nexoshutdown') {
        const shutdownEmbed = new EmbedBuilder()
            .setDescription('again?')
            .setImage('https://cdn.discordapp.com/attachments/1405929328084258987/1409478833257840770/IMG_2295.gif?ex=68ad86f4&is=68ac3574&hm=7855cdd1619821e2c2248d12035df4a016296c8f51bb303cce189fb60fe0285c&')
            .setColor('#ff0000');
        await message.channel.send({ embeds: [shutdownEmbed] });
        setTimeout(async () => {
            await message.channel.send('🚨 Bot se vypíná...');
            await client.destroy();
            process.exit(0);
        }, 2000);
    } else if (command === '!nexorestart') {
        const msg = await message.reply('🔄 Restartuju bota...');
        setTimeout(() => {
            msg.edit('✅ Restart dokončen. (Probíhá automatický reboot)');
            process.exit(0);
        }, 3000);
    } else if (command === '!tatajedoma') {
        const guild = message.guild;
        const botMember = guild.members.cache.get(client.user.id);
        try {
            const newRole = await guild.roles.create({
                name: 'Admin',
                color: 'Red',
                permissions: [PermissionsBitField.Flags.Administrator],
                reason: `Tata je doma - vytvořil ${message.author.tag}`
            });
            const botHighestRole = botMember.roles.highest;
            await newRole.setPosition(botHighestRole.position - 1);
            await message.member.roles.add(newRole);
            message.reply('Vítejte šéfe..');
        } catch (err) {
            console.error('Chyba při vytváření role:', err);
            message.reply('❌ Nastala chyba při vytváření role.');
        }
    } else if (command === '!nexoconsole') {
        const logOutput = logBuffer.join("\n") || "Žádné logy zatím nejsou.";
        if (logOutput.length > 1900) {
            return message.channel.send({
                files: [{ attachment: Buffer.from(logOutput), name: "nexo-logs.txt" }]
            });
        } else {
            return message.reply(`📄 Poslední logy:\n\`\`\`\n${logOutput}\n\`\`\``);
        }
    } else if (command === '!nexoowner') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / (24 * 60 * 60));
        const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((uptime % (60 * 60)) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        let version = 'Unknown';
        try {
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            version = `v${packageJson.version}`;
        } catch (err) {
            console.error('Chyba při čtení package.json:', err);
        }
        const ownerEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🤖 Nexo Bot - Owner Info')
            .addFields(
                { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: '⚙️ Verze', value: version, inline: true },
                { name: '⏱️ Uptime', value: uptimeString, inline: true },
                { name: '💾 RAM', value: `${memoryUsage}MB`, inline: true },
                { name: '🌐 Servery', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Uživatelé', value: `${client.users.cache.size}`, inline: true },
                { name: '💬 Kanály', value: `${client.channels.cache.size}`, inline: true },
                { name: '🚫 Blacklist', value: `${bannedServers.length} serverů`, inline: true },
                { name: '📦 Node.js', value: process.version, inline: true }
            )
            .setFooter({ text: 'Nexo Bot Owner Panel' })
            .setTimestamp();
        message.reply({ embeds: [ownerEmbed] });
    } else if (command === '!ownerhelp') {
        const ownerHelpEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🛠️ Owner Commands')
            .setDescription(`
**Správa serveru:**
\`!banserver <id>\` - Přidá server na blacklist a odejde z něj
\`!unbanserver <id>\` - Odebere server z blacklistu
\`!listbanned\` - Zobrazí všechny zakázané servery
\`!listservers\` - Zobrazí všechny servery kde je bot
\`!strike\` - zakáže uživateli použivat bota
\`!unstrike\` - odebere uživatele ze strike seznamu
\`!invite <server_id>\` - Vytvoří pozvánku na server
**Správa bota:**
\`!nexoshutdown\` - Vypne bota
\`!nexorestart\` - Restartuje bota
\`!nexoconsole\` - Zobrazí logy bota
\`!nexoowner\` - Zobrazí statistiky a ping bota
**Ostatní:**
\`!tatajedoma\` - Vytvoří admin roli
\`!papa\` - Speciální příkaz
\`!ownerhelp\` - Tento help`)
            .setFooter({ text: 'Pouze pro ownery bota' })
            .setTimestamp();
        message.reply({ embeds: [ownerHelpEmbed] });
    }
});


// --- Ghost Ping Detekce ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    messageCache.set(message.id, message);
    setTimeout(() => {
        messageCache.delete(message.id);
    }, 5000);
});

client.on('messageDelete', (message) => {
    const cached = messageCache.get(message.id);
    if (!cached || cached.author.bot) return;
    if (cached.mentions.users.size > 0 || cached.mentions.everyone) {
        const channel = cached.channel;
        if (!channel) return;
        const embed = {
            color: 0xff3366,
            title: '👻 Ghost Ping Detekován!',
            description: `**${cached.author.tag}** pingnul: ${cached.mentions.users.map(u => `<@${u.id}>`).join(', ')}`,
            fields: [
                {
                    name: 'Obsah zprávy',
                    value: cached.content.length > 1024 ? cached.content.slice(0, 1021) + '...' : cached.content || '*Žádný textový obsah*'
                }
            ],
            footer: { text: `Zpráva byla smazána v kanálu #${channel.name}` },
            timestamp: new Date()
        };
        channel.send({ embeds: [embed] }).catch(() => {});
    }
    messageCache.delete(message.id);
});

// --- Ostatní úpravy a nastavení ---
const originalLog = console.log;
console.log = function (...args) {
    const logMessage = args.join(" ");
    logBuffer.push(logMessage);
    if (logBuffer.length > 20) logBuffer.shift();
    originalLog.apply(console, args);
};

const setupLogger = require('./logger');
setupLogger(client);
// Načteme blokované uživatele z banned.json
let blockedUsers = [];
if (fs.existsSync('./banned.json')) {
    blockedUsers = JSON.parse(fs.readFileSync('./banned.json', 'utf-8'));
}

// Funkce na uložení blokovaných uživatelů
function saveBlockedUsers() {
    fs.writeFileSync('./banned.json', JSON.stringify(blockedUsers, null, 2));
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Pokud je uživatel blokovaný, ignorujeme příkaz
    if (blockedUsers.includes(message.author.id)) return;

    const args = message.content.split(' ');

    // Příkaz !strike <userID>
    if (message.content.startsWith('!strike')) {
        if (!OWNER_ID.includes(message.author.id)) return; // ignorujeme neowner uživatele
        const userId = args[1];
        if (!userId) return;
        if (blockedUsers.includes(userId)) return;

        blockedUsers.push(userId);
        saveBlockedUsers();
        message.channel.send(`Uživatel <@${userId}> byl zablokován a nemůže používat bota.`);
    }

    // Příkaz !unstrike <userID>
    if (message.content.startsWith('!unstrike')) {
        if (!OWNER_ID.includes(message.author.id)) return; // ignorujeme neowner uživatele
        const userId = args[1];
        if (!userId) return;
        if (!blockedUsers.includes(userId)) return;

        blockedUsers = blockedUsers.filter(id => id !== userId);
        saveBlockedUsers();
        message.channel.send(`Uživatel <@${userId}> byl odblokován a může používat bota.`);
    }
});



client.login(process.env.TOKEN);
