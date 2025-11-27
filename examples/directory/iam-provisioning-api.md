# IAM Provisioning API

This document describes the IAM (Identity Access Management) provisioning endpoints available in QMPlus for directory integration and department management.

## Departments API

### Get Departments

Retrieves all departments with optional filtering capabilities for integration with external directory services.

#### Endpoint

```
GET /provisioning/iam/department
```

#### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `active` | Boolean | No | Filter by active status (true/false/null) | `true` |
| `createdOn` | String | No | Filter by creation date range using PipelineDateRange preset | `LAST_30_DAYS` |
| `updatedOn` | String | No | Filter by update date range using PipelineDateRange preset | `CUSTOM` |
| `skip` | Integer | No | Number of records to skip for pagination (default: 0) | `0` |
| `limit` | Integer | No | Maximum number of records to return (max: 1000, default: 50) | `50` |

#### PipelineDateRange Presets

The `createdOn` and `updatedOn` parameters accept the following preset values:

- `TODAY`
- `YESTERDAY`
- `LAST_7_DAYS`
- `LAST_30_DAYS`
- `LAST_90_DAYS`
- `THIS_WEEK`
- `LAST_WEEK`
- `THIS_MONTH`
- `LAST_MONTH`
- `THIS_QUARTER`
- `LAST_QUARTER`
- `THIS_YEAR`
- `LAST_YEAR`
- `CUSTOM` (requires additional start/end date configuration)

#### Request Examples

**Basic request - all departments:**
```http
GET /provisioning/iam/department
```

**Filter by active departments:**
```http
GET /provisioning/iam/department?active=true
```

**Filter by creation date:**
```http
GET /provisioning/iam/department?createdOn=LAST_30_DAYS
```

**Filter by update date with pagination:**
```http
GET /provisioning/iam/department?updatedOn=LAST_7_DAYS&skip=0&limit=100
```

**Combined filters:**
```http
GET /provisioning/iam/department?active=true&createdOn=LAST_30_DAYS&updatedOn=LAST_7_DAYS&skip=0&limit=50
```

#### Response Format

```json
{
  "status": true,
  "entries": [
    {
      "id": "dept-123",
      "name": "Engineering Department",
      "externalId": "ext-eng-001",
      "parentDepartmentId": "dept-root",
      "parentExternalId": "ext-root",
      "createdOn": "2024-01-15T10:30:00Z",
      "updatedOn": "2024-02-01T14:45:00Z",
      "active": true
    },
    {
      "id": "dept-456",
      "name": "Marketing Department",
      "externalId": "ext-mkt-001",
      "parentDepartmentId": "dept-root",
      "parentExternalId": "ext-root",
      "createdOn": "2024-01-20T09:15:00Z",
      "updatedOn": "2024-01-25T16:20:00Z",
      "active": true
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | Boolean | Indicates if the request was successful |
| `entries` | Array | List of department objects |

#### Department Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Internal department ID |
| `name` | String | Department display name |
| `externalId` | String | External directory unique identifier |
| `parentDepartmentId` | String | Internal parent department ID |
| `parentExternalId` | String | External parent directory unique identifier |
| `createdOn` | DateTime | Department creation timestamp |
| `updatedOn` | DateTime | Last modification timestamp |
| `active` | Boolean | Department active status |

#### Error Responses

**Invalid date range preset:**
```json
{
  "status": false,
  "errors": [
    {
      "type": "VALIDATION",
      "field": ["createdOn"],
      "message": "Invalid date range preset. Valid values are: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, THIS_WEEK, LAST_WEEK, THIS_MONTH, LAST_MONTH, THIS_QUARTER, LAST_QUARTER, THIS_YEAR, LAST_YEAR, CUSTOM"
    }
  ]
}
```

**Invalid JSON format:**
```json
{
  "status": false,
  "errors": [
    {
      "type": "VALIDATION",
      "field": ["updatedOn"],
      "message": "Invalid date range format. Expected PipelineDateRange JSON object or preset string."
    }
  ]
}
```

**Pagination limit exceeded:**
```json
{
  "status": false,
  "errors": [
    {
      "type": "VALIDATION",
      "field": ["limit"],
      "message": "Limit cannot exceed 1000"
    }
  ]
}
```

## Integration Guidelines

### Directory Synchronization

This endpoint is designed to support directory service synchronization scenarios:

1. **Initial Sync**: Use without filters to get all departments
2. **Incremental Sync**: Use `updatedOn=LAST_7_DAYS` to get recently modified departments
3. **Active Departments Only**: Use `active=true` to exclude deactivated departments
4. **Batch Processing**: Use `skip` and `limit` parameters for pagination

### Rate Limiting

- Maximum 1000 records per request
- Recommended batch size: 50-100 records for optimal performance
- Use pagination for large datasets

### Authentication

This endpoint requires valid IAM provisioning credentials. Ensure your integration service has the appropriate permissions for department access.

## Implementation Details

### Performance Considerations

- The endpoint uses MongoDB indexes on `active`, `createdOn`, and `updatedOn` fields for optimal query performance
- Date range filtering leverages the `addDateEquality` function for locale-aware date comparisons
- Count queries are optimized using a dedicated `countWithFilters` method in the Department model

### Database Schema

The endpoint queries the `departments` collection with the following indexed fields:
- `id` (primary identifier)
- `active` (boolean status)
- `createdOn` (creation timestamp)
- `updatedOn` (modification timestamp)
- `parentDepartmentId` (hierarchical structure)

### Locale Support

Date range filtering supports locale-specific formatting. The default locale is `en-GB`, but can be configured based on tenant settings.

## Transaction Management API

The IAM Provisioning API supports transaction-based operations for bulk synchronization of departments and users. This ensures data consistency and allows for rollback capabilities.

### Transaction Workflow

1. **Create Checkpoint** - Start a new transaction
2. **Sync Operations** - Add departments/users to the transaction
3. **Commit Transaction** - Execute operations as a background job
4. **Track Progress** - Monitor job and transaction status

### Create Checkpoint

Creates a new transaction for bulk operations.

#### Endpoint

```
POST /provisioning/iam/checkpoint
```

#### Response Format

```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Checkpoint created successfully"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | Boolean | Indicates if the request was successful |
| `transactionId` | String | Unique identifier for the transaction |
| `message` | String | Status message |

