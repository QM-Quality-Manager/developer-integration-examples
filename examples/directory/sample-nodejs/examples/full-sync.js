#!/usr/bin/env node

/**
 * Full Synchronization Example
 * 
 * This script demonstrates a complete directory synchronization,
 * including departments and users with error handling and monitoring.
 */

require('dotenv').config();
const { QMPlusClient } = require('../lib/qmplus-client');
const logger = require('../lib/logger');
const { validateSyncData } = require('../lib/validators');

// Sample data - in real implementation, this would come from your directory system
const sampleData = {
  departments: [
    {
      externalId: "corp-root",
      departmentName: "Acme Corporation",
      active: true,
      parentExternalId: null
    },
    {
      externalId: "div-technology",
      departmentName: "Technology Division", 
      active: true,
      parentExternalId: "corp-root"
    },
    {
      externalId: "div-sales",
      departmentName: "Sales Division",
      active: true,
      parentExternalId: "corp-root"
    },
    {
      externalId: "dept-engineering",
      departmentName: "Engineering Department",
      active: true,
      parentExternalId: "div-technology"
    },
    {
      externalId: "dept-product",
      departmentName: "Product Management",
      active: true,
      parentExternalId: "div-technology"
    },
    {
      externalId: "team-frontend",
      departmentName: "Frontend Team",
      active: true,
      parentExternalId: "dept-engineering"
    },
    {
      externalId: "team-backend",
      departmentName: "Backend Team", 
      active: true,
      parentExternalId: "dept-engineering"
    },
    {
      externalId: "team-devops",
      departmentName: "DevOps Team",
      active: true,
      parentExternalId: "dept-engineering"
    }
  ],
  
  users: [
    {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@acme.com",
      phoneNumber: "+1-555-101-1001",
      externalId: "emp-001",
      active: true,
      userTypes: [
        {
          departmentExternalId: "team-backend",
          userTypeId: "1" // Developer role
        }
      ]
    },
    {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@acme.com", 
      phoneNumber: "+1-555-101-1002",
      externalId: "emp-002",
      active: true,
      userTypes: [
        {
          departmentExternalId: "team-frontend",
          userTypeId: "2" // Senior Developer role
        },
        {
          departmentExternalId: "dept-product",
          userTypeId: "3" // Technical Advisor role
        }
      ]
    },
    {
      firstName: "Michael",
      lastName: "Brown",
      email: "michael.brown@acme.com",
      phoneNumber: "+1-555-101-1003", 
      externalId: "emp-003",
      active: true,
      userTypes: [
        {
          departmentExternalId: "team-devops",
          userTypeId: "1" // Developer role
        }
      ]
    },
    {
      firstName: "Emily",
      lastName: "Davis",
      email: "emily.davis@acme.com",
      phoneNumber: "+1-555-101-1004",
      externalId: "emp-004",
      active: true,
      userTypes: [
        {
          departmentExternalId: "dept-engineering",
          userTypeId: "4" // Manager role
        }
      ]
    },
    {
      firstName: "David",
      lastName: "Wilson",
      email: "david.wilson@acme.com",
      phoneNumber: "+1-555-101-1005",
      externalId: "emp-005",
      active: true,
      userTypes: [
        {
          departmentExternalId: "div-technology", 
          userTypeId: "5" // Director role
        }
      ]
    }
  ]
};

