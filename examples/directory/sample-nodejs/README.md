# QMPlus Directory Integration - Node.js Sample

This is a complete working example of integrating with the QMPlus Directory Integration API using Node.js.

## Features

- ✅ Complete API client implementation
- ✅ Transaction management with error handling
- ✅ Department hierarchy synchronization
- ✅ User management with multi-department support
- ✅ Cascade operations for department activation/deactivation
- ✅ Comprehensive logging and monitoring
- ✅ Batch processing for large datasets
- ✅ Retry logic and error recovery

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your QMPlus credentials
```

### 3. Validate Authentication
```bash
npm run validate
```

### 4. Run Sample Sync
```bash
npm run sync
```

## Project Structure

```
sample-nodejs/
├── lib/
│   ├── qmplus-client.js      # Main API client
│   ├── logger.js             # Logging configuration
│   └── validators.js         # Data validation
├── examples/
│   ├── full-sync.js          # Complete sync example
│   ├── department-cascade.js # Cascade operations
│   ├── user-management.js    # User operations
│   ├── validate-auth.js      # Auth validation
│   └── monitor-transactions.js # Transaction monitoring
├── data/
│   ├── sample-departments.json
│   └── sample-users.json
├── index.js                  # Main entry point
├── test.js                   # Basic tests
└── README.md                 # This file
```

## Usage Examples

### Basic User Sync
```javascript
const { QMPlusClient } = require('./lib/qmplus-client');

const client = new QMPlusClient({
  baseUrl: process.env.QMPLUS_BASE_URL,
  tenantId: process.env.QMPLUS_TENANT_ID,
  apiToken: process.env.QMPLUS_API_TOKEN
});

// Create a simple user
const result = await client.syncUsers([{
  firstName: "John",
  lastName: "Doe", 
  email: "john.doe@company.com",
  externalId: "emp-001",
  active: true,
  userTypes: [{
    departmentExternalId: "dept-engineering",
    userTypeId: "1"
  }]
}]);
```

### Department Hierarchy
```javascript
// Create department structure
const departments = [
  {
    externalId: "corp-root",
    departmentName: "Acme Corp",
    active: true,
    parentExternalId: null
  },
  {
    externalId: "dept-engineering", 
    departmentName: "Engineering",
    active: true,
    parentExternalId: "corp-root"
  },
  {
    externalId: "team-frontend",
    departmentName: "Frontend Team", 
    active: true,
    parentExternalId: "dept-engineering"
  }
];

const result = await client.syncDepartments(departments);
```

### Cascade Deactivation
```javascript
// Deactivate entire department branch
const result = await client.syncDepartments([{
  externalId: "dept-legacy",
  departmentName: "Legacy Systems",
  active: false,
  cascadeToChildren: true // Deactivate all children
}]);
```

### Pagination Examples
```javascript
// Get first 50 transactions
const firstPage = await client.listTransactions({
  skip: 0,
  limit: 50
});

// Get next 50 transactions
const secondPage = await client.listTransactions({
  skip: 50,
  limit: 50
});

// Get users with pagination
const users = await client.getUsers({
  active: true,
  skip: 0,
  limit: 100
});

console.log(`Total users: ${users.total}, Returned: ${users.entries.length}`);
```

## API Client Methods

### Transaction Management
- `client.createCheckpoint()` - Create new transaction
- `client.commitTransaction(transactionId)` - Execute operations
- `client.getTransactionStatus(transactionId)` - Check status
- `client.listTransactions(filters)` - Get transaction history with skip/limit pagination

### Data Synchronization
- `client.syncUsers(users, transactionId?)` - Sync users
- `client.syncDepartments(departments, transactionId?)` - Sync departments
- `client.getUsers(filters?)` - Retrieve users with optional skip/limit pagination
- `client.getDepartments(filters?)` - Retrieve departments

### Convenience Methods
- `client.fullSync(data)` - Complete sync operation
- `client.bulkUserImport(users)` - Large user import
- `client.organizationSetup(hierarchy)` - Department structure setup

## Error Handling

The client includes comprehensive error handling:

```javascript
try {
  const result = await client.syncUsers(users);
  console.log(`Success: ${result.successfulOperations}/${result.totalOperations}`);
} catch (error) {
  if (error.code === 'AUTH_ERROR') {
    console.error('Authentication failed:', error.message);
  } else if (error.code === 'VALIDATION_ERROR') {
    console.error('Validation errors:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Monitoring

Monitor long-running operations:

```javascript
const transactionId = await client.createCheckpoint();
// ... queue operations ...

// Monitor progress
client.monitorTransaction(transactionId, (status) => {
  console.log(`Progress: ${status.completedOperations}/${status.totalOperations}`);
});

const result = await client.commitTransaction(transactionId);
```

## Configuration

### Environment Variables
- `QMPLUS_BASE_URL` - QMPlus API base URL
- `QMPLUS_TENANT_ID` - Your tenant identifier  
- `QMPLUS_API_TOKEN` - API authentication token
- `API_TIMEOUT` - Request timeout (default: 30000ms)
- `API_RETRY_ATTEMPTS` - Retry attempts (default: 3)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

### Client Options
```javascript
const client = new QMPlusClient({
  baseUrl: 'https://api.qmplus.com',
  tenantId: 'your-tenant',
  apiToken: 'your-token',
  timeout: 30000,
  retryAttempts: 3,
  batchSize: 100,
  logger: customLogger
});
```

## Testing

Run the test suite:
```bash
npm test
```

Test authentication:
```bash
npm run validate
```

## Scripts

- `npm start` - Run the main example
- `npm run dev` - Run with auto-reload
- `npm run sync` - Execute full sync example
- `npm run validate` - Test authentication
- `npm run monitor` - Monitor recent transactions

## Logging

Logs are written to:
- Console (formatted output)
- `logs/integration.log` (structured logs)
- `logs/error.log` (error-only logs)

Log levels: `debug`, `info`, `warn`, `error`

## Production Considerations

### Security
- Store API tokens securely (environment variables, vault)
- Use HTTPS for all communications
- Implement rate limiting
- Monitor for suspicious activity

### Performance
- Use batch operations for large datasets
- Implement exponential backoff for retries
- Monitor transaction completion times
- Consider parallel processing for independent operations

### Reliability
- Implement comprehensive error handling
- Use transaction mode for critical operations
- Monitor transaction status for long operations
- Implement alerting for failed operations

## Support

For issues or questions:
1. Check the [troubleshooting guide](../troubleshooting.md)
2. Review the [API reference](../api-reference.md)
3. Contact your QMPlus administrator

## License

MIT License - see LICENSE file for details.