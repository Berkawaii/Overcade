import type { HeroClassDefinition, HeroClassId, PlayerEntity } from './types';
import type { EnemyEntity } from './EnemyData';
import type { NpcEntity } from './WorldData';

/**
 * PixelArtRenderer
 * Handcrafted 16-bit pixel-art rendering engine for Chrono Knights // Aethelvale.
 * Renders distinct character silhouettes, directional poses, equipment,
 * animated walking bobs, and custom monsters/bosses without generic geometric circles.
 */
export class PixelArtRenderer {
  // Helper to draw a crisp pixel rectangle
  private static px(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // -------------------------------------------------------------
  // HERO RENDERING
  // -------------------------------------------------------------
  public static drawHero(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    classDef: HeroClassDefinition,
    accentColor: string
  ): void {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));

    const isMoving = player.isMoving;
    const isAttacking = player.attackState.isAttacking;
    const facing = player.facing;
    const now = performance.now();
    const walkBob = isMoving ? Math.sin(now * 0.016) * 3 : 0;
    const legSwing = isMoving ? Math.sin(now * 0.016) * 4 : 0;

    // Drop shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player slot accent ring on ground
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 16, 17, 7.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    const isFlipped = facing === 'left';
    if (isFlipped) {
      ctx.scale(-1, 1);
    }

    // Offset for whole body animation
    const by = -8 + walkBob;

    // --- LEGS & BOOTS ---
    const bootColor = '#1E293B';
    const armorPlate = classDef.accentColor;

    // Left leg
    this.px(ctx, -7, by + 12 + legSwing, 5, 8, bootColor);
    this.px(ctx, -7, by + 10, 5, 4, armorPlate);
    // Right leg
    this.px(ctx, 2, by + 12 - legSwing, 5, 8, bootColor);
    this.px(ctx, 2, by + 10, 5, 4, armorPlate);

    // --- BODY & CLASS-SPECIFIC SILHOUETTE ---
    switch (player.classId) {
      case 'knight':
        this.drawKnightBody(ctx, by, facing, isAttacking, accentColor);
        break;
      case 'pyromancer':
        this.drawPyromancerBody(ctx, by, facing, isAttacking, now);
        break;
      case 'ranger':
        this.drawRangerBody(ctx, by, facing, isAttacking);
        break;
      case 'cleric':
        this.drawClericBody(ctx, by, facing, isAttacking, now);
        break;
      case 'berserker':
        this.drawBerserkerBody(ctx, by, facing, isAttacking);
        break;
      case 'rogue':
        this.drawRogueBody(ctx, by, facing, isAttacking);
        break;
    }

    // Attack Slash Arc Overlay (Directional crescent swing)
    if (isAttacking) {
      const progress = Math.min(1, player.attackState.timer / Math.max(0.05, player.attackState.duration));
      const swingStart = -0.85 + progress * 0.4;
      const swingEnd = 0.75 + progress * 0.45;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(10, by + 2, 28, swingStart, swingEnd);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(10, by + 2, 25, swingStart + 0.15, swingEnd - 0.15);
      ctx.stroke();
    }

    ctx.restore();

