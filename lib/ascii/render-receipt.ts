import sharp from "sharp";

export type RenderReceipt = {
  generator: string;
  parameters: string[];
  preset: string;
  renderId: string;
};

const WIDTH = 900;
const HEIGHT = 1200;

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
      character
    ] ?? character,
  );
}

function makeMurmuration(seed: number, color: string) {
  const variant = Math.floor(random(seed) * 4);
  const centerX = variant === 0 ? 680 : variant === 1 ? 210 : 510;
  const centerY = variant === 0 ? 230 : variant === 1 ? 360 : 170;
  const stretchX = variant === 2 ? 350 : 250;
  const stretchY = variant === 3 ? 180 : 115;
  const particles: string[] = [];

  for (let index = 0; index < 180; index += 1) {
    const angle = random(seed + index * 2.7) * Math.PI * 2;
    const radius = Math.pow(random(seed + index * 7.1), 0.55);
    const x = centerX + Math.cos(angle) * stretchX * radius;
    const y = centerY + Math.sin(angle) * stretchY * radius;
    const size = 9 + random(seed + index * 3.8) * 18;
    const opacity = (0.05 + random(seed + index * 8.2) * 0.2).toFixed(2);
    if (index % 3 === 0) {
      const wing = size * 0.35;
      particles.push(
        `<path d="M ${(x - wing).toFixed(1)} ${(y + wing * 0.35).toFixed(1)} L ${x.toFixed(1)} ${(y - wing * 0.35).toFixed(1)} L ${(x + wing).toFixed(1)} ${(y + wing * 0.35).toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`,
      );
    } else {
      const r = (size * 0.18).toFixed(1);
      particles.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" opacity="${opacity}"/>`,
      );
    }
  }

  return particles.join("");
}

function cleanLine(value: string, maxLength = 46) {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength);
}

export async function renderReceiptPng(receipt: RenderReceipt) {
  const seed = Array.from(receipt.renderId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const parameters = receipt.parameters
    .map((parameter) => cleanLine(parameter))
    .filter(Boolean)
    .slice(0, 6);
  const rows = parameters.length ? parameters : ["DEFAULT SIGNAL PROFILE"];
  const parameterRows = rows
    .map((parameter, index) => `<text x="74" y="${650 + index * 54}" class="parameter">${escapeXml(parameter)}</text>`)
    .join("");
  const presetUpper = (receipt.preset || "").toUpperCase();
  let primaryColor = "#00ff66";
  let secondaryColor = "#86ffb2";
  let labelColor = "#84b494";
  let parameterColor = "#d4ffe4";
  let bgColor = "#010302";

  if (presetUpper.includes("CYBER")) {
    primaryColor = "#00f0ff";
    secondaryColor = "#ff007f";
    labelColor = "#b366ff";
    parameterColor = "#d4ffff";
    bgColor = "#0a0316";
  } else if (presetUpper.includes("AMBER")) {
    primaryColor = "#ffb000";
    secondaryColor = "#ff8c00";
    labelColor = "#cca300";
    parameterColor = "#ffe6b3";
    bgColor = "#0e0600";
  } else if (presetUpper.includes("CHROME")) {
    primaryColor = "#e2ecf7";
    secondaryColor = "#8faec9";
    labelColor = "#6d8ba8";
    parameterColor = "#f0f5fa";
    bgColor = "#090d14";
  }

  const tearRows = Array.from({ length: 26 }, (_, index) => {
    const x = 18 + random(seed + index * 8.7) * (WIDTH - 36);
    return `<rect x="${x.toFixed(1)}" y="${HEIGHT - 34 + (index % 2) * 8}" width="${(5 + random(seed + index) * 18).toFixed(1)}" height="3" fill="${primaryColor}" opacity=".42"/>`;
  }).join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <defs>
    <pattern id="scanlines" width="1" height="8" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#ffffff" opacity=".055"/></pattern>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <style>
      .mono { font-family: ui-monospace, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace; letter-spacing: 3px; }
      .micro { font-family: ui-monospace, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace; letter-spacing: 2px; font-size: 18px; }
      .parameter { font-family: ui-monospace, "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace; letter-spacing: 2px; font-size: 25px; fill: ${parameterColor}; }
    </style>
  </defs>
  <g filter="url(#glow)">${makeMurmuration(seed, primaryColor)}</g>
  <rect width="100%" height="100%" fill="url(#scanlines)"/>
  <rect x="42" y="42" width="816" height="1116" fill="#000000" fill-opacity=".62" stroke="${primaryColor}" stroke-opacity=".5" stroke-width="2"/>
  <text x="74" y="100" class="micro" fill="${secondaryColor}">ASCIILOGRAPH / RENDER RECEIPT</text>
  <line x1="74" y1="132" x2="826" y2="132" stroke="${primaryColor}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="8 9"/>
  <text x="74" y="205" class="micro" fill="${labelColor}">GENERATOR</text>
  <text x="74" y="250" class="mono" font-size="42" font-weight="700" fill="${primaryColor}">${escapeXml(cleanLine(receipt.generator, 20))}</text>
  <text x="74" y="325" class="micro" fill="${labelColor}">PRESET</text>
  <text x="74" y="370" class="mono" font-size="36" font-weight="700" fill="#f2f2f2">${escapeXml(cleanLine(receipt.preset, 30))}</text>
  <line x1="74" y1="422" x2="826" y2="422" stroke="${primaryColor}" stroke-opacity=".28" stroke-width="1"/>
  <text x="74" y="480" class="micro" fill="${labelColor}">RENDER NUMBER</text>
  <text x="74" y="526" class="mono" font-size="29" fill="${primaryColor}">${escapeXml(receipt.renderId)}</text>
  <text x="74" y="602" class="micro" fill="${labelColor}">SIGNAL PARAMETERS</text>
  ${parameterRows}
  <line x1="74" y1="1004" x2="826" y2="1004" stroke="${primaryColor}" stroke-opacity=".55" stroke-width="2" stroke-dasharray="8 9"/>
  <text x="450" y="1070" class="mono" font-size="22" text-anchor="middle" fill="${parameterColor}">ASCIILOGRAPH by gesswrldwide</text>
  <text x="450" y="1110" class="micro" text-anchor="middle" fill="${labelColor}">KEEP THE SIGNAL / POST THE NOISE</text>
  ${tearRows}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
