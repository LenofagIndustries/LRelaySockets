'use strict'

var config = require("./config.js")
var utils = require("./utils.js")
const Discord = require("discord.js")
var dclient = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES]})

const express = require("express");

const app = express();
var expressWS = require('express-ws')(app)
var wssrelay = expressWS.getWss("/relay")

var queue = []
var status = {}
var serversws = {}
var inforequests = []

app.ws("/relay", (ws, req) => {
    var goodip = `${ws._socket.remoteAddress.slice(7)}:${ws._socket.remotePort}`, selfname;

    if(!req.headers.authorization || !utils.checkAuth(req.headers.authorization)) {
        console.log(`[express] rejected ${goodip} (not authorized)`)
        ws.send(JSON.stringify({error: "auth", details: `invalid token`}))
        return ws.close(4401)
    }
    
    console.log(`[express] connected with ${goodip}`)
    ws.on("message", msg => {
        var parsed;
        try {
            parsed = JSON.parse(msg);
        } catch(err) {ws.send(JSON.stringify({error: "parse", details: `${err}`})); return console.log(`[express] JSON.parse errored: ${err}`)}

        switch(parsed.type) {
            case "identify":
                if(!parsed.name) return ws.send(JSON.stringify({error: "identify", details: `invalid name`}));
                serversws[parsed.name] = ws, selfname = parsed.name
                console.log(`[express] ${goodip} identified itself as "${selfname}"`)
            break
            case "message":
                if(!parsed.message) return ws.send(JSON.stringify({error: "message", details: `invalid message`}));
                var message = {}
                if(typeof parsed.message == "string") message.content = parsed.message;
                if(typeof parsed.message == "object") {
                    if(parsed.message.content) message.content = parsed.message.content;
                    if(parsed.message.embed) message.embeds = [parsed.message.embed];
                }
                //console.log(`[express] sending a message for ${req.socket.remoteAddress}`)
                dclient.channels.cache.get(config.channels.relay).send(message).catch(err => {
                    console.log(`[discord] error sending a message: ${err}`)
                    ws.send(JSON.stringify({error: "message", details: `error sending message: ${err}`}))
                })
            break
            case "console":
                if(!parsed.message || typeof parsed.message != "string") return ws.send(JSON.stringify({error: "console", details: `invalid message`}));

                if(parsed.message == "\n" && queue.length >= 1) return queue[queue.length - 1].text = `${queue[queue.length - 1].text}\n`; else if(parsed.message == "\n" && queue.length == 0) return;
                if(queue.length >= 1 && queue[queue.length - 1].text.slice(-1) != "\n") return queue[queue.length - 1].text = `${queue[queue.length - 1].text}${parsed.message}`;
                
                var last = queue[queue.length - 1]
                if(last && last.text.trim() == parsed.message.trim()) return last.count++;

                queue.push({text: parsed.message, count: 1})
            break
            case "status":
                if(!selfname) return ws.send(JSON.stringify({error: "status", details: `not identified`}));

                status[parsed.name] = {
                    uptime: parsed.uptime ?? 0,
                    players: parsed.players ?? [],
                    map: parsed.map ?? "unknown",
                    ip: parsed.ip ?? "unknown",
                    name: parsed.hostname ?? "unknown",
                    lastupdate: Date.now()
                }
            break
            case "inforequest":
                if(!parsed.id || !inforequests[parsed.id]) return ws.send(JSON.stringify({error: "inforequest", details: `unknown request`}));
                if(!parsed.info) return ws.send(JSON.stringify({error: "inforequest", details: `invalid info`}));
                inforequests[parsed.id](parsed.info)
            break
        }
    })

    ws.on("error", (err) => console.log(`[express] error in ${goodip} connection: ${err}`))
    ws.on("close", () => {console.log(`[express] connection closed with ${goodip}${selfname ? ` (${selfname})` : ""}`); if(selfname && serversws[selfname]) delete serversws[selfname]})
})

function* pastedChunking(e,n){for(let i=0;i<e.length;i+=n)yield e.slice(i,i+n)} // minified https://stackoverflow.com/a/55435856
setInterval(() => {
    if(!queue.length) return;
    var oqueue = queue; var big = false;
    var msg = "";
    if(queue.length >= 16) {var a = [...pastedChunking(queue, 8)]; queue = a[0]; oqueue = oqueue.slice(8); big = true};
    queue.forEach(a => msg += `${a.text.trim()}${a.count > 1 ? ` (x${a.count})` : ""}\n`); queue = big ? oqueue : []; oqueue = []; msg = msg.replaceAll("@", "@\u200b")/*.replaceAll("_", "\u200b_").replaceAll("*", "\\*").replaceAll("`", "\\`").replaceAll("|", "\\|").replaceAll("~", "\\~")*/ // pasted myself
    dclient.channels.cache.get(config.channels.console).send({content: `${msg}`}).catch(err => console.log(`[discord] error sending to console: ${err}`))
}, 2000)

