![License](https://img.shields.io/github/license/gerrustalker/LRelaySockets?style=flat-square)
![Open issues](https://img.shields.io/github/issues/gerrustalker/LRelaySockets?style=flat-square)
![Release Downloads](https://img.shields.io/github/downloads/gerrustalker/LRelaySockets/total?style=flat-square)
[![Join my Discord server!](https://img.shields.io/badge/discord-working%20example-5865F2?style=flat-square&logo=discord&logoColor=white)](https://gm.lenofag.ru/discord)
# LRelaySockets
Integrate your Garry's Mod server with Discord

### What this relay can do:
* [Connect](images/chatrelay.png) your Discord and game's chats
* Send [console](images/console.png) output to Discord and run console commands
* [Server status](images/statusapi.png) and player info Web API
* Lua API - make your own Discord commands

## Dependencies
### node.js
- axios@0.27.2
- steamid@2.0.0
- discord.js@13.6.0
- express@4.17.3
- express-ws@5.0.2

### Garry's Mod
- [GWSockets](https://github.com/FredyH/GWSockets) by FredyH ([downloads](https://github.com/FredyH/GWSockets/releases))
- [gm_spew](https://github.com/danielga/gm_spew) by danielga ([downloads](https://github.com/danielga/gm_spew/releases))

## Installation
1. [Clone](https://github.com/gerrustalker/LRelaySockets/archive/refs/heads/main.zip) this repository
2. Install npm dependencies using `npm i`
3. Install modules from [Dependencies](#garrys-mod) to server's `garrysmod/lua/bin`
4. Drop [`lrelaysockets`](garrysmod/addons/lrelaysockets) folder to your server's `garrysmod/addons` folder
5. [Configure](#configuration) your installation
6. Done!

## Configuration
1. Open [`config.js`](nodejs/config.js)
2. Here you will need to set channel IDs, Discord token and an **LRELAY key**, which serves as a password, you can set it to anything!
3. Open [`addons/lrelaysockets/lua/autorun/server/sv_config.lua`](garrysmod/addons/lrelaysockets/lua/autorun/server/sv_config.lua)
4. Change `socketPath`, which should look something like `ws://123.45.6.7:8556/relay`
5. Change `token` to your **LRELAY key**, which you set earlier at [`config.js`](nodejs/config.js) as `auth`
6. Change `consoleAccess` to your Discord user ID, you can add additional user IDs
7. (optional) Change `statusName` to whatever name you want for server status API

## Credits
* [Discordia](https://github.com/SinisterRectus/Discordia/) - Lua color convertation
* [Lenofag-2000](https://lenofag.ru) (lenofag.ru?uwu=1#9927)
* [Aksyned](https://izbushechka.su) - inspired from his relay

#
##### This relay is created specifically for **Sandbox** gamemode!
##### You will need to modify it yourself to make it work for DarkRP, TTT, etc
