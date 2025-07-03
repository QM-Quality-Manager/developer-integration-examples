const axios = require('axios');
const logger = require('./logger');

/**
 * QMPlus Directory Integration API Client
 * 
 * Provides a comprehensive interface for synchronizing users and departments
 * with QMPlus using the Directory Integration (Identum) API.
 */
class QMPlusClient {
  constructor(options) {
    this.baseUrl = options.baseUrl;
    this.tenantId = options.tenantId;
    this.apiToken = options.apiToken;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.batchSize = options.batchSize || 100;
    this.logger = options.logger || logger;

    // Create axios instance with default config
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'auth-tenant-id': this.tenantId,
        'auth-token': this.apiToken,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      response => response,
      error => this._handleError(error)
    );
  }

  // ============================================================================
  // Transaction Management
  // ============================================================================

  /**
   * Create a new checkpoint (transaction) for queueing operations
   * @returns {Promise<Object>} Checkpoint response with transactionId
   */
  async createCheckpoint() {
    this.logger.info('Creating new checkpoint');
    
    const response = await this.http.post('/provisioning/directory/checkpoint');
    const data = response.data;
    
    this.logger.info(`Checkpoint created: ${data.transactionId}`);
    return data;
  }

  /**
   * Commit a transaction, executing all queued operations atomically
   * @param {string} transactionId - Transaction ID to commit
   * @returns {Promise<Object>} Commit result with operation counts
   */
  async commitTransaction(transactionId) {
    this.logger.info(`Committing transaction: ${transactionId}`);
    
    const response = await this.http.post(`/provisioning/directory/commit`, null, {
      params: { transactionId }
    });
    
    const data = response.data;
    
    if (data.failedOperations > 0) {
      this.logger.warn(`Transaction completed with ${data.failedOperations} failures`, {
        transactionId,
        successful: data.successfulOperations,
        failed: data.failedOperations,
        errors: data.errors
      });
    } else {
      this.logger.info(`Transaction completed successfully: ${data.successfulOperations} operations`, {
        transactionId
      });
    }
    
    return data;
  }

  /**
   * Get the status of a transaction
   * @param {string} transactionId - Transaction ID to check
   * @returns {Promise<Object>} Transaction status information
   */
  async getTransactionStatus(transactionId) {
    const response = await this.http.get(`/provisioning/directory/transaction/${transactionId}/status`);
    return response.data;
  }

  /**
   * List transactions with optional filtering
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status
   * @param {string} filters.createdBy - Filter by creator
   * @param {string} filters.createdAfter - Filter by creation date
   * @param {string} filters.createdBefore - Filter by creation date
   * @param {number} filters.page - Page number (default: 0)
   * @param {number} filters.pageSize - Page size (default: 50)
   * @returns {Promise<Object>} List of transactions
   */
  async listTransactions(filters = {}) {
    const params = {
      page: filters.page || 0,
      pageSize: filters.pageSize || 50
    };
    
    if (filters.status) params.status = filters.status;
    if (filters.createdBy) params.createdBy = filters.createdBy;
    if (filters.createdAfter) params.createdAfter = filters.createdAfter;
    if (filters.createdBefore) params.createdBefore = filters.createdBefore;
    
    const response = await this.http.get('/provisioning/directory/transactions', { params });
    return response.data;
  }

  // ============================================================================
  // Department Management
  // ============================================================================

  /**
   * Synchronize departments
   * @param {Array<Object>} departments - Array of department objects
   * @param {string} transactionId - Optional transaction ID for batched operations
   * @returns {Promise<Object>} Sync result
   */
  async syncDepartments(departments, transactionId = null) {
    this.logger.info(`Syncing ${departments.length} departments`, {
      transactionMode: !!transactionId,
      transactionId
    });

    if (transactionId) {
      // Transaction mode - queue operations
      const response = await this.http.post('/provisioning/directory/department', departments, {
        params: { transactionId }
      });
      
      this.logger.info(`Queued ${departments.length} department operations`, {
        transactionId,
        operationsQueued: response.data.operationsQueued
      });
      
      return response.data;
    } else {
      // Direct mode - execute immediately
      const response = await this.http.post('/provisioning/directory/department', departments);
      
      this.logger.info(`Processed ${response.data.processed} departments directly`, {
        processed: response.data.processed,
        errors: response.data.errors?.length || 0
      });
      
      return response.data;
    }
  }

  /**
   * Get departments with optional filtering
   * @param {Object} filters - Filter options
   * @param {boolean} filters.active - Filter by active status
   * @returns {Promise<Object>} List of departments
   */
  async getDepartments(filters = {}) {
    const params = {};
    if (filters.active !== undefined) params.active = filters.active;
    
    const response = await this.http.get('/provisioning/directory/department', { params });
    return response.data;
  }

  // ============================================================================
  // User Management  
  // ============================================================================

  /**
   * Synchronize users
   * @param {Array<Object>} users - Array of user objects
   * @param {string} transactionId - Optional transaction ID for batched operations
   * @returns {Promise<Object>} Sync result
   */
  async syncUsers(users, transactionId = null) {
    this.logger.info(`Syncing ${users.length} users`, {
      transactionMode: !!transactionId,
      transactionId
    });

    if (transactionId) {
      // Transaction mode - queue operations
      const response = await this.http.post(`/provisioning/directory/${transactionId}/user`, users);
      
      this.logger.info(`Queued ${users.length} user operations`, {
        transactionId,
        operationsQueued: response.data.operationsQueued
      });
      
      return response.data;
    } else {
      // Direct mode - create transaction automatically
      const checkpoint = await this.createCheckpoint();
      await this.http.post(`/provisioning/directory/${checkpoint.transactionId}/user`, users);
      const result = await this.commitTransaction(checkpoint.transactionId);
      
      this.logger.info(`Processed ${users.length} users with auto-transaction`, {
        transactionId: checkpoint.transactionId,
        successful: result.successfulOperations,
        failed: result.failedOperations
      });
      
      return result;
    }
  }

  /**
   * Get users with optional filtering
   * @param {Object} filters - Filter options
   * @param {boolean} filters.active - Filter by active status
   * @returns {Promise<Object>} List of users
   */
  async getUsers(filters = {}) {
    const params = {};
    if (filters.active !== undefined) params.active = filters.active;
    
    const response = await this.http.get('/provisioning/directory/user', { params });
    return response.data;
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Perform a complete synchronization of departments and users
   * @param {Object} data - Sync data
   * @param {Array<Object>} data.departments - Departments to sync
   * @param {Array<Object>} data.users - Users to sync
   * @returns {Promise<Object>} Complete sync result
   */
  async fullSync(data) {
    this.logger.info('Starting full synchronization', {
      departments: data.departments?.length || 0,
      users: data.users?.length || 0
    });

    const checkpoint = await this.createCheckpoint();
    const transactionId = checkpoint.transactionId;

    try {
      // Sync departments first (dependency order)
      if (data.departments && data.departments.length > 0) {
        await this.syncDepartments(data.departments, transactionId);
      }

      // Sync users
      if (data.users && data.users.length > 0) {
        await this.syncUsers(data.users, transactionId);
      }

      // Commit all operations
      const result = await this.commitTransaction(transactionId);
      
      this.logger.info('Full synchronization completed', {
        transactionId,
        totalOperations: result.totalOperations,
        successful: result.successfulOperations,
        failed: result.failedOperations
      });

      return result;
    } catch (error) {
      this.logger.error('Full synchronization failed', {
        transactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Import users in batches for large datasets
   * @param {Array<Object>} users - Users to import
   * @param {number} batchSize - Batch size (default: 100)
   * @returns {Promise<Object>} Import result
   */
  async bulkUserImport(users, batchSize = null) {
    const effectiveBatchSize = batchSize || this.batchSize;
    
    this.logger.info(`Starting bulk user import`, {
      totalUsers: users.length,
      batchSize: effectiveBatchSize,
      totalBatches: Math.ceil(users.length / effectiveBatchSize)
    });

    const checkpoint = await this.createCheckpoint();
    const transactionId = checkpoint.transactionId;

    try {
      // Process in batches
      for (let i = 0; i < users.length; i += effectiveBatchSize) {
        const batch = users.slice(i, i + effectiveBatchSize);
        const batchNumber = Math.floor(i / effectiveBatchSize) + 1;
        const totalBatches = Math.ceil(users.length / effectiveBatchSize);
        
        this.logger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
          batchSize: batch.length,
          transactionId
        });
        
        await this.syncUsers(batch, transactionId);
      }

      // Commit all batches
      const result = await this.commitTransaction(transactionId);
      
      this.logger.info('Bulk user import completed', {
        transactionId,
        totalUsers: users.length,
        successful: result.successfulOperations,
        failed: result.failedOperations
      });

      return result;
    } catch (error) {
      this.logger.error('Bulk user import failed', {
        transactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Set up organizational department hierarchy
   * @param {Array<Object>} departments - Departments in dependency order
   * @returns {Promise<Object>} Setup result
   */
  async organizationSetup(departments) {
    this.logger.info('Setting up organizational hierarchy', {
      departments: departments.length
    });

    // Sort departments by hierarchy depth
    const sortedDepartments = this._sortDepartmentsByHierarchy(departments);
    
    return await this.syncDepartments(sortedDepartments);
  }

  // ============================================================================
  // Monitoring & Utilities
  // ============================================================================

  /**
   * Monitor a transaction until completion
   * @param {string} transactionId - Transaction to monitor
   * @param {Function} onProgress - Progress callback (optional)
   * @param {number} pollInterval - Poll interval in ms (default: 5000)
   * @returns {Promise<Object>} Final transaction status
   */
  async monitorTransaction(transactionId, onProgress = null, pollInterval = 5000) {
    this.logger.info(`Monitoring transaction: ${transactionId}`);
    
    while (true) {
      const status = await this.getTransactionStatus(transactionId);
      
      if (onProgress) {
        onProgress(status);
      }
      
      switch (status.transactionStatus) {
        case 'COMPLETED':
          this.logger.info('Transaction completed successfully', { transactionId });
          return status;
          
        case 'FAILED':
          this.logger.error('Transaction failed', { transactionId });
          return status;
          
        case 'PROCESSING':
          this.logger.debug('Transaction processing...', {
            transactionId,
            progress: `${status.completedOperations}/${status.totalOperations}`
          });
          break;
          
        case 'OPEN':
          this.logger.debug('Transaction still open', { transactionId });
          break;
          
        default:
          this.logger.warn(`Unknown transaction status: ${status.transactionStatus}`, { transactionId });
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Validate authentication and permissions
   * @returns {Promise<boolean>} True if authentication is valid
   */
  async validateAuth() {
    try {
      await this.listTransactions({ pageSize: 1 });
      this.logger.info('Authentication validation successful');
      return true;
    } catch (error) {
      this.logger.error('Authentication validation failed', { error: error.message });
      return false;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Handle HTTP errors and create meaningful error objects
   * @private
   */
  _handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      let errorType = 'API_ERROR';
      if (status === 401) errorType = 'AUTH_ERROR';
      else if (status === 403) errorType = 'PERMISSION_ERROR';
      else if (status === 400) errorType = 'VALIDATION_ERROR';
      
      const apiError = new Error(data.message || `API Error: ${status}`);
      apiError.code = errorType;
      apiError.status = status;
      apiError.details = data.errors || data;
      
      this.logger.error('API error occurred', {
        status,
        errorType,
        message: apiError.message,
        details: apiError.details
      });
      
      throw apiError;
    } else if (error.request) {
      // Network error
      const networkError = new Error('Network error - unable to reach QMPlus API');
      networkError.code = 'NETWORK_ERROR';
      networkError.originalError = error;
      
      this.logger.error('Network error occurred', {
        message: networkError.message,
        url: error.config?.url
      });
      
      throw networkError;
    } else {
      // Other error
      this.logger.error('Unexpected error occurred', { error: error.message });
      throw error;
    }
  }

  /**
   * Sort departments by hierarchy depth to ensure proper creation order
   * @private
   */
  _sortDepartmentsByHierarchy(departments) {
    const sorted = [];
    const remaining = [...departments];
    
    while (remaining.length > 0) {
      const addedCount = remaining.length;
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const dept = remaining[i];
        
        // Add if no parent or parent already added
        if (!dept.parentExternalId || 
            sorted.some(d => d.externalId === dept.parentExternalId)) {
          sorted.push(dept);
          remaining.splice(i, 1);
        }
      }
      
      // Prevent infinite loop on circular dependencies
      if (remaining.length === addedCount) {
        this.logger.warn('Circular dependency detected in departments, adding remaining');
        sorted.push(...remaining);
        break;
      }
    }
    
    return sorted;
  }
}

module.exports = { QMPlusClient };