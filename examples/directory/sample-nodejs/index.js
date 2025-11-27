#!/usr/bin/env node

/**
 * QMPlus Directory Integration - Main Example
 * 
 * This is the main entry point demonstrating various integration scenarios
 * with the QMPlus Directory Integration API.
 */

require('dotenv').config();
const { QMPlusClient } = require('./lib/qmplus-client');
const logger = require('./lib/logger');

async function basicExample() {
  console.log('🏢 QMPlus Directory Integration - Basic Example\n');
  
  // Initialize client
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN
  });
  
  try {
    // 1. Validate authentication
    console.log('1️⃣  Validating authentication...');
    const isValid = await client.validateAuth();
    if (!isValid) {
      throw new Error('Authentication failed');
    }
    console.log('✅ Authentication successful\n');
    
    // 2. Create a simple department structure
    console.log('2️⃣  Creating department structure...');
    const departments = [
      {
        externalId: "example-root",
        departmentName: "Example Organization",
        active: true,
        parentExternalId: null
      },
      {
        externalId: "example-it",
        departmentName: "IT Department", 
        active: true,
        parentExternalId: "example-root"
      }
    ];
    
    const deptResult = await client.syncDepartments(departments);
    console.log(`✅ Created ${deptResult.successfulOperations || deptResult.processed} departments\n`);
    
    // 3. Add users to the departments
    console.log('3️⃣  Adding users...');
    const users = [
      {
        firstName: "Alice",
        lastName: "Example",
        email: "alice.example@company.com",
        phoneNumber: "+1-555-000-0001",
        externalId: "example-user-001",
        active: true,
        userTypes: [
          {
            departmentExternalId: "example-it",
            userTypeId: "1" // Assuming user type ID 1 exists
          }
        ]
      },
      {
        firstName: "Bob", 
        lastName: "Sample",
        email: "bob.sample@company.com",
        phoneNumber: "+1-555-000-0002",
        externalId: "example-user-002",
        active: true,
        userTypes: [
          {
            departmentExternalId: "example-root",
            userTypeId: "1"
          }
        ]
      }
    ];
    
    const userResult = await client.syncUsers(users);
    console.log(`✅ Created ${userResult.successfulOperations} users\n`);
    
    // 4. Demonstrate cascade deactivation
    console.log('4️⃣  Demonstrating cascade deactivation...');
    const deactivation = [
      {
        externalId: "example-root",
        departmentName: "Example Organization",
        active: false,
        cascadeToChildren: true // This will deactivate the IT department too
      }
    ];
    
    const cascadeResult = await client.syncDepartments(deactivation);
    console.log(`✅ Cascade deactivation: ${cascadeResult.successfulOperations || cascadeResult.processed} operations\n`);
    
    // 5. Check final state
    console.log('5️⃣  Checking final state...');
    const finalDepartments = await client.getDepartments();
    const finalUsers = await client.getUsers();
    
    console.log(`📊 Final state:`);
    console.log(`   • Total departments: ${finalDepartments.entries.length}`);
    console.log(`   • Total users: ${finalUsers.entries.length}`);
    
    // Show active vs inactive counts
    const activeDepts = finalDepartments.entries.filter(d => d.active !== false).length;
    const activeUsers = finalUsers.entries.filter(u => u.active !== false).length;
    
    console.log(`   • Active departments: ${activeDepts}`);
    console.log(`   • Active users: ${activeUsers}`);
    
    console.log('\n🎉 Basic example completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example failed:', error.message);
    
    if (error.code) {
      console.error(`   Error type: ${error.code}`);
    }
    
    if (error.details) {
      console.error('   Details:', JSON.stringify(error.details, null, 2));
    }
    
    throw error;
  }
}

