
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = 3000;

const dataPath = path.join(__dirname, "db", "data.json");

// Load data
function loadData() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ redemptions: [] }));
  }
  return JSON.parse(fs.readFileSync(dataPath));
}

// Save data
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Generate code
function generateCode(store) {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${store.toUpperCase()}-${random}`;
}

// Redeem API
app.post("/redeem", (req, res) => {
  const { store } = req.body;

  const data = loadData();
  const code = generateCode(store);

  data.redemptions.push({
    store,
    code,
    time: new Date().toISOString(),
  });

  saveData(data);

  res.json({ code });
});

// Get count
app.get("/stats/:store", (req, res) => {
  const data = loadData();
  const count = data.redemptions.filter(
    (r) => r.store === req.params.store
  ).length;

  res.json({ total: count });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