    // Render 360-degree Cyclone Weapon Spin & Ultimate Orbiting Blades in unflipped world space around player!
    if (player.spinAttackTimer > 0) {
      this.drawCycloneWeaponSpin(ctx, player, classDef, now);
    }
    if (player.orbitBladesTimer > 0) {
      this.drawOrbitingBlades(ctx, player, classDef, now);
    }
  }

  private static drawCycloneWeaponSpin(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    classDef: HeroClassDefinition,
    now: number
  ): void {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y - 4));

    const spinAngle = now * 0.026;
    const radius = player.classId === 'berserker' ? 44 : player.classId === 'knight' ? 42 : 38;

    // Outer glowing 360-degree cyclone slash ring
    ctx.strokeStyle = classDef.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, spinAngle, spinAngle + Math.PI * 1.65);
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 3, spinAngle + 0.3, spinAngle + Math.PI * 1.45);
    ctx.stroke();

    // Draw the actual pixel-art weapon blades spinning 360 degrees around the hero!
    const bladeCount = player.classId === 'rogue' ? 4 : 2;
    for (let i = 0; i < bladeCount; i++) {
      const a = spinAngle + (i * Math.PI * 2) / bladeCount;
      ctx.save();
      ctx.rotate(a);

      if (player.classId === 'knight') {
        // Spinning Runed Broadsword
        this.px(ctx, 14, -3, 28, 6, '#E2E8F0'); // Gleaming steel blade
        this.px(ctx, 16, -1, 22, 2, '#38BDF8'); // Glowing rune fuller
        this.px(ctx, 10, -7, 4, 14, '#F59E0B'); // Golden crossguard
        this.px(ctx, 4, -2, 6, 4, '#451A03'); // Hilt
      } else if (player.classId === 'berserker') {
        // Spinning Giant Double-Headed Battleaxe
        this.px(ctx, 10, -2, 32, 4, '#78350F'); // Long oak haft
        this.px(ctx, 28, -11, 12, 22, '#94A3B8'); // Twin crescent axe head
        this.px(ctx, 36, -12, 5, 24, '#F97316'); // Blazing molten edge
        this.px(ctx, 39, -10, 2, 20, '#FFFFFF'); // White-hot edge
      } else {
        // Spinning Venom Curved Dagger (Rogue)
        this.px(ctx, 14, -2, 22, 4, '#10B981'); // Venom emerald blade
        this.px(ctx, 16, -1, 18, 2, '#A855F7'); // Shadow core
        this.px(ctx, 11, -5, 3, 10, '#F59E0B'); // Guard
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private static drawOrbitingBlades(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    classDef: HeroClassDefinition,
    now: number
  ): void {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y - 4));

    const count = player.classId === 'rogue' ? 6 : 4;
    const orbitRadius = 56;
    const baseAngle = now * 0.012;

    // Subtle sacred/shadow orbit ring
    ctx.strokeStyle = `${classDef.accentColor}55`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i * Math.PI * 2) / count;
      const bx = Math.cos(a) * orbitRadius;
      const by = Math.sin(a) * orbitRadius;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a + Math.PI / 2);

      if (player.classId === 'knight') {
        // Golden Spectral Greatsword
        this.px(ctx, -2, -14, 4, 24, '#FDE047');
        this.px(ctx, -1, -12, 2, 20, '#FFFFFF');
        this.px(ctx, -6, 6, 12, 3, '#F59E0B');
      } else if (player.classId === 'berserker') {
        // Crimson Bloodrage War Axe
        this.px(ctx, -2, -12, 4, 24, '#78350F');
        this.px(ctx, -9, -10, 18, 10, '#EF4444');
        this.px(ctx, -10, -8, 20, 4, '#FBBF24');
      } else {
        // Phantom Shadow Dagger
        this.px(ctx, -2, -12, 4, 20, '#A855F7');
        this.px(ctx, -1, -10, 2, 16, '#10B981');
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // Knight Paladin: Heavy steel armor, golden winged helm, kite shield & longsword
  private static drawKnightBody(
    ctx: CanvasRenderingContext2D,
    by: number,
    facing: string,
    isAttacking: boolean,
    accentColor: string
  ): void {
    // Torso Armor
    this.px(ctx, -8, by - 6, 16, 18, '#475569'); // Steel plate
    this.px(ctx, -6, by - 4, 12, 14, '#64748B'); // Highlights
    this.px(ctx, -2, by - 2, 4, 10, '#3B82F6'); // Cobalt heraldic crest
    this.px(ctx, -5, by + 2, 10, 2, '#F59E0B'); // Gold trim

    // Golden Pauldrons (Shoulders)
    this.px(ctx, -11, by - 6, 5, 6, '#F59E0B');
    this.px(ctx, 6, by - 6, 5, 6, '#F59E0B');

    // Helmet & Head
    this.px(ctx, -7, by - 20, 14, 14, '#334155'); // Helmet base
    this.px(ctx, -6, by - 19, 12, 12, '#64748B'); // Faceplate
    this.px(ctx, -4, by - 24, 8, 5, '#F59E0B'); // Golden crest comb
    this.px(ctx, -8, by - 23, 4, 5, '#E2E8F0'); // Wing feather left
    this.px(ctx, 4, by - 23, 4, 5, '#E2E8F0'); // Wing feather right

    // Visor eye slit
    if (facing === 'up') {
      this.px(ctx, -5, by - 16, 10, 4, '#1E293B'); // Back of helmet
    } else {
      this.px(ctx, -3, by - 14, 8, 3, '#0F172A'); // Eye slit
      this.px(ctx, -1, by - 14, 4, 2, '#38BDF8'); // Glowing visor eye
    }

    // Shield (on left side)
    this.px(ctx, -14, by - 4, 6, 14, '#1E3A8A');
    this.px(ctx, -15, by - 2, 8, 10, '#3B82F6');
    this.px(ctx, -13, by + 1, 4, 4, '#F59E0B'); // Gold cross

    // Longsword (on right side)
    const swordRot = isAttacking ? 25 : 0;
    this.px(ctx, 9, by - 10 + swordRot, 3, 18, '#CBD5E1'); // Blade
    this.px(ctx, 7, by + 3 + swordRot, 7, 2, '#F59E0B'); // Crossguard
    this.px(ctx, 9, by + 5 + swordRot, 3, 4, '#451A03'); // Grip
    this.px(ctx, 8, by + 9 + swordRot, 5, 2, '#F59E0B'); // Pommel
  }

  // Pyromancer: Flowing crimson robes, pointed cowl, blazing flame staff & orbiting sparks
  private static drawPyromancerBody(
    ctx: CanvasRenderingContext2D,
    by: number,
    facing: string,
    isAttacking: boolean,
    now: number
  ): void {
    // Robe Skirt
    this.px(ctx, -8, by + 2, 16, 11, '#991B1B');
    this.px(ctx, -7, by + 4, 14, 9, '#B91C1C');
    this.px(ctx, -1, by + 2, 2, 11, '#F59E0B'); // Gold front sash

    // Robe Torso
    this.px(ctx, -6, by - 6, 12, 10, '#DC2626');
    this.px(ctx, -4, by - 4, 8, 6, '#EF4444');

    // Cowl & Hood
    this.px(ctx, -6, by - 18, 12, 12, '#991B1B');
    this.px(ctx, -3, by - 22, 6, 5, '#7F1D1D'); // Pointed hood tip

    if (facing === 'up') {
      this.px(ctx, -5, by - 16, 10, 8, '#7F1D1D'); // Back of hood
    } else {
      this.px(ctx, -4, by - 14, 8, 6, '#18181B'); // Shaded face under hood
      this.px(ctx, -2, by - 13, 2, 2, '#F59E0B'); // Glowing orange eyes
      this.px(ctx, 1, by - 13, 2, 2, '#F59E0B');
    }

    // Wooden Fire Staff
    this.px(ctx, 8, by - 16, 3, 26, '#78350F'); // Staff wood
    this.px(ctx, 7, by - 19, 5, 4, '#F59E0B'); // Gold setting
    // Pulsing ruby crystal top
    const pulse = Math.sin(now * 0.01) > 0 ? '#EF4444' : '#F97316';
    this.px(ctx, 6, by - 23, 7, 5, pulse);

    // Orbiting fire mote
    const moteAngle = now * 0.005;
    const mx = Math.cos(moteAngle) * 16;
    const my = Math.sin(moteAngle) * 8;
    this.px(ctx, mx, by - 4 + my, 3, 3, '#FBBF24');
  }

  // Shadow Ranger: Green hunter tunic, leather wraps, quiver, recurve bow
  private static drawRangerBody(
    ctx: CanvasRenderingContext2D,
    by: number,
    facing: string,
    isAttacking: boolean
  ): void {
    // Tunic & Leather Vest
    this.px(ctx, -7, by - 5, 14, 16, '#15803D'); // Forest green tunic
    this.px(ctx, -5, by - 4, 10, 10, '#78350F'); // Leather vest
    this.px(ctx, -6, by + 4, 12, 3, '#451A03'); // Buckled belt

    // Quiver on Back (slanted)
    this.px(ctx, -10, by - 14, 4, 12, '#92400E');
    this.px(ctx, -11, by - 17, 3, 4, '#F8FAFC'); // Arrow fletching
    this.px(ctx, -8, by - 16, 3, 4, '#F8FAFC');

    // Archer Hood & Face
    this.px(ctx, -6, by - 18, 12, 12, '#166534');
    this.px(ctx, -4, by - 21, 8, 4, '#14532D');

    if (facing === 'up') {
      this.px(ctx, -5, by - 16, 10, 8, '#14532D');
    } else {
      this.px(ctx, -4, by - 15, 8, 7, '#FCD34D'); // Skin
      this.px(ctx, -2, by - 13, 2, 2, '#0F172A'); // Keen eyes
      this.px(ctx, 1, by - 13, 2, 2, '#0F172A');
      this.px(ctx, -4, by - 10, 8, 4, '#15803D'); // Green face mask / cowl
    }

    // Recurve Longbow
    const bowX = isAttacking ? 12 : 8;
    this.px(ctx, bowX, by - 16, 3, 24, '#78350F'); // Bow curve
    this.px(ctx, bowX + 2, by - 18, 2, 4, '#92400E');
    this.px(ctx, bowX + 2, by + 6, 2, 4, '#92400E');
    this.px(ctx, bowX - 1, by - 14, 1, 20, '#F8FAFC'); // String
  }

  // High Cleric: Pristine white & gold vestments, holy halo, sun scepter
  private static drawClericBody(
    ctx: CanvasRenderingContext2D,
    by: number,
    facing: string,
    isAttacking: boolean,
    now: number
  ): void {
    // Holy Halo above head
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, by - 24, 8, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // White Vestment Robe
    this.px(ctx, -8, by - 6, 16, 18, '#F8FAFC'); // Pure white robe
    this.px(ctx, -2, by - 6, 4, 18, '#F59E0B'); // Golden center stole
    this.px(ctx, -1, by - 2, 2, 6, '#D97706'); // Golden cross

    // Mitre / Cleric Cap
    this.px(ctx, -5, by - 20, 10, 12, '#FFFFFF');
    this.px(ctx, -4, by - 24, 8, 5, '#F59E0B'); // Mitre peaks
    this.px(ctx, -1, by - 22, 2, 7, '#D97706');

    if (facing === 'up') {
      this.px(ctx, -4, by - 16, 8, 7, '#FFFFFF');
    } else {
      this.px(ctx, -4, by - 14, 8, 6, '#FDE68A'); // Face
      this.px(ctx, -2, by - 13, 2, 2, '#3B82F6'); // Calm blue eyes
      this.px(ctx, 1, by - 13, 2, 2, '#3B82F6');
    }

    // Holy Scepter
    this.px(ctx, 8, by - 14, 3, 22, '#D97706'); // Gold rod
    this.px(ctx, 5, by - 18, 9, 5, '#FDE047'); // Scepter sunburst
    this.px(ctx, 7, by - 20, 5, 2, '#F59E0B');
  }

  // Berserker: Horned barbarian helmet, bear fur mantle, huge dual battleaxes
  private static drawBerserkerBody(
    ctx: CanvasRenderingContext2D,
    by: number,
    facing: string,
    isAttacking: boolean
  ): void {
    // Muscular Torso & Bear Pelt
    this.px(ctx, -8, by - 6, 16, 16, '#78350F'); // Fur pelt
    this.px(ctx, -6, by - 4, 12, 10, '#B45309'); // Muscular chest
    this.px(ctx, -7, by + 4, 14, 4, '#451A03'); // Spiked iron belt

    // Heavy Fur Pauldrons
    this.px(ctx, -11, by - 7, 5, 7, '#451A03');
    this.px(ctx, 6, by - 7, 5, 7, '#451A03');

    // Horned Barbarian Helm
    this.px(ctx, -6, by - 18, 12, 11, '#334155'); // Iron cap
    this.px(ctx, -12, by - 24, 5, 8, '#F8FAFC'); // Left curved bone horn
    this.px(ctx, -10, by - 20, 4, 4, '#E2E8F0');
    this.px(ctx, 7, by - 24, 5, 8, '#F8FAFC'); // Right curved bone horn
    this.px(ctx, 6, by - 20, 4, 4, '#E2E8F0');

    if (facing === 'up') {
      this.px(ctx, -5, by - 16, 10, 7, '#1E293B');
    } else {
      this.px(ctx, -4, by - 14, 8, 6, '#FBBF24');
      this.px(ctx, -3, by - 13, 2, 2, '#EF4444'); // Fierce red eyes
      this.px(ctx, 1, by - 13, 2, 2, '#EF4444');
      this.px(ctx, -5, by - 9, 10, 4, '#78350F'); // War beard
    }

    // Giant Double-Headed War Axes
    this.px(ctx, 8, by - 16, 3, 24, '#451A03'); // Haft
    this.px(ctx, 5, by - 16, 9, 8, '#94A3B8'); // Iron axe head
    this.px(ctx, 4, by - 18, 11, 2, '#CBD5E1'); // Sharp edge

    // Second axe on left
    this.px(ctx, -11, by - 14, 3, 20, '#451A03');
    this.px(ctx, -14, by - 14, 7, 7, '#94A3B8');
  }

  // Shadow Blade (Rogue): Dark ninja wrap, poison daggers, stealth shadow trail
  private static drawRogueBody(
    ctx: CanvasRenderingContext2D,
    by: number,
    facing: string,
    isAttacking: boolean
  ): void {
    // Sleek Dark Leather Garb
    this.px(ctx, -7, by - 5, 14, 16, '#0F172A'); // Midnight black tunic
    this.px(ctx, -5, by - 4, 10, 10, '#1E293B');
    this.px(ctx, -6, by + 3, 12, 3, '#10B981'); // Emerald venom vials on belt

    // Scarf / Mask
    this.px(ctx, -6, by - 18, 12, 12, '#09090B');
    if (facing === 'up') {
      this.px(ctx, -5, by - 16, 10, 8, '#09090B');
    } else {
      this.px(ctx, -4, by - 14, 8, 4, '#FCD34D'); // Eyes band
      this.px(ctx, -2, by - 13, 2, 2, '#10B981'); // Emerald slit eyes
      this.px(ctx, 1, by - 13, 2, 2, '#10B981');
      this.px(ctx, -5, by - 10, 10, 6, '#0F172A'); // Assassin face mask
    }

    // Twin Venom Daggers
    this.px(ctx, 8, by - 2, 3, 11, '#10B981'); // Dripping poison blade
    this.px(ctx, 8, by - 4, 3, 2, '#F59E0B'); // Hilt
    this.px(ctx, -11, by - 2, 3, 11, '#10B981'); // Left dagger
  }

  // -------------------------------------------------------------
  // NPC RENDERING
  // -------------------------------------------------------------
  public static drawNpc(ctx: CanvasRenderingContext2D, npc: NpcEntity): void {
    ctx.save();
    ctx.translate(Math.round(npc.x), Math.round(npc.y));

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const by = -6;

    switch (npc.id) {
      case 'npc-elder':
        // Elder Eldrin: Flowing sage robes, long braided white beard, wooden staff, scroll
        this.px(ctx, -8, by - 4, 16, 18, '#1E3A8A'); // Blue sage robe
        this.px(ctx, -2, by - 4, 4, 18, '#F59E0B'); // Gold sash
        // Head & Beard
        this.px(ctx, -5, by - 16, 10, 9, '#FDE68A');
        this.px(ctx, -4, by - 18, 8, 4, '#E2E8F0'); // White hair
        this.px(ctx, -4, by - 9, 8, 12, '#FFFFFF'); // Long white beard
        this.px(ctx, -2, by - 13, 2, 2, '#1E293B'); // Eyes
        this.px(ctx, 1, by - 13, 2, 2, '#1E293B');
        // Wooden Staff
        this.px(ctx, 9, by - 16, 3, 26, '#78350F');
        this.px(ctx, 8, by - 19, 5, 4, '#F59E0B');
        // Scroll in left hand
        this.px(ctx, -11, by + 1, 4, 7, '#FEF08A');
        break;

      case 'npc-blacksmith':
        // Brom the Smith: Muscular, leather forge apron, smithing hammer, red bandana
        this.px(ctx, -9, by - 5, 18, 18, '#78350F'); // Leather apron
        this.px(ctx, -6, by - 3, 12, 14, '#451A03');
        // Head & Red Bandana
        this.px(ctx, -5, by - 15, 10, 8, '#FBBF24');
        this.px(ctx, -6, by - 18, 12, 4, '#DC2626'); // Red bandana
        this.px(ctx, -5, by - 8, 10, 7, '#451A03'); // Thick brown beard
        this.px(ctx, -2, by - 13, 2, 2, '#1E293B');
        this.px(ctx, 1, by - 13, 2, 2, '#1E293B');
        // Heavy Smithing Hammer
        this.px(ctx, 9, by - 10, 3, 20, '#78350F');
        this.px(ctx, 6, by - 13, 9, 7, '#64748B'); // Iron hammer head
        break;

      case 'npc-apothecary':
        // Martha the Herbalist: Floral dress, herbal satchel, mortar & pestle
        this.px(ctx, -8, by - 4, 16, 18, '#047857'); // Emerald dress
        this.px(ctx, -6, by - 2, 12, 14, '#10B981');
        this.px(ctx, -5, by - 15, 10, 9, '#FDE68A'); // Face
        this.px(ctx, -6, by - 18, 12, 5, '#78350F'); // Brown hair bun
        this.px(ctx, -2, by - 13, 2, 2, '#047857'); // Green eyes
        this.px(ctx, 1, by - 13, 2, 2, '#047857');
        // Mortar & Pestle in hands
        this.px(ctx, -3, by + 1, 7, 6, '#713F12');
        this.px(ctx, -1, by - 2, 3, 4, '#E2E8F0');
        break;

      case 'npc-thorne':
        // High Commander Thorne: Gold & blue royal armor, fluttering crimson cape, broadsword
        this.px(ctx, -10, by - 2, 20, 18, '#DC2626'); // Red cape
        this.px(ctx, -8, by - 5, 16, 16, '#F59E0B'); // Gold plate
        this.px(ctx, -6, by - 3, 12, 12, '#3B82F6'); // Royal blue tabard
        this.px(ctx, -5, by - 16, 10, 9, '#FBBF24');
        this.px(ctx, -6, by - 19, 12, 4, '#F59E0B'); // Gold circlet
        this.px(ctx, -2, by - 13, 2, 2, '#1E293B');
        this.px(ctx, 1, by - 13, 2, 2, '#1E293B');
        this.px(ctx, 9, by - 8, 3, 22, '#CBD5E1'); // Imperial broadsword
        this.px(ctx, 7, by + 2, 7, 2, '#F59E0B');
        break;

      case 'npc-bazaar':
        // Merchant Cedric: Purple silk robes, feathered merchant cap, coin pouch
        this.px(ctx, -8, by - 5, 16, 18, '#7E22CE'); // Purple silk
        this.px(ctx, -6, by - 3, 12, 14, '#A855F7');
        this.px(ctx, -5, by - 15, 10, 8, '#FDE68A');
        this.px(ctx, -7, by - 19, 14, 5, '#D97706'); // Merchant hat
        this.px(ctx, 5, by - 23, 3, 6, '#EF4444'); // Red feather
        this.px(ctx, -2, by - 13, 2, 2, '#1E293B');
        this.px(ctx, 1, by - 13, 2, 2, '#1E293B');
        this.px(ctx, 7, by + 2, 6, 7, '#FBBF24'); // Gold pouch
        break;

      case 'npc-zephyr':
        // High Mage Zephyr: Indigo constellation robes, floating arcane crystal
        this.px(ctx, -8, by - 5, 16, 19, '#312E81'); // Dark astral indigo
        this.px(ctx, -6, by - 3, 12, 15, '#4338CA');
        this.px(ctx, -5, by - 16, 10, 9, '#E0E7FF');
        this.px(ctx, -6, by - 20, 12, 5, '#1E1B4B');
        this.px(ctx, -2, by - 13, 2, 2, '#C084FC'); // Violet magical eyes
        this.px(ctx, 1, by - 13, 2, 2, '#C084FC');
        // Floating crystal
        this.px(ctx, 9, by - 12, 6, 8, '#A855F7');
        this.px(ctx, 10, by - 11, 4, 6, '#E9D5FF');
        break;
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // ENEMY RENDERING
  // -------------------------------------------------------------
  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyEntity): void {
    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y));

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 12, enemy.radius * 0.9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const isFlipped = enemy.facing === 'left';
    if (isFlipped) {
      ctx.scale(-1, 1);
    }

    const by = -6;
    const now = performance.now();
    const walkBob = Math.sin(now * 0.015) * 2;

    switch (enemy.kind) {
      case 'wolf':
        // Steppe Pack Wolf: Quadruped predator, alert ears, fangs, bushy tail
        this.px(ctx, -14, by - 2 + walkBob, 20, 10, '#475569'); // Torso
        this.px(ctx, -12, by - 4 + walkBob, 16, 8, '#64748B'); // Highlights
        // Head & Snout
        this.px(ctx, 4, by - 8 + walkBob, 8, 8, '#475569');
        this.px(ctx, 11, by - 6 + walkBob, 5, 5, '#334155'); // Snout
        this.px(ctx, 13, by - 3 + walkBob, 2, 2, '#FFFFFF'); // Fangs
        this.px(ctx, 4, by - 12 + walkBob, 3, 5, '#334155'); // Ears
        this.px(ctx, 8, by - 7 + walkBob, 2, 2, '#EF4444'); // Glowing eye
        // Bushy tail
        this.px(ctx, -18, by - 6 + walkBob, 6, 6, '#64748B');
        // Paws
        this.px(ctx, -12, by + 8, 4, 7, '#334155');
        this.px(ctx, 2, by + 8, 4, 7, '#334155');
        break;

      case 'boar':
        // Armored Tusker Boar: Bulky body, upward ivory tusks, spiked iron back
        this.px(ctx, -14, by - 6 + walkBob, 24, 15, '#78350F'); // Brown bulky body
        this.px(ctx, -12, by - 4 + walkBob, 20, 11, '#92400E');
        this.px(ctx, -10, by - 9 + walkBob, 14, 4, '#475569'); // Spiked iron back armor
        // Snout & Big Curved Ivory Tusks
        this.px(ctx, 8, by - 2 + walkBob, 7, 8, '#78350F');
        this.px(ctx, 12, by - 5 + walkBob, 3, 6, '#FFFFFF'); // Big tusk
        this.px(ctx, 7, by - 4 + walkBob, 2, 2, '#EF4444'); // Red eye
        // Trotter hooves
        this.px(ctx, -10, by + 9, 5, 6, '#1C1917');
        this.px(ctx, 4, by + 9, 5, 6, '#1C1917');
        break;

      case 'bandit':
        // Plains Marauder: Striped bandana, eye patch, curved scimitar
        this.px(ctx, -7, by - 4 + walkBob, 14, 16, '#991B1B'); // Crimson jerkin
        this.px(ctx, -5, by - 2 + walkBob, 10, 10, '#78350F');
        this.px(ctx, -5, by - 15 + walkBob, 10, 8, '#FBBF24');
        this.px(ctx, -6, by - 18 + walkBob, 12, 4, '#DC2626'); // Red bandana
        this.px(ctx, 1, by - 13 + walkBob, 2, 2, '#09090B'); // Eye patch
        this.px(ctx, -2, by - 13 + walkBob, 2, 2, '#FFFFFF');
        // Curved Scimitar
        this.px(ctx, 8, by - 8 + walkBob, 3, 16, '#CBD5E1');
        this.px(ctx, 10, by - 12 + walkBob, 4, 6, '#E2E8F0');
        break;

      case 'skeleton_warrior':
      case 'tomb_wraith':
        // Skeleton Warrior: Skull, ribcage, bone limbs, rusted notched blade
        this.px(ctx, -6, by - 16 + walkBob, 12, 10, '#E2E8F0'); // Skull
        this.px(ctx, -3, by - 13 + walkBob, 2, 2, '#000000'); // Eye sockets
        this.px(ctx, 2, by - 13 + walkBob, 2, 2, '#000000');
        this.px(ctx, -2, by - 13 + walkBob, 1, 1, '#EF4444'); // Red glow pinprick
        this.px(ctx, 3, by - 13 + walkBob, 1, 1, '#EF4444');
        // Ribcage
        this.px(ctx, -5, by - 5 + walkBob, 10, 12, '#CBD5E1');
        this.px(ctx, -4, by - 3 + walkBob, 8, 2, '#1E293B'); // Rib spaces
        this.px(ctx, -4, by + 1 + walkBob, 8, 2, '#1E293B');
        // Rusted Sword
        this.px(ctx, 7, by - 10 + walkBob, 3, 18, '#B45309');
        break;

      case 'crypt_necromancer':
      case 'void_summoner':
        // Crypt Necromancer: Dark cowl, bony hands, hovering soul catalyst
        this.px(ctx, -7, by - 6 + walkBob, 14, 18, '#2E1065'); // Deep purple cowl
        this.px(ctx, -5, by - 4 + walkBob, 10, 14, '#581C87');
        this.px(ctx, -5, by - 16 + walkBob, 10, 9, '#1E1B4B');
        this.px(ctx, -2, by - 13 + walkBob, 2, 2, '#A855F7'); // Purple eyes
        this.px(ctx, 2, by - 13 + walkBob, 2, 2, '#A855F7');
        // Hovering Dark Soul Catalyst
        this.px(ctx, 9, by - 8 + walkBob, 6, 7, '#9333EA');
        this.px(ctx, 10, by - 7 + walkBob, 4, 5, '#C084FC');
        break;

      case 'spider_spinner':
      case 'spider_spitter':
      case 'spider_hatchling':
      case 'obsidian_scorpian':
        // Cavern Web Spinner / Acid Spitter: Segmented abdomen, fangs, 6 articulated legs
        this.px(ctx, -14, by - 6, 16, 14, '#14532D'); // Venomous abdomen
        this.px(ctx, -12, by - 4, 12, 10, '#16A34A');
        this.px(ctx, 2, by - 4, 8, 10, '#15803D'); // Thorax & head
        this.px(ctx, 8, by - 2, 3, 4, '#FDE047'); // Venom dripping fangs
        this.px(ctx, 4, by - 5, 2, 2, '#EF4444'); // Cluster eyes
        this.px(ctx, 6, by - 5, 2, 2, '#EF4444');
        // 6 Spider Legs (animated crawling)
        const legStep = Math.sin(now * 0.02) * 3;
        // Top legs
        this.px(ctx, -6, by - 12 + legStep, 3, 7, '#166534');
        this.px(ctx, 2, by - 12 - legStep, 3, 7, '#166534');
        // Bottom legs
        this.px(ctx, -6, by + 8 - legStep, 3, 7, '#166534');
        this.px(ctx, 2, by + 8 + legStep, 3, 7, '#166534');
        break;

      case 'magma_golem':
      case 'fire_imp':
      case 'shadow_assassin':
      default:
        // Fiery Golem & Creature fallback
        this.px(ctx, -10, by - 6 + walkBob, 20, 16, enemy.color);
        this.px(ctx, -6, by - 4 + walkBob, 12, 10, '#FEF08A');
        this.px(ctx, -3, by - 2 + walkBob, 6, 6, '#EF4444');
        break;
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // BOSS RENDERING
  // -------------------------------------------------------------
  public static drawBoss(ctx: CanvasRenderingContext2D, boss: EnemyEntity): void {
    ctx.save();
    ctx.translate(Math.round(boss.x), Math.round(boss.y));

    const isFlipped = boss.facing === 'left';
    if (isFlipped) {
      ctx.scale(-1, 1);
    }

    const by = -14;
    const now = performance.now();
    const bob = Math.sin(now * 0.01) * 3;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 22, boss.radius * 0.9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    if (boss.id.includes('malakor') && !boss.id.includes('dark')) {
      // BOSS 1: Skeleton Warlord Malakor (Bone Greatswords, Barbed Crown, Glowing Soul Ribs)
      this.drawMalakorWarlord(ctx, by, bob, !!boss.enraged);
    } else if (boss.id.includes('vespera')) {
      // BOSS 2: Broodmother Vespera (Monstrous 8-legged spider queen with dripping venom sac)
      this.drawBroodmotherVespera(ctx, by, bob, now, !!boss.enraged);
    } else if (boss.id.includes('ignis')) {
      // BOSS 3: Forgekeeper Ignis (Lava Colossus with molten hammer and furnace chest)
      this.drawForgekeeperIgnis(ctx, by, bob, now, !!boss.enraged);
    } else {
      // FINAL BOSS: Dark Sovereign Malakor (Cosmic Void Archon with starry nebula mantle)
      this.drawDarkSovereignMalakor(ctx, by, bob, now, !!boss.enraged);
    }

    ctx.restore();
  }

  // Boss 1: Skeleton Warlord Malakor
  private static drawMalakorWarlord(
    ctx: CanvasRenderingContext2D,
    by: number,
    bob: number,
    enraged: boolean
  ): void {
    const boneColor = '#E2E8F0';
    const soulGlow = enraged ? '#EF4444' : '#A855F7';

    // Skull & Barbed Bone Crown
    this.px(ctx, -12, by - 26 + bob, 24, 20, boneColor);
    this.px(ctx, -14, by - 34 + bob, 28, 9, '#D97706'); // Barbed golden dread crown
    this.px(ctx, -7, by - 20 + bob, 4, 5, '#000000'); // Eye sockets
    this.px(ctx, 3, by - 20 + bob, 4, 5, '#000000');
    this.px(ctx, -5, by - 19 + bob, 2, 3, soulGlow); // Glowing eyes
    this.px(ctx, 5, by - 19 + bob, 2, 3, soulGlow);

    // Glowing Ribcage
    this.px(ctx, -14, by - 6 + bob, 28, 26, '#334155'); // Dark chest hollow
    this.px(ctx, -12, by - 4 + bob, 24, 22, soulGlow); // Soul heart
    this.px(ctx, -14, by - 5 + bob, 28, 3, boneColor); // Rib 1
    this.px(ctx, -14, by + 1 + bob, 28, 3, boneColor); // Rib 2
    this.px(ctx, -14, by + 7 + bob, 28, 3, boneColor); // Rib 3

    // Twin Crimson Blood Greatswords
    this.px(ctx, 16, by - 28 + bob, 6, 44, '#DC2626'); // Right sword
    this.px(ctx, 18, by - 26 + bob, 2, 40, '#F87171');
    this.px(ctx, -22, by - 24 + bob, 6, 40, '#DC2626'); // Left sword
  }

  // Boss 2: Broodmother Vespera
  private static drawBroodmotherVespera(
    ctx: CanvasRenderingContext2D,
    by: number,
    bob: number,
    now: number,
    enraged: boolean
  ): void {
    const venomColor = enraged ? '#EF4444' : '#22C55E';

    // Massive Pulsing Venom Sac
    this.px(ctx, -26, by - 12 + bob, 32, 28, '#064E3B');
    this.px(ctx, -22, by - 8 + bob, 24, 20, venomColor);

    // Carapace Head & Multi-eyes
    this.px(ctx, 6, by - 8 + bob, 18, 18, '#022C22');
    this.px(ctx, 18, by - 4 + bob, 6, 10, '#FDE047'); // Acid mandibles
    // Red cluster eyes
    this.px(ctx, 10, by - 7 + bob, 3, 3, '#EF4444');
    this.px(ctx, 14, by - 7 + bob, 3, 3, '#EF4444');
    this.px(ctx, 12, by - 3 + bob, 3, 3, '#EF4444');

    // 8 Huge Scuttling Spider Legs
    const step = Math.sin(now * 0.015) * 6;
    this.px(ctx, -12, by - 24 + step, 5, 14, '#064E3B');
    this.px(ctx, 4, by - 24 - step, 5, 14, '#064E3B');
    this.px(ctx, -12, by + 14 - step, 5, 14, '#064E3B');
    this.px(ctx, 4, by + 14 + step, 5, 14, '#064E3B');
  }

  // Boss 3: Forgekeeper Ignis
  private static drawForgekeeperIgnis(
    ctx: CanvasRenderingContext2D,
    by: number,
    bob: number,
    now: number,
    enraged: boolean
  ): void {
    const magmaGlow = enraged ? '#F97316' : '#EF4444';

    // Basalt Colossus Torso & Glowing Molten Core
    this.px(ctx, -18, by - 8 + bob, 36, 32, '#18181B');
    this.px(ctx, -14, by - 4 + bob, 28, 24, magmaGlow); // Glowing heart core
    this.px(ctx, -10, by - 1 + bob, 20, 18, '#FEF08A'); // Hot core center

    // Horned Lava Helm
    this.px(ctx, -12, by - 26 + bob, 24, 18, '#27272A');
    this.px(ctx, -16, by - 34 + bob, 6, 10, magmaGlow); // Left fire horn
    this.px(ctx, 10, by - 34 + bob, 6, 10, magmaGlow); // Right fire horn
    this.px(ctx, -6, by - 18 + bob, 4, 3, '#FEF08A'); // Molten eyes
    this.px(ctx, 2, by - 18 + bob, 4, 3, '#FEF08A');

    // Massive Two-Handed Foundry Sledgehammer
    this.px(ctx, 20, by - 36 + bob, 6, 54, '#451A03'); // Iron-reinforced haft
    this.px(ctx, 14, by - 40 + bob, 18, 16, '#3F3F46'); // Heavy anvil head
    this.px(ctx, 16, by - 38 + bob, 14, 12, magmaGlow); // Glowing molten face
  }

  // Final Boss: Dark Sovereign Malakor
  private static drawDarkSovereignMalakor(
    ctx: CanvasRenderingContext2D,
    by: number,
    bob: number,
    now: number,
    enraged: boolean
  ): void {
    const voidColor = enraged ? '#EF4444' : '#8B5CF6';

    // Orbiting Void Runes
    for (let i = 0; i < 4; i++) {
      const angle = now * 0.003 + (i * Math.PI) / 2;
      const rx = Math.cos(angle) * 38;
      const ry = Math.sin(angle) * 16;
      this.px(ctx, rx, by + ry, 6, 6, '#C084FC');
      this.px(ctx, rx + 1, by + ry + 1, 4, 4, '#FDF4FF');
    }

    // Astral Starry Robes
    this.px(ctx, -18, by - 10 + bob, 36, 36, '#0B0A1A');
    this.px(ctx, -14, by - 6 + bob, 28, 28, '#2E1065');
    this.px(ctx, -2, by - 6 + bob, 4, 28, voidColor);

    // Cosmic Antlers / Void Horns
    this.px(ctx, -14, by - 28 + bob, 28, 18, '#1E1B4B');
    this.px(ctx, -22, by - 42 + bob, 8, 16, voidColor);
    this.px(ctx, 14, by - 42 + bob, 8, 16, voidColor);

    // Glowing Void Eyes
    this.px(ctx, -7, by - 20 + bob, 4, 4, '#F43F5E');
    this.px(ctx, 3, by - 20 + bob, 4, 4, '#F43F5E');
  }

  // Training Dummy
  public static drawDummy(
    ctx: CanvasRenderingContext2D,
    dummy: { x: number; y: number; hurtTimer: number }
  ): void {
    ctx.save();
    ctx.translate(Math.round(dummy.x), Math.round(dummy.y));

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const by = -8;
    const hit = dummy.hurtTimer > 0;
    const woodColor = hit ? '#EF4444' : '#78350F';
    const strawColor = hit ? '#FFFFFF' : '#FDE047';

    // Wooden Post Base
    this.px(ctx, -4, by + 8, 8, 16, '#451A03');

    // Straw Body & Target Cross
    this.px(ctx, -12, by - 8, 24, 18, strawColor);
    this.px(ctx, -14, by - 2, 28, 6, woodColor); // Cross arm
    this.px(ctx, -2, by - 14, 4, 30, woodColor); // Vertical pole

    // Burlap Sack Head
    this.px(ctx, -8, by - 20, 16, 12, strawColor);
    this.px(ctx, -4, by - 16, 3, 3, '#000000'); // Stitched eyes
    this.px(ctx, 1, by - 16, 3, 3, '#000000');

    ctx.restore();
  }
}
