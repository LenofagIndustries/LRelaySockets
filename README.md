[![Join my Discord server!](https://img.shields.io/badge/Discord-Working%20example-black?style=flat-square&logo=discord&logoColor=white)](https://gm.lenofag.ru/discord)
# LRelaySockets
Integrate your Garry's Mod server with Discord

## Dependencies
### node.js
- discord.js@13.6.0
- express@4.17.3
- express-ws@5.0.2

### Garry's Mod
- [GWSockets](https://github.com/FredyH/GWSockets) by FredyH ([downloads](https://github.com/FredyH/GWSockets/releases))
- [gm_spew](https://github.com/danielga/gm_spew) by danielga ([downloads](https://github.com/danielga/gm_spew/releases))

## Installation
1. [Clone](/archive/refs/heads/main.zip) this repository
2. Install npm dependencies using `npm i`
3. Drop `lrelaysockets` folder to your server's `garrysmod/addons` folder
4. [Configure](#configuration) your installation
5. Done!

## Configuration
1. Open `config.js`
2. Here you will need to set channel IDs, Discord token and an **LRELAY key**, which serves as a password, you can set it to anything!
3. Install modules from [Dependencies](#garrys-mod) to `lua/bin`
4. Open `addons/lrelaysockets/server/sv_config.lua`
5. Change `socketPath`, which should look something like `ws://123.45.6.7:8556/relay`
6. Change `token` to your **LRELAY key**, which you set earlier at `config.js` as `auth`
7. Change `consoleAccess` to your Discord user ID, you can add additional user IDs
8. (optional) Change `statusName` to whatever name you want for server status API
