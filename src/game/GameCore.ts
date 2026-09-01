import { audioSynth } from '../engine/AudioSynth';
import { touchHaptics } from '../engine/TouchHaptics';
import {
  EnemyEntity,
  GAME_ITEMS,
  PLAYER_CLASSES,
  PlayerCharacter,
} from './Entities';
import { GameWorld, TILE_TYPES, TileType, SerializedWorld } from './GameWorld';
import { saveManager, SerializedGameState } from './SaveManager';

export type GameZone = 'BUILDING' | 'COLLECTORS' | 'CITY';

export interface GameLogEntry {
  id: string;
  text: string;
  type: 'sys' | 'combat' | 'hack' | 'loot' | 'danger' | 'boss';
  timestamp: number;
}

export interface HackPuzzleState {
  grid: string[][];
  target: string[];
  buffer: string[];
  bufferLimit: number;
  lastPos: { r: number; c: number };
  lastAxis: 'H' | 'V' | null;
  context: 'combat' | 'data' | 'cache';
}

export class GameCore {
  public player: PlayerCharacter;
  public world: GameWorld;
  public playerPos = { x: 1, y: 1 };
  public playerDir: 'N' | 'E' | 'S' | 'W' = 'N';
  public zone: GameZone = 'BUILDING';
  public floor: number = 1;
  public turn: number = 0;
  public weather: string = 'CLEAR';
  public inCombat: boolean = false;
  public combatTurn: 'player' | 'enemy' = 'player';
  public activeEnemy: EnemyEntity | null = null;
  public isBossFight: boolean = false;
  public hackState: HackPuzzleState | null = null;
  public logs: GameLogEntry[] = [];
  public hasKeycard: boolean = false;
  public isGameOver: boolean = false;
  public isGameWon: boolean = false;

  private listeners: Array<() => void> = [];

  constructor(className = 'NETRUNNER', playerName = 'VEX_77') {
    const cls = PLAYER_CLASSES[className] || PLAYER_CLASSES.NETRUNNER;
    this.player = {
      name: playerName,
      className,
      level: 1,
      xp: 0,
      xpToNext: 100,
      hp: cls.hp,
      maxHp: cls.hp,
      shield: cls.name === 'Street Samurai' || cls.name === 'Cyber Shield' ? Math.round(40 * 0.3) : 0,
      maxShield: 40,
      ram: cls.ram,
      maxRam: cls.ram,
      ramRegen: cls.name === 'Netrunner' ? 6 : 4,
      credits: cls.credits,
      dataFragments: 0,
      damageBonus: cls.dmg,
      defenseBonus: cls.def,
      spriteId: cls.spriteId,
      inventory: {
        nanomed: 2,
        ramboost: 1,
      },
      equipment: {
        weapon: cls.starterWeapon || 'weapon0',
        armor: 'armor0',
      },
      programs: ['strike_protocol.bin', 'packet_probe.sys'],
      statusEffects: [],
    };

    this.world = new GameWorld(15, 15, Date.now() % 100000);
    this.playerPos = this.world.getStartPos();

    // Check if there is saved game data to resume session
    const savedState = saveManager.loadFromStorage();
    if (savedState && savedState.player && typeof savedState.player.hp === 'number' && !savedState.isGameOver) {
      this.deserialize(savedState);
      this.log(`🔄 Session Resumed: Runner [${this.player.name} (${this.player.className})] on ${this.zone} (Floor ${this.floor}).`, 'sys');
      this.log(`Vitals: HP ${this.player.hp}/${this.player.maxHp} | Pos: (${this.playerPos.x}, ${this.playerPos.y}) | Inventory: ${Object.keys(this.player.inventory).length} items.`, 'sys');
    } else {
      this.log(`Runner ${this.player.name} jacked in. Welcome to the NetCrawler 2D Engine.`, 'sys');
      this.log(`Class: ${cls.name} | Trait: ${cls.passive}`, 'sys');
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    // Schedule debounced auto-save on state mutation
    saveManager.scheduleAutoSave(() => this.serialize(), 300);

    for (const listener of this.listeners) {
      listener();
    }
  }

  public log(text: string, type: GameLogEntry['type'] = 'sys') {
    const entry: GameLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text,
      type,
      timestamp: performance.now(),
    };
    this.logs.unshift(entry);
    if (this.logs.length > 80) {
      this.logs.pop();
    }
    this.notify();
  }

