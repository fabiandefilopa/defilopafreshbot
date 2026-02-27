import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Supabase Service for database operations
 * Manages user tracking and wallet scan history
 */
export class SupabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  /**
   * Initialize Supabase client
   * @returns {boolean} True if initialized successfully
   */
  initialize() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not found in .env file');
      console.warn('   Database features will be disabled');
      return false;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.initialized = true;
      console.log('✅ Supabase client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error.message);
      return false;
    }
  }

  /**
   * Check if Supabase is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get or create user in database
   * @param {string} chatId - Telegram chat ID
   * @param {object} userData - User data from Telegram
   * @returns {Promise<object|null>} User record or null if failed
   */
  async getOrCreateUser(chatId, userData = {}) {
    if (!this.initialized) return null;

    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('chat_id', chatId)
        .single();

      if (existingUser) {
        // Update last activity
        await this.supabase
          .from('users')
          .update({ last_activity: new Date().toISOString() })
          .eq('chat_id', chatId);

        return existingUser;
      }

      // Create new user
      const { data: newUser, error: insertError } = await this.supabase
        .from('users')
        .insert([
          {
            chat_id: chatId,
            username: userData.username || null,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log(`✅ New user created: ${chatId}`);
      return newUser;
    } catch (error) {
      console.error('❌ Error in getOrCreateUser:', error.message);
      return null;
    }
  }

  /**
   * Save scan history (for future implementation)
   * @param {string} chatId - Telegram chat ID
   * @param {object} scanData - Scan results and configuration
   * @returns {Promise<object|null>}
   */
  async saveScanHistory(chatId, scanData) {
    if (!this.initialized) return null;

    try {
      const { data, error } = await this.supabase
        .from('scan_history')
        .insert([
          {
            chat_id: chatId,
            exchanges: scanData.exchanges,
            scan_type: scanData.scanType,
            filter_type: scanData.filterType,
            filter_config: scanData.filterConfig,
            time_range: scanData.timeRange,
            results_count: scanData.resultsCount,
            fresh_wallets: scanData.freshWallets,
            scan_duration: scanData.scanDuration,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Error saving scan history:', error.message);
      return null;
    }
  }

  /**
   * Get user scan history (for future implementation)
   * @param {string} chatId - Telegram chat ID
   * @param {number} limit - Number of records to fetch
   * @returns {Promise<array>}
   */
  async getUserScanHistory(chatId, limit = 10) {
    if (!this.initialized) return [];

    try {
      const { data, error } = await this.supabase
        .from('scan_history')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching scan history:', error.message);
      return [];
    }
  }

  /**
   * Close Supabase connection (cleanup)
   */
  close() {
    if (this.supabase) {
      // Supabase client doesn't require explicit closing
      this.initialized = false;
      console.log('✅ Supabase client closed');
    }
  }
}

export default SupabaseService;
