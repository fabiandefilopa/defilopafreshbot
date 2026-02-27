import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Service to load and manage exchange configuration
 */
export class ExchangeConfigService {
  constructor(configPath = null) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = null;
  }

  getDefaultConfigPath() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, '../../config/exchanges.json');
  }

  /**
   * Load exchange configuration from JSON file
   * @returns {object} Configuration object
   */
  load() {
    try {
      const fileContent = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(fileContent);
      return this.config;
    } catch (error) {
      throw new Error(`Error loading exchange config: ${error.message}`);
    }
  }

  /**
   * Get all exchanges
   * @returns {object} Exchanges object
   */
  getExchanges() {
    if (!this.config) {
      this.load();
    }
    return this.config.exchanges;
  }

  /**
   * Get specific exchange configuration
   * @param {string} exchangeKey - Exchange key (e.g., 'binance')
   * @returns {object|null} Exchange config or null
   */
  getExchange(exchangeKey) {
    if (!this.config) {
      this.load();
    }
    return this.config.exchanges[exchangeKey] || null;
  }

  /**
   * Get detection configuration
   * @returns {object} Detection config
   */
  getDetectionConfig() {
    if (!this.config) {
      this.load();
    }
    return this.config.detectionConfig;
  }

  /**
   * Check if exchange has wallets configured
   * @param {string} exchangeKey
   * @returns {boolean}
   */
  hasWallets(exchangeKey) {
    const exchange = this.getExchange(exchangeKey);
    return exchange && exchange.wallets && exchange.wallets.length > 0;
  }

  /**
   * Get all wallet addresses for an exchange
   * @param {string} exchangeKey
   * @returns {string[]} Array of wallet addresses
   */
  getWallets(exchangeKey) {
    const exchange = this.getExchange(exchangeKey);
    return exchange ? exchange.wallets : [];
  }
}

export default ExchangeConfigService;
