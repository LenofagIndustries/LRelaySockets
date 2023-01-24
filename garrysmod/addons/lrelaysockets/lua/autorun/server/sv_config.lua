LRELAY = LRELAY or {}

LRELAY.socketPath = "ws://[Your server's IP address]:[Port configured at config.js, 8556 by default]/relay"
LRELAY.token = "" -- Here you need to put your LRELAY key, configured at config.js!

LRELAY.statusName = "sandbox" -- Required for status API

LRELAY.consoleAccess = {
    ["UserID"]  = true,
    ["UserID2"] = true
} -- Configures console relay access