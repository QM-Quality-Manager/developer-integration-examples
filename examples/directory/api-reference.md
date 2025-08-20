# API Reference - Directory Integration

Complete reference for all Directory Integration (Identum) API endpoints.

## Base URL
```
https://your-qmplus-instance.com/api
```

## Authentication Headers
All requests require these headers:
```http
auth-tenant-id: your-tenant-id
auth-token: your-api-token
Content-Type: application/json
```

## Required Roles
- **PROVISIONING_UPDATE**: Create, update operations and transactions
- **PROVISIONING_SEARCH**: Read operations and status checking

---

## Transaction Management

### Create Checkpoint
Creates a new transaction for queueing operations.

```http
POST /provisioning/iam/checkpoint
```

**Response:**
```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Checkpoint created successfully"
}
```

### Commit Transaction
Executes all queued operations atomically.

```http
POST /provisioning/iam/{transactionId}/commit
```

**Response:**
```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "totalOperations": 25,
  "successfulOperations": 23,
  "failedOperations": 2,
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["operation.15"],
      "messages": [
        {
          "locale": "US",
          "message": "Department not found: dept-xyz",
          "key": "identum.commit.department.error"
        }
      ]
    }
  ]
}
```

### Get Transaction Status
Retrieves current status of a transaction.

```http
GET /provisioning/iam/transaction/{transactionId}/status
```

**Response:**
```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "transactionStatus": "COMPLETED",
  "totalOperations": 25,
  "completedOperations": 23,
  "failedOperations": 2,
  "createdOn": "2024-01-15T10:30:00",
  "committedOn": "2024-01-15T10:31:00",
  "completedOn": "2024-01-15T10:31:30"
}
```

### List Transactions
Retrieves transaction history with filtering and pagination.

```http
GET /provisioning/iam/transactions
```

**Query Parameters:**
- `status` (optional): Filter by status (OPEN, PROCESSING, COMPLETED, FAILED)
- `createdBy` (optional): Filter by user ID who created transaction
- `createdAfter` (optional): Filter by creation date (ISO format: yyyy-MM-ddTHH:mm:ss)
- `createdBefore` (optional): Filter by creation date
- `skip` (optional, default: 0): Number of records to skip for pagination
- `limit` (optional, default: 50, max: 1000): Maximum number of records to return

**Example:**
```http
GET /provisioning/iam/transactions?status=COMPLETED&skip=0&limit=20
```

**Response:**
```json
{
  "status": true,
  "transactions": [
    {
      "id": "507f1f77bcf86cd799439011",
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "COMPLETED",
      "operationCount": 25,
      "completedCount": 23,
      "failedCount": 2,
      "createdBy": "user123",
      "createdOn": "2024-01-15T10:30:00",
      "committedOn": "2024-01-15T10:31:00",
      "completedOn": "2024-01-15T10:31:30",
      "updatedBy": "user123",
      "updatedOn": "2024-01-15T10:31:30"
    }
  ],
  "totalCount": 157,
  "skip": 0,
  "limit": 20
}
```

---

## Department Management

### Sync Departments
Queues department operations within a transaction.

```http
POST /provisioning/iam/{transactionId}/department
```

**Request Body:**
```json
[
  {
    "externalId": "dept-engineering",
    "departmentName": "Engineering Department",
    "active": true,
    "parentExternalId": "dept-technology",
    "cascadeToChildren": false
  },
  {
    "externalId": "dept-frontend",
    "departmentName": "Frontend Team",
    "active": true,
    "parentExternalId": "dept-engineering",
    "cascadeToChildren": true
  }
]
```

**Field Descriptions:**
- `externalId`: Unique identifier from external system
- `departmentName`: Display name for the department
- `active`: Whether department is active (true/false)
- `parentExternalId`: External ID of parent department (null for root)
- `cascadeToChildren`: Whether activation/deactivation should cascade to child departments

**Response:**
```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "operationsQueued": 2,
  "operations": [
    {
      "status": true,
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": 1,
      "message": "Department operation queued"
    },
    {
      "status": true,
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": 2,
      "message": "Department operation queued"
    }
  ]
}
```

**Note:** All department operations require a transaction. There is no direct synchronization mode for departments.

### Get Departments
Retrieves all departments with optional filtering and pagination.

```http
GET /provisioning/iam/department?active=true&createdOn=LAST_30_DAYS&updatedOn=LAST_7_DAYS&skip=0&limit=50
```

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)
- `createdOn` (optional): Filter by creation date using PipelineDateRange preset (see presets below)
- `updatedOn` (optional): Filter by update date using PipelineDateRange preset (see presets below)
- `skip` (optional, default: 0): Number of records to skip for pagination
- `limit` (optional, default: 50, max: 1000): Maximum number of records to return

