/* 
   ========================================================================
   SILS (Silhouette) Functions for fx-svg-stage.js
   ------------------------------------------------------------------------
   Replace the SILS section in fx-svg-stage.js with this enhanced code.
   These functions generate highly detailed, architecturally rich silhouettes
   that morph smoothly from left to right.
   ========================================================================
*/

const SILS = {};

// 1. HORIZON (Soft natural hills)
SILS.horizon = function () {
  let d = 'M0,' + GROUND;
  for (let x = 0; x <= W; x += 15) {
    // Combine multiple sine waves for organic, rolling hills
    const y = GROUND - 12 
      - 22 * Math.sin(x / W * Math.PI) 
      - 8 * Math.sin(x / 180) 
      - 4 * Math.cos(x / 75)
      - 2 * Math.sin(x / 25);
    d += ' L' + x + ',' + y.toFixed(1);
  }
  return d + ' L' + W + ',' + H + ' L0,' + H + ' Z';
};

// 2. SPROUT (Early civilization, Nusantara traditional roofs, wooden pillars)
SILS.sprout = function () {
  const r = rng(101);
  let d = 'M0,' + GROUND;
  let x = 0;
  while (x < W) {
    const gap = 15 + r() * 30;
    x += gap;
    if (x > W - 20) break;
    
    // Natural ground
    const groundY = GROUND - 5 - 10 * Math.sin(x / W * Math.PI);
    d += ' L' + x.toFixed(1) + ',' + groundY.toFixed(1);
    
    if (r() > 0.4 && x > 80 && x < W - 80) {
      const w = 20 + r() * 30;
      const h = 15 + r() * 25;
      
      // Stilts (pillars)
      d += ' L' + x.toFixed(1) + ',' + (groundY - 8).toFixed(1);
      d += ' L' + (x + 4).toFixed(1) + ',' + (groundY - 8).toFixed(1);
      d += ' L' + (x + 4).toFixed(1) + ',' + (groundY - h).toFixed(1);
      
      // Joglo / Saddle roof (curved upwards at edges)
      d += ' L' + (x - 6).toFixed(1) + ',' + (groundY - h + 4).toFixed(1); // overhang left
      d += ' Q' + (x + w/2).toFixed(1) + ',' + (groundY - h - 15 - r()*10).toFixed(1) + ' ' + (x + w/2).toFixed(1) + ',' + (groundY - h - 20).toFixed(1); // peak
      d += ' Q' + (x + w/2).toFixed(1) + ',' + (groundY - h - 15).toFixed(1) + ' ' + (x + w + 6).toFixed(1) + ',' + (groundY - h + 4).toFixed(1); // overhang right
      
      // Right pillar
      d += ' L' + (x + w - 4).toFixed(1) + ',' + (groundY - h).toFixed(1);
      d += ' L' + (x + w - 4).toFixed(1) + ',' + (groundY - 8).toFixed(1);
      d += ' L' + (x + w).toFixed(1) + ',' + (groundY - 8).toFixed(1);
      d += ' L' + (x + w).toFixed(1) + ',' + groundY.toFixed(1);
      
      x += w;
    }
  }
  d += ' L' + W + ',' + GROUND + ' L' + W + ',' + H + ' L0,' + H + ' Z';
  return d;
};

