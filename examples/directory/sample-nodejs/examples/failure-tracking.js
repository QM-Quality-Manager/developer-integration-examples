#!/usr/bin/env node

/**
 * Failure Tracking and Error Handling Example
 * 
 * This script demonstrates comprehensive failure tracking for IAM operations,
 * including detailed error analysis, recovery strategies, and monitoring.
 */

require('dotenv').config();
const { QMPlusClient } = require('../lib/qmplus-client');
const logger = require('../lib/logger');

// Sample data with intentional errors for demonstration
const sampleDataWithErrors = {
  departments: [
    {
      externalId: "dept-valid",
      departmentName: "Valid Department",
      active: true,
      parentExternalId: null
    },
    {
      externalId: "dept-duplicate", 
      departmentName: "Duplicate Department",
      active: true,
      parentExternalId: null
    },
    {
      externalId: "dept-duplicate", // Intentional duplicate
      departmentName: "Another Duplicate",
      active: true,
      parentExternalId: null
    },
    {
      externalId: "dept-invalid-parent",
      departmentName: "Invalid Parent Department", 
      active: true,
      parentExternalId: "non-existent-parent" // Parent doesn't exist
    }
  ],
  
  users: [
    {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@company.com",
      externalId: "user-001",
      active: true,
      userTypes: [
        {
          departmentExternalId: "dept-valid",
          userTypeId: "1"
        }
      ]
    },
    {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@company.com",
      externalId: "user-002", 
      active: true,
      userTypes: [
        {
          departmentExternalId: "non-existent-dept", // Department doesn't exist
          userTypeId: "1"
        }
      ]
    },
    {
      // Missing required fields for data format error
      firstName: "Invalid",
      emailAddress: "invalid@company.com", // Wrong field name (should be 'email')
      externalId: "user-003",
      active: true,
      userTypes: []
    }
  ]
};

async function demonstrateFailureTracking() {
  console.log('🔍 Failure Tracking and Error Handling Demo\n');
  
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN,
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS) || 3
  });

  try {
    // Step 1: Perform sync with errors
    console.log('📡 Starting sync with intentional errors...');
    const timer = logger.time('Sync with Errors');
    
    const checkpoint = await client.createCheckpoint();
    const transactionId = checkpoint.transactionId;
    
    console.log(`   • Transaction ID: ${transactionId}`);
    
    // Sync departments and users
    await client.syncDepartments(sampleDataWithErrors.departments, transactionId);
    await client.syncUsers(sampleDataWithErrors.users, transactionId);
    
    // Commit transaction (will run as background job)
    const commitResult = await client.commitTransaction(transactionId);
    console.log(`   • Background job started: ${commitResult.jobId}`);
    
    // Step 2: Monitor transaction progress
    console.log('\n⏳ Monitoring transaction progress...');
    let transactionStatus;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      transactionStatus = await client.getTransactionStatus(transactionId);
      attempts++;
      
      console.log(`   • Status: ${transactionStatus.transactionStatus} (${transactionStatus.completedOperations}/${transactionStatus.totalOperations})`);
      
      if (attempts >= maxAttempts) {
        throw new Error('Transaction monitoring timeout');
      }
    } while (transactionStatus.transactionStatus === 'PROCESSING');
    
    timer.end();
    
    // Step 3: Analyze results and failures
    console.log('\n📊 Transaction Results:');
    console.log(`   • Status: ${transactionStatus.transactionStatus}`);
    console.log(`   • Total Operations: ${transactionStatus.totalOperations}`);
    console.log(`   • Successful: ${transactionStatus.completedOperations}`);
    console.log(`   • Failed: ${transactionStatus.failedOperations}`);
    console.log(`   • Success Rate: ${Math.round((transactionStatus.completedOperations / transactionStatus.totalOperations) * 100)}%`);
    
    if (transactionStatus.failedOperations > 0) {
      console.log('\n⚠️  Detailed Failure Analysis:');
      
      if (transactionStatus.failures && transactionStatus.failures.length > 0) {
        transactionStatus.failures.forEach((failure, index) => {
          console.log(`\n   ${index + 1}. Operation ${failure.operationId}`);
          console.log(`      • Type: ${failure.operationType}`);
          console.log(`      • Action: ${failure.operationAction}`);
          console.log(`      • Entity: ${failure.entityName || 'Unknown'}`);
          console.log(`      • External ID: ${failure.externalId || 'N/A'}`);
          console.log(`      • Error Type: ${failure.errorType}`);
          console.log(`      • Error Message: ${failure.errorMessage}`);
          console.log(`      • Failed On: ${failure.failedOn}`);
          
          if (failure.details) {
            console.log(`      • Additional Details:`);
            Object.entries(failure.details).forEach(([key, value]) => {
              console.log(`        - ${key}: ${value}`);
            });
          }
        });
        
        // Step 4: Error categorization and recommendations
        console.log('\n💡 Error Analysis and Recommendations:');
        
        const errorsByType = {};
        transactionStatus.failures.forEach(failure => {
          if (!errorsByType[failure.errorType]) {
            errorsByType[failure.errorType] = [];
          }
          errorsByType[failure.errorType].push(failure);
        });
        
        Object.entries(errorsByType).forEach(([errorType, failures]) => {
          console.log(`\n   ${errorType} Errors (${failures.length}):`);
          
          switch (errorType) {
            case 'VALIDATION':
              console.log('      • Check for duplicate external IDs and missing required fields');
              console.log('      • Verify parent-child relationships exist');
              console.log('      • Ensure email addresses are unique');
              break;
              
            case 'DATA_FORMAT':
              console.log('      • Verify JSON field names match the expected schema');
              console.log('      • Check for unrecognized fields in your payload');
              console.log('      • Ensure data types match requirements');
              break;
              
            case 'NOT_FOUND':
              console.log('      • Create missing parent departments first');
              console.log('      • Verify user types exist in the system');
              console.log('      • Check external ID references');
              break;
              
            case 'DUPLICATE':
              console.log('      • Use UPDATE operations instead of CREATE for existing entities');
              console.log('      • Check for duplicate entries in your source data');
              break;
              
            case 'SYSTEM':
              console.log('      • Contact support if these errors persist');
              console.log('      • Check system status and connectivity');
              break;
              
            default:
              console.log('      • Review the specific error messages for guidance');
          }
        });
      }
    }
    
    // Step 5: Background job monitoring
    console.log('\n📈 Background Job Details:');
    const jobDetails = await client.getJob(commitResult.jobId);
    
    console.log(`   • Job ID: ${jobDetails.value.id}`);
    console.log(`   • Status: ${jobDetails.value.status}`);
    console.log(`   • Progress: ${jobDetails.value.donePercentage}%`);
    console.log(`   • Started: ${jobDetails.value.startedOn}`);
    console.log(`   • Finished: ${jobDetails.value.finishedOn || 'In progress'}`);
    
    if (jobDetails.value.updates && jobDetails.value.updates.length > 0) {
      console.log(`   • Progress Updates:`);
      jobDetails.value.updates.forEach((update, index) => {
        console.log(`     ${index + 1}. ${update.timestamp}: ${update.message}`);
      });
    }
    
    if (jobDetails.value.results) {
      console.log(`   • Final Results:`);
      Object.entries(jobDetails.value.results).forEach(([key, value]) => {
        console.log(`     - ${key}: ${value}`);
      });
    }
    
    if (jobDetails.value.errorMessage) {
      console.log(`   • Job Error: ${jobDetails.value.errorMessage}`);
    }
    
  } catch (error) {
    console.error('\n❌ Failure tracking demo failed:', error.message);
    throw error;
  }
}

