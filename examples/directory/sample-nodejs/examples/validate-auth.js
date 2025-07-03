#!/usr/bin/env node

/**
 * Authentication Validation Script
 * 
 * This script validates your QMPlus API credentials and permissions.
 * Run this first to ensure your integration is properly configured.
 */

require('dotenv').config();
const { QMPlusClient } = require('../lib/qmplus-client');
const logger = require('../lib/logger');
const { validateAuthConfig } = require('../lib/validators');

async function validateAuth() {
  console.log('🔐 QMPlus Authentication Validation\n');
  
  // Validate configuration
  const config = {
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN
  };
  
  console.log('📋 Checking configuration...');
  const configErrors = validateAuthConfig(config);
  
  if (configErrors.length > 0) {
    console.error('❌ Configuration errors:');
    configErrors.forEach(error => console.error(`   • ${error}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  console.log('✅ Configuration looks good');
  console.log(`   • Base URL: ${config.baseUrl}`);
  console.log(`   • Tenant ID: ${config.tenantId}`);
  console.log(`   • API Token: ${config.apiToken.substring(0, 10)}...`);
  
  // Create client
  const client = new QMPlusClient(config);
  
  console.log('\n🔗 Testing API connection...');
  
  try {
    // Test basic authentication
    const isValid = await client.validateAuth();
    
    if (!isValid) {
      console.error('❌ Authentication failed');
      console.error('   • Check your API token and tenant ID');
      console.error('   • Ensure the user has required roles');
      process.exit(1);
    }
    
    console.log('✅ Authentication successful');
    
    // Test permissions by checking available endpoints
    console.log('\n🔑 Testing permissions...');
    
    // Test PROVISIONING_SEARCH permission
    try {
      const transactions = await client.listTransactions({ pageSize: 1 });
      console.log('✅ PROVISIONING_SEARCH permission confirmed');
      console.log(`   • Found ${transactions.totalCount} total transactions`);
    } catch (error) {
      if (error.code === 'PERMISSION_ERROR') {
        console.error('❌ Missing PROVISIONING_SEARCH permission');
        console.error('   • Contact your administrator to assign this role');
      } else {
        throw error;
      }
    }
    
    // Test PROVISIONING_UPDATE permission
    try {
      const checkpoint = await client.createCheckpoint();
      console.log('✅ PROVISIONING_UPDATE permission confirmed');
      console.log(`   • Created test checkpoint: ${checkpoint.transactionId}`);
      
      // Clean up test transaction (it will expire automatically)
      console.log('   • Test checkpoint created (will auto-expire)');
    } catch (error) {
      if (error.code === 'PERMISSION_ERROR') {
        console.error('❌ Missing PROVISIONING_UPDATE permission');
        console.error('   • Contact your administrator to assign this role');
      } else {
        throw error;
      }
    }
    
    // Test data retrieval capabilities
    console.log('\n📊 Testing data access...');
    
    try {
      const departments = await client.getDepartments({ active: true });
      console.log(`✅ Can access departments (${departments.entries.length} active)`);
      
      const users = await client.getUsers({ active: true });
      console.log(`✅ Can access users (${users.entries.length} active)`);
    } catch (error) {
      console.error('⚠️  Data access limited:', error.message);
    }
    
    console.log('\n🎉 Validation completed successfully!');
    console.log('   Your integration is ready to use.');
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    
    if (error.code === 'AUTH_ERROR') {
      console.error('\n💡 Authentication troubleshooting:');
      console.error('   • Verify your API token is correct and not expired');
      console.error('   • Check that the tenant ID matches your organization');
      console.error('   • Ensure the user account associated with the token is active');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('\n💡 Network troubleshooting:');
      console.error('   • Check your internet connection');
      console.error('   • Verify the QMPlus base URL is correct');
      console.error('   • Check if there are any firewall restrictions');
    } else {
      console.error('\n💡 General troubleshooting:');
      console.error('   • Check the logs for more detailed error information');
      console.error('   • Contact your QMPlus administrator for assistance');
    }
    
    process.exit(1);
  }
}

// Enhanced error handling for the script
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  console.error('\n💥 Unexpected error occurred. Check logs for details.');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('\n💥 Critical error occurred. Check logs for details.');
  process.exit(1);
});

// Run validation
if (require.main === module) {
  validateAuth().catch(error => {
    logger.error('Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { validateAuth };