# Vortex Drift - ElevenLabs SFX (Ses Efekti) Promtlari (24 Efekt)

Bu rehber, **Vortex // Drift 09** icindeki garaj secimleri, 3-2-1 baslangic geri sayimi, drift & lastik kaymasi, carpisma kivilcimlari ve 5 farkli BLUR silahi/power-up'i icin **ElevenLabs Sound Effects** uzerinde uretebilecegin **24 adet SFX promtunu** icerir.

---

## ElevenLabs Ayarlari ve Dosyalari Yukleme Adimlari

1. [ElevenLabs Sound Effects](https://elevenlabs.io/app/sound-effects) paneline girip **Duration** alanini her efektin yaninda yazan onerilen sureye (genelde `0.5s` - `2.0s` arasi) ayarla, **Prompt Influence** degerini ~`0.5` - `0.7` civarinda birak.
2. En net baslayan varyasyonu **`.mp3`** olarak indir ve asagidaki **tam dosya adiyla** proje klasorune kopyala:
   ```text
   public/assets/vortex/sfx/
   ```
   *(Tam yol: `/Users/berkay.acar/Projects/Overcade/public/assets/vortex/sfx/`)*
3. **Sifir Ek Ayar & Otomatik Kirpma:**
   - Vite (`vite.config.ts`) sadece bu klasorde bulunan dosyalari derler/yukler; yuklenmemis efektler asla `404` hatasi vermez ve mevcut `SoundFX` Web Audio sentezine otomatik fallback yapar.
   - [VortexSfxManager.ts](file:///Users/berkay.acar/Projects/Overcade/src/games/vortexDrift/VortexSfxManager.ts) klibin basindaki sessizligi otomatik kirparak tepkiyi `0ms` gecikmeye ceker ve ust uste binmelerde kulak yormamasi icin `+/- %6` dogal perde (pitch) varyasyonu uygular.
4. Dosyalari ekledikten sonra canliya almak icin:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

---

## 1. Lobi, Geri Sayim ve Yaris Akisi (7 Efekt)

### 1.1 `ui_car_switch.mp3` - Garajda Arac / Pist Degistirme (`0.5s`)
```text
Crisp futuristic racing game UI metallic pneumatic latch click with subtle sleek electronic servo sweep, clean tight menu navigation sound, no music
```

### 1.2 `ui_lock_ready.mp3` - Arac & Pist Kilitleme Onayi (`0.8s`)
```text
Punchy cyber motorsport UI confirm lock-in chime, deep mechanical hydraulic clamp locking shut followed by bright futuristic neon harmonic confirmation tone, no music
```

### 1.3 `ui_vote_winner.mp3` - Oylama Sonucu & Pist Secim Fanfari (`1.5s`)
```text
Sleek futuristic racing lobby circuit selected sting, rising glowing digital chord rush ending in crisp holographic telemetry lock confirm chime, short arcade sting, no full drums
```

### 1.4 `race_countdown_beep.mp3` - Baslangic Isigi Geri Sayimi `3 - 2 - 1` (`0.6s`)
```text
Sharp iconic arcade racing start grid countdown tone, crisp bright synthesized F1 telemetry light pulse beep with tight punchy transient, short clean single beep, no reverb tail
```

### 1.5 `race_countdown_go.mp3` - Yesil Isik `GO!` Kalkis Sinyali (`1.2s`)
```text
High-energy arcade race green light GO launch horn, triumphant bright dual-oscillator synth blast fused with turbo blow-off valve hiss, explosive start signal, no background music
```

### 1.6 `race_lap_chime.mp3` - Yeni Tur & Final Tur Gecis Sinyali (`1.2s`)
```text
Sleek futuristic race lap checkpoint pass-by chime, rapid Doppler energy gate whoosh paired with bright crystalline double harmonic telemetry ping, no music
```

### 1.7 `race_finish_fanfare.mp3` - Bitis Cizgisi Zafer Sinyali (`2.2s`)
```text
Checkered flag arcade race victory finish sound effect, explosive confetti firework crackle with bright ascending futuristic synth trophy chime burst, triumphant impact, no full song
```

---

## 2. Surus, Drift ve Carpisma Fizikleri (7 Efekt)

### 2.1 `car_engine_launch.mp3` - Baslangic Kalkis Motor Patlamasi (`1.5s`)
```text
Aggressive twin-turbo futuristic supercar launch takeoff roar, heavy high-rev engine acceleration surge fading out quickly with crisp exhaust pop, dry racing game SFX, no music
```

### 2.2 `car_drift_screech.mp3` - Virajda Lastik Kayma / Drift Sesi (`1.0s`)
```text
Sharp asphalt high-speed car tire drift screech and hot rubber skid on smooth tarmac, clean racing tire squeal segment without background traffic or music
```

### 2.3 `car_drift_boost.mp3` - Drift Sarji Dolunca Mini Turbo Patlamasi (`0.9s`)
```text
Crisp turbocharger wastegate flutter into tight blue flame afterburner snap boost whoosh, high-speed arcade drift release sound, short punchy acceleration burst, no music
```

### 2.4 `car_wall_scrape.mp3` - Bariyer Surtme & Kivilcim Sesi (`0.7s`)
```text
Metallic guardrail high-speed car side scrape with crackling electric sparks crunching against steel barrier, short sharp racing collision graze, no music
```

### 2.5 `car_collision_slam.mp3` - Arabaya Carpma Darbesi (`0.8s`)
```text
Heavy carbon-fiber race car bumper slam impact, deep metallic crunch thud with brief chassis rattle and spark burst, tight vehicular collision SFX, no music
```

### 2.6 `car_airborne_land.mp3` - Shunt Darbesinden Havalanip Yere Inme (`0.8s`)
```text
Heavy race car suspension compression slam landing onto asphalt after jump, heavy metallic chassis bounce thud with tire chirp, crisp impact SFX, no music
```

### 2.7 `hud_slot_cycle.mp3` - 3'lu Silah Slotu Degistirme (`[R1]`) (`0.5s`)
```text
Ultra-fast sci-fi hologram weapon slot toggle blip, crisp futuristic digital mechanical click chirp, very short UI switch sound, no music
```

---

## 3. Power-Up Silahlari ve Savas Efektleri (10 Efekt)

### 3.1 `powerup_pickup.mp3` - Hologram Power-Up Alma (`0.8s`)
```text
Bright futuristic holographic orb collection chime, energetic sci-fi energy absorption whoosh with crisp sparkling digital synth pickup ping, arcade racing SFX, no music
```

### 3.2 `powerup_nitro.mp3` - Nitro Booster Atesleme (`1.6s`)
```text
Massive futuristic plasma nitrous oxide thruster ignition roar, explosive supersonic boom into roaring blue jet afterburner tail rush, high-speed racing boost SFX, no music
```

### 3.3 `powerup_shield.mp3` - Kinetik Enerji Kalkani & Tamir (`1.2s`)
```text
Sci-fi hexagonal energy shield dome powering up around car, warm rising electromagnetic hum locking into crystalline shimmering protective forcefield tone, no music
```

### 3.4 `powerup_shield_block.mp3` - Kalkanin Fuze / Darbe Emme Sesi (`0.8s`)
```text
Resonant futuristic energy shield deflecting incoming missile, bright glass-like plasma forcefield ring fizzle with punchy kinetic bounce absorb, no music
```

### 3.5 `powerup_barge.mp3` - Barge Sok Dalgasi Patlamasi (`1.4s`)
```text
Powerful purple gravitational shockwave pulse blasting outward from race car, deep sub-bass concussive thump with wide ringing sci-fi EMP force ring, no music
```

### 3.6 `powerup_shunt_fire.mp3` - Shunt Gudumlu Fuze Atesi (`1.0s`)
```text
Futuristic homing missile pod firing off car roof rail, pneumatic lock release click into roaring red plasma rocket launch whoosh, punchy weapon fire SFX, no music
```

### 3.7 `powerup_shunt_impact.mp3` - Shunt Fuze Patlamasi (`1.4s`)
```text
Massive sci-fi homing missile detonation striking a race car, tight fiery explosion boom with shattering metallic debris and deep bass punch, no music
```

### 3.8 `powerup_bolt_fire.mp3` - 3'lu Plazma Bolt Atesi (`0.6s`)
```text
Rapid triple sci-fi plasma bolt cannon burst firing from car bumper, tight punchy staccato laser energy snaps, futuristic combat racer weapon SFX, no music
```

### 3.9 `powerup_bolt_impact.mp3` - Plazma Bolt Isabeti (`0.8s`)
```text
Crisp futuristic plasma bolt detonating on car armor, snappy high-tech electric spark pop explosion with metallic ping, short impact SFX, no music
```

### 3.10 `car_warning_incoming.mp3` - Gelen Gudumlu Fuze Lock-On Uyarisi (`0.8s`)
```text
Urgent fighter jet cockpit incoming homing missile lock-on warning alarm double beep, crisp high-tech red alert radar ping sound, dry electronic warning, no music
```
