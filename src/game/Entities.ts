export interface PlayerCharacter {
  name: string;
  className: string;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  ram: number;
  maxRam: number;
  ramRegen: number;
  credits: number;
  dataFragments: number;
  damageBonus: number;
  defenseBonus: number;
  spriteId: string;
  inventory: Record<string, number>;
  equipment: {
    weapon: string;
    armor: string;
  };
  programs: string[];
  statusEffects: Array<{ type: string; turns: number }>;
}

export interface EnemyEntity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  dmg: number;
  armor: number;
  spriteId: string;
  isBoss?: boolean;
  bossPhase?: number;
  loot?: string;
  nextZone?: string;
  statusEffects: Array<{ type: string; turns: number }>;
}

export interface ItemDef {
  id: string;
  name: string;
  type: 'consumable' | 'equipment';
  slot?: 'weapon' | 'armor';
  desc: string;
  spriteId: string;
  dmg?: number;
  def?: number;
  combatOnly?: boolean;
  use?: (player: PlayerCharacter) => string;
}

export const GAME_ITEMS: Record<string, ItemDef> = {
  nanomed: {
    id: 'nanomed',
    name: 'NanoMed.sys',
    type: 'consumable',
    desc: 'Restores +45 Integrity (HP)',
    spriteId: 'item_nanomed',
    use: (p) => {
      p.hp = Math.min(p.maxHp, p.hp + 45);
      return 'Integrity restored (+45 HP)';
    },
  },
  ramboost: {
    id: 'ramboost',
    name: 'RAMBoost.exe',
    type: 'consumable',
    desc: 'Instantly overclocks +8 RAM',
    spriteId: 'item_ramboost',
    use: (p) => {
      p.ram = Math.min(p.maxRam, p.ram + 8);
      return 'RAM overclocked (+8 RAM)';
    },
  },
  decryptor: {
    id: 'decryptor',
    name: 'Decryptor.pkg',
    type: 'consumable',
    desc: 'Yields +150 Encrypted Credits',
    spriteId: 'item_credits',
    use: (p) => {
      p.credits += 150;
      return 'Decrypted +150 Credits';
    },
  },
  chipmod: {
    id: 'chipmod',
    name: 'NeuralMod.bin',
    type: 'consumable',
    desc: 'Permanently increases Damage by +2',
    spriteId: 'item_weapon',
    use: (p) => {
      p.damageBonus += 2;
      return 'Neural damage +2 boosted permanently';
    },
  },
  nanoshield: {
    id: 'nanoshield',
    name: 'NanoShield.pkg',
    type: 'consumable',
    desc: 'Instantly reinforces Shield by +30',
    spriteId: 'item_nanomed',
    use: (p) => {
      p.shield = Math.min(p.maxShield, p.shield + 30);
      return 'Shield matrix reinforced (+30 Shield)';
    },
  },
  antivirus: {
    id: 'antivirus',
    name: 'AntiVirus.sys',
    type: 'consumable',
    desc: 'Cleanses all negative debuffs and corruptions',
    spriteId: 'item_ramboost',
    use: (p) => {
      p.statusEffects = [];
      return 'All system debuffs purged';
    },
  },
  empgrenade: {
    id: 'empgrenade',
    name: 'EMPGrenade.bin',
    type: 'consumable',
    desc: 'Stuns the target enemy for 1 turn',
    spriteId: 'item_weapon',
    combatOnly: true,
  },
  weapon0: {
    id: 'weapon0',
    name: 'Sparksteel Dagger',
    type: 'equipment',
    slot: 'weapon',
    desc: 'High-frequency carbon edge (+8 Dmg)',
    spriteId: 'item_weapon',
    dmg: 8,
  },
  weapon1: {
    id: 'weapon1',
    name: 'Mono-filament Katana',
    type: 'equipment',
    slot: 'weapon',
    desc: 'Razor-thin monomolecular blade (+16 Dmg)',
    spriteId: 'item_weapon',
    dmg: 16,
  },
  armor0: {
    id: 'armor0',
    name: 'Basic Mesh Vest',
    type: 'equipment',
    slot: 'armor',
    desc: 'Kevlar weave with baseline grounding (+3 Def)',
    spriteId: 'item_nanomed',
    def: 3,
  },
  armor1: {
    id: 'armor1',
    name: 'Sub-dermal Titanium Armor',
    type: 'equipment',
    slot: 'armor',
    desc: 'Military ballistic alloy (+8 Def)',
    spriteId: 'item_nanomed',
    def: 8,
  },
};

export const PLAYER_CLASSES: Record<
  string,
  {
    name: string;
    hp: number;
    ram: number;
    dmg: number;
    def: number;
    credits: number;
    spriteId: string;
    passive: string;
    starterWeapon: string;
  }
> = {
  NETRUNNER: {
    name: 'Netrunner',
    hp: 95,
    ram: 24,
    dmg: 0,
    def: 1,
    credits: 120,
    spriteId: 'player_netrunner',
    passive: '+50% RAM recovery rate, +30% Breach bonus damage',
    starterWeapon: 'weapon0',
  },
  SAMURAI: {
    name: 'Street Samurai',
    hp: 160,
    ram: 8,
    dmg: 5,
    def: 3,
    credits: 100,
    spriteId: 'player_samurai',
    passive: 'Starts with 30% active shield, +25% crit chance, 2x crit multiplier',
    starterWeapon: 'weapon0',
  },
  TECHIE: {
    name: 'Techie Engineer',
    hp: 125,
    ram: 16,
    dmg: 2,
    def: 5,
    credits: 400,
    spriteId: 'player_techie',
    passive: '+300 starter credits, heavy armor defense bonus (+5)',
    starterWeapon: 'weapon0',
  },
  SLASHER: {
    name: 'Code Slasher',
    hp: 110,
    ram: 14,
    dmg: 4,
    def: 2,
    credits: 150,
    spriteId: 'player_samurai',
    passive: 'Attacks deal 1.5x damage to wounded targets',
    starterWeapon: 'weapon1',
  },
  SHIELD: {
    name: 'Cyber Shield',
    hp: 150,
    ram: 10,
    dmg: 2,
    def: 6,
    credits: 120,
    spriteId: 'player_netrunner',
    passive: 'Automatic 35% shield replenishment every encounter start',
    starterWeapon: 'weapon0',
  },
  OVERFLOW: {
    name: 'Buffer Overflow',
    hp: 85,
    ram: 28,
    dmg: 1,
    def: 0,
    credits: 100,
    spriteId: 'player_netrunner',
    passive: 'High RAM pool; double attack chance during breach strikes',
    starterWeapon: 'weapon0',
  },
  SCRIPTKID: {
    name: 'Script Kiddie',
    hp: 105,
    ram: 12,
    dmg: 2,
    def: 1,
    credits: 350,
    spriteId: 'player_techie',
    passive: 'Begins with 3 extra consumable utilities & +250 credits',
    starterWeapon: 'weapon0',
  },
};