**PipelineDateRange Presets:**
- `TODAY`, `YESTERDAY`
- `LAST_7_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`
- `THIS_WEEK`, `LAST_WEEK`
- `THIS_MONTH`, `LAST_MONTH`
- `THIS_QUARTER`, `LAST_QUARTER`
- `THIS_YEAR`, `LAST_YEAR`
- `CUSTOM` (requires additional configuration)

**Example Queries:**

Basic query - all departments:
```http
GET /provisioning/iam/department
```

Filter by active departments with pagination:
```http
GET /provisioning/iam/department?active=true&skip=0&limit=100
```

Filter by recent changes:
```http
GET /provisioning/iam/department?updatedOn=LAST_7_DAYS
```

Combined filters:
```http
GET /provisioning/iam/department?active=true&createdOn=LAST_30_DAYS&updatedOn=LAST_7_DAYS&limit=50
```

**Response:**
```json
{
  "status": true,
  "departments": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Engineering Department",
      "externalId": "dept-engineering",
      "parentDepartmentId": "507f1f77bcf86cd799439012",
      "parentExternalId": "dept-technology",
      "createdOn": "2024-01-15T10:30:00Z",
      "updatedOn": "2024-02-01T14:45:00Z",
      "active": true
    }
  ],
  "totalCount": 25,
  "skip": 0,
  "limit": 50
}
```

**Response Fields:**
- `status`: Boolean indicating request success
- `departments`: Array of department objects
- `totalCount`: Total number of departments matching filter criteria
- `skip`: Number of records skipped (pagination)
- `limit`: Maximum number of records returned

**Department Object Fields:**
- `id`: Internal department ID
- `name`: Department display name
- `externalId`: External directory unique identifier (same as directoryUniqueIdentifier)
- `parentDepartmentId`: Internal parent department ID
- `parentExternalId`: External parent directory unique identifier
- `createdOn`: Department creation timestamp
- `updatedOn`: Last modification timestamp
- `active`: Department active status

---

## User Management

### Sync Users
Queues user operations within a transaction.

```http
POST /provisioning/iam/{transactionId}/user
```

**Request Body:**
```json
[
  {
    "firstName": "John",
    "middleName": "Michael",
    "lastName": "Smith",
    "email": "john.smith@company.com",
    "phoneNumber": "+1-555-123-4567",
    "externalId": "user-12345",
    "active": true,
    "userTypes": [
      {
        "departmentExternalId": "dept-engineering",
        "userTypeId": "1"
      },
      {
        "departmentExternalId": "dept-frontend", 
        "userTypeId": "2"
      }
    ]
  }
]
```

**Field Descriptions:**
- `firstName`, `middleName`, `lastName`: User name components
- `email`: User's email address (used as username)
- `phoneNumber`: Contact number
- `externalId`: Unique identifier from external system
- `active`: Whether user is active
- `userTypes`: Array of department/role assignments
  - `departmentExternalId`: External ID of department
  - `userTypeId`: Internal ID of user type/role

**Response:**
```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "operationsQueued": 1,
  "operations": [
    {
      "status": true,
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": 3,
      "message": "User operation queued"
    }
  ]
}
```

### Get Users
Retrieves all users with optional filtering and pagination.

```http
GET /provisioning/iam/user?active=true&skip=0&limit=50
```

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)
- `skip` (optional): Number of records to skip for pagination
- `limit` (optional, max: 1000): Maximum number of records to return

**Response:**
```json
{
  "status": true,
  "entries": [
    {
      "id": "507f1f77bcf86cd799439014",
      "firstName": "John",
      "middleName": "Michael", 
      "lastName": "Smith",
      "email": "john.smith@company.com",
      "phoneNumber": "+1-555-123-4567",
      "directoryUniqueIdentifier": "user-12345",
      "userTypes": [
        {
          "departmentId": "507f1f77bcf86cd799439011",
          "departmentName": "Engineering Department",
          "userTypeId": "1",
          "userTypeName": "Developer"
        },
        {
          "departmentId": "507f1f77bcf86cd799439013",
          "departmentName": "Frontend Team",
          "userTypeId": "2", 
          "userTypeName": "Senior Developer"
        }
      ]
    }
  ],
  "total": 150
}
```

---

## Cascade Operations

### Department Activation Cascade
Activate a department and all its children:

```json
{
  "externalId": "dept-technology",
  "departmentName": "Technology Division",
  "active": true,
  "cascadeToChildren": true
}
```

