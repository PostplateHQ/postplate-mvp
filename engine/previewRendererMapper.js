function canvasForPlatform(platform = 'instagram_post') {
  if (platform === 'instagram_story') return { width: 1080, height: 1920 };
  if (platform === 'flyer') return { width: 1200, height: 1500 };
  return { width: 1080, height: 1080 };
}

function toNode(id, type, x, y, width, height, extras = {}) {
  return { id, type, x, y, width, height, ...extras };
}

function mapLayoutConfigToNodes(layoutConfig, tokens, qrSource) {
  const canvas = layoutConfig.canvas;
  const nodes = [];
  const xLeft = layoutConfig.layout.padding + 220;
  const top = layoutConfig.layout.padding + 120;
  const imageRightX = canvas.width - layoutConfig.layout.padding - 210;
  const textW = Math.round(canvas.width * layoutConfig.sizing.headlineMaxWidth);

  nodes.push(
    toNode('headline', 'text', xLeft, top + 80, textW, 220, {
      priority: 100,
      finalText: layoutConfig.copy.headline,
      fontSize: layoutConfig.mode === 'textHero' ? 86 : 74,
      color: tokens.foreground,
      background: null,
    }),
  );
  if (layoutConfig.visibility.subheadline && layoutConfig.copy.subheadline) {
    nodes.push(
      toNode('subline', 'text', xLeft, top + 250, textW, 90, {
        priority: 95,
        finalText: layoutConfig.copy.subheadline,
        fontSize: 32,
        color: tokens.subForeground,
        background: null,
      }),
    );
  }

  nodes.push(
    toNode('restaurant', 'text', xLeft, canvas.height - layoutConfig.layout.padding - 90, 620, 70, {
      priority: 90,
      finalText: layoutConfig.copy.brandLine,
      fontSize: 30,
      color: tokens.foreground,
      background: null,
    }),
  );

  if (layoutConfig.visibility.footer && layoutConfig.copy.footerLine) {
    nodes.push(
      toNode('address', 'text', xLeft, canvas.height - layoutConfig.layout.padding - 38, 620, 50, {
        priority: 80,
        finalText: layoutConfig.copy.footerLine,
        fontSize: 22,
        color: tokens.subForeground,
        background: null,
      }),
    );
  }

  if (layoutConfig.visibility.heroImage && layoutConfig.assets.heroImageUrl) {
    nodes.push(
      toNode('productImage', 'image', imageRightX, canvas.height / 2, Math.round(canvas.width * layoutConfig.sizing.heroImageWidth), Math.round(canvas.height * 0.62), {
        priority: 70,
        src: layoutConfig.assets.heroImageUrl,
        fit: 'cover',
        shape: 'rect',
      }),
    );
  }

  if (layoutConfig.visibility.qr && qrSource) {
    const size = layoutConfig.sizing.qrSize;
    nodes.push(
      toNode('qrCode', 'image', canvas.width - layoutConfig.layout.padding - size / 2, canvas.height - layoutConfig.layout.padding - size / 2, size, size, {
        priority: 62,
        src: qrSource,
        fit: 'contain',
        shape: 'square',
      }),
    );
  }

  if (layoutConfig.visibility.logo && layoutConfig.assets.logoUrl) {
    const width = layoutConfig.sizing.logoWidth;
    nodes.push(
      toNode('logo', 'image', layoutConfig.layout.padding + width / 2, layoutConfig.layout.padding + 30, width, 60, {
        priority: 60,
        src: layoutConfig.assets.logoUrl,
        fit: 'contain',
        shape: 'rect',
      }),
    );
  }

  return nodes;
}

module.exports = {
  canvasForPlatform,
  mapLayoutConfigToNodes,
};