// Base skyline generator for architectural details
function buildSkyline(seed, minH, maxH, styleOpts) {
  const r = rng(seed);
  let d = 'M0,' + GROUND;
  let x = -10;
  
  const { tilt = 0, ruins = 0, isModern = false, isFuture = false, isRebuild = false } = styleOpts || {};
  
  while (x < W + 10) {
    const gap = ruins > 0 ? (2 + r() * 15) : (1 + r() * 10);
    x += gap;
    if (x > W + 20) break;
    
    let w = 30 + r() * 70;
    if (isModern || isFuture) w += 20 + r() * 60; // wider buildings in modern times
    
    // City center emphasis
    const cx = Math.abs(x - W * 0.55) / (W * 0.5);
    let h = minH + r() * (maxH - minH);
    h *= (1.4 - cx * 0.7); 
    if (h < minH * 0.5) h = minH * 0.5;
    
    const topY = GROUND - h;
    const t = (r() - 0.5) * tilt;
    
    if (ruins > 0) {
      // Ruins: shattered, jagged, broken columns
      d += ' L' + x.toFixed(1) + ',' + GROUND;
      
      const leftBreak = topY + h * (0.3 + 0.6 * r());
      d += ' L' + (x + t).toFixed(1) + ',' + leftBreak.toFixed(1);
      
      const jagged = 3 + Math.floor(r() * 5);
      for (let j = 1; j <= jagged; j++) {
        const jx = x + (w * j) / jagged;
        const jy = topY + h * (0.2 + 0.7 * r());
        d += ' L' + (jx + t).toFixed(1) + ',' + jy.toFixed(1);
      }
      
      const rightBreak = topY + h * (0.3 + 0.6 * r());
      d += ' L' + (x + w + t).toFixed(1) + ',' + rightBreak.toFixed(1);
      
      // Sometimes an exposed steel beam
      if (r() > 0.7) {
        d += ' L' + (x + w + t).toFixed(1) + ',' + (rightBreak - 20 - r() * 30).toFixed(1);
        d += ' L' + (x + w + t + 2).toFixed(1) + ',' + (rightBreak - 20).toFixed(1);
        d += ' L' + (x + w + t + 2).toFixed(1) + ',' + rightBreak.toFixed(1);
      }
      
      d += ' L' + (x + w).toFixed(1) + ',' + GROUND;
      
    } else if (isRebuild) {
      // Rebuild: Cranes, scaffolding, exposed frames
      d += ' L' + x.toFixed(1) + ',' + GROUND;
      
      if (r() > 0.6) {
        // Construction crane
        const cx_pos = x + w/2;
        const cy_top = topY - 50 - r() * 60;
        d += ' L' + (cx_pos - 4).toFixed(1) + ',' + GROUND;
        d += ' L' + (cx_pos - 4).toFixed(1) + ',' + cy_top.toFixed(1); // tower left
        d += ' L' + (cx_pos - 30).toFixed(1) + ',' + cy_top.toFixed(1); // counter-jib
        d += ' L' + (cx_pos - 30).toFixed(1) + ',' + (cy_top - 6).toFixed(1);
        d += ' L' + (cx_pos).toFixed(1) + ',' + (cy_top - 16).toFixed(1); // apex
        d += ' L' + (cx_pos + 60 + r()*40).toFixed(1) + ',' + (cy_top - 6).toFixed(1); // main jib
        d += ' L' + (cx_pos + 60).toFixed(1) + ',' + cy_top.toFixed(1);
        d += ' L' + (cx_pos + 4).toFixed(1) + ',' + cy_top.toFixed(1); // tower right
        d += ' L' + (cx_pos + 4).toFixed(1) + ',' + GROUND;
      } else {
        // Scaffolding / under-construction building
        d += ' L' + x.toFixed(1) + ',' + topY.toFixed(1);
        const floors = 3 + Math.floor(r() * 4);
        for (let f = 1; f < floors; f++) {
          const fy = topY + (h / floors) * f;
          d += ' L' + (x + w * 0.2).toFixed(1) + ',' + fy.toFixed(1);
          d += ' L' + (x + w * 0.2).toFixed(1) + ',' + (fy + 4).toFixed(1);
          d += ' L' + x.toFixed(1) + ',' + (fy + 4).toFixed(1);
        }
        d += ' L' + (x + w).toFixed(1) + ',' + topY.toFixed(1);
        d += ' L' + (x + w).toFixed(1) + ',' + GROUND;
      }
      
    } else {
      // Normal buildings (Small, Full, Future, Tilt)
      d += ' L' + x.toFixed(1) + ',' + GROUND;
      d += ' L' + (x + t).toFixed(1) + ',' + topY.toFixed(1);
      
      const kind = r();
      
      if (isFuture) {
        // Futuristic structures: Domes, sweeping curves, skybridges
        if (kind > 0.85) {
          // Dome
          d += ' L' + (x + w/2 + t).toFixed(1) + ',' + (topY - w/3).toFixed(1); // pointed dome
          d += ' Q' + (x + w + t*2).toFixed(1) + ',' + (topY - w/4).toFixed(1) + ' ' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else if (kind > 0.6) {
          // Sweeping curve building
          d += ' Q' + (x + w/2 + t).toFixed(1) + ',' + (topY - 60).toFixed(1) + ' ' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else if (kind > 0.3) {
          // Twin towers with connecting bridge
          const bw = w * 0.3;
          d += ' L' + (x + bw + t).toFixed(1) + ',' + topY.toFixed(1); // tower 1
          d += ' L' + (x + bw + t).toFixed(1) + ',' + (topY + h*0.2).toFixed(1);
          d += ' L' + (x + w - bw + t).toFixed(1) + ',' + (topY + h*0.2).toFixed(1); // bridge
          d += ' L' + (x + w - bw + t).toFixed(1) + ',' + topY.toFixed(1); // tower 2
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else {
          // Tiered eco-scraper
          d += ' L' + (x + w*0.2 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w*0.2 + t).toFixed(1) + ',' + (topY - 20).toFixed(1);
          d += ' L' + (x + w*0.8 + t).toFixed(1) + ',' + (topY - 20).toFixed(1);
          d += ' L' + (x + w*0.8 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        }
        
      } else if (isModern) {
        // Metropolis: Art Deco setbacks, spires, telecoms
        if (kind > 0.9) {
          // Telecom tower (spire with rings/dishes)
          const mid = x + w/2 + t;
          d += ' L' + (mid - 6).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (mid - 2).toFixed(1) + ',' + (topY - 40).toFixed(1);
          d += ' L' + (mid - 12).toFixed(1) + ',' + (topY - 40).toFixed(1); // dish
          d += ' L' + (mid - 12).toFixed(1) + ',' + (topY - 44).toFixed(1);
          d += ' L' + (mid - 1).toFixed(1) + ',' + (topY - 44).toFixed(1);
          d += ' L' + mid.toFixed(1) + ',' + (topY - 80).toFixed(1); // spire tip
          d += ' L' + (mid + 1).toFixed(1) + ',' + (topY - 44).toFixed(1);
          d += ' L' + (mid + 12).toFixed(1) + ',' + (topY - 44).toFixed(1); // dish
          d += ' L' + (mid + 12).toFixed(1) + ',' + (topY - 40).toFixed(1);
          d += ' L' + (mid + 2).toFixed(1) + ',' + (topY - 40).toFixed(1);
          d += ' L' + (mid + 6).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else if (kind > 0.7) {
          // Art Deco Setbacks (Chrysler/Empire style)
          d += ' L' + (x + w*0.1 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w*0.1 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
          d += ' L' + (x + w*0.25 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
          d += ' L' + (x + w*0.25 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
          d += ' L' + (x + w*0.45 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
          d += ' L' + (x + w*0.5 + t).toFixed(1) + ',' + (topY - 70).toFixed(1); // spire
          d += ' L' + (x + w*0.55 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
          d += ' L' + (x + w*0.75 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
          d += ' L' + (x + w*0.75 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
          d += ' L' + (x + w*0.9 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
          d += ' L' + (x + w*0.9 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else if (kind > 0.4) {
          // Flat modern block with structural rhythm (window notches)
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
          // small notches on the right side
          const notches = 3;
          for (let n = 1; n <= notches; n++) {
             const ny = topY + (h * 0.3 * n) / notches;
             d += ' L' + (x + w + t*2).toFixed(1) + ',' + ny.toFixed(1);
             d += ' L' + (x + w - 4 + t*2).toFixed(1) + ',' + ny.toFixed(1);
             d += ' L' + (x + w - 4 + t*2).toFixed(1) + ',' + (ny + 4).toFixed(1);
             d += ' L' + (x + w + t*2).toFixed(1) + ',' + (ny + 4).toFixed(1);
          }
        } else {
           d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        }
        
      } else {
        // Small City: Clock towers, classic chimneys, peaked roofs
        if (kind > 0.85) {
          // Clock tower / Town hall
          const mid = x + w/2 + t;
          d += ' L' + (mid - 15).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (mid - 15).toFixed(1) + ',' + (topY - 30).toFixed(1); // tower base
          d += ' L' + (mid - 18).toFixed(1) + ',' + (topY - 30).toFixed(1);
          d += ' L' + (mid).toFixed(1) + ',' + (topY - 55).toFixed(1); // pointy roof
          d += ' L' + (mid + 18).toFixed(1) + ',' + (topY - 30).toFixed(1);
          d += ' L' + (mid + 15).toFixed(1) + ',' + (topY - 30).toFixed(1);
          d += ' L' + (mid + 15).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else if (kind > 0.65) {
          // Peaked roof (residential/commercial)
          d += ' L' + (x + w/2 + t).toFixed(1) + ',' + (topY - 20 - r()*15).toFixed(1);
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else if (kind > 0.4) {
          // Factory / classic chimneys
          d += ' L' + (x + w*0.3 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w*0.3 + t).toFixed(1) + ',' + (topY - 25).toFixed(1);
          d += ' L' + (x + w*0.4 + t).toFixed(1) + ',' + (topY - 25).toFixed(1);
          d += ' L' + (x + w*0.4 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w*0.7 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w*0.7 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
          d += ' L' + (x + w*0.8 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
          d += ' L' + (x + w*0.8 + t).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        } else {
          // Flat roof
          d += ' L' + (x + w + t*2).toFixed(1) + ',' + topY.toFixed(1);
        }
      }
      
      d += ' L' + (x + w + t*2).toFixed(1) + ',' + GROUND;
    }
    
    x += w;
  }
  
  d += ' L' + (W + 40) + ',' + GROUND + ' L' + (W + 40) + ',' + H + ' L-40,' + H + ' L-40,' + GROUND + ' Z';
  return d;
}

// 3. SKYLINE-SMALL (Classic town elements)
SILS['skyline-small'] = function () { 
  return buildSkyline(42, 35, 120, { isModern: false }); 
};

// 4. SKYLINE-FULL (Grand metropolis, art deco, spires)
SILS['skyline-full'] = function () { 
  return buildSkyline(105, 70, 320, { isModern: true }); 
};

// 5. SKYLINE-TILT (Distorted metropolis under pressure)
SILS['skyline-tilt'] = function () { 
  return buildSkyline(105, 70, 320, { isModern: true, tilt: 25 }); 
};

// 6. RUINS (Shattered, collapsed structures)
SILS.ruins = function () { 
  return buildSkyline(105, 30, 220, { ruins: 1 }); 
};

// 7. REBUILD (Construction cranes, scaffolding)
SILS.rebuild = function () { 
  return buildSkyline(204, 60, 250, { isRebuild: true }); 
};

// 8. CITY-FINAL (Harmonious futuristic city)
SILS['city-final'] = function () { 
  return buildSkyline(308, 90, 380, { isFuture: true }); 
};

// Optional: Export or assign
// Object.assign(window.FXSvg.SILS, SILS);
