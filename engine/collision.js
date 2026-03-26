function toRect(node) {
  const x = Number(node.x || 0);
  const y = Number(node.y || 0);
  const width = Number(node.width || 0);
  const height = Number(node.height || 0);

  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

function overlaps(a, b) {
  const ra = toRect(a);
  const rb = toRect(b);
  return ra.left < rb.right && ra.right > rb.left && ra.top < rb.bottom && ra.bottom > rb.top;
}

function keepInsideSafeArea(node, canvas, safePadding) {
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;
  const minX = safePadding + halfWidth;
  const maxX = canvas.width - safePadding - halfWidth;
  const minY = safePadding + halfHeight;
  const maxY = canvas.height - safePadding - halfHeight;

  node.x = Math.max(minX, Math.min(maxX, node.x));
  node.y = Math.max(minY, Math.min(maxY, node.y));
}

function resolveCollisions(nodes, canvas, safePadding = 24, warnings = []) {
  const sorted = [...nodes].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  let overflowAdjusted = false;

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const high = sorted[i];
      const low = sorted[j];

      if (!overlaps(high, low)) {
        continue;
      }

      overflowAdjusted = true;
      let resolved = false;

      const moveAttempts = [
        { dx: 0, dy: low.height * 0.2 + 8 },
        { dx: low.width * 0.2 + 8, dy: 0 },
        { dx: 0, dy: -(low.height * 0.2 + 8) },
      ];

      for (const attempt of moveAttempts) {
        const original = { x: low.x, y: low.y };

        for (let hop = 1; hop <= 6; hop += 1) {
          low.x = original.x + attempt.dx * hop;
          low.y = original.y + attempt.dy * hop;
          keepInsideSafeArea(low, canvas, safePadding);

          if (!overlaps(high, low)) {
            resolved = true;
            break;
          }
        }

        if (resolved) {
          break;
        }

        low.x = original.x;
        low.y = original.y;
      }

      if (!resolved && low.type === "text") {
        low.fontSize = Math.max(12, Math.round((low.fontSize || 16) * 0.92));
        low.height = Math.max(20, Math.round(low.height * 0.94));
        keepInsideSafeArea(low, canvas, safePadding);
        if (!overlaps(high, low)) {
          resolved = true;
          warnings.push(`Shrank ${low.id} to avoid overlap with ${high.id}.`);
        }
      }

      if (!resolved && low.optional) {
        low.hidden = true;
        resolved = true;
        warnings.push(`Hid optional node ${low.id} due to collision with ${high.id}.`);
      }

      if (!resolved) {
        warnings.push(`Required collision unresolved between ${high.id} and ${low.id}; kept priority order.`);
      }
    }
  }

  return {
    nodes: sorted,
    overflowAdjusted,
  };
}

module.exports = {
  overlaps,
  resolveCollisions,
};
