const fs = require('fs');
const yaml = require('js-yaml'); // Du musst dieses Modul installieren mit: npm install js-yaml

// Konfigurationen laden
let config = {};
let chat = {};

// JSON-Konfigurationen laden (falls vorhanden)
try {
  config = require(process.env.CONFIG_FILE || './config.json');
} catch (e) {
  // Falls die JSON-Datei nicht existiert oder fehlerhaft ist, versuche YAML
  try {
    config = yaml.load(fs.readFileSync('./config.yaml', 'utf8'));
  } catch (e) {
    console.warn('Weder config.json noch config.yaml konnte geladen werden');
    config = {};
  }
}

// Chat-Konfigurationen laden
try {
  chat = require(process.env.CHAT_FILE || './chat.json');
} catch (e) {
  // Falls die JSON-Datei nicht existiert oder fehlerhaft ist, versuche YAML
  try {
    chat = yaml.load(fs.readFileSync('./chat.yaml', 'utf8'));
  } catch (e) {
    console.warn('Weder chat.json noch chat.yaml konnte geladen werden');
    chat = {};
  }
}

module.exports = {
  get: (name, d = undefined) => {
    return config[name] || chat[name] || d;
  },
  // Used mostly for tests
  set: (name, value) => {
    config[name] = value;
  }
};