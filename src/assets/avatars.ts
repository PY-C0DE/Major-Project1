/**
 * AlphaQuant AI - System Avatars Library (Google Play Games Inspired)
 * Features 20 high-fidelity vector avatars with vibrant gradients and distinctive personas:
 * - Animals & Totems (Wolf, Bull, Fox, Falcon, Panther, Owl, Bear, Dragon)
 * - Cyberbots & AI (Quantum Bot, Neural Matrix, Synth Pilot, Pixel Droid, Cyber Ninja, Astro Bot)
 * - Gamers & Quants (Lead Quant, Pixel Champion, Crypto Rebel, Gold Trophy, Synthwave Runner, Stealth Scout)
 * All avatars are self-contained SVG Data URIs for instant rendering and persistence.
 */

export interface SystemAvatar {
  id: string;
  name: string;
  category: 'animals' | 'cyberbots' | 'quants' | 'cosmic';
  description: string;
  accentColor: string;
  svgDataUri: string;
}

// Helper to convert SVG markup into a clean encoded Data URI
function createSvgUri(svgString: string): string {
  const encoded = encodeURIComponent(svgString.trim())
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export const SYSTEM_AVATARS: SystemAvatar[] = [
  // CATEGORY 1: ANIMALS & TOTEMS
  {
    id: 'alpha-wolf',
    name: 'Alpha Wolf',
    category: 'animals',
    description: 'Fierce leader of the quantitative pack with cybernetic night vision.',
    accentColor: '#06b6d4',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-wolf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#0e7490" />
            <stop offset="100%" stop-color="#06b6d4" />
          </linearGradient>
          <linearGradient id="fur-wolf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e2e8f0" />
            <stop offset="100%" stop-color="#94a3b8" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-wolf)" stroke="#38bdf8" stroke-width="2"/>
        <!-- Wolf Ears -->
        <polygon points="26,18 36,36 20,38" fill="#475569" />
        <polygon points="28,22 34,34 23,35" fill="#f43f5e" />
        <polygon points="74,18 64,36 80,38" fill="#475569" />
        <polygon points="72,22 66,34 77,35" fill="#f43f5e" />
        <!-- Head -->
        <polygon points="50,28 72,46 64,74 50,82 36,74 28,46" fill="url(#fur-wolf)" />
        <!-- Snout -->
        <polygon points="50,48 58,68 50,76 42,68" fill="#cbd5e1" />
        <polygon points="50,68 54,73 46,73" fill="#0f172a" />
        <!-- Cyber Visor / Eyes -->
        <rect x="33" y="44" width="34" height="7" rx="3.5" fill="#06b6d4" />
        <line x1="33" y1="47.5" x2="67" y2="47.5" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="43" cy="47.5" r="2.5" fill="#ffffff" />
        <circle cx="57" cy="47.5" r="2.5" fill="#ffffff" />
        <!-- Cheek fur fluff -->
        <polygon points="28,46 18,52 29,56" fill="#94a3b8" />
        <polygon points="72,46 82,52 71,56" fill="#94a3b8" />
      </svg>
    `)
  },
  {
    id: 'bull-runner',
    name: 'Bull Market King',
    category: 'animals',
    description: 'Unstoppable bullish momentum armed with golden horns.',
    accentColor: '#10b981',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-bull" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#064e3b" />
            <stop offset="100%" stop-color="#10b981" />
          </linearGradient>
          <linearGradient id="gold-horn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-bull)" stroke="#34d399" stroke-width="2"/>
        <!-- Horns -->
        <path d="M 28 38 Q 14 20 22 10 Q 30 20 36 32 Z" fill="url(#gold-horn)" stroke="#d97706" stroke-width="1" />
        <path d="M 72 38 Q 86 20 78 10 Q 70 20 64 32 Z" fill="url(#gold-horn)" stroke="#d97706" stroke-width="1" />
        <!-- Bull Head -->
        <ellipse cx="50" cy="52" rx="24" ry="26" fill="#1e293b" />
        <polygon points="34,36 66,36 60,64 40,64" fill="#334155" />
        <!-- Snout Ring -->
        <ellipse cx="50" cy="68" rx="14" ry="9" fill="#475569" />
        <circle cx="45" cy="68" r="2.5" fill="#0f172a" />
        <circle cx="55" cy="68" r="2.5" fill="#0f172a" />
        <path d="M 45 74 A 6 6 0 0 0 55 74" fill="none" stroke="#fbbf24" stroke-width="2" />
        <!-- Glowing Eyes -->
        <ellipse cx="40" cy="46" rx="4" ry="2.5" fill="#34d399" />
        <ellipse cx="60" cy="46" rx="4" ry="2.5" fill="#34d399" />
      </svg>
    `)
  },
  {
    id: 'quant-fox',
    name: 'Quant Fox',
    category: 'animals',
    description: 'Clever statistical strategist with keen pattern-recognition senses.',
    accentColor: '#f97316',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-fox" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#431407" />
            <stop offset="50%" stop-color="#c2410c" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-fox)" stroke="#fdba74" stroke-width="2"/>
        <!-- Ears -->
        <polygon points="24,18 38,36 18,36" fill="#c2410c" />
        <polygon points="26,22 36,34 22,34" fill="#ffffff" />
        <polygon points="76,18 62,36 82,36" fill="#c2410c" />
        <polygon points="74,22 64,34 78,34" fill="#ffffff" />
        <!-- Head -->
        <polygon points="50,30 76,48 62,76 50,84 38,76 24,48" fill="#ea580c" />
        <!-- White cheeks & snout -->
        <polygon points="50,56 64,74 50,82 36,74" fill="#ffffff" />
        <polygon points="50,72 54,77 46,77" fill="#0f172a" />
        <!-- Glasses -->
        <rect x="30" y="44" width="16" height="12" rx="3" fill="#0f172a" stroke="#fbbf24" stroke-width="1.5" />
        <rect x="54" y="44" width="16" height="12" rx="3" fill="#0f172a" stroke="#fbbf24" stroke-width="1.5" />
        <line x1="46" y1="50" x2="54" y2="50" stroke="#fbbf24" stroke-width="2" />
        <circle cx="38" cy="50" r="3" fill="#38bdf8" />
        <circle cx="62" cy="50" r="3" fill="#38bdf8" />
      </svg>
    `)
  },
  {
    id: 'cyber-falcon',
    name: 'Cyber Falcon',
    category: 'animals',
    description: 'High-speed algorithmic predator monitoring real-time feeds.',
    accentColor: '#38bdf8',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-falcon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0c4a6e" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-falcon)" stroke="#38bdf8" stroke-width="2"/>
        <!-- Crest feathers -->
        <polygon points="50,14 54,28 46,28" fill="#0369a1" />
        <polygon points="42,18 48,28 38,28" fill="#0284c7" />
        <polygon points="58,18 52,28 62,28" fill="#0284c7" />
        <!-- Head -->
        <circle cx="50" cy="46" r="24" fill="#f8fafc" />
        <!-- Mask / markings -->
        <polygon points="34,42 50,34 66,42 58,54 42,54" fill="#0f172a" />
        <!-- Beak -->
        <polygon points="44,52 56,52 50,74" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
        <!-- Cyber Eyes -->
        <circle cx="41" cy="44" r="4" fill="#06b6d4" />
        <circle cx="59" cy="44" r="4" fill="#06b6d4" />
        <circle cx="41" cy="44" r="1.5" fill="#ffffff" />
        <circle cx="59" cy="44" r="1.5" fill="#ffffff" />
      </svg>
    `)
  },
  {
    id: 'neon-panther',
    name: 'Neon Panther',
    category: 'animals',
    description: 'Stealth volatility hunter that strikes on breakout signals.',
    accentColor: '#a855f7',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-panther" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2e1065" />
            <stop offset="100%" stop-color="#7e22ce" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-panther)" stroke="#c084fc" stroke-width="2"/>
        <!-- Ears -->
        <ellipse cx="28" cy="30" rx="8" ry="10" fill="#09090b" stroke="#a855f7" stroke-width="1" />
        <ellipse cx="72" cy="30" rx="8" ry="10" fill="#09090b" stroke="#a855f7" stroke-width="1" />
        <!-- Head -->
        <circle cx="50" cy="52" r="26" fill="#18181b" />
        <!-- Snout -->
        <ellipse cx="50" cy="65" rx="12" ry="9" fill="#27272a" />
        <polygon points="50,60 54,64 46,64" fill="#e879f9" />
        <!-- Neon Eyes -->
        <polygon points="34,44 44,48 36,52" fill="#c084fc" />
        <polygon points="66,44 56,48 64,52" fill="#c084fc" />
        <circle cx="39" cy="48" r="2" fill="#ffffff" />
        <circle cx="61" cy="48" r="2" fill="#ffffff" />
        <!-- Whisker Accents -->
        <line x1="28" y1="64" x2="18" y2="62" stroke="#a855f7" stroke-width="1.5" />
        <line x1="28" y1="67" x2="16" y2="70" stroke="#a855f7" stroke-width="1.5" />
        <line x1="72" y1="64" x2="82" y2="62" stroke="#a855f7" stroke-width="1.5" />
        <line x1="72" y1="67" x2="84" y2="70" stroke="#a855f7" stroke-width="1.5" />
      </svg>
    `)
  },
  {
    id: 'wise-owl',
    name: 'Wise Quant Owl',
    category: 'animals',
    description: 'Dean of econometric risk modeling and conformal math.',
    accentColor: '#6366f1',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-owl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#4338ca" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-owl)" stroke="#818cf8" stroke-width="2"/>
        <!-- Feather Tufts -->
        <polygon points="26,22 36,36 22,38" fill="#312e81" />
        <polygon points="74,22 64,36 78,38" fill="#312e81" />
        <!-- Head -->
        <circle cx="50" cy="52" r="25" fill="#e0e7ff" />
        <!-- Giant Eyes -->
        <circle cx="39" cy="48" r="11" fill="#1e1b4b" stroke="#fbbf24" stroke-width="2.5" />
        <circle cx="61" cy="48" r="11" fill="#1e1b4b" stroke="#fbbf24" stroke-width="2.5" />
        <circle cx="39" cy="48" r="5" fill="#fbbf24" />
        <circle cx="61" cy="48" r="5" fill="#fbbf24" />
        <circle cx="41" cy="46" r="2" fill="#ffffff" />
        <circle cx="63" cy="46" r="2" fill="#ffffff" />
        <!-- Beak -->
        <polygon points="50,56 54,66 46,66" fill="#f59e0b" />
        <!-- Graduation cap / visor -->
        <polygon points="50,18 76,28 50,36 24,28" fill="#0f172a" />
        <rect x="47" y="32" width="6" height="8" fill="#0f172a" />
        <circle cx="76" cy="30" r="2" fill="#fbbf24" />
      </svg>
    `)
  },
  {
    id: 'crypto-bear',
    name: 'Tactical Bear',
    category: 'animals',
    description: 'Disciplined short-side hedging specialist with tactical gear.',
    accentColor: '#14b8a6',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-bear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#134e4a" />
            <stop offset="100%" stop-color="#0d9488" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-bear)" stroke="#2dd4bf" stroke-width="2"/>
        <!-- Bear Ears -->
        <circle cx="28" cy="28" r="9" fill="#1f2937" stroke="#111827" stroke-width="2" />
        <circle cx="28" cy="28" r="4" fill="#374151" />
        <circle cx="72" cy="28" r="9" fill="#1f2937" stroke="#111827" stroke-width="2" />
        <circle cx="72" cy="28" r="4" fill="#374151" />
        <!-- Bear Head -->
        <circle cx="50" cy="52" r="26" fill="#374151" />
        <!-- Snout -->
        <ellipse cx="50" cy="62" rx="14" ry="10" fill="#d1d5db" />
        <ellipse cx="50" cy="58" rx="5" ry="3.5" fill="#111827" />
        <!-- Tactical Goggles -->
        <rect x="30" y="40" width="40" height="12" rx="4" fill="#111827" />
        <rect x="33" y="42" width="15" height="8" rx="2" fill="#2dd4bf" />
        <rect x="52" y="42" width="15" height="8" rx="2" fill="#2dd4bf" />
        <line x1="48" y1="46" x2="52" y2="46" stroke="#111827" stroke-width="2" />
      </svg>
    `)
  },
  {
    id: 'dragon-master',
    name: 'Mythic Dragon',
    category: 'animals',
    description: 'High-beta momentum powerhouse breathing green alpha candles.',
    accentColor: '#ef4444',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-dragon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#450a0a" />
            <stop offset="100%" stop-color="#dc2626" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-dragon)" stroke="#f87171" stroke-width="2"/>
        <!-- Dragon Horns -->
        <polygon points="30,36 18,12 36,24" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
        <polygon points="70,36 82,12 64,24" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
        <!-- Dragon Head -->
        <polygon points="50,22 74,44 64,74 50,84 36,74 26,44" fill="#7f1d1d" />
        <polygon points="50,30 68,48 50,78 32,48" fill="#991b1b" />
        <!-- Fiery Eyes -->
        <polygon points="36,46 46,50 38,54" fill="#fbbf24" />
        <polygon points="64,46 54,50 62,54" fill="#fbbf24" />
        <!-- Snout Fluff -->
        <polygon points="46,70 50,64 54,70" fill="#0f172a" />
        <circle cx="47" cy="74" r="1.5" fill="#fca5a5" />
        <circle cx="53" cy="74" r="1.5" fill="#fca5a5" />
      </svg>
    `)
  },

  // CATEGORY 2: CYBERBOTS & AI (GOOGLE PLAY GAMES RETRO/FUTURISTIC)
  {
    id: 'quantum-bot',
    name: 'Quantum Bot 9000',
    category: 'cyberbots',
    description: 'Flagship Google Play style Android bot with conformal sensor array.',
    accentColor: '#10b981',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-qbot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#022c22" />
            <stop offset="50%" stop-color="#065f46" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-qbot)" stroke="#34d399" stroke-width="2"/>
        <!-- Antennae -->
        <line x1="38" y1="26" x2="28" y2="14" stroke="#a7f3d0" stroke-width="3" stroke-linecap="round" />
        <circle cx="27" cy="13" r="3" fill="#34d399" />
        <line x1="62" y1="26" x2="72" y2="14" stroke="#a7f3d0" stroke-width="3" stroke-linecap="round" />
        <circle cx="73" cy="13" r="3" fill="#34d399" />
        <!-- Bot Head Dome -->
        <path d="M 22 56 A 28 28 0 0 1 78 56 Z" fill="#34d399" />
        <!-- Bot Eyes -->
        <circle cx="36" cy="44" r="5" fill="#022c22" />
        <circle cx="64" cy="44" r="5" fill="#022c22" />
        <circle cx="37.5" cy="43" r="1.5" fill="#ffffff" />
        <circle cx="65.5" cy="43" r="1.5" fill="#ffffff" />
        <!-- Bot Body Collar -->
        <rect x="24" y="60" width="52" height="18" rx="8" fill="#10b981" />
        <!-- Chest Core -->
        <circle cx="50" cy="69" r="4" fill="#a7f3d0" />
      </svg>
    `)
  },
  {
    id: 'neural-matrix',
    name: 'Neural Matrix',
    category: 'cyberbots',
    description: 'Deep neural network core running 100,000 simulations per second.',
    accentColor: '#3b82f6',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-matrix" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#1e3a8a" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-matrix)" stroke="#60a5fa" stroke-width="2"/>
        <!-- Circuit Lines -->
        <path d="M 20 50 L 32 50 L 40 34 L 60 34 L 68 50 L 80 50" fill="none" stroke="#38bdf8" stroke-width="1.5" />
        <path d="M 32 50 L 40 66 L 60 66 L 68 50" fill="none" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Skull/Core Shell -->
        <polygon points="50,22 72,36 72,64 50,78 28,64 28,36" fill="#1e293b" stroke="#60a5fa" stroke-width="2" />
        <!-- Visor Scan -->
        <rect x="34" y="44" width="32" height="8" rx="4" fill="#000000" />
        <rect x="36" y="46" width="28" height="4" rx="2" fill="#60a5fa" />
        <circle cx="50" cy="48" r="3" fill="#ffffff" />
        <!-- Neural Nodes -->
        <circle cx="50" cy="32" r="3" fill="#38bdf8" />
        <circle cx="40" cy="62" r="2.5" fill="#38bdf8" />
        <circle cx="60" cy="62" r="2.5" fill="#38bdf8" />
      </svg>
    `)
  },
  {
    id: 'synth-pilot',
    name: 'Mecha Pilot',
    category: 'cyberbots',
    description: 'Armored combat pilot engineered for high-frequency trading rigs.',
    accentColor: '#f43f5e',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-pilot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c0519" />
            <stop offset="100%" stop-color="#be123c" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-pilot)" stroke="#fb7185" stroke-width="2"/>
        <!-- Helmet Crest -->
        <polygon points="50,14 56,26 44,26" fill="#f43f5e" />
        <!-- Helmet Shape -->
        <polygon points="50,22 74,38 70,68 50,84 30,68 26,38" fill="#18181b" stroke="#e11d48" stroke-width="2" />
        <!-- Neon Visor -->
        <polygon points="34,44 66,44 62,58 38,58" fill="#fb7185" />
        <line x1="36" y1="51" x2="64" y2="51" stroke="#ffffff" stroke-width="2" />
        <!-- Respirator/Vents -->
        <rect x="42" y="66" width="16" height="8" rx="2" fill="#27272a" />
        <line x1="46" y1="68" x2="46" y2="72" stroke="#fb7185" stroke-width="1.5" />
        <line x1="50" y1="68" x2="50" y2="72" stroke="#fb7185" stroke-width="1.5" />
        <line x1="54" y1="68" x2="54" y2="72" stroke="#fb7185" stroke-width="1.5" />
      </svg>
    `)
  },
  {
    id: 'pixel-droid',
    name: 'Retro Arcade Droid',
    category: 'cyberbots',
    description: 'Charming 8-bit retro arcade robot from the 1980s console era.',
    accentColor: '#eab308',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-pixel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#422006" />
            <stop offset="100%" stop-color="#ca8a04" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-pixel)" stroke="#facc15" stroke-width="2"/>
        <!-- Antenna -->
        <rect x="48" y="16" width="4" height="12" fill="#facc15" />
        <rect x="46" y="12" width="8" height="6" fill="#eab308" />
        <!-- Robot Head Box -->
        <rect x="26" y="28" width="48" height="40" rx="8" fill="#1e293b" stroke="#facc15" stroke-width="2" />
        <!-- Screen Visor -->
        <rect x="32" y="34" width="36" height="20" rx="4" fill="#0f172a" />
        <!-- Pixel Eyes -->
        <rect x="38" y="40" width="8" height="8" fill="#facc15" />
        <rect x="54" y="40" width="8" height="8" fill="#facc15" />
        <!-- Smile Dots -->
        <rect x="38" y="60" width="6" height="3" fill="#facc15" />
        <rect x="46" y="62" width="8" height="3" fill="#facc15" />
        <rect x="56" y="60" width="6" height="3" fill="#facc15" />
        <!-- Ear Bolts -->
        <rect x="22" y="42" width="4" height="10" rx="2" fill="#cbd5e1" />
        <rect x="74" y="42" width="4" height="10" rx="2" fill="#cbd5e1" />
      </svg>
    `)
  },
  {
    id: 'cyber-ninja',
    name: 'Cyber Ninja',
    category: 'cyberbots',
    description: 'Silent quantitative executioner with zero-slippage market entry.',
    accentColor: '#10b981',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-ninja" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#064e3b" />
            <stop offset="100%" stop-color="#047857" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-ninja)" stroke="#34d399" stroke-width="2"/>
        <!-- Ninja Hood -->
        <circle cx="50" cy="50" r="28" fill="#0f172a" stroke="#1e293b" stroke-width="2" />
        <!-- Headband -->
        <rect x="22" y="34" width="56" height="8" fill="#047857" />
        <!-- Metal Plate with Logo -->
        <rect x="40" y="32" width="20" height="12" rx="2" fill="#cbd5e1" />
        <circle cx="50" cy="38" r="3" fill="#065f46" />
        <!-- Eye Mask Cutout -->
        <rect x="30" y="44" width="40" height="10" rx="4" fill="#022c22" />
        <!-- Glowing Cyan/Green Eyes -->
        <polygon points="36,49 44,50 38,53" fill="#34d399" />
        <polygon points="64,49 56,50 62,53" fill="#34d399" />
        <!-- Mask Seam -->
        <path d="M 40 64 Q 50 68 60 64" stroke="#334155" stroke-width="1.5" fill="none" />
      </svg>
    `)
  },
  {
    id: 'astro-bot',
    name: 'Cosmic Astro Bot',
    category: 'cyberbots',
    description: 'Deep-space explorer seeking galactic returns and cosmic alpha.',
    accentColor: '#8b5cf6',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-astro" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2e1065" />
            <stop offset="100%" stop-color="#6d28d9" />
          </linearGradient>
          <linearGradient id="gold-visor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-astro)" stroke="#a78bfa" stroke-width="2"/>
        <!-- Astronaut Helmet -->
        <circle cx="50" cy="50" r="28" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
        <!-- Golden Reflective Visor -->
        <ellipse cx="50" cy="50" rx="20" ry="16" fill="url(#gold-visor)" />
        <!-- Reflection Sheen -->
        <ellipse cx="44" cy="44" rx="8" ry="4" fill="#ffffff" opacity="0.6" transform="rotate(-20 44 44)" />
        <!-- Neck Ring -->
        <rect x="36" y="74" width="28" height="6" rx="3" fill="#94a3b8" />
        <!-- Star sparkles in background -->
        <circle cx="24" cy="24" r="1.5" fill="#ffffff" />
        <circle cx="76" cy="22" r="1.5" fill="#ffffff" />
        <circle cx="78" cy="74" r="1.5" fill="#ffffff" />
      </svg>
    `)
  },

  // CATEGORY 3: GAMERS & QUANTS
  {
    id: 'lead-quant',
    name: 'Lead Strategist',
    category: 'quants',
    description: 'Institutional portfolio mastermind calibrated for Conformal 90% bounds.',
    accentColor: '#0ea5e9',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-lq" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#082f49" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-lq)" stroke="#38bdf8" stroke-width="2"/>
        <!-- Hair -->
        <path d="M 28 42 Q 32 18 50 18 Q 68 18 72 42 Z" fill="#1e293b" />
        <!-- Face -->
        <circle cx="50" cy="50" r="22" fill="#fed7aa" />
        <!-- Hair Sideburns -->
        <polygon points="28,40 32,50 32,40" fill="#1e293b" />
        <polygon points="72,40 68,50 68,40" fill="#1e293b" />
        <!-- Modern Glasses -->
        <rect x="34" y="44" width="13" height="9" rx="2" fill="none" stroke="#0f172a" stroke-width="1.5" />
        <rect x="53" y="44" width="13" height="9" rx="2" fill="none" stroke="#0f172a" stroke-width="1.5" />
        <line x1="47" y1="48" x2="53" y2="48" stroke="#0f172a" stroke-width="1.5" />
        <!-- Eyes -->
        <circle cx="40" cy="48" r="2.5" fill="#0f172a" />
        <circle cx="60" cy="48" r="2.5" fill="#0f172a" />
        <!-- Smile -->
        <path d="M 44 60 Q 50 65 56 60" stroke="#0f172a" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <!-- Suit Collar -->
        <polygon points="34,72 50,86 66,72" fill="#0f172a" />
        <polygon points="44,72 50,82 56,72" fill="#38bdf8" />
      </svg>
    `)
  },
  {
    id: 'pixel-champion',
    name: 'Pixel Arcade Champion',
    category: 'quants',
    description: 'Competitive arcade champion who holds high scores across all tickers.',
    accentColor: '#ec4899',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-champ" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#500724" />
            <stop offset="100%" stop-color="#db2777" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-champ)" stroke="#f472b6" stroke-width="2"/>
        <!-- Backward Baseball Cap -->
        <path d="M 26 40 A 24 24 0 0 1 74 40 Z" fill="#ec4899" stroke="#be185d" stroke-width="1.5" />
        <rect x="22" y="38" width="56" height="6" rx="3" fill="#be185d" />
        <!-- Face -->
        <ellipse cx="50" cy="56" rx="20" ry="18" fill="#ffedd5" />
        <!-- 80s Neon Sunglasses -->
        <polygon points="30,46 70,46 64,58 36,58" fill="#18181b" stroke="#06b6d4" stroke-width="2" />
        <line x1="32" y1="52" x2="68" y2="52" stroke="#f43f5e" stroke-width="1.5" />
        <!-- Smirk -->
        <path d="M 44 65 Q 52 69 58 64" stroke="#9a3412" stroke-width="2" fill="none" stroke-linecap="round" />
      </svg>
    `)
  },
  {
    id: 'crypto-rebel',
    name: 'Cyberpunk Hacker',
    category: 'quants',
    description: 'Decentralized liquidity hacker with neon green audio headset.',
    accentColor: '#22c55e',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-rebel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#052e16" />
            <stop offset="100%" stop-color="#15803d" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-rebel)" stroke="#4ade80" stroke-width="2"/>
        <!-- Hoodie -->
        <circle cx="50" cy="50" r="26" fill="#18181b" />
        <!-- Face -->
        <circle cx="50" cy="52" r="18" fill="#fed7aa" />
        <!-- Spiky Hair -->
        <polygon points="36,36 42,26 48,34 54,24 60,34 66,28 66,38" fill="#22c55e" />
        <!-- Headset band -->
        <path d="M 28 48 A 22 22 0 0 1 72 48" fill="none" stroke="#22c55e" stroke-width="3" />
        <circle cx="28" cy="48" r="5" fill="#15803d" stroke="#4ade80" stroke-width="1.5" />
        <circle cx="72" cy="48" r="5" fill="#15803d" stroke="#4ade80" stroke-width="1.5" />
        <!-- Cool expression -->
        <circle cx="44" cy="52" r="2" fill="#0f172a" />
        <circle cx="56" cy="52" r="2" fill="#0f172a" />
        <line x1="46" y1="60" x2="54" y2="60" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    `)
  },
  {
    id: 'gold-trophy',
    name: 'Golden Champion',
    category: 'quants',
    description: 'Gold tier trading badge earned for 100+ high-probability trades.',
    accentColor: '#eab308',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-trophy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#451a03" />
            <stop offset="100%" stop-color="#b45309" />
          </linearGradient>
          <linearGradient id="gold-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="50%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#eab308" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-trophy)" stroke="#fde047" stroke-width="2"/>
        <!-- Golden Laurel Leaves -->
        <path d="M 24 60 C 18 40 32 26 36 28" fill="none" stroke="#facc15" stroke-width="3" />
        <path d="M 76 60 C 82 40 68 26 64 28" fill="none" stroke="#facc15" stroke-width="3" />
        <!-- Crown / Cup Trophy -->
        <polygon points="50,26 64,36 58,56 42,56 36,36" fill="url(#gold-fill)" stroke="#a16207" stroke-width="1.5" />
        <!-- Cup Stem & Base -->
        <rect x="46" y="56" width="8" height="12" fill="#eab308" />
        <rect x="36" y="68" width="28" height="8" rx="2" fill="url(#gold-fill)" stroke="#a16207" stroke-width="1.5" />
        <!-- Star Emblem -->
        <polygon points="50,38 52,43 57,43 53,46 55,51 50,48 45,51 47,46 43,43 48,43" fill="#ffffff" />
      </svg>
    `)
  },
  {
    id: 'synthwave-runner',
    name: 'Synthwave Runner',
    category: 'cosmic',
    description: 'Riding the outrun highway beneath the neon grid sunset.',
    accentColor: '#d946ef',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-synth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4a044e" />
            <stop offset="50%" stop-color="#86198f" />
            <stop offset="100%" stop-color="#c026d3" />
          </linearGradient>
          <linearGradient id="sun-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-synth)" stroke="#f0abfc" stroke-width="2"/>
        <!-- Outrun Sun -->
        <circle cx="50" cy="44" r="22" fill="url(#sun-grad)" />
        <!-- Sun Stripes -->
        <rect x="28" y="44" width="44" height="2" fill="#4a044e" />
        <rect x="28" y="48" width="44" height="3" fill="#4a044e" />
        <rect x="28" y="53" width="44" height="4" fill="#4a044e" />
        <!-- Horizon Grid -->
        <polygon points="12,68 88,68 96,88 4,88" fill="#18181b" stroke="#06b6d4" stroke-width="1" />
        <line x1="50" y1="68" x2="50" y2="88" stroke="#d946ef" stroke-width="1.5" />
        <line x1="30" y1="68" x2="20" y2="88" stroke="#d946ef" stroke-width="1.5" />
        <line x1="70" y1="68" x2="80" y2="88" stroke="#d946ef" stroke-width="1.5" />
      </svg>
    `)
  },
  {
    id: 'stealth-scout',
    name: 'Stealth Scout',
    category: 'cosmic',
    description: 'Low-latency packet recon agent operating beyond firewall perimeters.',
    accentColor: '#06b6d4',
    svgDataUri: createSvgUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="bg-scout" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#083344" />
            <stop offset="100%" stop-color="#0e7490" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-scout)" stroke="#67e8f9" stroke-width="2"/>
        <!-- Balaclava / Helmet -->
        <circle cx="50" cy="50" r="26" fill="#0f172a" stroke="#164e63" stroke-width="2" />
        <!-- Tri-Goggles Night Vision -->
        <circle cx="42" cy="44" r="6" fill="#155e75" stroke="#22d3ee" stroke-width="2" />
        <circle cx="58" cy="44" r="6" fill="#155e75" stroke="#22d3ee" stroke-width="2" />
        <circle cx="50" cy="54" r="6" fill="#155e75" stroke="#22d3ee" stroke-width="2" />
        <!-- Glowing Lenses -->
        <circle cx="42" cy="44" r="3" fill="#22d3ee" />
        <circle cx="58" cy="44" r="3" fill="#22d3ee" />
        <circle cx="50" cy="54" r="3" fill="#22d3ee" />
      </svg>
    `)
  }
];

export const AVATAR_CATEGORIES = [
  { id: 'all', label: 'All Avatars' },
  { id: 'animals', label: '🐺 Animals & Totems' },
  { id: 'cyberbots', label: '🤖 Cyberbots & AI' },
  { id: 'quants', label: '🎮 Gamers & Quants' },
  { id: 'cosmic', label: '🪐 Cosmic & Retro' }
] as const;