This will:
1. Activate "Technology Division"
2. Recursively activate all child departments
3. Apply to unlimited depth of hierarchy

### Department Deactivation Cascade
Deactivate a department branch:

```json
{
  "externalId": "dept-legacy",
  "departmentName": "Legacy Systems",
  "active": false,
  "cascadeToChildren": true
}
```

### Non-Cascade Operation
Update only the target department:

```json
{
  "externalId": "dept-hr",
  "departmentName": "Human Resources",
  "active": false,
  "cascadeToChildren": false
}
```

---

## Error Responses

All errors follow a consistent structure. The API returns appropriate HTTP status codes along with structured error responses.

### Error Response Structure

```json
{
  "status": false,
  "message": "Description of the error",
  "errors": [
    {
      "code": "ERROR_TYPE",
      "paths": ["field.path"],
      "messages": [
        {
          "locale": "US",
          "message": "Human-readable error message",
          "key": "error.code.key"
        }
      ]
    }
  ]
}
```

### HTTP Status Codes

- **400 Bad Request** - Validation errors, malformed requests
- **401 Unauthorized** - Missing or invalid authentication
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server errors

### Common Error Codes

#### Transaction Errors

**Transaction Not Found**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["transactionId"],
      "messages": [
        {
          "locale": "US",
          "message": "Transaction not found",
          "key": "iam.transaction.not_found"
        }
      ]
    }
  ]
}
```

**Transaction Not Open**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["transactionId"],
      "messages": [
        {
          "locale": "US",
          "message": "Transaction is not in open status",
          "key": "iam.transaction.not_open"
        }
      ]
    }
  ]
}
```

**Invalid Transaction Status**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["status"],
      "messages": [
        {
          "locale": "US",
          "message": "Invalid transaction status. Valid values are: OPEN, PROCESSING, COMPLETED, FAILED",
          "key": "iam.transaction.invalid_status"
        }
      ]
    }
  ]
}
```

#### Pagination Errors

**Invalid Skip Parameter**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["skip"],
      "messages": [
        {
          "locale": "US",
          "message": "Skip must be 0 or greater",
          "key": "iam.transaction.invalid_skip"
        }
      ]
    }
  ]
}
```

**Invalid Limit Parameter**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["limit"],
      "messages": [
        {
          "locale": "US",
          "message": "Limit must be between 1 and 1000",
          "key": "iam.transaction.invalid_limit"
        }
      ]
    }
  ]
}
```

#### Department Errors

**Department Not Found**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["departments.0.parentExternalId"],
      "messages": [
        {
          "locale": "US",
          "message": "Department not found",
          "key": "iam.provisioning.department.notFound"
        }
      ]
    }
  ]
}
```

#### User Type Errors

**User Type Not Found**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["users.0.userTypes.0.userTypeId"],
      "messages": [
        {
          "locale": "US",
          "message": "User type not found",
          "key": "iam.provisioning.userType.notFound"
        }
      ]
    }
  ]
}
```

#### Date Format Errors

**Invalid Date Format**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["createdAfter"],
      "messages": [
        {
          "locale": "US",
          "message": "Invalid date format. Expected: yyyy-MM-ddTHH:mm:ss",
          "key": "iam.transaction.invalid_date"
        }
      ]
    }
  ]
}
```

