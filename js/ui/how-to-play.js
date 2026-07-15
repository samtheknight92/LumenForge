import { esc } from '../core/utils.js'

function section(title, bodyHtml) {
  return `
    <section class="card how-to-section">
      <h3>${esc(title)}</h3>
      <div class="how-to-body">${bodyHtml}</div>
    </section>
  `
}

function tip(label, text) {
  return `
    <div class="how-to-item">
      <div class="how-to-item-label">${label}</div>
      <p class="how-to-item-text">${text}</p>
    </div>
  `
}

function tips(items) {
  return `<div class="how-to-items">${items.join('')}</div>`
}

function doubleNatural20Block() {
  const rules = [
    'If the second roll is also a natural 20, the target is instantly defeated.',
    'This applies to Basic Attacks from <strong>all</strong> weapon types.',
    '<strong>Ranged</strong> weapon skills and abilities can also trigger this rule.',
    '<strong>Non-ranged</strong> weapon skills and abilities cannot trigger it unless their description specifically says otherwise.',
    'Multi-hit and area attacks only receive <strong>one</strong> Double Natural 20 check per ability use — not one check per hit or target.',
    'Bosses, major story characters, and enemies marked as immune to instant defeat are not instantly killed. Instead, the attack deals its <strong>maximum critical damage</strong> and ignores Defence.'
  ]

  return `
    <div class="how-to-block">
      ${tip(
        'Double Natural 20',
        'When any <strong>Basic Weapon Attack</strong> rolls a natural 20, roll another d20.'
      )}
      <ul class="how-to-sublist">
        ${rules.map(row => `<li>${row}</li>`).join('')}
      </ul>
    </div>
  `
}

function skillTypesBlock() {
  const types = [
    {
      pill: 'good',
      name: 'Passive',
      text: 'Always on once learned — bonuses, +stats, and similar. No button to press.'
    },
    {
      pill: 'warn',
      name: 'Toggle',
      text: 'A stance or mode you switch on/off (Skills tab or action bar). While on, its rules apply and it may cost Stamina.'
    },
    {
      pill: '',
      name: 'Action',
      text: 'Something you do in the moment — attack, spell, buff. Costs Stamina and usually sits on the action bar.'
    }
  ]

  return `
    <div class="how-to-block how-to-types">
      <div class="how-to-item-label">Skill types</div>
      <div class="how-to-type-grid">
        ${types.map(row => `
          <div class="how-to-type-card">
            <span class="pill ${row.pill}">${esc(row.name)}</span>
            <p>${row.text}</p>
          </div>
        `).join('')}
      </div>
      <p class="how-to-footnote subtle">Most skills start with <strong>Action:</strong>, <strong>Passive:</strong>, <strong>Spell:</strong>, or similar — read the full skill text if timing is unclear.</p>
    </div>
  `
}

