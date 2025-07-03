# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the QMPlus Directory Integration API.

## Table of Contents
- [Authentication Issues](#authentication-issues)
- [Permission Errors](#permission-errors)
- [Data Validation Problems](#data-validation-problems)
- [Transaction Issues](#transaction-issues)
- [Network Connectivity](#network-connectivity)
- [Performance Problems](#performance-problems)
- [Common Error Codes](#common-error-codes)

---

## Authentication Issues

### ❌ "Authentication failed" / HTTP 401

**Symptoms:**
- All API requests return 401 Unauthorized
- Error message: "Invalid or expired auth-token"

**Causes & Solutions:**

1. **Missing or incorrect headers**
   ```bash
   # ❌ Wrong: Missing headers
   curl https://api.qmplus.com/provisioning/iam/checkpoint
   
   # ✅ Correct: Include auth headers
   curl -H "auth-tenant-id: your-tenant-id" \
        -H "auth-token: your-api-token" \
        -H "Content-Type: application/json" \
        https://api.qmplus.com/provisioning/iam/checkpoint
   ```

2. **Expired or invalid API token**
   - **Solution**: Generate a new API token through QMPlus admin interface
   - **Check**: Verify token hasn't been revoked by administrator

3. **Incorrect tenant ID**
   - **Solution**: Verify tenant ID with your QMPlus administrator
   - **Check**: Ensure no extra spaces or special characters

4. **User account deactivated**
   - **Solution**: Contact administrator to reactivate the user account

**Testing Authentication:**
```javascript
// Use the validation script
npm run validate

// Or test manually
const client = new QMPlusClient(config);
const isValid = await client.validateAuth();
```

---

## Permission Errors

### ❌ "Access denied" / HTTP 403

**Symptoms:**
- Authentication succeeds but specific operations fail
- Error message: "Missing required role: PROVISIONING_UPDATE"

**Required Roles:**
- **PROVISIONING_UPDATE**: Create, update, delete operations
- **PROVISIONING_SEARCH**: Read operations and status checking

**Solutions:**

1. **Check user roles in QMPlus:**
   - Login to QMPlus as administrator
   - Navigate to Admin → User Management
   - Edit the user account
   - Verify roles are assigned:
     - ✅ PROVISIONING_UPDATE
     - ✅ PROVISIONING_SEARCH

2. **Test specific permissions:**
   ```javascript
   // Test read permissions
   try {
     await client.listTransactions({ pageSize: 1 });
     console.log('✅ PROVISIONING_SEARCH confirmed');
   } catch (error) {
     console.log('❌ Missing PROVISIONING_SEARCH');
   }
   
   // Test write permissions
   try {
     await client.createCheckpoint();
     console.log('✅ PROVISIONING_UPDATE confirmed');
   } catch (error) {
     console.log('❌ Missing PROVISIONING_UPDATE');
   }
   ```

---

## Data Validation Problems

### ❌ "Validation failed" / HTTP 400

**Common validation errors and solutions:**

#### Missing Required Fields
```javascript
// ❌ Wrong: Missing required fields
{
  "firstName": "John",
  // Missing lastName, email, externalId, active, userTypes
}

// ✅ Correct: All required fields
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "externalId": "emp-001",
  "active": true,
  "userTypes": [
    {
      "departmentExternalId": "dept-engineering",
      "userTypeId": "1"
    }
  ]
}
```

#### Invalid Email Format
```javascript
// ❌ Wrong: Invalid email
{
  "email": "not-an-email"
}

// ✅ Correct: Valid email format
{
  "email": "user@company.com"
}
```

#### Department Dependencies
```javascript
// ❌ Wrong: Parent department doesn't exist
{
  "externalId": "dept-child",
  "parentExternalId": "dept-nonexistent" // This parent doesn't exist
}

// ✅ Correct: Ensure parent exists first
// 1. Create parent
{
  "externalId": "dept-parent",
  "departmentName": "Parent Department",
  "active": true
}
// 2. Then create child
{
  "externalId": "dept-child", 
  "parentExternalId": "dept-parent"
}
```

#### User Type References
```javascript
// ❌ Wrong: Invalid department or user type
{
  "userTypes": [
    {
      "departmentExternalId": "dept-nonexistent",
      "userTypeId": "999" // Invalid IDs
    }
  ]
}

// ✅ Correct: Use valid references
{
  "userTypes": [
    {
      "departmentExternalId": "dept-engineering", // Department must exist
      "userTypeId": "1" // Valid user type ID
    }
  ]
}
```

**Validation Helper:**
```javascript
const { validateSyncData } = require('./lib/validators');

const validation = validateSyncData(data);
if (!validation.valid) {
  console.log('Validation errors:', validation);
}
```

---

## Transaction Issues

### ❌ "Transaction not found"

**Symptoms:**
- Error when trying to commit or check transaction status
- Message: "Transaction with ID xxx not found"

**Causes & Solutions:**

1. **Transaction ID typo**
   - **Solution**: Double-check the transaction ID
   - **Prevention**: Store transaction ID immediately after creation

2. **Transaction expired**
   - **Cause**: Transactions expire after 24 hours of inactivity
   - **Solution**: Create a new transaction and re-queue operations

3. **Transaction already committed**
   - **Cause**: Trying to commit an already-committed transaction
   - **Solution**: Check transaction status first

### ❌ "Transaction not open"

**Symptoms:**
- Cannot add operations to transaction
- Message: "Transaction xxx is not open"

**Solutions:**
```javascript
// Check transaction status before adding operations
const status = await client.getTransactionStatus(transactionId);

switch (status.transactionStatus) {
  case 'OPEN':
    // Safe to add operations
    await client.syncUsers(users, transactionId);
    break;
    
  case 'COMMITTED':
  case 'PROCESSING': 
    // Cannot add more operations
    console.log('Transaction already committed/processing');
    break;
    
  case 'COMPLETED':
  case 'FAILED':
    // Transaction finished
    console.log('Transaction already completed');
    break;
}
```

### ❌ Partial transaction failures

**Symptoms:**
- Some operations succeed, others fail
- `failedOperations > 0` in commit response

**Investigation:**
```javascript
const result = await client.commitTransaction(transactionId);

if (result.failedOperations > 0) {
  console.log('Failed operations:', result.errors);
  
  result.errors.forEach(error => {
    console.log(`Error: ${error.messages[0].message}`);
    console.log(`Path: ${error.paths.join(', ')}`);
  });
}
```

**Common causes:**
- Missing department dependencies
- Invalid user type IDs
- Duplicate external IDs
- Data format issues

---

## Network Connectivity

### ❌ "Network error - unable to reach QMPlus API"

**Symptoms:**
- Connection timeouts
- DNS resolution failures
- SSL/TLS errors

**Troubleshooting steps:**

1. **Check base URL**
   ```bash
   # Test basic connectivity
   curl -I https://your-instance.qmplus.com/api
   
   # Check DNS resolution
   nslookup your-instance.qmplus.com
   ```

2. **Verify SSL/TLS**
   ```bash
   # Test SSL certificate
   openssl s_client -connect your-instance.qmplus.com:443
   ```

3. **Check firewall/proxy**
   - Ensure outbound HTTPS (port 443) is allowed
   - Configure proxy settings if needed:
   ```javascript
   const client = new QMPlusClient({
     // ... other config
     proxy: {
       host: 'proxy.company.com',
       port: 8080
     }
   });
   ```

4. **Test from command line**
   ```bash
   # Simple connectivity test
   curl -v https://your-instance.qmplus.com/api/provisioning/iam/transactions \
     -H "auth-tenant-id: your-tenant" \
     -H "auth-token: your-token"
   ```

### ❌ Request timeouts

**Solutions:**
1. **Increase timeout**
   ```javascript
   const client = new QMPlusClient({
     timeout: 60000, // 60 seconds
     // ... other config
   });
   ```

2. **Use smaller batch sizes**
   ```javascript
   const client = new QMPlusClient({
     batchSize: 50, // Smaller batches
     // ... other config
   });
   ```

3. **Implement retry logic**
   ```javascript
   const client = new QMPlusClient({
     retryAttempts: 5,
     // ... other config
   });
   ```

---

## Performance Problems

### ❌ Slow synchronization

**Symptoms:**
- Long transaction commit times
- Timeouts on large datasets

**Optimization strategies:**

1. **Use appropriate batch sizes**
   ```javascript
   // ❌ Too large - may timeout
   await client.bulkUserImport(users, 1000);
   
   // ✅ Optimal batch size
   await client.bulkUserImport(users, 100);
   ```

2. **Process departments before users**
   ```javascript
   // ✅ Correct order (departments first)
   await client.syncDepartments(departments, transactionId);
   await client.syncUsers(users, transactionId);
   ```

3. **Use transaction mode for large operations**
   ```javascript
   // ❌ Slow - multiple transactions
   for (const user of users) {
     await client.syncUsers([user]);
   }
   
   // ✅ Fast - single transaction
   const checkpoint = await client.createCheckpoint();
   await client.syncUsers(users, checkpoint.transactionId);
   await client.commitTransaction(checkpoint.transactionId);
   ```

4. **Monitor progress**
   ```javascript
   const transactionId = await client.createCheckpoint();
   // ... queue operations ...
   
   // Monitor progress
   client.monitorTransaction(transactionId, (status) => {
     console.log(`Progress: ${status.completedOperations}/${status.totalOperations}`);
   });
   
   await client.commitTransaction(transactionId);
   ```

### ❌ Memory issues with large datasets

**Solutions:**
1. **Stream processing**
   ```javascript
   // Process in smaller chunks
   const chunkSize = 1000;
   for (let i = 0; i < users.length; i += chunkSize) {
     const chunk = users.slice(i, i + chunkSize);
     await processChunk(chunk);
   }
   ```

2. **Clean up resources**
   ```javascript
   // Clear references after processing
   processedData = null;
   if (global.gc) global.gc(); // Force garbage collection in Node.js
   ```

---

## Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `AUTH_ERROR` | 401 | Authentication failed | Check API token and tenant ID |
| `PERMISSION_ERROR` | 403 | Insufficient permissions | Verify user roles |
| `VALIDATION_ERROR` | 400 | Data validation failed | Check required fields and formats |
| `NETWORK_ERROR` | - | Network connectivity issue | Check internet connection and firewall |
| `API_ERROR` | 500 | Server error | Contact QMPlus support |

## Debug Mode

Enable detailed logging for troubleshooting:

```javascript
// Environment variable
LOG_LEVEL=debug npm start

// Or programmatically
const logger = require('./lib/logger');
logger.level = 'debug';

// Client with detailed logging
const client = new QMPlusClient({
  // ... config
  logger: logger // Custom logger
});
```

## Getting Help

### 1. Check Logs
```bash
# View recent logs
tail -f logs/integration.log

# Search for errors
grep "ERROR" logs/integration.log

# View error-only logs
cat logs/error.log
```

### 2. Use Debug Tools
```bash
# Validate authentication
npm run validate

# Test with minimal data
npm run test

# Monitor transactions
npm run monitor
```

### 3. Contact Support

When contacting support, include:
- **Error message** and stack trace
- **Request/response data** (sanitized)
- **Transaction ID** if applicable
- **Timestamp** of the issue
- **Environment details** (Node.js version, OS, etc.)

**Sanitize sensitive data:**
```javascript
// ❌ Don't include
{
  "auth-token": "your-secret-token"
}

// ✅ Include (sanitized)
{
  "auth-token": "abc123...***"
}
```

---

**Need more help?** Check the [API Reference](./api-reference.md) or contact your QMPlus administrator.