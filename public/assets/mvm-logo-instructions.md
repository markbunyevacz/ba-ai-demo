# MVM Logo Integráció

## Logo Fájl

Mentsd el az MVM logót (sárga háttér, fehér MVM szöveg) ide:
- `public/assets/mvm-logo.png` vagy
- `public/assets/mvm-logo.svg`

## Logo Jellemzők

A felküldött logo alapján:
- **Háttér szín**: Narancsos-sárga (#F5A623 vagy #FFB83D)
- **Szöveg szín**: Fehér
- **Betűtípus**: Vastag, modern sans-serif (Arial Black vagy hasonló)
- **MVM betűk**: "M V M" vagy "MVM" formázás

## Jelenlegi Implementáció

Az App.jsx-ben jelenleg egy CSS-alapú megoldás van:
```jsx
<div className="bg-[#F5A623] rounded-lg px-3 py-2 sm:px-4 sm:py-3">
  <span className="text-white font-black text-xl sm:text-2xl tracking-wider">
    MVM
  </span>
</div>
```

## Logo Fájl Használata (Ha elérhető)

Ha be szeretnéd illeszteni a logo fájlt, cseréld le a fenti kódot erre:

```jsx
<div className="flex items-center justify-center">
  <img 
    src="/assets/mvm-logo.png" 
    alt="MVM Logo" 
    className="h-10 sm:h-12 w-auto rounded-lg"
  />
</div>
```

## SVG Verzió (Opcionális)

Ha SVG formátumban szeretnéd:

```jsx
<svg width="80" height="40" viewBox="0 0 80 40" className="rounded-lg">
  <rect width="80" height="40" fill="#F5A623" rx="4"/>
  <text 
    x="40" 
    y="28" 
    textAnchor="middle" 
    fill="white" 
    fontSize="20" 
    fontWeight="900" 
    fontFamily="Arial, sans-serif"
  >
    MVM
  </text>
</svg>
```

## Telepítési Lépések

1. Mentsd a logo képet a `public/assets/` mappába
2. Fájlnév: `mvm-logo.png` vagy `mvm-logo.svg`
3. Módosítsd az App.jsx header részét az img tag használatához
4. Teszteld különböző képernyőméreteken

## Megjegyzések

- A jelenlegi CSS megoldás is professzionális és működik
- Logo fájl használata ajánlott production környezetben
- Ensure logo optimization (WebP, optimális méret)

