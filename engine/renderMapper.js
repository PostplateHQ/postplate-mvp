function mapNodeForRender(node) {
  const base = {
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    priority: node.priority,
  };

  if (node.hidden) {
    return { ...base, hidden: true };
  }

  if (node.type === "text" || node.type === "button" || node.type === "badge") {
    return {
      ...base,
      finalText: node.finalText || node.text || "",
      fontSize: node.fontSize || node.fontSizeMax || null,
      lineClamp: node.lineClamp || null,
      color: node.color || null,
      background: node.background || null,
    };
  }

  if (node.type === "image") {
    return {
      ...base,
      src: node.src || node.source || null,
      fit: node.fit || "cover",
      crop: node.crop || null,
      shape: node.shape || "rect",
    };
  }

  return base;
}

function createRenderOutput({ templateId, presetId, format, canvas, nodes, warnings, overflowAdjusted, layoutConfig = null }) {
  return {
    templateId,
    presetId,
    format,
    canvas: {
      width: canvas.width,
      height: canvas.height,
    },
    resolvedNodes: nodes.filter((node) => !node.hidden).map(mapNodeForRender),
    warnings,
    overflowAdjusted,
    layoutConfig,
  };
}

module.exports = {
  createRenderOutput,
};