**Invalid Date Range Preset**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["createdOn"],
      "messages": [
        {
          "locale": "US",
          "message": "Invalid date range preset. Valid values are: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS, THIS_WEEK, LAST_WEEK, THIS_MONTH, LAST_MONTH, THIS_QUARTER, LAST_QUARTER, THIS_YEAR, LAST_YEAR, CUSTOM",
          "key": "iam.department.invalid_date_range"
        }
      ]
    }
  ]
}
```

**Invalid Date Range JSON Format**
```json
{
  "status": false,
  "message": "Validation failed",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["updatedOn"],
      "messages": [
        {
          "locale": "US",
          "message": "Invalid date range format. Expected PipelineDateRange JSON object or preset string.",
          "key": "iam.department.invalid_date_format"
        }
      ]
    }
  ]
}
```

### Authentication Errors

**Missing Authentication**
```http
HTTP 401 Unauthorized
```
```json
{
  "status": false,
  "message": "Authentication failed",
  "error": "Missing required authentication headers: auth-tenant-id, auth-token"
}
```

**Invalid Authentication**
```http
HTTP 401 Unauthorized
```
```json
{
  "status": false,
  "message": "Authentication failed",
  "error": "Invalid or expired auth-token"
}
```

### Authorization Errors

**Insufficient Permissions**
```http
HTTP 403 Forbidden
```
```json
{
  "status": false,
  "message": "Access denied",
  "error": "Missing required role: PROVISIONING_UPDATE"
}
```

**Read-Only Access**
```http
HTTP 403 Forbidden
```
```json
{
  "status": false,
  "message": "Access denied",
  "error": "Missing required role: PROVISIONING_SEARCH"
}
```

### Commit Transaction Errors

During transaction commit, multiple operations may fail. The response includes details for each failure:

```json
{
  "status": true,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "totalOperations": 25,
  "successfulOperations": 23,
  "failedOperations": 2,
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["operation.15"],
      "messages": [
        {
          "locale": "US",
          "message": "Department not found: dept-xyz",
          "key": "iam.provisioning.department.notFound"
        }
      ]
    },
    {
      "code": "VALIDATION", 
      "paths": ["operation.18"],
      "messages": [
        {
          "locale": "US",
          "message": "User type not found",
          "key": "iam.provisioning.userType.notFound"
        }
      ]
    }
  ]
}
```

### Error Code Reference

| Error Key | Description | HTTP Status | Common Causes |
|-----------|-------------|-------------|---------------|
| `iam.transaction.not_found` | Transaction not found | 400 | Invalid transaction ID |
| `iam.transaction.not_open` | Transaction not in open status | 400 | Attempting to modify committed transaction |
| `iam.transaction.invalid_status` | Invalid status filter value | 400 | Invalid status in query parameter |
| `iam.transaction.invalid_date` | Invalid date format | 400 | Wrong date format in query |
| `iam.transaction.invalid_limit` | Invalid limit parameter | 400 | Limit out of range (1-1000) |
| `iam.transaction.invalid_skip` | Invalid skip parameter | 400 | Negative skip value |
| `iam.department.invalid_date_range` | Invalid date range preset | 400 | Invalid preset value in createdOn/updatedOn |
| `iam.department.invalid_date_format` | Invalid date range JSON format | 400 | Malformed PipelineDateRange JSON |
| `iam.provisioning.department.notFound` | Department not found | 400 | Invalid department external ID |
| `iam.provisioning.userType.notFound` | User type not found | 400 | Invalid user type ID |

---

## Rate Limits

- **Transaction Creation**: 10 per minute per user
- **Operations per Transaction**: 10,000 maximum
- **List Transactions**: 100 requests per minute
- **Sync Operations**: 50 requests per minute

## Transaction Workflow

### Complete Sync Example
Here's a complete workflow showing all required API calls:

```javascript
// 1. Create a transaction
const checkpoint = await fetch('/api/provisioning/iam/checkpoint', {
  method: 'POST',
  headers: authHeaders
});
const { transactionId } = await checkpoint.json();

// 2. Queue department operations (note: transactionId in path)
await fetch(`/api/provisioning/iam/${transactionId}/department`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify([
    {
      externalId: "dept-engineering",
      departmentName: "Engineering Department", 
      active: true,
      parentExternalId: null,
      cascadeToChildren: false
    }
  ])
});

// 3. Queue user operations (note: transactionId in path)
await fetch(`/api/provisioning/iam/${transactionId}/user`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify([
    {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@company.com",
      phoneNumber: "+1-555-123-4567",
      externalId: "user-001",
      active: true,
      userTypes: [{
        departmentExternalId: "dept-engineering",
        userTypeId: "1"
      }]
    }
  ])
});

// 4. Commit all operations atomically
const result = await fetch(`/api/provisioning/iam/${transactionId}/commit`, {
  method: 'POST',
  headers: authHeaders
});
const commitResult = await result.json();

console.log(`Success: ${commitResult.successfulOperations}/${commitResult.totalOperations}`);
```

### Multi-Department User Example
Users can belong to multiple departments with different roles:

```json
{
  "firstName": "Jane",
  "lastName": "Smith", 
  "email": "jane.smith@company.com",
  "phoneNumber": "9876543210",
  "externalId": "ext456",
  "active": true,
  "userTypes": [
    {
      "departmentExternalId": "dept-engineering",
      "userTypeId": "1"
    },
    {
      "departmentExternalId": "dept-frontend",
      "userTypeId": "2" 
    }
  ]
}
```

### Department Hierarchy Example
Creating a department hierarchy with parent-child relationships:

```json
[
  {
    "externalId": "dept-technology",
    "departmentName": "Technology Division",
    "active": true,
    "parentExternalId": null,
    "cascadeToChildren": true
  },
  {
    "externalId": "dept-engineering", 
    "departmentName": "Engineering Department",
    "active": true,
    "parentExternalId": "dept-technology",
    "cascadeToChildren": false
  },
  {
    "externalId": "dept-frontend",
    "departmentName": "Frontend Team", 
    "active": true,
    "parentExternalId": "dept-engineering",
    "cascadeToChildren": true
  }
]
```

### Pagination Example
Working with large datasets using skip/limit:

```javascript
// Get first 50 transactions
const page1 = await fetch('/api/provisioning/iam/transactions?skip=0&limit=50');
const firstPage = await page1.json();

