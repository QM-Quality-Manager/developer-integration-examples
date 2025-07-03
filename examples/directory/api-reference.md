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
POST /provisioning/iam/commit?transactionId={transactionId}
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
- `status` (optional): Filter by status (OPEN, COMMITTED, PROCESSING, COMPLETED, FAILED, ROLLED_BACK)
- `createdBy` (optional): Filter by user ID who created transaction
- `createdAfter` (optional): Filter by creation date (ISO format: yyyy-MM-ddTHH:mm:ss)
- `createdBefore` (optional): Filter by creation date
- `page` (optional, default: 0): Page number
- `pageSize` (optional, default: 50, max: 1000): Items per page

**Example:**
```http
GET /provisioning/iam/transactions?status=COMPLETED&page=0&pageSize=20
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
  "page": 0,
  "pageSize": 20
}
```

---

## Department Management

### Sync Departments (Transaction Mode)
Queues department operations within a transaction.

```http
POST /provisioning/iam/department?transactionId={transactionId}
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

### Sync Departments (Direct Mode)
Synchronizes departments immediately without transaction.

```http
POST /provisioning/iam/department
```

**Request Body:** Same as transaction mode

**Response:**
```json
{
  "status": true,
  "processed": 2,
  "errors": [],
  "results": [
    {
      "id": "507f1f77bcf86cd799439011",
      "directoryUniqueIdentifier": "dept-engineering",
      "parentDepartmentId": "507f1f77bcf86cd799439012",
      "parentDirectoryUniqueIdentifier": "dept-technology"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "directoryUniqueIdentifier": "dept-frontend",
      "parentDepartmentId": "507f1f77bcf86cd799439011",
      "parentDirectoryUniqueIdentifier": "dept-engineering"
    }
  ]
}
```

### Get Departments
Retrieves all departments with optional filtering.

```http
GET /provisioning/iam/department?active=true
```

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "status": true,
  "entries": [
    {
      "id": "507f1f77bcf86cd799439011",
      "directoryUniqueIdentifier": "dept-engineering",
      "parentDepartmentId": "507f1f77bcf86cd799439012",
      "parentDirectoryUniqueIdentifier": "dept-technology"
    }
  ]
}
```

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
Retrieves all users with optional filtering.

```http
GET /provisioning/iam/user?active=true
```

**Query Parameters:**
- `active` (optional): Filter by active status (true/false)

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
  ]
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

### Validation Error
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
          "message": "Parent department not found: dept-nonexistent",
          "key": "identum.department.parent.notfound"
        }
      ]
    }
  ]
}
```

### Authentication Error
```http
HTTP 401 Unauthorized
```
```json
{
  "status": false,
  "message": "Authentication failed",
  "error": "Invalid or missing auth-token"
}
```

### Authorization Error
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

### Transaction Error
```json
{
  "status": false,
  "message": "Transaction not found",
  "errors": [
    {
      "code": "VALIDATION",
      "paths": ["transactionId"],
      "messages": [
        {
          "locale": "US",
          "message": "Transaction with ID 550e8400-e29b-41d4-a716-446655440000 not found"
        }
      ]
    }
  ]
}
```

---

## Rate Limits

- **Transaction Creation**: 10 per minute per user
- **Operations per Transaction**: 10,000 maximum
- **List Transactions**: 100 requests per minute
- **Sync Operations**: 50 requests per minute

## Best Practices

1. **Always use transactions** for multi-operation syncs
2. **Process departments before users** (dependency order)
3. **Use external IDs consistently** across systems
4. **Implement retry logic** for failed operations
5. **Monitor transaction status** for large operations
6. **Use pagination** when listing transactions

---

**Next**: See [Authentication Guide](./authentication.md) for security setup.