// This is an API for your server status and player info requests
// This should be available for http://[ip/domain]/status/[status server name]] or .../player/[status server name]/[SteamID or Steam custom URL]
// Status server name is configured at sv_config.lua! (LRELAY.statusName)

app.get("/status/:name", (req, res) => {
    var name = req.params.name; if(!name || typeof name != "string" || name.trim() == "") return res.status(400).json({error: "name", details: "invalid name"})
    var sdata = status[name]; if(!sdata) return res.status(404).json({error: "name", details: "unknown name"})

    res.header("Access-Control-Allow-Origin", "*")
    res.status(200).json(sdata)
})

var playercached = []
app.get("/player/:server/:part", (req, res) => {
    var server = req.params.server; if(!server || typeof server != "string" || server.trim() == "" || !serversws[server]) return res.status(400).json({error: "playerinfo", details: "invalid server"})
    var part = req.params.part; if(!part || typeof part != "string" || part.trim() == "") return res.status(400).json({error: "playerinfo", details: "invalid part (steamid/url/customurl)"})

    var tm, steamid;
    utils.fetchSteamID(part)
        .then(tsteamid => {
            steamid = tsteamid
            if(playercached[steamid.getSteamID64()]) return res.status(200).json(playercached[steamid.getSteamID64()]);
            if(inforequests[steamid.getSteam2RenderedID()]) return res.status(429).json({error: "playerinfo", details: "request already in progress"})
            console.log(`[express] requesting from "${server}" - "${part}"`)

            serversws[server].send(JSON.stringify({type: "inforequest", steamid: steamid.getSteam2RenderedID()}))
            tm = setTimeout(() => {res.status(408).json({error: "playerinfo", details: "server did not respond"}); delete inforequests[steamid.getSteam2RenderedID()]}, 2500)
            inforequests[steamid.getSteam2RenderedID()] = info => {
                clearTimeout(tm); delete inforequests[steamid.getSteam2RenderedID()]
                setTimeout(() => delete playercached[steamid.getSteamID64()], 15000)
                // prevents spamming with invalid users
                playercached[steamid.getSteamID64()] = {error: "playerinfo", details: "not found"}
                if(info.notfound) return res.status(404).json({error: "playerinfo", details: "not found"})
                var ninfo = {
                    avatar: info.avatar ?? "https://lenofag.ru/files/image/invalid_pfp.png", // spooky iplogger
                    group: info.group ?? "user",
                    name: info.name ?? "(unknown name)",
                    steamid64: steamid.getSteamID64(),
                    steamid: steamid.getSteam2RenderedID(),
                    playing: info.playing ?? false,
                    lastjoined: info.lastjoined ?? Math.floor(Date.now() / 1000),
                    totaltime: info.totaltime ?? 0,
                    ban: info.ban ?? false
                }

                res.status(200).json(ninfo)
                playercached[steamid.getSteamID64()] = ninfo

                setTimeout(() => delete playercached[steamid.getSteamID64()], 15000)
            }
        })
        .catch(err => {
            res.status(500).json({error: "playerinfo", details: `${err}`})
            if(tm) clearTimeout(tm)
            if(tsteamid && inforequests[tsteamid.getSteam2RenderedID()]) delete inforequests[tsteamid.getSteam2RenderedID()]
        })
})

app.listen(config.port, () => {
    console.log(`[express] relay started at ${config.port} port`)
})

dclient.on("messageCreate", (message) => {
    if(!message.author.bot && message.author != dclient.user && message.content) {
        if(message.author.id == dclient.application.owner.id && message.content == "LRELAY!!!ClearThisShit") return queue = []; // This command will only be accessible for bot's owner (This will NOT work with teams!!!)
        switch(message.channel.id) {
            case config.channels.relay:
                wssrelay.clients.forEach(client => {
                    client.send(JSON.stringify({type: "message", content: message.content, author: {name: message.member.displayName, username: message.author.username, discrimator: message.author.discriminator, color: message.member.displayColor == 0 ? 16777215 : message.member.displayColor, avatar: message.member.displayAvatarURL()}}))
                })
            break
            case config.channels.console:
                wssrelay.clients.forEach(client => {
                    client.send(JSON.stringify({type: "console", content: message.content, author: {name: message.member.displayName, username: message.author.username, discriminator: message.author.discriminator, color: message.member.displayColor, id: message.author.id}}))
                })
            break
        }

    }
})
dclient.on("ready", () => console.log(`[discord] bot started as ${dclient.user.tag}`))
dclient.login(config.token)
