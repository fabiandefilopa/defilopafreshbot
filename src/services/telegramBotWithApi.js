import TelegramBot from 'node-telegram-bot-api';

/**
 * Versión del bot que consume la API REST
 * Útil si quieres separar el bot y la API en diferentes servidores
 */
class TelegramBotWithApi {
  constructor(token, apiBaseUrl = 'http://localhost:3000') {
    this.bot = new TelegramBot(token, { polling: true });
    this.apiBaseUrl = apiBaseUrl;
    
    // Estado del monitoreo por usuario
    this.userConfigs = new Map();
    
    this.setupCommands();
  }

  /**
   * Hacer request a la API
   */
  async apiRequest(endpoint) {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error en la API');
      }
      
      return data.data;
    } catch (error) {
      throw new Error(`API Error: ${error.message}`);
    }
  }

  /**
   * Configuración de comandos
   */
  setupCommands() {
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/setwallet (.+)/, (msg, match) => this.handleSetWallet(msg, match[1]));
    this.bot.onText(/\/wallet$/, (msg) => this.handleGetWallet(msg));
    this.bot.onText(/\/balance/, (msg) => this.handleBalance(msg));
    this.bot.onText(/\/txs(?: (\d+))?/, (msg, match) => this.handleTransactions(msg, match?.[1]));
    this.bot.onText(/\/search (.+)/, (msg, match) => this.handleSearchAmount(msg, match[1]));
    this.bot.onText(/\/range (\d+\.?\d*) (\d+\.?\d*)/, (msg, match) => 
      this.handleSearchRange(msg, parseFloat(match[1]), parseFloat(match[2])));
    this.bot.onText(/\/alert (.+)/, (msg, match) => this.handleSetAlert(msg, match[1]));
    this.bot.onText(/\/alerts$/, (msg) => this.handleGetAlerts(msg));
    this.bot.onText(/\/stopalert/, (msg) => this.handleStopAlert(msg));
    this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));
    this.bot.onText(/\/setapi (.+)/, (msg, match) => this.handleSetApi(msg, match[1]));
  }

  getUserConfig(chatId) {
    if (!this.userConfigs.has(chatId)) {
      this.userConfigs.set(chatId, {
        wallet: process.env.DEFAULT_WALLET || null,
        alerts: [],
        monitoring: false,
        monitorInterval: null,
        lastChec