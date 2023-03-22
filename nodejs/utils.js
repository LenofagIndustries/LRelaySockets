"use strict"

var config = require("./config.js")
const axios = require("axios")
const SteamID = require("steamid")

var checkAuth = (t) => {
    var ret = false
    config.auth.forEach(token => {if(token == t) ret = true})
    return ret
}

var steamIDCache = []
var fetchSteamID = (req) => { req = req.trim()
    return new Promise((_resolve, reject) => {
        if(steamIDCache[req]) return _resolve(steamIDCache[req]);
        if(req == "") reject("No input");
        if(req == "BOT") reject("Very funny of you")

        var resolve = (a) => {_resolve(a); steamIDCache[req] = a}
        try {resolve(new SteamID(req))}
        catch {
            var customurl, matched = req.match(/^(?:https?:\/\/)?steamcommunity.com\/(id|profiles)\/(.*)$/);
            if(matched) {
                switch(matched[1]) {
                    case "id":
                        customurl = matched[2]
                    break
                    case "profiles":
                        try {resolve(new SteamID(matched[2]))} catch {reject("Invalid profile")}
                    return;
                    default:
                        reject("Impossible point reached!")
                    return;
                }
            } else customurl = req;

            if(!customurl) reject("Bad input")
            axios.get(`https://steamcommunity.com/id/${customurl}?xml=1`)
                .then(res => {
                    try {resolve(new SteamID(res.data.match(/<steamID64>(.*)<\/steamID64>/)[1]))}
                    catch {reject("Nothing found")}
                })
                .catch(() => reject("Nothing found"))
        }
    })
}

module.exports = {
    checkAuth, fetchSteamID
}