# LumenForge RPG v5: Table-Test Ready Beta

LumenForge is a browser-based **character sheet and play aid** for a custom tabletop RPG. It helps players create, equip, develop, and track characters at the table while giving GMs tools for initiative, encounters, NPCs, monsters, folders, and premade characters.

The app is a **static HTML, CSS, and JavaScript project**. It has no backend, no accounts, and no live synchronization between players. Each player normally runs their own character sheet on their own device, while the GM manages NPCs and encounters separately.

LumenForge is a play aid rather than a virtual tabletop. Players still talk, describe actions, roll dice, and follow the GM's rulings at the table.

## Main features

### Characters and progression

- Create and manage multiple characters with **sidebar folders**
- Separate **Combat Power** and **Skill Level** progression
- Races, backgrounds, elemental affinities, racial abilities, and racial skill trees
- Weapon, magic, career, fusion, racial, Ascension, and Ultimate skills
- HP, Stamina, Lumens, Gil, Accuracy, defences, Speed, Strength, and Magic Power
- Character notes, additional note pages, quests, equipment history, and printable sheets

### Combat and effects

- Optional action bar with attack rolls, damage rolls, Stamina costs, and reminders
- Manual or automatic Stamina deduction
- Status effects, stat modifiers, regeneration, damage-over-time effects, and Process Turn support
- Weather effects with mechanical and roleplay descriptions
- Weapon, element, instrument, Striker, and elemental-affinity interactions
- Pinned skills copied to the left side of the action bar for quick access

### Equipment, shop, and crafting

- Weapons, armour, off-hand equipment, instruments, materials, consumables, and profession items
- Shop filters, search, rarity requirements, buyable-only view, and starred items
- Inventory sorting, tags, newest-first sorting, starred items, and item locks
- Player-written notes on owned equipment
- Crafting recipes, starred crafts, materials, and career bonuses
- Enchantments on equipped gear
- Unidentified equipment and GM-only cursed equipment information
- Generic equipment trackers for charges, counters, story conditions, and similar mechanics

### GM tools

- GM Mode with hidden information and GM-only item details
- Initiative tracker and NPC turn helper
- Premade NPC, monster, and pedestrian roster
- Threat Levels for premade and generated characters
- Monster and NPC builder using **Type + Role + Threat Level + Optional Specials**
- Encounter Balancer with party and enemy setup
- Spawn premade characters directly into roster folders

### Homebrew

- Create custom items, skills, races, backgrounds, recipes, monster types, roles, and specials
- Import and export Homebrew packs
- Import preview and approval tools
- Archive and deletion protection for custom content that is already in use
- Balance labels and GM-facing information

### Saving and presentation

- Automatic browser storage using `localStorage`
- Full-save export and import
- Single-character export and import
- Light and dark modes, colour themes, compact layouts, and mobile styling
- URL state support for tabs and selected sections

## Run locally

The app uses ES modules and generated JSON data, so it must be served through a local web server. Do not open `index.html` directly as a `file://` page.

### Option A: npm

```bash
npm run serve
```

Then open [http://localhost:8000](http://localhost:8000).

### Option B: Python

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

If port `8000` is already in use, choose another port:

```bash
npx serve -l 8080 .
```

or:

```bash
python -m http.server 8080
```

## Deploy for external browser testing

A local `localhost` address can only be opened on the computer running it. To let another person or browser-testing service inspect the app, deploy the project through a public HTTPS address.

Suitable options include:

- **GitHub Pages** for a permanent public test build
- **Netlify Drop** for a quick drag-and-drop deployment
- **Vercel** for automatic preview deployments from GitHub
- **Cloudflare Tunnel** or **ngrok** for temporarily exposing a local server

Do not include private save files, passwords, API keys, or personal information in a public test deployment.

## Rebuild and verify game data

```bash
npm run build-data
npm run validate
npm run audit
npm test
```

These commands rebuild generated JSON, validate content references, run project audits, and test core systems such as saving, imports, race passives, Homebrew items, cursed equipment, inventory navigation, note pages, unidentified equipment, weather, and GM monster generation.

## Premade character roster

`data/json/premade-characters.json` contains **349 premade characters**:

- **345 generated NPCs, monsters, and pedestrians** covering Threat Levels 1 to 50 where applicable
- **4 Quick-Start player characters** for immediate play

The generated roster is built by `scripts/build-premade-characters.mjs` using the authored archetypes, families, and variants in `scripts/lib/leveled-premade-data.mjs`.

The generator uses the application's real runtime formulas for stats, Threat Level, Skill Level, and Combat Power. It searches for a stat spread that reaches the intended Threat Level, helping prevent the generated roster from drifting away from what the app displays.

The Quick-Start files retain their older `Level5_*` filenames and `level5_*` IDs for save compatibility, but the current app displays progression through **Combat Power** and **Skill Level**, not the retired combined Level value.

After changing premade archetypes or generator data, run:

```bash
node scripts/build-premade-characters.mjs
node scripts/verify-premade-roster.mjs
```

`npm run build-data` also rebuilds the premade roster.

## Save, export, and import

- **Auto-save:** Progress is stored in the current browser's `localStorage`.
- **Export Save:** Downloads the full application state, including characters, folders, GM settings, initiative data, selections, and interface state.
- **Character Export:** Downloads a single character for sharing or moving between devices.
- **Import Save:** Supports full saves and older character-only exports.

When importing a full save into an existing roster, the app can either replace the current save or merge characters by ID.

Back up using **Export Save** before major updates, clearing browser data, or changing devices.

## Project layout

```text
index.html          Application shell
js/                 Application modules grouped by feature
data/               Source game data
data/json/          Generated runtime JSON
scripts/            Build, validation, audit, and test scripts
styles/             Base, theme, compact, and mobile CSS
```

Important JavaScript areas include:

```text
js/character/       Character creation, stats, progression, and Threat Level
js/combat/          Action bar, attacks, damage, weapons, and weather
js/effects/         Status effects and Process Turn behaviour
js/gm/              Initiative, encounters, Threat tools, and monster builder
js/homebrew/        Custom content, imports, exports, and approval tools
js/items/           Inventory, equipment, crafting, enchantments, and curses
js/skills/          Skill trees, activation, effects, careers, and fusion
js/ui/              Rendering, controls, tooltips, glossary, and table guide
```

## Current status

**v5 is a feature-rich, table-test ready beta.**

The main game systems, saves, imports, generated data, Homebrew framework, GM tools, cursed equipment, weather, and inventory systems are functional and covered by automated checks.

The project is suitable for private sessions and structured playtesting. It should not yet be treated as a fully polished public release until the remaining known issues and browser interaction checks have been completed.

## Intentional limitations

- **No multiplayer synchronization:** Each character sheet is stored and operated separately.
- **No server accounts:** Saves remain on the device unless exported.
- **GM judgement remains essential:** Hits, targets, narrative consequences, and many offensive effects are table decisions.
- **Some race passives are table rules:** The app explains them but does not automatically make every related roll or decision.
- **Harmonies are table-facing mechanics:** The app supports the relevant skills and text, but it does not synchronize effects between players.
- **The action bar is optional:** It assists with rolls, costs, and reminders without replacing tabletop play.

## Credits

Built for the LumenForge tabletop RPG system: a deliberately more accessible alternative to heavier fantasy roleplaying systems, while preserving freedom in character creation and playstyle.