  public move(dx: number, dy: number) {
    if (this.inCombat || this.isGameOver || this.isGameWon) return;

    if (dx === 1) this.playerDir = 'E';
    else if (dx === -1) this.playerDir = 'W';
    else if (dy === 1) this.playerDir = 'S';
    else if (dy === -1) this.playerDir = 'N';

    const nx = this.playerPos.x + dx;
    const ny = this.playerPos.y + dy;

    if (nx < 0 || ny < 0 || nx >= this.world.getWidth() || ny >= this.world.getHeight()) {
      this.log('Boundary barrier reached.', 'sys');
      return;
    }

    const tile = this.world.getTile(nx, ny);

    if (tile === TILE_TYPES.WALL) {
      this.log('Impassable firewall block.', 'sys');
      touchHaptics.trigger('light_tap');
      return;
    }

    if (tile === TILE_TYPES.DOOR) {
      this.log('Security Gate is LOCKED. Hack a Central Security Terminal (K) to open.', 'danger');
      touchHaptics.trigger('damage');
      audioSynth.playHit(false);
      return;
    }

    this.playerPos = { x: nx, y: ny };
    this.world.markExplored(nx, ny);
    this.turn++;
    touchHaptics.trigger('step');
    audioSynth.playStep();

    // Check tile interactions
    if (tile === TILE_TYPES.VIRUS) {
      this.world.setTile(nx, ny, TILE_TYPES.PATH);
      this.startCombat(false);
    } else if (tile === TILE_TYPES.SAFE) {
      if (this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 5);
        this.log('Safe node connection: +5 Integrity restored.', 'loot');
      }
    } else if (tile === TILE_TYPES.PORTAL) {
      this.log('Encrypted Master Portal found. Press [Interact / E] to breach!', 'boss');
    }