async function demonstrateRetryStrategies() {
  console.log('\n🔄 Retry Strategy Demonstration\n');
  
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN
  });
  
  console.log('🎯 Recommended Retry Strategies by Error Type:');
  
  const retryStrategies = {
    'VALIDATION': {
      retry: false,
      action: 'Fix data and resubmit',
      examples: ['Duplicate external IDs', 'Missing required fields', 'Invalid references']
    },
    'DATA_FORMAT': {
      retry: false,
      action: 'Correct JSON structure and field names',
      examples: ['Unrecognized field names', 'Invalid JSON syntax', 'Wrong data types']
    },
    'NOT_FOUND': {
      retry: true,
      action: 'Create missing dependencies first',
      examples: ['Parent department missing', 'User type not found']
    },
    'DUPLICATE': {
      retry: false,
      action: 'Use UPDATE instead of CREATE',
      examples: ['Entity already exists', 'Email already registered']
    },
    'SYSTEM': {
      retry: true,
      action: 'Retry with exponential backoff',
      examples: ['Database timeout', 'Network errors', 'Service unavailable']
    }
  };
  
  Object.entries(retryStrategies).forEach(([errorType, strategy]) => {
    console.log(`\n   ${errorType}:`);
    console.log(`     • Should Retry: ${strategy.retry ? 'Yes' : 'No'}`);
    console.log(`     • Action: ${strategy.action}`);
    console.log(`     • Common Examples:`);
    strategy.examples.forEach(example => {
      console.log(`       - ${example}`);
    });
  });
  
  console.log('\n💡 Implementation Tips:');
  console.log('   • Always check transaction status for detailed failure information');
  console.log('   • Use the failures array to identify specific problems');
  console.log('   • Monitor background jobs for real-time progress updates');
  console.log('   • Implement exponential backoff for SYSTEM errors');
  console.log('   • Group failures by error type for efficient batch fixing');
}

async function main() {
  try {
    await demonstrateFailureTracking();
    await demonstrateRetryStrategies();
    
    console.log('\n🎉 Failure tracking demonstration completed successfully!');
    
  } catch (error) {
    logger.error('Failure tracking demo failed:', error);
    console.error('\n💥 Demo failed. Check logs for detailed error information.');
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}

module.exports = { demonstrateFailureTracking, sampleDataWithErrors };