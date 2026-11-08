<p align="center">
  <a href="https://github.com/homebridge/homebridge"><img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" height="120" alt="Homebridge"></a>
  &nbsp;&nbsp;&nbsp;
  <img src="./docs/nibe-myuplink-logo-small.png" height="120" alt="NIBE myUplink">
</p>

<h1 align="center">homebridge-nibe-s1156</h1>

<p align="center">
  <b>Bring your NIBE S1156 heat pump into Apple Home.</b><br>
  Temperatures, hot water and firmware alerts from NIBE myUplink, right next to the rest of your smart home.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/homebridge-nibe-s1156"><img src="https://img.shields.io/npm/v/homebridge-nibe-s1156?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/homebridge-nibe-s1156"><img src="https://img.shields.io/npm/dm/homebridge-nibe-s1156?color=cb3837" alt="npm downloads"></a>
  <a href="https://github.com/homebridge/homebridge"><img src="https://img.shields.io/badge/homebridge-1.8%20%7C%202.x-491F59?logo=homebridge" alt="Homebridge 1.8 | 2.x"></a>
  <a href="https://github.com/buddyshome/homebridge-nibe-s1156/blob/main/LICENSE"><img src="https://img.shields.io/github/license/buddyshome/homebridge-nibe-s1156" alt="MIT license"></a>
</p>

---

## ✨ Features

- 🌡️ **Live temperatures** from your heat pump as native HomeKit temperature sensors: outdoor, hot water, pool and more
- 🏊 **Pool monitoring**: pool temperature (BT51) and pool supply line (BT59)
- 🚿 **Hot water thermostat** with a *Temporary Lux* switch to boost hot water from the Home app
- 🔔 **Firmware alerts**: an occupancy sensor that triggers when a new NIBE firmware is available, ready for automations
- ⚙️ **Easy setup** through the Homebridge UI with built-in step-by-step instructions
- 🙈 **Pick what you see**: hide any accessory you don't need
- 🌍 Accessory names in English, Polish and Swedish

## 📋 Requirements

| | |
|---|---|
| **Heat pump** | NIBE S1156, connected to [NIBE myUplink](https://myuplink.com) |
| **Homebridge** | 1.8 or newer, including Homebridge 2.x |
| **Node.js** | 18 or newer (Homebridge 2.5 needs 22.12 or newer) |
| **myUplink API app** | Free, see [Setup](#-setup) |

Other NIBE models connected to myUplink may work too, because the plugin only shows accessories whose data your pump actually reports.

## 🚀 Installation

**Recommended:** open the Homebridge UI → **Plugins**, search for `homebridge-nibe-s1156` and click **Install**.

Or from the command line:

```bash
npm install -g homebridge-nibe-s1156
```

## 🔑 Setup

The plugin reads data through the official NIBE myUplink API, so you need your own (free) API credentials:

1. Make sure you have a [myUplink](https://myuplink.com) account with your heat pump connected.
2. Log in at **[dev.myuplink.com](https://dev.myuplink.com)** with the same account.
3. Go to **Applications** → **Create New Application**.
4. Enter any name and description (for example `Homebridge`). Leave the *Callback URL* empty.
5. Accept the API Services Agreement and click **Create**.
6. Copy the **Client Identifier** and **Client Secret** into the plugin settings in the Homebridge UI.

Restart Homebridge, and your heat pump's sensors will appear in the Home app within a minute.

> 💡 The same instructions are built into the plugin's settings page in the Homebridge UI.

## 🏠 Accessories

### Temperature sensors

| Sensor | myUplink parameter |
|---|---|
| Current outdoor temperature (BT1) | `4` |
| Average outdoor temperature (BT1) | `54` |
| Hot water charging (BT6) | `12` |
| Pool (BT51) | `38` |
| Pool supply line (BT59) | `24632` |
| Outdoor temperature | `40004`, `44362` |
| Average outdoor temperature | `40067` |
| Hot water top | `40013` |
| Ventilation: exhaust / extract / supply / outdoor air | `40025`, `40026`, `40075`, `40183` |

### Other accessories

| Accessory | What it does |
|---|---|
| **Hot water** | Thermostat showing hot water temperature (`40014`, `40008`). Its switch controls **Temporary Lux** (`48132`). This needs a myUplink **premium (manage)** subscription. Changes take about 20–30 seconds to reach the heat pump. |
| **New firmware** | Occupancy sensor that triggers when a firmware update is available for your heat pump. |

Accessories only appear if your heat pump reports the matching data, so you won't get empty sensors for hardware you don't have.

## ⚙️ Configuration

Configuring through the **Homebridge UI** is recommended. If you prefer editing `config.json` directly:

```json
{
  "platforms": [
    {
      "platform": "Nibe-s1156",
      "identifier": "YOUR-CLIENT-IDENTIFIER",
      "secret": "YOUR-CLIENT-SECRET",
      "language": "en",
      "pollingPeriod": 60
    }
  ]
}
```

| Option | Required | Default | Description |
|---|:---:|---|---|
| `platform` | ✅ | | Must be `Nibe-s1156`. |
| `identifier` | ✅ | | Client Identifier from your myUplink API application. |
| `secret` | ✅ | | Client Secret from your myUplink API application. |
| `language` | | `en` | Accessory name language: `en`, `pl` or `sv`. |
| `pollingPeriod` | | `60` | How often (in seconds) to fetch new data. Minimum `60`. |
| `disabledAccessories` | | | List of accessory IDs to hide. Easiest to manage with the toggles in the plugin settings. |
| `showApiResponse` | | `false` | Log the raw myUplink API responses. Useful for troubleshooting. |

## 🛠️ Development

```bash
git clone https://github.com/buddyshome/homebridge-nibe-s1156.git
cd homebridge-nibe-s1156
npm install
npm run develop
```

`npm run develop` builds the plugin, links it into your global Homebridge and starts it in debug mode. Changes in `src/`, `homebridge-ui/` or the YAML files are rebuilt automatically, and Homebridge restarts on its own. The output is also written to `~/.homebridge/homebridge.log`, so you can follow it in the Homebridge UI.

| Command | Description |
|---|---|
| `npm run build` | Build into `dist/` |
| `npm test` | Lint and run the test suite |
| `npm run lintFix` | Auto-fix lint issues |

### Adding a sensor

Want another value from your heat pump? Find its parameter ID in the myUplink API (enable `showApiResponse`), then:

1. Add the ID to `allowedParameters` in [`src/platform/myuplink/MyUplinkApiFetcher.ts`](src/platform/myuplink/MyUplinkApiFetcher.ts).
2. Add a `TemperatureSensorAccessory` for it in [`src/platform/NibePlatform.ts`](src/platform/NibePlatform.ts).

Pull requests are welcome!

## 🙏 Credits

This plugin is based on [homebridge-nibe](https://github.com/hp-net/homebridge-nibe) by [hpruszyn](https://github.com/hp-net), adapted and extended for the NIBE S1156.

## 📄 License

[MIT](LICENSE)
