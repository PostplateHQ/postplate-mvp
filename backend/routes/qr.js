function registerQrRoutes(app, deps) {
  const {
    QRCode,
    loadData,
    getOfferById,
  } = deps;

  app.get("/qr", async (req, res) => {
    let {
      store = "",
      restaurant = "",
      offer = "",
      offerId = "",
    } = req.query;

    if (offerId) {
      const data = loadData();
      const savedOffer = getOfferById(data, offerId);
      if (!savedOffer) {
        return res.status(404).json({ error: "offer not found" });
      }
      store = savedOffer.store;
      restaurant = savedOffer.restaurant;
      offer = savedOffer.name;
    }

    if (!store || !restaurant || !offer) {
      return res.status(400).json({
        error: "store, restaurant, and offer are required",
      });
    }

    const redeemUrl =
      `${req.protocol}://${req.get("host")}/redeem` +
      `?store=${encodeURIComponent(store)}` +
      `&restaurant=${encodeURIComponent(restaurant)}` +
      `&offer=${encodeURIComponent(offer)}` +
      (offerId ? `&offerId=${encodeURIComponent(offerId)}` : "");

    try {
      const qrDataUrl = await QRCode.toDataURL(redeemUrl, {
        width: 320,
        margin: 2,
      });

      res.json({
        success: true,
        redeemUrl,
        qrDataUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "failed to generate QR code" });
    }
  });
}

module.exports = { registerQrRoutes };
