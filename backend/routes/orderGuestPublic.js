/**
 * Public (unauthenticated) hooks for the customer order-guest flow.
 * Events are fire-and-forget for analytics pipelines.
 */

function registerOrderGuestPublicRoutes(app) {
  app.post("/api/public/order-guest/event", (req, res) => {
    const body = req.body || {};
    const name = body.event || body.type || "unknown";
    if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
      console.log("[order-guest event]", name, JSON.stringify(body).slice(0, 800));
    }
    res.status(204).end();
  });

  app.post("/api/public/order-guest/receipt", (req, res) => {
    const body = req.body || {};
    if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
      console.log("[order-guest receipt]", JSON.stringify(body).slice(0, 500));
    }
    res.status(204).end();
  });

  app.post("/api/public/orders", (req, res) => {
    const body = req.body || {};
    const orderId = body.orderId || `pp_ord_${Date.now()}`;
    res.json({ success: true, orderId, status: "created" });
  });
}

module.exports = { registerOrderGuestPublicRoutes };