async function performFullSync() {
  console.log('🚀 Starting Full Directory Synchronization\n');
  
  // Initialize client
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN,
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS) || 3,
    batchSize: parseInt(process.env.API_BATCH_SIZE) || 100
  });
  
  // Validate authentication
  console.log('🔐 Validating authentication...');
  const isAuthValid = await client.validateAuth();
  if (!isAuthValid) {
    throw new Error('Authentication validation failed');
  }
  console.log('✅ Authentication successful\n');
  
  // Validate sync data
  console.log('📋 Validating sync data...');
  const validation = validateSyncData(sampleData);
  
  if (!validation.valid) {
    console.error('❌ Data validation failed:');
    
    if (validation.generalErrors.length > 0) {
      console.error('\nGeneral errors:');
      validation.generalErrors.forEach(error => console.error(`   • ${error}`));
    }
    
    if (validation.departmentErrors.length > 0) {
      console.error('\nDepartment errors:');
      validation.departmentErrors.forEach(dept => {
        console.error(`   • Department ${dept.externalId}:`);
        dept.errors.forEach(error => console.error(`     - ${error}`));
      });
    }
    
    if (validation.userErrors.length > 0) {
      console.error('\nUser errors:');
      validation.userErrors.forEach(user => {
        console.error(`   • User ${user.email}:`);
        user.errors.forEach(error => console.error(`     - ${error}`));
      });
    }
    
    throw new Error('Data validation failed');
  }
  
  console.log('✅ Data validation passed');
  console.log(`   • ${sampleData.departments.length} departments to sync`);
  console.log(`   • ${sampleData.users.length} users to sync\n`);
  
  // Start timing
  const timer = logger.time('Full Sync');
  
  try {
    // Perform full synchronization
    console.log('⚙️  Starting synchronization...');
    const result = await client.fullSync(sampleData);
    
    // Complete timing
    const duration = timer.end('Full sync completed');
    
    // Display results
    console.log('\n📊 Synchronization Results:');
    console.log(`   • Transaction ID: ${result.transactionId}`);
    console.log(`   • Total Operations: ${result.totalOperations}`);
    console.log(`   • Successful: ${result.successfulOperations}`);
    console.log(`   • Failed: ${result.failedOperations}`);
    console.log(`   • Success Rate: ${Math.round((result.successfulOperations / result.totalOperations) * 100)}%`);
    console.log(`   • Duration: ${duration}ms`);
    
    if (result.failedOperations > 0) {
      console.log('\n⚠️  Some operations failed:');
      result.errors?.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.messages?.[0]?.message || 'Unknown error'}`);
        if (error.paths?.length > 0) {
          console.log(`      Path: ${error.paths.join(', ')}`);
        }
      });
    }
    
    // Display summary of what was created/updated
    console.log('\n📈 Summary:');
    console.log(`   • Departments processed: ${sampleData.departments.length}`);
    console.log(`   • Users processed: ${sampleData.users.length}`);
    
    if (result.successfulOperations === result.totalOperations) {
      console.log('\n🎉 Full synchronization completed successfully!');
    } else {
      console.log('\n⚠️  Synchronization completed with some failures.');
      console.log('   Check the error details above and retry failed operations.');
    }
    
  } catch (error) {
    timer.end('Full sync failed');
    
    console.error('\n❌ Synchronization failed:', error.message);
    
    if (error.code === 'VALIDATION_ERROR') {
      console.error('\nValidation errors occurred:');
      if (error.details && Array.isArray(error.details)) {
        error.details.forEach(detail => {
          console.error(`   • ${detail.messages?.[0]?.message || 'Unknown validation error'}`);
        });
      }
    }
    
    throw error;
  }
}

async function demonstrateMonitoring() {
  console.log('\n🔍 Demonstrating Transaction Monitoring\n');
  
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN
  });
  
  // Get recent transactions for monitoring demo
  console.log('📊 Recent transaction history:');
  const recentTransactions = await client.listTransactions({
    pageSize: 5
  });
  
  if (recentTransactions.transactions.length === 0) {
    console.log('   No recent transactions found.');
    return;
  }
  
  recentTransactions.transactions.forEach((tx, index) => {
    const status = tx.status;
    const statusIcon = status === 'COMPLETED' ? '✅' : 
                     status === 'FAILED' ? '❌' : 
                     status === 'PROCESSING' ? '⏳' : '🔄';
    
    console.log(`   ${index + 1}. ${statusIcon} ${tx.transactionId}`);
    console.log(`      Status: ${status}`);
    console.log(`      Operations: ${tx.completedCount}/${tx.operationCount}`);
    console.log(`      Created: ${tx.createdOn}`);
    
    if (tx.status === 'COMPLETED' && tx.completedOn) {
      console.log(`      Completed: ${tx.completedOn}`);
    }
    
    console.log('');
  });
}

async function main() {
  try {
    await performFullSync();
    await demonstrateMonitoring();
    
  } catch (error) {
    logger.error('Full sync example failed:', error);
    console.error('\n💥 Example failed. Check logs for detailed error information.');
    process.exit(1);
  }
}

// Error handling for the script
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection in full-sync:', reason);
  console.error('\n💥 Unexpected error occurred. Check logs for details.');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception in full-sync:', error);
  console.error('\n💥 Critical error occurred. Check logs for details.');
  process.exit(1);
});

// Run the example
if (require.main === module) {
  main();
}

module.exports = { performFullSync, sampleData };