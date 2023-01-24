local function dec(c) return Color(bit.band(bit.rshift(c, 16), 0xff), bit.band(bit.rshift(c, 8), 0xff), bit.band(c, 0xff)) end

local tagColor = Color(0, 150, 255) -- You can change tag color here! ("[Discord] ...")

net.Receive("LRELAYS:Message", function()
    local data = util.JSONToTable(net.ReadString())
    if not data then return end

    chat.AddText(Color(50, 50, 50), "[", tagColor, "Discord", Color(50, 50, 50), "] ", dec(data.author.color), data.author.name, Color(255, 255, 255), ": ", data.content)
end)