function resourcesBlock() {
  const rows = [
    { name: 'Stamina', text: 'Pays for actions and toggles' },
    { name: 'Lumens', text: 'Buy skills on the Skills tab' },
    { name: 'Gil', text: 'Buy shop gear' },
    { name: 'Stats', text: 'Affect rolls, damage, HP/Stamina, or defences — depends on the stat and skill. Check Stats tab + tooltips for formulas.' }
  ]

  return `
    <div class="how-to-block how-to-resources">
      <div class="how-to-item-label">Character resources</div>
      <div class="how-to-resource-grid">
        ${rows.map(row => `
          <div class="how-to-resource-card">
            <strong>${esc(row.name)}</strong>
            <span>${row.text}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function actionBarBlock() {
  const choices = [
    'Tap a skill to roll what the app supports and spend Stamina — only apply damage or target effects after the GM confirms the attack hit',
    'Roll accuracy and damage on your own dice — tap the skill only to deduct Stamina, or skip the button entirely',
    'Track everything manually with HP/Stamina +/- on the Character or Stats tab'
  ]

  return `
    <div class="how-to-block">
      ${tip(
        'Action bar (optional)',
        'Buttons at the bottom are a <em>helper</em>, not the GM. They do not decide hits, targets, or outcomes. You do <em>not</em> have to use them. The table decides how much automation feels good.'
      )}
      <ul class="how-to-sublist">
        ${choices.map(row => `<li>${row}</li>`).join('')}
      </ul>
    </div>
  `
}

export function renderHowToPlayTab() {
  const general = tips([
    tip(
      'What this app is',
      '<strong>LumenForge is a play aid, not a VTT.</strong> You still talk, roll dice at the table, and the GM decides what happens. This app tracks a character sheet locally on the device or browser you are using — HP, gear, skills, and optional roll helpers. Each player normally runs their own sheet on their own device; the GM keeps NPCs on theirs.'
    ),
    tip(
      'Combat flow',
      'On your turn, say what you do. To attack, roll <strong>d20 + Accuracy</strong> vs the target\'s <strong>Physical Defence</strong> (melee/ranged) or <strong>Magical Defence</strong> (spells). On a hit, roll damage — read the skill or Basic Attack tooltip for the formula.'
    ),
    doubleNatural20Block(),
    actionBarBlock(),
    resourcesBlock(),
    skillTypesBlock(),
    tip(
      'Equipment',
      'Weapon slot, off-hand, armour, accessory. Weapon skills need the right weapon equipped (or empty hands for Striker). Greyed skills show why on hover, tap, or long-press depending on your device.'
    ),
    tip(
      'Ranged weapons',
      'With bows and crossbows, you normally <strong>cannot move and attack in the same turn, in either order</strong>, unless <strong>Quick Draw</strong> or a skill says otherwise (e.g. Parting Shot: attack then up to 15ft — plus normal movement if you have Quick Draw). Mark <strong>Moved</strong> on the action bar when you reposition. Range is based on line of sight, but the GM decides whether the shot is practical, too far, blocked, or affected by cover. See <strong>Skills → Weapons → Ranged</strong> for the full summary.'
    ),
    tip(
      'Harmonies &amp; careers',
      'Some skills mention allies helping (+1 per helper, etc.). That is a <strong>table rule</strong> — players coordinate out loud; the app does not sync buffs between sheets.'
    ),
    tip(
      'Status effects',
      'Buffs, debuffs, poison, Burn, and similar show on the <strong>Character</strong> tab under Applied Status Effects. The GM or player adds them from the effects list (pick effect, duration, optional note). Use the dictionary on the <strong>Notes</strong> tab if you need a reminder what one does.'
    ),
    tip(
      'Process Turn',
      'Press <strong>Process Turn</strong> on the Character tab at the <strong>End of Turn</strong> — after you move, attack, use an item, or finish your action. On <em>your</em> sheet it: pays toggle Stamina costs (if you cannot pay, the toggle switches off unless the GM rules otherwise); applies per-turn damage or healing from statuses (Bleeding, Poison, Burn, regeneration, Mana Focus, and similar); then ticks each effect\'s remaining duration down by 1 — a 1-round effect like Blind stays for your action, then expires on this press. Clears your Moved marker for next turn. In combat, do this every turn after you act; out of combat, only when the GM says to and you have effects or toggles to process.'
    ),
    tip(
      'Knocked Out &amp; Revival',
      'At <strong>0 HP</strong> you are <strong>Knocked Out</strong> — you cannot move, attack, use items, or use skills, but you stay in initiative. On each of your turns you may make one <strong>Recovery Roll</strong> (1d20): <strong>11+</strong> success, <strong>10 or lower</strong> failure. Two successes <em>in a row</em> → <strong>Revived</strong> at 1 HP. Three failures <em>in a row</em> → <strong>Dead</strong>. A failure resets the success streak; a success resets the failure streak. Track streaks on the Character tab. <strong>Manual revival</strong> by another character takes two of the helper\'s turns (step 1 begin CPR/first aid, step 2 finish) and Revives at 1 HP. A healing item or healing skill restores its full HP amount immediately, clears Recovery streaks, and removes Knocked Out (example: a 25 HP potion Revives and restores up to 25 HP, not merely 1 HP).'
    ),
    tip(
      'Improvised actions &amp; Rule of Cool',
      'Players may attempt actions that are not represented by a specific skill or item. The GM decides whether the action is reasonable, whether it uses the character\'s full turn, and what number must be rolled to succeed (<strong>Saving Roll</strong>). The GM may also require an item, piece of equipment or other resource to be damaged, consumed or sacrificed as part of the attempt. Example: a Bleeding character without bandages may tear clothing or gear into a pressure wrap — the GM may require the full turn, set a Saving Roll target, and permanently remove the sacrificed item whether the roll succeeds or fails. The app does not automate this; it stays a flexible GM ruling.'
    ),
    tip(
      'Saves',
      'Use Export Save (sidebar) to back up characters. Homebrew packs and character files move between devices — the live website does not store your data. Clearing browser data, switching browsers, or using another device may lose local saves unless you exported them. Knocked Out state and Recovery Roll streaks are included in saves.'
    )
  ])

  const player = tips([
    tip(
      'Setup',
      'Create a character (sidebar) — pick race, background, spend Lumens on skills, buy gear on the <strong>Shop</strong> tab, and craft on the <strong>Craft</strong> tab if you know the right career recipes. Keep the action bar visible at the bottom during fights.'
    ),
    tip(
      'Your turn (combat)',
      'When initiative reaches you: <strong>1.</strong> <strong>Move</strong> <em>or</em> use one skill / Basic Attack (your choice first) — unless you are Knocked Out (Recovery Roll only). <strong>2.</strong> Do the other if you still can — melee can move then strike; bows normally cannot move and shoot the same turn unless Quick Draw or a skill says otherwise. <strong>3.</strong> Press <strong>Process Turn</strong> at the <strong>End of Turn</strong> (ticks, then durations). <strong>4.</strong> Say you are done; next player goes. Roll accuracy at the table first; only apply damage or target effects after the GM confirms a hit — action bar, physical dice, or manual HP/Stamina all work.'
    ),
    tip(
      'Outside combat',
      'No initiative loop — explore, talk to NPCs and teammates, and all the roleplaying you expect from a TTRPG. Press <strong>Process Turn</strong> only when the GM calls for it and you have statuses or toggles that need ticking down at End of Turn; skip it if nothing is active.'
    ),
    tip(
      'Skills tab',
      'Learn skills when you have enough Lumens and meet requirements. <strong>Ascension</strong> (~20 breakthroughs, hidden until you qualify — T3 Lv10 · T4 Lv15 · T5 Lv22). <strong>Ultimate</strong> splits into Rare Legends, Weapon Mastery (one per weapon path), and Element Mastery (one per magic path) — T5 Lv22 · T6 Lv30.'
    ),
    tip(
      'Notes tab',
      'Your private scratch pad plus the term dictionary for statuses and damage types.'
    ),
    tip(
      'Homebrew tab',
      'Optional — your table can add custom items, skills, or races. Import a pack from your GM, or export your own to share.'
    ),
    tip(
      'Player etiquette',
      'One person owns the sheet for their character. Call out numbers you roll so the GM hears them. Read skill tooltips (hover, tap, or long-press) when unsure — no need to memorize every skill.'
    )
  ])

  const gm = tips([
    tip(
      'You run the fiction',
      'The app helps you spawn NPCs, track initiative, and preview enemy builds — it does not automate enemy AI or hidden rolls for the whole table.'
    ),
    tip(
      'Player rolls',
      'Action bar pop-ups are convenience, not law — they do not prove a hit landed. A player may roll physical dice and only use the app to track Stamina. Only apply damage or target effects after the GM confirms the attack hit; trust what players call out at the table.'
    ),
    tip(
      'GM Tools tab',
      'Turn on <strong>GM Mode</strong> to unlock all skills/items for testing, free purchases, and ignore prerequisites. Use the <strong>initiative tracker</strong> and <strong>NPC turn</strong> helper to keep combat moving.'
    ),
    tip(
      'Premade characters',
      'Spawn NPCs and monsters from <strong>GM Tools → Premade Characters</strong>. Each player still uses their own device for their PC; foes live on your GM roster. Cards show a <strong>Threat Level</strong> pill plus <strong>L</strong> / <strong>Gil loot</strong> pills — Threat Level is how dangerous that foe is in a fight, and the wallet reward is baked into the template. Use the <strong>Encounter Balancer</strong> section (also in GM Tools) to compare Threat Level against your party\'s Combat Power before you spawn a fight — "Add to Encounter" checks difficulty without touching your roster.'
    ),
    tip(
      'Defeat loot — Lumens & Gil',
      'When a foe is defeated, the party loots what is on <em>that character\'s sheet</em> — the app does not auto-transfer rewards. Open the defeated NPC on your roster and check <strong>Stats → Live Resource Editor</strong> for their <strong>Lumens</strong> and <strong>Gil</strong>. Split however your table likes, then each player adds their share on <em>their own device</em> (Stats tab). Humanoid premades usually carry about <strong>3 Lumens and 200 Gil per level</strong>; beasts often have Lumens only, with a little pocket Gil for humanoid monsters like goblins or bandits.'
    ),
    tip(
      'Defeat loot — items',
      'Everything in the foe\'s inventory — <strong>not equipped</strong> — is lootable unless you rule otherwise: weapons, armor, potions, materials, and monster parts. Read their <strong>Notes</strong> (premades often list <strong>Potential defeat drops</strong>). Hand items out in fiction, or have the player on <em>their own device</em> use <strong>Shop → Grant</strong> (with <strong>GM Mode</strong> if needed) on their character — there is no auto-sync between devices. Remove spent loot from the defeated sheet if you keep corpses on the roster until you are finished with them.'
    ),
    tip(
      'Applying effects',
      'Add status effects from the Character tab (pick effect, duration, optional note). Players press <strong>Process Turn</strong> at the End of Turn to tick timers — see <strong>Everyone</strong> above. Track Knocked Out Recovery Rolls and manual revival on that character\'s sheet.'
    ),
    tip(
      'Homebrew',
      'Build custom loot, skills, or races on the Homebrew tab → export pack → players import. GitHub Pages deploys code only, not your local homebrew.'
    ),
    tip(
      'Pacing tips',
      'Keep rulings simple — LumenForge is lighter than D&D. When in doubt, pick the smallest rule that works. Reward teamwork with +1 per helper rather than new subsystems.'
    ),
    tip(
      'Before session',
      'Export your save. Confirm everyone can open the app (local server or github.io). Share homebrew packs in advance if you use custom content.'
    )
  ])

  return `
    <div class="how-to-play">
      <header class="how-to-hero card">
        <div class="kicker">Table guide</div>
        <h2>How to Play</h2>
        <p class="how-to-lead">Quick rules for running or playing LumenForge with this app. For term lookups (Burn, Barrier, etc.), use the <strong>Notes</strong> tab dictionary.</p>
      </header>

      <div class="how-to-grid">
        ${section('Everyone — how a session works', general)}
        ${section('Players', player)}
        ${section('Game Master (GM)', gm)}
      </div>
    </div>
  `
}
