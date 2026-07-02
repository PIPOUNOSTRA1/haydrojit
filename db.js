const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'db');
const ORDERS_FILE = path.join(DB_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DB_DIR, 'products.json');
const CONFIG_FILE = path.join(DB_DIR, 'admin_config.json');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// SHA-256 Hashing helper for admin passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Safe Atomic JSON Reader/Writer
function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error(`Error reading database file ${filePath}:`, e);
  }
  return defaultValue;
}

function writeJsonFileAtomic(filePath, data) {
  const tempPath = filePath + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (e) {
    console.error(`Error writing database file ${filePath}:`, e);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}

// Default CleanJet Car Washer Offer Packages (Taager UAE Premium pricing)
const defaultProducts = {
  "basic": {
    "id": "basic",
    "name": "الحزمة الأساسية (جهاز واحد + 2 بطارية)",
    "subtitle": "الخيار الفردي للغسيل السريع",
    "price": 149.0,
    "oldPrice": 249.0,
    "status": "active",
    "image": "car_washer_banner.jpg"
  },
  "double": {
    "id": "double",
    "name": "الحزمة المزدوجة - جهازين (المعززة)",
    "subtitle": "العرض الأكثر طلباً وتوفيراً (جهازين كاملين)",
    "price": 239.0,
    "oldPrice": 498.0,
    "status": "active",
    "image": "car_washer_banner.jpg"
  }
};

// Initialize collections if they don't exist
function initDatabase() {
  if (!fs.existsSync(ORDERS_FILE)) {
    writeJsonFileAtomic(ORDERS_FILE, []);
  }

  if (!fs.existsSync(PRODUCTS_FILE)) {
    writeJsonFileAtomic(PRODUCTS_FILE, defaultProducts);
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultApiKey = 'CJ-' + crypto.randomBytes(16).toString('hex').toUpperCase();
    writeJsonFileAtomic(CONFIG_FILE, {
      password_hash: hashPassword('admin123'),
      api_key: defaultApiKey
    });
  }
}

initDatabase();

module.exports = {
  hashPassword,
  readOrders: () => readJsonFile(ORDERS_FILE, []),
  writeOrders: (orders) => writeJsonFileAtomic(ORDERS_FILE, orders),
  readProducts: () => readJsonFile(PRODUCTS_FILE, defaultProducts),
  writeProducts: (products) => writeJsonFileAtomic(PRODUCTS_FILE, products),
  readAdminConfig: () => readJsonFile(CONFIG_FILE, {}),
  writeAdminConfig: (config) => writeJsonFileAtomic(CONFIG_FILE, config)
};