### Sync Operations

After creating a checkpoint, you can add operations to the transaction:

- **Sync Departments**: `POST /provisioning/iam/{transactionId}/department`
- **Sync Users**: `POST /provisioning/iam/{transactionId}/user`

### Commit Transaction

Schedules a background job to commit a transaction, processing all queued operations asynchronously. Operations are processed in order: departments first, then users.

#### Endpoint

```
POST /provisioning/iam/{transactionId}/commit
```

#### Response Format

```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "jobId": "670e8400-e29b-41d4-a716-446655440001",
  "message": "Transaction commit has been scheduled for background processing. Use the jobId to check status."
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | Boolean | Indicates if the commit was accepted |
| `transactionId` | String | Transaction identifier |
| `jobId` | String | Background job identifier for tracking |
| `message` | String | Status message |

## Progress Tracking

### Transaction Status

Monitor the progress of a transaction using the transaction status endpoint.

#### Endpoint

```
GET /provisioning/iam/transaction/{transactionId}/status
```

#### Response Format

```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "transactionStatus": "COMPLETED",
  "totalOperations": 150,
  "completedOperations": 145,
  "failedOperations": 5,
  "createdOn": "2024-01-15T10:30:00Z",
  "committedOn": "2024-01-15T10:35:00Z",
  "completedOn": "2024-01-15T10:45:00Z",
  "failures": [
    {
      "operationId": "op-42",
      "operationType": "DEPARTMENT",
      "operationAction": "CREATE",
      "externalId": "ext-dept-duplicate",
      "entityName": "Marketing Department",
      "errorMessage": "Department with external ID 'ext-dept-duplicate' already exists",
      "errorType": "VALIDATION",
      "failedOn": "2024-01-15T10:42:30Z",
      "details": {
        "operationId": "42",
        "transactionId": "550e8400-e29b-41d4-a716-446655440000",
        "exceptionType": "ValidationError"
      }
    },
    {
      "operationId": "op-87",
      "operationType": "USER",
      "operationAction": "CREATE",
      "externalId": "ext-user-001",
      "entityName": "John Smith",
      "errorMessage": "User email 'john.smith@company.com' is already registered",
      "errorType": "VALIDATION",
      "failedOn": "2024-01-15T10:43:15Z",
      "details": {
        "operationId": "87",
        "transactionId": "550e8400-e29b-41d4-a716-446655440000",
        "exceptionType": "ValidationError",
        "email": "john.smith@company.com"
      }
    }
  ]
}
```

#### Transaction Status Values

- `OPEN` - Transaction is accepting operations
- `COMMITTED` - Transaction has been committed and scheduled for processing
- `PROCESSING` - Background job is executing operations
- `COMPLETED` - All operations have been processed (check failedOperations for partial failures)
- `FAILED` - Transaction processing failed

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | Boolean | Indicates if the request was successful |
| `transactionId` | String | Transaction identifier |
| `transactionStatus` | String | Current transaction status |
| `totalOperations` | Integer | Total number of operations in the transaction |
| `completedOperations` | Integer | Number of successfully completed operations |
| `failedOperations` | Integer | Number of operations that failed |
| `createdOn` | String | When the transaction was created |
| `committedOn` | String | When the transaction was committed for processing |
| `completedOn` | String | When the transaction processing completed |
| `failures` | Array | Detailed information about each failed operation (null if no failures) |

#### Failure Object Structure

Each entry in the `failures` array contains detailed information about why a specific operation failed:

| Field | Type | Description |
|-------|------|-------------|
| `operationId` | String | Unique identifier for the failed operation |
| `operationType` | String | Type of operation ("DEPARTMENT" or "USER") |
| `operationAction` | String | Action that was attempted ("CREATE", "UPDATE", "DELETE") |
| `externalId` | String | External ID of the entity being processed |
| `entityName` | String | Name of the entity (department name or user full name) |
| `errorMessage` | String | Detailed human-readable error message |
| `errorType` | String | Category of error (see Error Types below) |
| `failedOn` | String | When the operation failed |
| `details` | Object | Additional context-specific information |

#### Error Types

| Error Type | Description | Common Causes |
|------------|-------------|---------------|
| `VALIDATION` | Input data validation failed | Invalid format, missing required fields, constraint violations |
| `DATA_FORMAT` | JSON or data parsing failed | Malformed JSON, unrecognized fields, invalid data structure |
| `DUPLICATE` | Entity already exists | Attempting to create department/user with existing external ID or email |
| `NOT_FOUND` | Referenced entity not found | Parent department doesn't exist, user type not found |
| `PERMISSION` | Access denied | Insufficient permissions to perform the operation |
| `SYSTEM` | Internal system error | Database errors, network issues, unexpected exceptions |

#### Troubleshooting Failed Operations

Use the failure details to understand and resolve issues:

1. **Validation Errors**: Check the `errorMessage` for specific validation requirements
2. **Data Format Errors**: Verify JSON structure and field names match the expected schema
3. **Duplicate Errors**: Verify external IDs and email addresses are unique
4. **Not Found Errors**: Ensure parent departments and user types exist before referencing them
5. **System Errors**: Contact support if these occur frequently

**Example Error Analysis:**

```json
{
  "operationId": "op-42",
  "operationType": "DEPARTMENT",
  "operationAction": "CREATE",
  "externalId": "ext-dept-001",
  "entityName": "Sales Department",
  "errorMessage": "Department with external ID 'ext-dept-001' already exists",
  "errorType": "VALIDATION",
  "failedOn": "2024-01-15T10:42:30Z"
}
```

**Resolution**: Use UPDATE action instead of CREATE, or use a different external ID.

**DATA_FORMAT Error Example:**

```json
{
  "operationId": "op-73",
  "operationType": "USER",
  "operationAction": "CREATE",
  "externalId": null,
  "entityName": null,
  "errorMessage": "Invalid user data format: Unrecognized field 'emailAddress' (expected 'email')",
  "errorType": "DATA_FORMAT",
  "failedOn": "2024-01-15T10:44:12Z",
  "details": {
    "operationId": "73",
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "exceptionType": "UnrecognizedPropertyException"
  }
}
```

**Resolution**: Check field names in your JSON payload match the expected schema exactly.

### List Operations

Retrieves a paginated list of operations for a specific transaction. Useful for debugging and auditing.

#### Endpoint

```
GET /provisioning/iam/transaction/{transactionId}/operations
```

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `status` | String | No | Filter by operation status | `FAILED` |
| `entityType` | String | No | Filter by entity type | `USER` |
| `operationType` | String | No | Filter by operation type | `USER_CREATE` |
| `sortField` | String | No | Field to sort by (default: orderId) | `createdOn` |
| `sortDirection` | Integer | No | Sort direction (1=asc, -1=desc) | `1` |
| `skip` | Integer | No | Records to skip (default: 0) | `0` |
| `limit` | Integer | No | Max records to return (default: 50, max: 1000) | `100` |

**Valid Status Values**: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

**Valid Entity Types**: `USER`, `DEPARTMENT`

**Valid Operation Types**: `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`, `DEPT_CREATE`, `DEPT_UPDATE`, `DEPT_DELETE`

#### Response Format

```json
{
  "status": true,
  "operations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": 1,
      "operationType": "USER_CREATE",
      "entityType": "USER",
      "status": "COMPLETED",
      "error": null,
      "createdBy": "admin",
      "createdOn": "2024-01-15T10:30:00",
      "processedOn": "2024-01-15T10:35:00",
      "data": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
      }
    }
  ],
  "totalCount": 25,
  "skip": 0,
  "limit": 50
}
```

### Background Job Tracking

Track the detailed progress of background job processing using the Admin Jobs API.

#### Endpoint

```
GET /user/job/{jobId}
```

#### Response Format

```json
{
  "status": true,
  "value": {
    "id": "507f1f77bcf86cd799439011",
    "version": "V1",
    "tenantId": "tenant-123",
    "status": "DONE",
    "createdBy": "user-456",
    "createdOn": "2024-01-15T10:35:00Z",
    "startedOn": "2024-01-15T10:35:30Z",
    "startOn": "2024-01-15T10:35:00Z",
    "finishedOn": "2024-01-15T10:45:00Z",
    "priority": 5,
    "job": {
      "type": "EXECUTE_IAM_COMMIT_TRANSACTION_JOB",
      "userId": "user-456",
      "tenantId": "tenant-123",
      "transactionId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "errorMessage": null,
    "stackTrace": null,
    "donePercentage": 100,
    "updates": [
      {
        "timestamp": "2024-01-15T10:40:00Z",
        "message": "Processing departments: 50/100 completed"
      },
      {
        "timestamp": "2024-01-15T10:42:00Z",
        "message": "Processing users: 25/50 completed"
      }
    ],
    "results": {
      "totalDepartments": 100,
      "totalUsers": 50,
      "successfulDepartments": 98,
      "successfulUsers": 47,
      "failedDepartments": 2,
      "failedUsers": 3
    }
  }
}
```

## BackendJob Document Structure

The BackendJob document returned by the `/user/job/{jobId}` endpoint contains the following fields:

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique job identifier |
| `version` | String | Job schema version (typically "V1") |
| `tenantId` | String | Tenant identifier |
| `status` | String | Current job status |
| `createdBy` | String | User ID who created the job |
| `createdOn` | DateTime | Job creation timestamp |
| `startedOn` | DateTime | Job execution start timestamp |
| `startOn` | DateTime | Scheduled execution time |
| `finishedOn` | DateTime | Job completion timestamp |
| `priority` | Integer | Job priority (higher numbers = higher priority) |

### Job Status Values

- `NOT_STARTED` - Job is queued but not started
- `STARTED` - Job is currently running
- `DONE` - Job completed successfully
- `FAILED` - Job failed with errors
- `CANCELLED` - Job was cancelled

### Job-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `job` | Object | Job-specific configuration and parameters |
| `job.type` | String | Job type (e.g., "EXECUTE_IAM_COMMIT_TRANSACTION_JOB") |
| `job.userId` | String | User who initiated the job |
| `job.tenantId` | String | Target tenant for the job |
| `job.transactionId` | String | Associated transaction ID |

### Progress and Error Fields

| Field | Type | Description |
|-------|------|-------------|
| `errorMessage` | String | Error message if job failed |
| `stackTrace` | String | Full stack trace for debugging |
| `donePercentage` | Integer | Completion percentage (0-100) |
| `updates` | Array | Progress updates during job execution |
| `results` | Object | Job results and statistics |

### Progress Updates Structure

Each entry in the `updates` array contains:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | DateTime | When the update was recorded |
| `message` | String | Human-readable progress message |

### Results Object

The `results` object varies by job type but typically includes:

| Field | Type | Description |
|-------|------|-------------|
| `totalDepartments` | Integer | Total departments processed |
| `totalUsers` | Integer | Total users processed |
| `successfulDepartments` | Integer | Successfully processed departments |
| `successfulUsers` | Integer | Successfully processed users |
| `failedDepartments` | Integer | Failed department operations |
| `failedUsers` | Integer | Failed user operations |

## Integration Best Practices

### Transaction-Based Synchronization

1. **Create Checkpoint**: Always start with creating a transaction
2. **Batch Operations**: Add multiple departments/users to the same transaction
3. **Commit Once**: Commit the transaction when all operations are added
4. **Monitor Progress**: Use both transaction status and job tracking
5. **Handle Failures**: Implement retry logic for failed operations

### Example Workflow

```javascript
// 1. Create checkpoint
const checkpoint = await createCheckpoint();
const transactionId = checkpoint.transactionId;

// 2. Sync departments
await syncDepartments(transactionId, departments);

// 3. Sync users  
await syncUsers(transactionId, users);

// 4. Commit transaction
const commit = await commitTransaction(transactionId);
const jobId = commit.jobId;

// 5. Monitor progress
const monitorJob = async (jobId) => {
  let status = 'NOT_STARTED';
  while (status !== 'DONE' && status !== 'FAILED') {
    const job = await getJob(jobId);
    status = job.value.status;
    
    console.log(`Progress: ${job.value.donePercentage}%`);
    console.log(`Status: ${status}`);
    
    if (job.value.updates && job.value.updates.length > 0) {
      const latestUpdate = job.value.updates[job.value.updates.length - 1];
      console.log(`Latest update: ${latestUpdate.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  }
  
  return status === 'DONE';
};

const success = await monitorJob(jobId);
if (success) {
  console.log('Synchronization completed successfully');
} else {
  console.error('Synchronization failed');
}
```

### Error Handling

The IAM Provisioning API provides comprehensive error tracking at multiple levels:

#### 1. Transaction-Level Error Tracking

Monitor overall transaction progress using the `getTransactionStatus` endpoint:

```javascript
const checkTransactionStatus = async (transactionId) => {
  const response = await fetch(`/provisioning/iam/transaction/${transactionId}/status`);
  const status = await response.json();
  
  console.log(`Transaction: ${status.transactionStatus}`);
  console.log(`Progress: ${status.completedOperations}/${status.totalOperations}`);
  console.log(`Failures: ${status.failedOperations}`);
  
  // Handle individual failures
  if (status.failures && status.failures.length > 0) {
    console.log('Failed operations:');
    status.failures.forEach(failure => {
      console.log(`- ${failure.operationType} ${failure.operationAction}: ${failure.errorMessage}`);
      console.log(`  Entity: ${failure.entityName} (${failure.externalId})`);
      console.log(`  Error Type: ${failure.errorType}`);
      
      // Take corrective action based on error type
      switch (failure.errorType) {
        case 'VALIDATION':
          console.log('  Action: Fix data format or missing fields');
          break;
        case 'DUPLICATE':
          console.log('  Action: Use UPDATE instead of CREATE or change external ID');
          break;
        case 'NOT_FOUND':
          console.log('  Action: Ensure parent entities exist first');
          break;
      }
    });
  }
  
  return status;
};
```

#### 2. Job-Level Progress Tracking

Use the background job endpoint for detailed execution progress:

```javascript
const monitorJobProgress = async (jobId) => {
  const response = await fetch(`/user/job/${jobId}`);
  const job = await response.json();
  
  if (job.value.errorMessage) {
    console.error(`Job failed: ${job.value.errorMessage}`);
    return false;
  }
  
  // Check for progress updates
  if (job.value.updates && job.value.updates.length > 0) {
    const latestUpdate = job.value.updates[job.value.updates.length - 1];
    console.log(`Progress: ${latestUpdate.message}`);
  }
  
  return job.value.status;
};
```

#### 3. Retry Strategy for Failed Operations

Implement intelligent retry logic based on failure types:

```javascript
const retryFailedOperations = async (transactionStatus) => {
  if (!transactionStatus.failures) return;
  
  const retryableFailures = transactionStatus.failures.filter(failure => {
    // Only retry certain error types
    return ['SYSTEM', 'NOT_FOUND'].includes(failure.errorType);
  });
  
  if (retryableFailures.length > 0) {
    console.log(`Retrying ${retryableFailures.length} failed operations...`);
    
    // Create a new transaction for retries
    const newCheckpoint = await createCheckpoint();
    
    // Re-submit the failed operations (you'd need to reconstruct the original data)
    // This is implementation-specific based on how you store the original requests
    
    const retryCommit = await commitTransaction(newCheckpoint.transactionId);
    return retryCommit.jobId;
  }
  
  return null;
};
```

#### 4. Best Practices

- **Monitor both transaction status and job status** for complete visibility
- **Parse failure details** to understand specific issues with each operation
- **Implement categorized retry logic** based on error types:
  - `VALIDATION` errors: Fix data and retry
  - `DUPLICATE` errors: Use UPDATE operations or change identifiers
  - `NOT_FOUND` errors: Create dependencies first, then retry
  - `SYSTEM` errors: Retry with exponential backoff
  - `PERMISSION` errors: Check authorization, don't retry
- **Handle partial success scenarios** where some operations succeed and others fail
- **Log detailed failure information** for debugging and auditing
- **Implement exponential backoff** for polling operations to avoid overwhelming the system