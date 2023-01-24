'use strict'

var config = require("./config.js")
const Discord = require("discord.js")
var dclient = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES]})

const express = require("express");

const app = express();
var expressWS = require('express-ws')(app)
var wssrelay = expressWS.getWss("/relay")

var checkAuth = (t) => {
    config.auth.forEach(token => {if(token == t) return true})
    return false
}

var queue = []
var status = {}

app.ws("/relay", (ws) => {
    var goodip = `${ws._socket.remoteAddress.slice(7)}:${ws._socket.remotePort}`
    console.log(`[express] connected with ${goodip}`)
    ws.on("message", msg => {
        var parsed;
        try {
            parsed = JSON.parse(msg);
        } catch(err) {ws.send(JSON.stringify({error: "parse", details: `${err}`})); return console.log(`[express] JSON.parse errored: ${err}`)}

        if(!parsed.token || checkAuth(parsed.token)) return ws.send(JSON.stringify({error: "auth", details: `invalid token`}));
        switch(parsed.type) {
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
                if(!parsed.message || typeof parsed.message != "string") return ws.send(JSON.stringify({error: "message", details: `invalid message`}));
                //if(parsed.message.trim() == "") return;

                if(parsed.message == "\n" && queue.length >= 1) return queue[queue.length - 1] = `${queue[queue.length - 1]}\n`; else if(parsed.message == "\n" && queue.length == 0) return;
                if(queue.length >= 1 && queue[queue.length - 1].slice(-1) != "\n") return queue[queue.length - 1] = `${queue[queue.length - 1]} ${parsed.message}`;
                queue.push(parsed.message)
            break
            case "status":
                if(!parsed.name || typeof parsed.name != "string" || parsed.name.trim() == "") return ws.send(JSON.stringify({error: "status", details: `invalid name`}));
                var sdata = {}
                sdata.uptime = parsed.uptime ?? 0
                sdata.players = parsed.players ?? []
                sdata.map = parsed.map ?? "unknown"
                sdata.ip = parsed.ip ?? "unknown"
                sdata.name = parsed.hostname ?? "unknown"
                sdata.lastupdate = Date.now()
                status[parsed.name] = sdata
            break
        }
    })

    ws.on("error", (err) => console.log(`[express] error in ${goodip} connection: ${err}`))
    ws.on("close", () => console.log(`[express] connection closed with ${goodip}`))
})

function* pastedChunking(e,n){for(let i=0;i<e.length;i+=n)yield e.slice(i,i+n)} // minified https://stackoverflow.com/a/55435856
setInterval(() => {
    if(!queue.length) return;
    var oqueue = queue; var big = false;
    var msg = "";
    if(queue.length >= 16) {var a = [...pastedChunking(queue, 8)]; queue = a[0]; oqueue = oqueue.slice(8); big = true};
    queue.forEach(a => msg += `${a}`); queue = big ? oqueue : []; oqueue = []; msg = msg.replaceAll("_", "\\_")/*.replaceAll("*", "\\*").replaceAll("`", "\\`").replaceAll("|", "\\|").replaceAll("~", "\\~")*/.replaceAll("@", "@ ") // pasted myself
    dclient.channels.cache.get(config.channels.console).send({content: `${msg}`}).catch(err => console.log(`[discord] error sending to console: ${err}`))
}, 2000)

// This is an API for your server status
// This should be available for http://[ip/domain]/status/[status server name]]
// Status server name is configured at sv_config.lua! (LRELAY.statusName)

app.get("/status/:name", (req, res) => {
    var name = req.params.name; if(!name || typeof name != "string" || name.trim() == "") return res.status(400).json({error: "name", details: "invalid name"})
    var sdata = status[name]; if(!sdata) return res.status(404).json({error: "name", details: "unknown name"})

    res.header("Access-Control-Allow-Origin", "*")
    res.status(200).json(sdata)
})

app.listen(config.port, () => {
    console.log(`[express] relay started at ${config.port} port`)
})

dclient.on("messageCreate", (message) => {
    if(!message.author.bot && message.author != dclient.user && message.content) {
        if(message.author.id && message.content == "LRELAY!!!ClearThisShit") return queue = [];
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