    this.notify();
  }

  public interact() {
    if (this.inCombat || this.isGameOver || this.isGameWon) return;
    const { x, y } = this.playerPos;
    const tile = this.world.getTile(x, y);

    switch (tile) {
      case TILE_TYPES.DATA:
        this.startTerminalHack('data');
        this.world.setTile(x, y, TILE_TYPES.PATH);
        break;
      case TILE_TYPES.CACHE:
        this.startTerminalHack('cache');
        this.hasKeycard = true;
        this.world.setTile(x, y, TILE_TYPES.PATH);
        break;
      case TILE_TYPES.TERMINAL:
        this.world.unlockAllDoors();
        this.world.setTile(x, y, TILE_TYPES.PATH);
        this.log('[SECURITY OVERRIDE] Central Security Terminal hacked! All Sector Gates unlocked.', 'hack');
        audioSynth.playHackTone(true);
        touchHaptics.trigger('hack_success');
        break;
      case TILE_TYPES.PORTAL:
        this.startCombat(true);
        break;
      default:
        this.log('No interactable node detected at current grid coords.', 'sys');
        break;
    }
    this.notify();
  }

  public startCombat(isBoss: boolean) {
    this.inCombat = true;
    this.combatTurn = 'player';
    this.isBossFight = isBoss;

    if (isBoss) {
      const bossConfig = this.getBossForZone();
      this.activeEnemy = {
        id: 'boss',
        name: bossConfig.name,
        hp: bossConfig.hp + this.floor * 25,
        maxHp: bossConfig.hp + this.floor * 25,
        dmg: bossConfig.dmg + this.floor * 2,
        armor: 3 + this.floor,
        spriteId: 'boss_colossus',
        isBoss: true,
        bossPhase: 1,
        loot: bossConfig.loot,
        nextZone: bossConfig.nextZone,
        statusEffects: [],
      };
      this.log(`⚠️ CRITICAL THREAT: ${this.activeEnemy.name} intercepted your signal!`, 'boss');
      audioSynth.playHit(true);
      touchHaptics.trigger('boss_alert');
    } else {
      const names = ['Arasaka ICE-Sentinel', 'Rogue Daemon', 'Trojan Drone', 'Firewall Interceptor', 'Glitch Watcher'];
      const name = names[Math.floor(Math.random() * names.length)];
      const hp = 24 + this.floor * 12;
      this.activeEnemy = {
        id: `enemy_${Date.now()}`,
        name,
        hp,
        maxHp: hp,
        dmg: 6 + Math.floor(this.floor * 2.5),
        armor: Math.floor(this.floor / 2),
        spriteId: Math.random() > 0.5 ? 'enemy_sentinel' : 'enemy_drone',
        statusEffects: [],
      };
      this.log(`⚔️ Hostile Interception: ${this.activeEnemy.name} engaged!`, 'combat');
      audioSynth.playLaser(440, 0.15);
      touchHaptics.trigger('attack');
    }
    this.notify();
  }

  private getBossForZone() {
    if (this.zone === 'BUILDING') {
      return { name: 'Firewall Sentinel X', hp: 150, dmg: 14, loot: 'Sentinel_Breaker.exe', nextZone: 'COLLECTORS' };
    }
    if (this.zone === 'COLLECTORS') {
      return { name: 'Daemon Overlord 2.0', hp: 220, dmg: 18, loot: 'DaemonSlayer_Kernel.sys', nextZone: 'CITY' };
    }
    return { name: 'Black ICE Colossus [MASTER]', hp: 320, dmg: 24, loot: 'Colossus_Core.sys', nextZone: undefined };
  }

  public attack() {
    if (!this.inCombat || this.combatTurn !== 'player' || !this.activeEnemy) return;

    let baseDmg = 8 + this.player.damageBonus + this.player.level * 2;
    const weapon = GAME_ITEMS[this.player.equipment.weapon];
    if (weapon && weapon.dmg) baseDmg += weapon.dmg;

    // Balcony tile damage buff
    if (this.world.getTile(this.playerPos.x, this.playerPos.y) === TILE_TYPES.BALCONY) {
      baseDmg = Math.round(baseDmg * 1.25);
    }

    const isCrit = Math.random() < (this.player.className === 'SAMURAI' ? 0.28 : 0.1);
    let finalDmg = isCrit ? Math.round(baseDmg * (this.player.className === 'SAMURAI' ? 2.0 : 1.5)) : baseDmg;
    finalDmg = Math.max(1, finalDmg - this.activeEnemy.armor);

    this.activeEnemy.hp = Math.max(0, this.activeEnemy.hp - finalDmg);

    if (isCrit) {
      this.log(`💥 CRITICAL STRIKE! Dealt ${finalDmg} damage to ${this.activeEnemy.name}!`, 'combat');
      audioSynth.playHit(true);
      touchHaptics.trigger('critical');
    } else {
      this.log(`⚡ Strike landed on ${this.activeEnemy.name} for ${finalDmg} damage.`, 'combat');
      audioSynth.playLaser(600, 0.12);
      touchHaptics.trigger('attack');
    }

    if (this.activeEnemy.hp <= 0) {
      this.handleVictory();
    } else {
      this.enemyTurn();
    }
    this.notify();
  }

  public defend() {
    if (!this.inCombat || this.combatTurn !== 'player' || !this.activeEnemy) return;

    const shieldAdd = Math.round(this.player.maxShield * 0.25);
    this.player.shield = Math.min(this.player.maxShield, this.player.shield + shieldAdd);
    this.player.defenseBonus += 6;

    this.log(`🛡️ Fortified defense (+${shieldAdd} Shield, +6 temp armor).`, 'combat');
    audioSynth.playPickup();
    touchHaptics.trigger('light_tap');

    this.enemyTurn();
    this.notify();
  }

  public scan() {
    if (!this.inCombat || this.combatTurn !== 'player' || !this.activeEnemy) return;

    this.log(`🔍 SCAN: ${this.activeEnemy.name} | HP: ${this.activeEnemy.hp}/${this.activeEnemy.maxHp} | Dmg: ${this.activeEnemy.dmg} | Armor: ${this.activeEnemy.armor}`, 'hack');
    this.activeEnemy.statusEffects.push({ type: 'Stunned', turns: 1 });
    this.log(`Target disrupted! Stunned for 1 turn.`, 'hack');
    audioSynth.playHackTone(true);
    touchHaptics.trigger('hack_success');

    this.enemyTurn(true);
    this.notify();
  }

  public startTerminalHack(context: 'combat' | 'data' | 'cache') {
    const symbols = ['◆', '◇', '▲', '▽', '●', '○', '■', '□'].slice(0, 4 + Math.min(4, this.floor));
    const size = 4;
    const grid: string[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => symbols[Math.floor(Math.random() * symbols.length)])
    );
    const targetLen = 3 + Math.min(2, this.floor);
    const target: string[] = Array.from({ length: targetLen }, () =>
      symbols[Math.floor(Math.random() * symbols.length)]
    );

    this.hackState = {
      grid,
      target,
      buffer: [],
      bufferLimit: targetLen + 3,
      lastPos: { r: 0, c: 0 },
      lastAxis: null,
      context,
    };
    this.log(`🔐 Breach Protocol Initiated [${context.toUpperCase()}]. Match the required hex sequence!`, 'hack');
    audioSynth.playHackTone(true);
    touchHaptics.trigger('light_tap');
    this.notify();
  }

  public pickHackCell(r: number, c: number) {
    if (!this.hackState) return;

    if (this.hackState.buffer.length === 0) {
      if (r !== 0) {
        this.log('First byte must be selected from the top row (Row 0).', 'danger');
        touchHaptics.trigger('damage');
        return;
      }
    } else {
      const { r: lr, c: lc } = this.hackState.lastPos;
      const isRow = r === lr;
      const isCol = c === lc;
      if (!isRow && !isCol) {
        this.log('Must choose along the active row or column axis.', 'danger');
        touchHaptics.trigger('damage');
        return;
      }
      const axis = isRow ? 'H' : 'V';
      if (this.hackState.lastAxis && axis === this.hackState.lastAxis) {
        this.log(`Must alternate axis (${this.hackState.lastAxis === 'H' ? 'Vertical next' : 'Horizontal next'}).`, 'danger');
        touchHaptics.trigger('damage');
        return;
      }
      this.hackState.lastAxis = axis;
    }

    this.hackState.lastPos = { r, c };
    const sym = this.hackState.grid[r][c];
    this.hackState.buffer.push(sym);
    audioSynth.playLaser(800 + this.hackState.buffer.length * 100, 0.08);
    touchHaptics.trigger('light_tap');

    // Check if target sequence is matched
    const isMatched = this.checkSubsequence(this.hackState.buffer, this.hackState.target);

    if (isMatched) {
      this.resolveHack(true);
    } else if (this.hackState.buffer.length >= this.hackState.bufferLimit) {
      this.resolveHack(false);
    }
    this.notify();
  }

  private checkSubsequence(buf: string[], target: string[]): boolean {
    let tIdx = 0;
    for (const b of buf) {
      if (b === target[tIdx]) {
        tIdx++;
        if (tIdx >= target.length) return true;
      }
    }
    return false;
  }

  public resolveHack(success: boolean) {
    if (!this.hackState) return;
    const ctx = this.hackState.context;
    this.hackState = null;

    if (success) {
      audioSynth.playHackTone(true);
      touchHaptics.trigger('hack_success');

      if (ctx === 'combat' && this.activeEnemy) {
        const breachDmg = 25 + this.floor * 10 + (this.player.className === 'NETRUNNER' ? 15 : 0);
        this.activeEnemy.hp = Math.max(0, this.activeEnemy.hp - breachDmg);
        this.log(`💥 BREACH SUCCESSFUL! Direct kernel shock dealt ${breachDmg} damage to ${this.activeEnemy.name}!`, 'hack');
        if (this.activeEnemy.hp <= 0) {
          this.handleVictory();
          return;
        }
      } else {
        const creditsGain = (120 + this.floor * 60) * (ctx === 'cache' ? 2 : 1);
        const fragsGain = ctx === 'cache' ? 5 : 2;
        this.player.credits += creditsGain;
        this.player.dataFragments += fragsGain;
        this.log(`🎉 BREACH COMPLETE: Decrypted +${creditsGain} Credits and +${fragsGain} Data Fragments!`, 'loot');

        // Chance of item drop
        if (Math.random() < 0.6) {
          const drops = ['nanomed', 'ramboost', 'decryptor', 'chipmod', 'nanoshield'];
          const drop = drops[Math.floor(Math.random() * drops.length)];
          this.addItem(drop, 1);
          this.log(`Found item: ${GAME_ITEMS[drop].name}!`, 'loot');
        }
        if (ctx === 'cache') {
          this.hasKeycard = true;
          this.log('🔑 Sub-Grid Keycard obtained! Elevator & master overrides unlocked.', 'loot');
        }
      }
    } else {
      audioSynth.playHackTone(false);
      touchHaptics.trigger('hack_fail');
      const feedbackDmg = 12 + this.floor * 4;
      this.damagePlayer(feedbackDmg, 'Kernel Feedback Surge');
    }

    if (this.inCombat && this.activeEnemy) {
      this.enemyTurn();
    }
    this.notify();
  }

  private enemyTurn(wasStunned = false) {
    if (!this.inCombat || !this.activeEnemy) return;
    this.combatTurn = 'enemy';

    setTimeout(() => {
      if (!this.inCombat || !this.activeEnemy) return;

      const stun = this.activeEnemy.statusEffects.find((s) => s.type === 'Stunned');
      if (stun || wasStunned) {
        this.activeEnemy.statusEffects = this.activeEnemy.statusEffects.filter((s) => s !== stun);
        this.log(`${this.activeEnemy.name} is stunned and skipped its cycle!`, 'combat');
      } else {
        let dmg = this.activeEnemy.dmg;
        if (this.activeEnemy.isBoss && this.activeEnemy.hp < this.activeEnemy.maxHp * 0.5 && this.activeEnemy.bossPhase === 1) {
          this.activeEnemy.bossPhase = 2;
          this.log(`⚠️ ${this.activeEnemy.name} entered OVERDRIVE Phase 2! Damage amplified!`, 'boss');
          dmg += 8;
        }

        const def = this.player.defenseBonus + this.getEquippedArmorDef();
        const effectiveDmg = Math.max(1, dmg - def);
        this.damagePlayer(effectiveDmg, this.activeEnemy.name);
      }

      // Restore turn to player
      this.player.ram = Math.min(this.player.maxRam, this.player.ram + this.player.ramRegen);
      this.player.defenseBonus = PLAYER_CLASSES[this.player.className]?.def || 0;
      this.combatTurn = 'player';
      this.notify();
    }, 450);
  }

  public damagePlayer(dmg: number, source: string) {
    let remain = dmg;
    if (this.player.shield > 0) {
      const absorb = Math.min(this.player.shield, remain);
      this.player.shield -= absorb;
      remain -= absorb;
    }

    this.player.hp = Math.max(0, this.player.hp - remain);
    this.log(`💔 ${source} strikes you for ${dmg} damage! (${remain} absorbed)`, 'danger');
    audioSynth.playHit(false);
    touchHaptics.trigger('damage');

    if (this.player.hp <= 0) {
      this.handleDefeat();
    }
    this.notify();
  }

  private handleVictory() {
    if (!this.activeEnemy) return;
    const isBoss = this.activeEnemy.isBoss;
    const enemyName = this.activeEnemy.name;
    const xpGain = isBoss ? 200 : 25 + this.floor * 10;
    const creditGain = isBoss ? 300 : 20 + this.floor * 15;

    this.player.xp += xpGain;
    this.player.credits += creditGain;
    this.log(`🏆 VICTORY: ${enemyName} neutralized! +${xpGain} XP, +${creditGain} Credits.`, 'loot');
    audioSynth.playLevelUp();
    touchHaptics.trigger('level_up');

    if (isBoss) {
      if (this.activeEnemy.loot) {
        this.player.programs.push(this.activeEnemy.loot);
        this.log(`🎁 Legendary Program extracted: ${this.activeEnemy.loot}!`, 'boss');
      }

      if (this.activeEnemy.nextZone) {
        this.zone = this.activeEnemy.nextZone as GameZone;
        this.floor = 1;
        this.world = new GameWorld(15, 15, Date.now() % 100000);
        this.playerPos = this.world.getStartPos();
        this.log(`🌐 PORTAL SECURED: Teleporting to Sector [${this.zone}]!`, 'boss');
      } else {
        this.isGameWon = true;
        this.log('🌟 MASTER CORE TAKEOVER COMPLETE: You have conquered the NetCrawler Matrix!', 'boss');
      }
    }

    this.checkLevelUp();
    this.inCombat = false;
    this.activeEnemy = null;
    this.isBossFight = false;
    this.notify();
  }

  private checkLevelUp() {
    while (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext;
      this.player.level++;
      this.player.maxHp += 15;
      this.player.hp = this.player.maxHp;
      this.player.maxShield += 10;
      this.player.damageBonus += 2;
      if (this.player.level % 2 === 0) this.player.maxRam += 2;
      this.player.xpToNext = 100 + (this.player.level - 1) * 80;

      this.log(`✨ LEVEL UP! You reached Level ${this.player.level}! All stats upgraded.`, 'loot');
      audioSynth.playLevelUp();
      touchHaptics.trigger('level_up');
    }
  }

  private handleDefeat() {
    this.isGameOver = true;
    this.inCombat = false;
    this.log('💀 SYSTEM FLATLINED: Neural interface collapsed. Game Over.', 'danger');
    audioSynth.playExplosion();
    touchHaptics.trigger('explosion');
    this.notify();
  }

  public flee() {
    if (!this.inCombat || this.isBossFight) {
      this.log('Cannot flee from a Master Boss encounter!', 'danger');
      return;
    }

    if (Math.random() < 0.65) {
      this.log('💨 Emergency disconnect successful! Escaped encounter.', 'sys');
      this.inCombat = false;
      this.activeEnemy = null;
      audioSynth.playStep();
      touchHaptics.trigger('step');
    } else {
      this.log('Escape failed! Hostile locked onto your signal.', 'danger');
      this.enemyTurn();
    }
    this.notify();
  }

  public useItem(itemId: string) {
    const qty = this.player.inventory[itemId] || 0;
    if (qty <= 0) {
      this.log('Item not in inventory.', 'sys');
      return;
    }

    const def = GAME_ITEMS[itemId];
    if (!def) return;

    if (itemId === 'empgrenade') {
      if (!this.inCombat || !this.activeEnemy) {
        this.log('EMPGrenade can only be detonated in combat!', 'danger');
        return;
      }
      this.activeEnemy.statusEffects.push({ type: 'Stunned', turns: 1 });
      this.log(`💥 EMP Grenade exploded! ${this.activeEnemy.name} stunned!`, 'combat');
      audioSynth.playExplosion();
      touchHaptics.trigger('explosion');
    } else if (def.use) {
      const msg = def.use(this.player);
      this.log(`🧪 ${msg}`, 'loot');
      audioSynth.playPickup();
      touchHaptics.trigger('light_tap');
    }

    this.player.inventory[itemId]--;
    if (this.player.inventory[itemId] <= 0) {
      delete this.player.inventory[itemId];
    }

    if (this.inCombat) {
      this.enemyTurn();
    }
    this.notify();
  }

  public equip(itemId: string) {
    const def = GAME_ITEMS[itemId];
    if (!def || def.type !== 'equipment' || !def.slot) {
      this.log('Item cannot be equipped.', 'sys');
      return;
    }

    this.player.equipment[def.slot] = itemId;
    this.log(`⚔️ Equipped ${def.name} (${def.desc}).`, 'loot');
    audioSynth.playPickup();
    touchHaptics.trigger('light_tap');
    this.notify();
  }

  public addItem(itemId: string, qty = 1) {
    this.player.inventory[itemId] = (this.player.inventory[itemId] || 0) + qty;
    this.notify();
  }

  public getEquippedArmorDef(): number {
    const armor = GAME_ITEMS[this.player.equipment.armor];
    return armor?.def || 0;
  }

  public restartGame(className = 'NETRUNNER', playerName = 'VEX_77') {
    const cls = PLAYER_CLASSES[className] || PLAYER_CLASSES.NETRUNNER;
    this.player = {
      name: playerName,
      className,
      level: 1,
      xp: 0,
      xpToNext: 100,
      hp: cls.hp,
      maxHp: cls.hp,
      shield: cls.name === 'Street Samurai' || cls.name === 'Cyber Shield' ? Math.round(40 * 0.3) : 0,
      maxShield: 40,
      ram: cls.ram,
      maxRam: cls.ram,
      ramRegen: cls.name === 'Netrunner' ? 6 : 4,
      credits: cls.credits,
      dataFragments: 0,
      damageBonus: cls.dmg,
      defenseBonus: cls.def,
      spriteId: cls.spriteId,
      inventory: {
        nanomed: 2,
        ramboost: 1,
      },
      equipment: {
        weapon: cls.starterWeapon || 'weapon0',
        armor: 'armor0',
      },
      programs: ['strike_protocol.bin', 'packet_probe.sys'],
      statusEffects: [],
    };
    this.zone = 'BUILDING';
    this.floor = 1;
    this.turn = 0;
    this.inCombat = false;
    this.activeEnemy = null;
    this.hackState = null;
    this.isGameOver = false;
    this.isGameWon = false;
    this.hasKeycard = false;
    this.world = new GameWorld(15, 15, Date.now() % 100000);
    this.playerPos = this.world.getStartPos();
    this.logs = [];
    this.log(`Runner ${this.player.name} jacked in. Welcome to the NetCrawler 2D Engine.`, 'sys');
    
    // Immediately save new session profile
    this.saveToStorage('netcrawler_save_primary', `New Runner (${this.player.name})`);
    this.notify();
  }

  public serialize(): SerializedGameState {
    return {
      version: 1,
      timestamp: Date.now(),
      savedAtFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      player: {
        ...this.player,
        inventory: { ...this.player.inventory },
        equipment: { ...this.player.equipment },
        programs: [...this.player.programs],
        statusEffects: this.player.statusEffects.map((s) => ({ ...s })),
      },
      playerPos: { ...this.playerPos },
      playerDir: this.playerDir,
      zone: this.zone,
      floor: this.floor,
      turn: this.turn,
      weather: this.weather,
      hasKeycard: this.hasKeycard,
      isGameOver: this.isGameOver,
      isGameWon: this.isGameWon,
      inCombat: this.inCombat,
      combatTurn: this.combatTurn,
      activeEnemy: this.activeEnemy ? {
        ...this.activeEnemy,
        statusEffects: this.activeEnemy.statusEffects.map((s) => ({ ...s })),
      } : null,
      isBossFight: this.isBossFight,
      world: this.world.serialize(),
      logs: this.logs.slice(0, 40),
    };
  }

  public deserialize(state: SerializedGameState): boolean {
    try {
      if (!state || !state.player || typeof state.player.hp !== 'number') {
        return false;
      }

      this.player = {
        name: state.player.name || 'VEX_77',
        className: state.player.className || 'NETRUNNER',
        level: state.player.level || 1,
        xp: state.player.xp || 0,
        xpToNext: state.player.xpToNext || 100,
        hp: state.player.hp,
        maxHp: state.player.maxHp || 100,
        shield: typeof state.player.shield === 'number' ? state.player.shield : 0,
        maxShield: state.player.maxShield || 40,
        ram: typeof state.player.ram === 'number' ? state.player.ram : 10,
        maxRam: state.player.maxRam || 10,
        ramRegen: state.player.ramRegen || 4,
        credits: typeof state.player.credits === 'number' ? state.player.credits : 0,
        dataFragments: typeof state.player.dataFragments === 'number' ? state.player.dataFragments : 0,
        damageBonus: state.player.damageBonus || 0,
        defenseBonus: state.player.defenseBonus || 0,
        spriteId: state.player.spriteId || 'player_netrunner',
        inventory: state.player.inventory ? { ...state.player.inventory } : { nanomed: 2, ramboost: 1 },
        equipment: state.player.equipment ? { ...state.player.equipment } : { weapon: 'weapon0', armor: 'armor0' },
        programs: Array.isArray(state.player.programs) ? [...state.player.programs] : ['strike_protocol.bin', 'packet_probe.sys'],
        statusEffects: Array.isArray(state.player.statusEffects) ? state.player.statusEffects.map((s) => ({ ...s })) : [],
      };

      if (state.world) {
        this.world.deserialize(state.world);
      }

      this.playerPos = state.playerPos ? { ...state.playerPos } : { x: 1, y: 1 };
      this.playerDir = state.playerDir || 'N';
      this.zone = state.zone || 'BUILDING';
      this.floor = typeof state.floor === 'number' ? state.floor : 1;
      this.turn = typeof state.turn === 'number' ? state.turn : 0;
      this.weather = state.weather || 'CLEAR';
      this.hasKeycard = !!state.hasKeycard;
      this.isGameOver = !!state.isGameOver;
      this.isGameWon = !!state.isGameWon;
      this.inCombat = !!state.inCombat;
      this.combatTurn = state.combatTurn || 'player';
      this.activeEnemy = state.activeEnemy ? { ...state.activeEnemy } : null;
      this.isBossFight = !!state.isBossFight;
      this.hackState = null;

      if (Array.isArray(state.logs) && state.logs.length > 0) {
        this.logs = [...state.logs];
      }

      return true;
    } catch (e) {
      console.error('[GameCore] Failed to deserialize game state:', e);
      return false;
    }
  }

  public saveToStorage(slotKey = 'netcrawler_save_primary', label = 'Manual Checkpoint'): boolean {
    const success = saveManager.saveToStorage(this.serialize(), slotKey, label);
    if (success) {
      this.log(`💾 Checkpoint Synced [${label}] to Local Storage.`, 'sys');
      audioSynth.playPickup();
      touchHaptics.trigger('light_tap');
    }
    return success;
  }

  public loadFromStorage(slotKey = 'netcrawler_save_primary'): boolean {
    const state = saveManager.loadFromStorage(slotKey);
    if (!state) {
      this.log('No saved Neural Link data found in this slot.', 'danger');
      return false;
    }
    const success = this.deserialize(state);
    if (success) {
      this.log(`📥 Loaded Checkpoint [${state.slotLabel || 'Save State'}] from ${state.savedAtFormatted || 'Local Storage'}.`, 'loot');
      audioSynth.playHackTone(true);
      touchHaptics.trigger('hack_success');
      this.notify();
    }
    return success;
  }

  public clearSavedState(slotKey = 'netcrawler_save_primary') {
    saveManager.deleteSave(slotKey);
    this.log('🗑️ Local Storage save record purged.', 'sys');
    this.notify();
  }
}

export const gameCore = new GameCore('NETRUNNER', 'VEX_77');
