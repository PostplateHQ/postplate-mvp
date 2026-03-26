const MIN_LINE_HEIGHT_RATIO = 1.05;
const DEFAULT_LINE_HEIGHT_RATIO = 1.2;

function estimateTextWidth(text, fontSize) {
  const normalized = String(text || "");
  return normalized.length * fontSize * 0.58;
}

function wrapText(text, maxWidth, fontSize) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (estimateTextWidth(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }

    lines.push(current);
    current = words[index];
  }

  lines.push(current);
  return lines;
}

function ellipsize(text, maxChars) {
  const value = String(text || "");
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function shortenForRole(text, role) {
  const source = String(text || "").trim();
  if (!source) {
    return source;
  }

  const roleLimits = {
    headline: 28,
    subheadline: 42,
    cta: 18,
    footer: 50,
  };

  return ellipsize(source, roleLimits[role] || 48);
}

function fitTextToZone({ text, width, height, fontSizeMin, fontSizeMax, lineClamp, allowTextShrink, role }) {
  const content = String(text || "").trim();
  const maxLines = Number(lineClamp || 2);
  const minSize = Number(fontSizeMin || 12);
  const maxSize = Number(fontSizeMax || Math.max(minSize, 24));

  if (!content) {
    return {
      finalText: "",
      fontSize: maxSize,
      lines: [""],
      lineHeight: Math.round(maxSize * DEFAULT_LINE_HEIGHT_RATIO),
      wasTrimmed: false,
      overflow: false,
      attempts: 0,
    };
  }

  const floorSize = allowTextShrink === false ? maxSize : minSize;
  let fontSize = maxSize;
  let attempts = 0;

  while (fontSize >= floorSize) {
    attempts += 1;
    const lines = wrapText(content, width, fontSize);
    const lineHeightRatio = Math.max(MIN_LINE_HEIGHT_RATIO, DEFAULT_LINE_HEIGHT_RATIO - Math.min(0.12, attempts * 0.01));
    const lineHeight = Math.round(fontSize * lineHeightRatio);
    const fitsLineCount = lines.length <= maxLines;
    const fitsHeight = lines.length * lineHeight <= height;

    if (fitsLineCount && fitsHeight) {
      return {
        finalText: content,
        fontSize,
        lines,
        lineHeight,
        wasTrimmed: false,
        overflow: false,
        attempts,
      };
    }

    fontSize -= 1;
  }

  const shortened = shortenForRole(content, role);
  const fallbackLines = wrapText(shortened, width, floorSize).slice(0, maxLines);
  const fallbackLineHeight = Math.round(floorSize * MIN_LINE_HEIGHT_RATIO);
  const overflow = fallbackLines.length * fallbackLineHeight > height;

  return {
    finalText: shortened,
    fontSize: floorSize,
    lines: fallbackLines,
    lineHeight: fallbackLineHeight,
    wasTrimmed: shortened !== content,
    overflow,
    attempts,
  };
}

module.exports = {
  estimateTextWidth,
  wrapText,
  fitTextToZone,
  shortenForRole,
};
