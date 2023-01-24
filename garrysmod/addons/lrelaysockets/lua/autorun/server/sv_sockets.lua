require("gwsockets")

util.AddNetworkString("LRELAYS:Message")

local socket = LRELAY.socket and LRELAY.socket or GWSockets.createWebSocket(LRELAY.socketPath)
if    socket ~= LRELAY.socket then LRELAY.socket = socket socket:open() else print("[LRelay] Script updated, using previos connection") end

LRELAY.SendMessage = function(content)
    if socket:isConnected() then socket:write(util.TableToJSON({type = "message", message = content, token = LRELAY.token})) end
end

LRELAY.SendToConsole = function(content)
    if socket:isConnected() then socket:write(util.TableToJSON({type = "console", message = utf8.force(content), token = LRELAY.token})) end
end

LRELAY.SendStatus = function(uptime, players, map, ip, name)
    if socket:isConnected() then socket:write(util.TableToJSON({type = "status", name = LRELAY.statusName, uptime = uptime or 0, players = players or {}, map = map or "gm_bigcity_improved", ip = ip or game.GetIPAddress() or "unknown ip", hostname = name or "no name", token = LRELAY.token})) end
end

-- pasted from original LRelay written by me (Lenofag-2000)
LRELAY.avatars = LRELAY.avatars or {INVALID = "https://lenofag.ru/files/image/invalid_pfp.png"}
gameevent.Listen("player_connect")
hook.Add("player_connect", "LRELAYS:ConnectMSG", function(data)
    local pfp = LRELAY.avatars[data.networkid] or LRELAY.avatars.INVALID

    if data.bot == 0 and pfp == LRELAY.avatars.INVALID then
        http.Fetch("https://steamcommunity.com/profiles/" .. util.SteamIDTo64(data.networkid) .. "?xml=1", function(body)
            local da = string.match(body, "https://avatars.akamai.steamstatic.com/[/A-z0-9%-_%.,%(%)]+_full.jpg")
            print(da)
            if not da or da == "" then
                LRELAY.avatars[data.networkid] = LRELAY.avatars.INVALID
                pfp = LRELAY.avatars.INVALID
            else
                LRELAY.avatars[data.networkid] = da
                pfp = da
            end
        end, function() LRELAY.avatars[data.networkid] = LRELAY.avatars.INVALID pfp = LRELAY.avatars.INVALID end)
    end

    timer.Simple(1, function()
        LRELAY.SendMessage({
            content = util.SteamIDTo64(data.networkid) == 76561198357469388 and "WTF <@388964061397778432>", -- Zvbhrf has awoken!
            embed = {
                author = {
                    name = string.format("%s connecting", data.name),
                    icon_url = pfp,
                    url = data.bot == 0 and "https://steamcommunity.com/profiles/" .. util.SteamIDTo64(data.networkid) or "https://steamcommunity.com/id/garry"
                },
                color = 6618980
            }
        })
    end)
end)

hook.Add("PlayerInitialSpawn", "LRELAYS:ConnectInitialSpawnMSG", function(ply)
    timer.Simple(1, function() LRELAY.SendMessage({embed = {author = {name = string.format("%s spawned", ply:Name()), icon_url = LRELAY.avatars[ply:SteamID()] or LRELAY.avatars.INVALID, url = not ply:IsBot() and "https://steamcommunity.com/profiles/" .. ply:SteamID64() or "https://steamcommunity.com/id/garry"}, color = 6618980}}) end)
end)

gameevent.Listen("player_disconnect")
hook.Add("player_disconnect", "LRELAYS:DisconnectMSG", function(data)
    LRELAY.SendMessage({embed = {author = {name = string.format("%s disconnected", data.name), icon_url = LRELAY.avatars[data.networkid] or LRELAY.avatars.INVALID, url = data.bot == 0 and "https://steamcommunity.com/profiles/" .. util.SteamIDTo64(data.networkid) or "https://steamcommunity.com/id/garry"}, description = "**Reason:**\n" .. data.reason, color = 16724530}})
end)

local function rgbToDecimal(color) -- https://github.com/SinisterRectus/Discordia/blob/master/libs/utils/Color.lua#L109-L114
    local r, g, b = color.r, color.g, color.b

    r = bit.band(bit.lshift(r, 16), 0xFF0000)
    g = bit.band(bit.lshift(g, 8), 0x00FF00)
    b = bit.band(b, 0x0000FF)
    return bit.bor(bit.bor(r, g), b)
end

local function DecimalToRGB(c) return Color(bit.band(bit.rshift(c, 16), 0xff), bit.band(bit.rshift(c, 8), 0xff), bit.band(c, 0xff)) end

hook.Add("PlayerSay", "LRELAYS:PlayerSay", function(ply, text)
    LRELAY.SendMessage({embed = {author = {name = ply:Name(), icon_url = LRELAY.avatars[ply:SteamID()] or LRELAY.avatars.INVALID, url = not ply:IsBot() and "https://steamcommunity.com/profiles/" .. ply:SteamID64()}, description = text, color = rgbToDecimal(team.GetColor(ply:Team()))}})
end)

gameevent.Listen("player_changename")
hook.Add("player_changename", "LRELAYS:NameChanged", function(data)
    local ply = Player(data.userid) if not ply or not IsValid(ply) then return end
    LRELAY.SendMessage({embed = {author = {name = string.format("%s changed his name to %s", data.oldname, data.newname), icon_url = LRELAY.avatars[ply:SteamID()] or LRELAY.avatars.INVALID, url = not ply:IsBot() and "https://steamcommunity.com/profiles/" .. ply:SteamID64() or "https://steamcommunity.com/id/garry"}, color = rgbToDecimal(team.GetColor(ply:Team()))}})
end)

function socket:onMessage(msg)
    if not msg then return end

    local a = util.JSONToTable(msg)
    if a and a.type == "message" then
        print(string.format("[LRelay] Message - %s: %s", a.author.name, a.content))
        net.Start("LRELAYS:Message")
        net.WriteString(msg)
        net.Broadcast()
    end
    if a then hook.Run("LRelayS:Message", socket, a or msg) end
end

function socket:onError(msg)
    print("[LRelay] Sockets error: " .. msg)
    hook.Run("LRelayS:Error", socket, msg)
end

function socket:onConnected()
    print("[LRelay] Connected successfully!")

    if not LRELAY.FirstConnect then
        LRELAY.FirstConnect = true
        timer.Simple(5, function() LRELAY.SendMessage({embed = {title = "Server finished starting!", description = string.format("Playing at **%s**\nConnect: steam://connect/%s", game.GetMap(), game.GetIPAddress()), color = rgbToDecimal(Color(150, 0, 255))}}) end)
    end
    hook.Run("LRelayS:Connected", socket)
end

local function autoReconnectPls()
    timer.Create("Sockets:Reconnect", 5, 1, function()
        print("[LRelay] Autoreconnecting...")
        socket:open()
    end)
end

function socket:onDisconnected()
    print("[LRelay] Disconnected!")
    hook.Run("LRelayS:Disconnected", socket)
    autoReconnectPls()
end

-- Manual socket (dis)connect concommands, you can delete those
concommand.Add("lrelay_debug_connect", function(ply) if ply and IsValid(ply) and ply:IsPlayer() then return end socket:open() end)
concommand.Add("lrelay_debug_disconnect", function(ply) if ply and IsValid(ply) and ply:IsPlayer() then return end socket:close() end)
