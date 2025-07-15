# Workflow Examples

This guide provides practical examples for common Directory Integration scenarios.

## Table of Contents
- [Basic User Sync](#basic-user-sync)
- [Department Hierarchy Setup](#department-hierarchy-setup)
- [Cascade Operations](#cascade-operations)
- [Large-Scale Synchronization](#large-scale-synchronization)
- [Error Handling](#error-handling)
- [Monitoring & Auditing](#monitoring--auditing)

---

## Basic User Sync

### Simple User Creation
Create a single user with department assignment:

```javascript
async function createUser() {
  // 1. Create checkpoint
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST',
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  // 2. Add user
  await fetch(`${baseUrl}/provisioning/iam/${transactionId}/user`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify([{
      firstName: "Jane",
      lastName: "Smith", 
      email: "jane.smith@company.com",
      phoneNumber: "+1-555-123-4567",
      externalId: "emp-12345",
      active: true,
      userTypes: [{
        departmentExternalId: "dept-engineering",
        userTypeId: "1"
      }]
    }])
  });

  // 3. Commit transaction
  const result = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST',
    headers: defaultHeaders
  });
  
  return await result.json();
}
```

### Bulk User Import
Import multiple users efficiently:

```javascript
async function bulkUserImport(users) {
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST', 
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  // Process in batches to avoid large payloads
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await fetch(`${baseUrl}/provisioning/iam/${transactionId}/user`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(batch)
    });
    
    console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)}`);
  }

  // Commit all operations
  const result = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST',
    headers: defaultHeaders
  });

  return await result.json();
}

// Example usage
const users = [
  {
    firstName: "John", lastName: "Doe", email: "john.doe@company.com",
    externalId: "emp-001", active: true,
    userTypes: [{ departmentExternalId: "dept-hr", userTypeId: "1" }]
  },
  {
    firstName: "Alice", lastName: "Johnson", email: "alice.johnson@company.com", 
    externalId: "emp-002", active: true,
    userTypes: [{ departmentExternalId: "dept-engineering", userTypeId: "2" }]
  }
  // ... more users
];

bulkUserImport(users);
```

---

## Department Hierarchy Setup

### Create Organizational Structure
Build a complete department hierarchy:

```javascript
async function setupOrganization() {
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST',
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  // Define organizational structure
  const departments = [
    // Root level
    {
      externalId: "corp-root",
      departmentName: "Acme Corporation",
      active: true,
      parentExternalId: null
    },
    
    // Division level
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
    
    // Department level
    {
      externalId: "dept-engineering",
      departmentName: "Engineering",
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
      externalId: "dept-enterprise-sales",
      departmentName: "Enterprise Sales",
      active: true,
      parentExternalId: "div-sales"
    },
    
    // Team level
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
  ];

  // Add all departments
  await fetch(`${baseUrl}/provisioning/iam/${transactionId}/department`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(departments)
  });

  // Commit the structure
  const result = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST',
    headers: defaultHeaders
  });

  return await result.json();
}
```

### Multi-Department User Assignment
Assign user to multiple departments with different roles:

```javascript
async function assignUserMultipleDepartments() {
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST',
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  const user = {
    firstName: "Sarah",
    lastName: "Wilson", 
    email: "sarah.wilson@company.com",
    externalId: "emp-sarah-001",
    active: true,
    userTypes: [
      {
        departmentExternalId: "team-frontend",
        userTypeId: "3" // Lead Developer
      },
      {
        departmentExternalId: "dept-product", 
        userTypeId: "4" // Technical Advisor
      },
      {
        departmentExternalId: "div-technology",
        userTypeId: "5" // Architecture Committee Member
      }
    ]
  };

  await fetch(`${baseUrl}/provisioning/iam/${transactionId}/user`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify([user])
  });

  const result = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST', 
    headers: defaultHeaders
  });

  return await result.json();
}
```

---

## Cascade Operations

### Department Reorganization
Reorganize departments with cascade activation:

```javascript
async function reorganizeDepartments() {
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST',
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  const changes = [
    // Deactivate old structure with cascade
    {
      externalId: "dept-legacy-systems",
      departmentName: "Legacy Systems", 
      active: false,
      cascadeToChildren: true // Deactivate all child departments
    },
    
    // Activate new structure with cascade
    {
      externalId: "dept-cloud-platform",
      departmentName: "Cloud Platform",
      active: true,
      parentExternalId: "div-technology",
      cascadeToChildren: true // Ensure all children are active
    },
    
    // Selective activation (don't cascade)
    {
      externalId: "team-migration", 
      departmentName: "Migration Team",
      active: true,
      parentExternalId: "dept-cloud-platform",
      cascadeToChildren: false // Only activate this team
    }
  ];

  await fetch(`${baseUrl}/provisioning/iam/${transactionId}/department`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(changes)
  });

  const result = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST',
    headers: defaultHeaders
  });

  return await result.json();
}
```

### Emergency Deactivation
Quickly deactivate an entire department branch:

```javascript
async function emergencyDeactivation(departmentExternalId) {
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST',
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  // Deactivate department and all children immediately
  const deactivation = {
    externalId: departmentExternalId,
    departmentName: "Department Name", // Must provide name
    active: false,
    cascadeToChildren: true
  };

  await fetch(`${baseUrl}/provisioning/iam/${transactionId}/department`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify([deactivation])
  });

  const result = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST',
    headers: defaultHeaders
  });

  console.log(`Emergency deactivation completed: ${result.successfulOperations} operations`);
  return result;
}
```

---

## Large-Scale Synchronization

### Full Directory Sync
Synchronize an entire Active Directory or LDAP:

```javascript
class DirectorySync {
  constructor(baseUrl, headers) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  async fullSync(directoryData) {
    console.log('Starting full directory synchronization...');
    
    // Create transaction
    const checkpoint = await this.createCheckpoint();
    const { transactionId } = checkpoint;

    try {
      // 1. Sync all departments first (dependency order)
      await this.syncDepartments(transactionId, directoryData.departments);
      
      // 2. Sync all users
      await this.syncUsers(transactionId, directoryData.users);
      
      // 3. Commit everything
      const result = await this.commitTransaction(transactionId);
      
      console.log(`Sync completed: ${result.successfulOperations}/${result.totalOperations} successful`);
      return result;
      
    } catch (error) {
      console.error('Sync failed:', error);
      // Transaction will be abandoned (no rollback needed)
      throw error;
    }
  }

