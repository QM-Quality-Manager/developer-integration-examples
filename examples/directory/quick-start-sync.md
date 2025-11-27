# Quick Start: Department & User Sync

This guide walks through a complete sync workflow - creating a department and user in a single transaction.

## Prerequisites

- API credentials (tenant ID and API token)
- User with `PROVISIONING_UPDATE` role

## The Sync Workflow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  1. Checkpoint  │───▶│  2. Add Dept    │───▶│  3. Add User    │───▶│  4. Commit      │
│  Create tx      │    │  Queue op       │    │  Queue op       │    │  Start job      │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                                              │
                                                                              ▼
                                                                     ┌─────────────────┐
                                                                     │  5. Poll Status │
                                                                     │  Until complete │
                                                                     └─────────────────┘
```

## Step-by-Step Example

### 1. Create a Checkpoint (Start Transaction)

```bash
curl -X POST "https://your-instance.qmplus.com/api/provisioning/iam/checkpoint" \
  -H "auth-tenant-id: your-tenant" \
  -H "auth-token: your-token" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "status": true,
  "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "Checkpoint created successfully"
}
```

Save the `transactionId` - you'll use it in all subsequent calls.

### 2. Add Department

```bash
curl -X POST "https://your-instance.qmplus.com/api/provisioning/iam/a1b2c3d4-e5f6-7890-abcd-ef1234567890/department" \
  -H "auth-tenant-id: your-tenant" \
  -H "auth-token: your-token" \
  -H "Content-Type: application/json" \
  -d '[{
    "externalId": "dept-engineering",
    "departmentName": "Engineering",
    "active": true,
    "parentExternalId": null
  }]'
```

### 3. Add User

```bash
curl -X POST "https://your-instance.qmplus.com/api/provisioning/iam/a1b2c3d4-e5f6-7890-abcd-ef1234567890/user" \
  -H "auth-tenant-id: your-tenant" \
  -H "auth-token: your-token" \
  -H "Content-Type: application/json" \
  -d '[{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@company.com",
    "externalId": "user-jane-001",
    "active": true,
    "matchOnField": "EXTERNAL_ID",
    "userTypes": [{
      "departmentExternalId": "dept-engineering",
      "userTypeId": "1"
    }]
  }]'
```

### 4. Commit Transaction

```bash
curl -X POST "https://your-instance.qmplus.com/api/provisioning/iam/a1b2c3d4-e5f6-7890-abcd-ef1234567890/commit" \
  -H "auth-tenant-id: your-tenant" \
  -H "auth-token: your-token" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "status": true,
  "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "jobId": "job-xyz-123",
  "message": "Transaction commit has been scheduled for background processing."
}
```

### 5. Poll for Completion

```bash
curl "https://your-instance.qmplus.com/api/provisioning/iam/transaction/a1b2c3d4-e5f6-7890-abcd-ef1234567890/status" \
  -H "auth-tenant-id: your-tenant" \
  -H "auth-token: your-token"
```

**Response (Success):**
```json
{
  "status": true,
  "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "transactionStatus": "COMPLETED",
  "totalOperations": 2,
  "completedOperations": 2,
  "failedOperations": 0,
  "failures": null
}
```

Poll every 1-2 seconds until `transactionStatus` is `COMPLETED` or `FAILED`.

## Complete JavaScript Example

```javascript
const BASE_URL = 'https://your-instance.qmplus.com/api';
const HEADERS = {
  'auth-tenant-id': 'your-tenant',
  'auth-token': 'your-token',
  'Content-Type': 'application/json'
};

async function syncDepartmentAndUser() {
  // 1. Create checkpoint
  const checkpoint = await fetch(`${BASE_URL}/provisioning/iam/checkpoint`, {
    method: 'POST', headers: HEADERS
  }).then(r => r.json());

  const txId = checkpoint.transactionId;

  // 2. Add department
  await fetch(`${BASE_URL}/provisioning/iam/${txId}/department`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify([{
      externalId: 'dept-engineering',
      departmentName: 'Engineering',
      active: true
    }])
  });

  // 3. Add user
  await fetch(`${BASE_URL}/provisioning/iam/${txId}/user`, {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify([{
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane.smith@company.com',
      externalId: 'user-jane-001',
      active: true,
      matchOnField: 'EXTERNAL_ID',
      userTypes: [{ departmentExternalId: 'dept-engineering', userTypeId: '1' }]
    }])
  });

  // 4. Commit
  await fetch(`${BASE_URL}/provisioning/iam/${txId}/commit`, {
    method: 'POST', headers: HEADERS
  });

  // 5. Poll until complete
  while (true) {
    await new Promise(r => setTimeout(r, 1500));
    const status = await fetch(
      `${BASE_URL}/provisioning/iam/transaction/${txId}/status`,
      { headers: HEADERS }
    ).then(r => r.json());

    if (status.transactionStatus === 'COMPLETED') {
      console.log('Sync complete!');
      return status;
    }
    if (status.transactionStatus === 'FAILED') {
      throw new Error('Sync failed: ' + JSON.stringify(status.failures));
    }
  }
}

syncDepartmentAndUser();
```

## Key Points

| Aspect | Details |
|--------|---------|
| **Order matters** | Departments are processed before users automatically |
| **External IDs** | Use consistent IDs to enable updates on re-sync |
| **matchOnField** | Set to `EXTERNAL_ID`, `EMAIL`, or `USERNAME` for user matching |
| **Async processing** | Commit starts a background job - always poll for status |
| **Batching** | Add multiple departments/users in single requests for efficiency |

---

**Next**: See [API Reference](./api-reference.md) for complete endpoint documentation.