// Get next 50 transactions 
const page2 = await fetch(`/api/provisioning/iam/transactions?skip=50&limit=50`);
const secondPage = await page2.json();

console.log(`Total: ${firstPage.totalCount}, Page 1: ${firstPage.transactions.length} items`);
```

### Filtering Transactions Example
Filter transactions by status and date:

```javascript
// Get completed transactions from last week
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const dateFilter = lastWeek.toISOString().slice(0, 19); // yyyy-MM-ddTHH:mm:ss

const response = await fetch(
  `/api/provisioning/iam/transactions?status=COMPLETED&createdAfter=${dateFilter}&limit=100`
);
const completedTransactions = await response.json();
```

### Department Filtering Examples
Enhanced department filtering for directory synchronization:

```javascript
// Initial sync - get all active departments
const allActiveDepts = await fetch('/api/provisioning/iam/department?active=true');
const activeDepartments = await allActiveDepts.json();

// Incremental sync - get departments updated in last 7 days
const recentChanges = await fetch('/api/provisioning/iam/department?updatedOn=LAST_7_DAYS');
const changedDepartments = await recentChanges.json();

// Combined filtering - active departments created this month
const newActiveDepts = await fetch('/api/provisioning/iam/department?active=true&createdOn=THIS_MONTH&limit=100');
const newDepartments = await newActiveDepts.json();

// Pagination through large datasets
let skip = 0;
const limit = 50;
let hasMore = true;

while (hasMore) {
  const response = await fetch(`/api/provisioning/iam/department?skip=${skip}&limit=${limit}`);
  const data = await response.json();
  
  // Process data.departments
  console.log(`Processing ${data.departments.length} departments (${skip}-${skip + data.departments.length} of ${data.totalCount})`);
  
  skip += limit;
  hasMore = skip < data.totalCount;
}
```

### Directory Sync Integration Pattern
Complete workflow for directory service integration:

```javascript
class DirectorySync {
  async performIncrementalSync() {
    try {
      // 1. Get departments changed since last sync
      const changedDepts = await this.getChangedDepartments();
      
      // 2. Create transaction for any updates needed
      if (changedDepts.departments.length > 0) {
        const transaction = await this.createTransaction();
        
        // 3. Queue department updates
        await this.queueDepartmentUpdates(transaction.transactionId, changedDepts.departments);
        
        // 4. Commit changes
        const result = await this.commitTransaction(transaction.transactionId);
        
        console.log(`Sync completed: ${result.successfulOperations}/${result.totalOperations} successful`);
      }
      
      // 5. Update last sync timestamp
      this.updateLastSyncTime();
      
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }
  
  async getChangedDepartments() {
    const lastSync = this.getLastSyncTime();
    const preset = this.getDateRangePreset(lastSync);
    
    return fetch(`/api/provisioning/iam/department?updatedOn=${preset}&active=true`);
  }
  
  getDateRangePreset(lastSync) {
    const daysSince = Math.floor((Date.now() - lastSync) / (24 * 60 * 60 * 1000));
    
    if (daysSince <= 1) return 'TODAY';
    if (daysSince <= 7) return 'LAST_7_DAYS';
    if (daysSince <= 30) return 'LAST_30_DAYS';
    return 'LAST_90_DAYS';
  }
}
```

### Transaction States
1. **OPEN** - Transaction created, accepting operations
2. **COMMITTED** - All operations queued, ready for processing
3. **PROCESSING** - Operations being executed
4. **COMPLETED** - All operations finished (may have failures)
5. **FAILED** - Transaction could not be processed

## Best Practices

1. **Always use transactions** - All department operations require transactions
2. **Process departments before users** (dependency order)
3. **Use external IDs consistently** across systems
4. **Implement retry logic** for failed operations
5. **Monitor transaction status** for large operations
6. **Use pagination** when listing transactions
7. **Handle partial failures** - Some operations may succeed while others fail

---

**Next**: See [Authentication Guide](./authentication.md) for security setup.