  async syncDepartments(transactionId, departments) {
    console.log(`Syncing ${departments.length} departments...`);
    
    // Sort by hierarchy depth to ensure parents are created first
    const sortedDepts = this.sortDepartmentsByHierarchy(departments);
    
    const batchSize = 50;
    for (let i = 0; i < sortedDepts.length; i += batchSize) {
      const batch = sortedDepts.slice(i, i + batchSize);
      
      await fetch(`${this.baseUrl}/provisioning/iam/department?transactionId=${transactionId}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(batch)
      });
      
      console.log(`Department batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sortedDepts.length/batchSize)} queued`);
    }
  }

  async syncUsers(transactionId, users) {
    console.log(`Syncing ${users.length} users...`);
    
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await fetch(`${this.baseUrl}/provisioning/iam/${transactionId}/user`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(batch)
      });
      
      console.log(`User batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)} queued`);
    }
  }

  sortDepartmentsByHierarchy(departments) {
    // Simple sort by parent dependency
    const sorted = [];
    const remaining = [...departments];
    
    while (remaining.length > 0) {
      const added = [];
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const dept = remaining[i];
        
        // Add if no parent or parent already added
        if (!dept.parentExternalId || 
            sorted.some(d => d.externalId === dept.parentExternalId)) {
          sorted.push(dept);
          added.push(i);
        }
      }
      
      // Remove added departments
      added.forEach(index => remaining.splice(index, 1));
      
      // Prevent infinite loop
      if (added.length === 0 && remaining.length > 0) {
        console.warn('Circular dependency detected in departments');
        sorted.push(...remaining);
        break;
      }
    }
    
    return sorted;
  }

  async createCheckpoint() {
    const response = await fetch(`${this.baseUrl}/provisioning/iam/checkpoint`, {
      method: 'POST',
      headers: this.headers
    });
    return await response.json();
  }

  async commitTransaction(transactionId) {
    const response = await fetch(`${this.baseUrl}/provisioning/iam/${transactionId}/commit`, {
      method: 'POST',
      headers: this.headers
    });
    return await response.json();
  }
}

// Usage
const sync = new DirectorySync(baseUrl, defaultHeaders);
const directoryData = {
  departments: [/* department objects */],
  users: [/* user objects */]
};

sync.fullSync(directoryData);
```

---

## Error Handling

### Robust Transaction Handling
Handle errors and partial failures:

```javascript
async function robustSync(data) {
  let transactionId = null;
  
  try {
    // Create checkpoint
    const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
      method: 'POST',
      headers: defaultHeaders
    });
    
    if (!checkpoint.ok) {
      throw new Error(`Failed to create checkpoint: ${checkpoint.status}`);
    }
    
    const checkpointData = await checkpoint.json();
    transactionId = checkpointData.transactionId;
    console.log(`Created transaction: ${transactionId}`);

    // Queue operations
    await queueOperations(transactionId, data);

    // Commit with retry logic
    const result = await commitWithRetry(transactionId);
    
    if (result.failedOperations > 0) {
      console.warn(`Partial success: ${result.failedOperations} operations failed`);
      console.log('Failed operations:', result.errors);
    }
    
    return result;
    
  } catch (error) {
    console.error('Sync failed:', error);
    
    if (transactionId) {
      // Check transaction status for debugging
      try {
        const status = await getTransactionStatus(transactionId);
        console.log('Transaction status at failure:', status);
      } catch (statusError) {
        console.error('Could not get transaction status:', statusError);
      }
    }
    
    throw error;
  }
}

async function commitWithRetry(transactionId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
        method: 'POST',
        headers: defaultHeaders
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 409) {
        // Conflict - transaction might be processing
        console.log(`Commit attempt ${attempt}: Transaction processing, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      
      throw new Error(`Commit failed: ${response.status}`);
      
    } catch (error) {
      console.error(`Commit attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

async function getTransactionStatus(transactionId) {
  const response = await fetch(`${baseUrl}/provisioning/iam/transaction/${transactionId}/status`, {
    headers: defaultHeaders
  });
  return await response.json();
}
```

### Validation and Cleanup
Validate data before sync and handle cleanup:

```javascript
function validateUser(user) {
  const errors = [];
  
  if (!user.externalId) errors.push('Missing externalId');
  if (!user.email) errors.push('Missing email'); 
  if (!user.firstName || !user.lastName) errors.push('Missing name');
  if (!user.userTypes || user.userTypes.length === 0) errors.push('Missing userTypes');
  
  user.userTypes?.forEach((ut, index) => {
    if (!ut.departmentExternalId) errors.push(`UserType[${index}]: Missing departmentExternalId`);
    if (!ut.userTypeId) errors.push(`UserType[${index}]: Missing userTypeId`);
  });
  
  return errors;
}

function validateDepartment(dept) {
  const errors = [];
  
  if (!dept.externalId) errors.push('Missing externalId');
  if (!dept.departmentName) errors.push('Missing departmentName');
  if (dept.active === undefined) errors.push('Missing active flag');
  
  return errors;
}

async function safeSync(data) {
  // Validate all data first
  const validationErrors = [];
  
  data.departments?.forEach((dept, index) => {
    const errors = validateDepartment(dept);
    if (errors.length > 0) {
      validationErrors.push(`Department[${index}]: ${errors.join(', ')}`);
    }
  });
  
  data.users?.forEach((user, index) => {
    const errors = validateUser(user);
    if (errors.length > 0) {
      validationErrors.push(`User[${index}]: ${errors.join(', ')}`);
    }
  });
  
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);
  }
  
  // Proceed with sync
  return await robustSync(data);
}
```

---

## Monitoring & Auditing

### Transaction Monitoring
Monitor long-running operations:

```javascript
async function monitorTransaction(transactionId) {
  console.log(`Monitoring transaction: ${transactionId}`);
  
  while (true) {
    const status = await getTransactionStatus(transactionId);
    
    console.log(`Status: ${status.transactionStatus}, Progress: ${status.completedOperations}/${status.totalOperations}`);
    
    switch (status.transactionStatus) {
      case 'COMPLETED':
        console.log('✅ Transaction completed successfully');
        return status;
        
      case 'FAILED':
        console.error('❌ Transaction failed');
        return status;
        
      case 'PROCESSING':
        // Continue monitoring
        break;
        
      case 'OPEN':
        console.log('⏳ Transaction still open (not yet committed)');
        break;
        
      default:
        console.log(`Unknown status: ${status.transactionStatus}`);
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Usage with async commit monitoring
async function syncWithMonitoring(data) {
  const checkpoint = await fetch(`${baseUrl}/provisioning/iam/checkpoint`, {
    method: 'POST',
    headers: defaultHeaders
  });
  const { transactionId } = await checkpoint.json();

  // Queue operations
  await queueOperations(transactionId, data);
  
  // Start commit (don't await immediately)
  const commitPromise = fetch(`${baseUrl}/provisioning/iam/${transactionId}/commit`, {
    method: 'POST',
    headers: defaultHeaders
  });
  
  // Monitor in parallel
  const monitorPromise = monitorTransaction(transactionId);
  
  // Wait for both to complete
  const [commitResponse, finalStatus] = await Promise.all([
    commitPromise.then(r => r.json()),
    monitorPromise
  ]);
  
  return { commitResponse, finalStatus };
}
```

### Audit Trail Query
Query historical transactions:

```javascript
async function getAuditTrail(options = {}) {
  const params = new URLSearchParams({
    page: options.page || 0,
    pageSize: options.pageSize || 50
  });
  
  if (options.status) params.append('status', options.status);
  if (options.createdBy) params.append('createdBy', options.createdBy);
  if (options.createdAfter) params.append('createdAfter', options.createdAfter);
  if (options.createdBefore) params.append('createdBefore', options.createdBefore);
  
  const response = await fetch(`${baseUrl}/provisioning/iam/transactions?${params}`, {
    headers: defaultHeaders
  });
  
  return await response.json();
}

// Usage examples
const auditTrail = await getAuditTrail({
  status: 'COMPLETED',
  createdAfter: '2024-01-01T00:00:00',
  pageSize: 100
});

const failedTransactions = await getAuditTrail({
  status: 'FAILED',
  createdAfter: '2024-01-15T00:00:00'
});

const userTransactions = await getAuditTrail({
  createdBy: 'integration-user-123'
});
```

---

**Next**: See the [Node.js Sample Project](./sample-nodejs/) for a complete implementation.