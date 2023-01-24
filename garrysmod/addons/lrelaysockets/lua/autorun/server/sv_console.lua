require "spew"
MsgC(Color(0, 255, 0), "gm_spew loaded...\n")

local StopItPlease = false

hook.Add("Think", "LRELAYS:EngineSpew", function()
    if StopItPlease then return end
    local messages = spew.GetAll()
    if not messages then return end

    for k, msg in ipairs(messages) do
        LRELAY.SendToConsole(msg.message)
    end
end)

hook.Add("LRelayS:Message", "LRELAYS:ConsoleCommands", function(_, msg)
    if StopItPlease then return end
    if not type(msg) == "table" then msg = util.JSONToTable(msg) end if not msg then return end
    if msg.type == "console" and LRELAY.consoleAccess[msg.author.id] then game.ConsoleCommand(string.format("%s\n", msg.content)) print(string.format("[LRelay] Received command from %s#%s (%s): %s", msg.author.username, msg.author.discriminator, msg.author.id, msg.content)) end
end)

-- This will stop console relay from sending/receiving messages
concommand.Add("lrelay_console_toggle", function() StopItPlease = not StopItPlease end)

-- This will notify your console of shutting down, you can remove this if not needed
hook.Add("ShutDown", "LRELAYS:ConsoleShutdown", function()
    LRELAY.SendToConsole("ShutDown hook called, server shutting down...")
end)