async function transactionExample() {
  console.log('\n🔄 Transaction Management Example\n');
  
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN
  });
  
  try {
    // 1. Create checkpoint
    console.log('1️⃣  Creating checkpoint...');
    const checkpoint = await client.createCheckpoint();
    console.log(`✅ Checkpoint created: ${checkpoint.transactionId}\n`);
    
    // 2. Queue multiple operations
    console.log('2️⃣  Queueing operations...');
    
    // Queue department operations
    await client.syncDepartments([
      {
        externalId: "tx-example-dept",
        departmentName: "Transaction Example Dept",
        active: true,
        parentExternalId: null
      }
    ], checkpoint.transactionId);
    
    // Queue user operations
    await client.syncUsers([
      {
        firstName: "Transaction",
        lastName: "User",
        email: "tx.user@company.com",
        externalId: "tx-user-001", 
        active: true,
        userTypes: [
          {
            departmentExternalId: "tx-example-dept",
            userTypeId: "1"
          }
        ]
      }
    ], checkpoint.transactionId);
    
    console.log('✅ Operations queued\n');
    
    // 3. Check transaction status before commit
    console.log('3️⃣  Checking transaction status...');
    const statusBefore = await client.getTransactionStatus(checkpoint.transactionId);
    console.log(`   Status: ${statusBefore.transactionStatus}`);
    console.log(`   Total operations: ${statusBefore.totalOperations}`);
    console.log(`   Completed: ${statusBefore.completedOperations}`);
    
    // 4. Commit transaction
    console.log('\n4️⃣  Committing transaction...');
    const commitResult = await client.commitTransaction(checkpoint.transactionId);
    
    console.log(`✅ Transaction committed:`);
    console.log(`   • Total operations: ${commitResult.totalOperations}`);
    console.log(`   • Successful: ${commitResult.successfulOperations}`);
    console.log(`   • Failed: ${commitResult.failedOperations}`);
    
    // 5. Final status check
    console.log('\n5️⃣  Final status check...');
    const finalStatus = await client.getTransactionStatus(checkpoint.transactionId);
    console.log(`   Final status: ${finalStatus.transactionStatus}`);
    console.log(`   Completed on: ${finalStatus.completedOn}`);
    
    console.log('\n🎉 Transaction example completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Transaction example failed:', error.message);
    throw error;
  }
}

async function monitoringExample() {
  console.log('\n📊 Monitoring Example\n');
  
  const client = new QMPlusClient({
    baseUrl: process.env.QMPLUS_BASE_URL,
    tenantId: process.env.QMPLUS_TENANT_ID,
    apiToken: process.env.QMPLUS_API_TOKEN
  });
  
  try {
    // Get transaction history
    console.log('1️⃣  Getting transaction history...');
    const history = await client.listTransactions({
      limit: 10
    });
    
    console.log(`📈 Found ${history.totalCount} total transactions`);
    console.log(`   Showing last ${history.transactions.length} transactions:\n`);
    
    history.transactions.forEach((tx, index) => {
      const statusIcon = tx.status === 'COMPLETED' ? '✅' : 
                        tx.status === 'FAILED' ? '❌' : 
                        tx.status === 'PROCESSING' ? '⏳' : '🔄';
      
      console.log(`   ${index + 1}. ${statusIcon} ${tx.transactionId.substring(0, 8)}...`);
      console.log(`      Status: ${tx.status}`);
      console.log(`      Operations: ${tx.completedCount}/${tx.operationCount}`);
      console.log(`      Created: ${new Date(tx.createdOn).toLocaleString()}`);
      
      if (tx.failedCount > 0) {
        console.log(`      ⚠️  Failed operations: ${tx.failedCount}`);
      }
      
      console.log('');
    });
    
    // Filter examples
    console.log('2️⃣  Filtering examples...');
    
    const completedTx = await client.listTransactions({
      status: 'COMPLETED',
      limit: 5
    });
    console.log(`   • Completed transactions: ${completedTx.totalCount}`);

    const failedTx = await client.listTransactions({
      status: 'FAILED',
      limit: 5
    });
    console.log(`   • Failed transactions: ${failedTx.totalCount}`);
    
    console.log('\n🎉 Monitoring example completed!');
    
  } catch (error) {
    console.error('\n❌ Monitoring example failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 QMPlus Directory Integration Examples\n');
  console.log('This script demonstrates various integration scenarios.\n');
  
  try {
    await basicExample();
    await transactionExample();
    await monitoringExample();
    
    console.log('\n✨ All examples completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   • Check the examples/ directory for more specific scenarios');
    console.log('   • Run "npm run sync" for a full synchronization example');
    console.log('   • Run "npm run validate" to test your authentication');
    console.log('   • Check the logs/ directory for detailed logging');
    
  } catch (error) {
    logger.error('Examples failed:', error);
    console.error('\n💥 Examples failed. Check logs for detailed error information.');
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection in main:', reason);
  console.error('\n💥 Unexpected error occurred. Check logs for details.');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception in main:', error);
  console.error('\n💥 Critical error occurred. Check logs for details.');
  process.exit(1);
});

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { basicExample, transactionExample, monitoringExample };