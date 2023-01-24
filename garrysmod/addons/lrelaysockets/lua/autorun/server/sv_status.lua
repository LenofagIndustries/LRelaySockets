timer.Create("LRELAYS:SendStatus", 5, 0, function()
    local players = {}
    for k, ply in ipairs(player.GetAll()) do
        players[#players + 1] = {
            name = ply:Name(),
            bot = ply:IsBot(),
            avatar = LRELAY.avatars[ply:SteamID()] or LRELAY.avatars.INVALID,
            steamid = ply:SteamID(),
            steamid64 = ply:SteamID64()
        }
    end
    LRELAY.SendStatus(CurTime() * 1000, players, game.GetMap(), game.GetIPAddress(), GetHostName())    
end)