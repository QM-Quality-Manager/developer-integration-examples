# Authentication & Authorization Guide

This guide covers security requirements for the Directory Integration API.

## Overview

QMPlus Directory Integration uses token-based authentication with role-based authorization. All API requests require:

1. **Tenant Identification**: Your organization's unique tenant ID
2. **Authentication Token**: Valid API token for the user
3. **Required Roles**: Appropriate permissions for the operation

## Required Headers

Every API request must include these headers:

```http
auth-tenant-id: your-tenant-id
auth-token: your-api-token
Content-Type: application/json
```

## Obtaining Credentials

### 1. Tenant ID
Your tenant ID is provided by your QMPlus administrator and typically follows the pattern:
- Production: `company-prod`
- Staging: `company-staging`
- Development: `company-dev`

### 2. API Token
API tokens are generated through the QMPlus administration interface:

1. **Login** to QMPlus as an administrator
2. **Navigate** to Admin → User Management
3. **Select** the user account for API access
4. **Generate** a new API token
5. **Copy** the token securely (it won't be shown again)

⚠️ **Security Note**: API tokens should be treated as passwords and stored securely.

## Required Roles

Users must have specific roles to access different operations:

### PROVISIONING_UPDATE
Required for all write operations:
- ✅ Create checkpoints
- ✅ Sync departments 
- ✅ Sync users
- ✅ Commit transactions

### PROVISIONING_SEARCH  
Required for all read operations:
- ✅ Get departments
- ✅ Get users
- ✅ Get transaction status
- ✅ List transactions

## Role Assignment

Roles are assigned by QMPlus administrators:

1. **Navigate** to Admin → User Management
2. **Edit** the user account
3. **Add Roles** in the permissions section:
   - Select "PROVISIONING_UPDATE" for write access
   - Select "PROVISIONING_SEARCH" for read access
4. **Save** the user configuration

## Authentication Examples

### cURL Example
```bash
curl -X POST \
  https://your-qmplus-instance.com/api/provisioning/directory/checkpoint \
  -H "auth-tenant-id: your-tenant-id" \
  -H "auth-token: your-api-token" \
  -H "Content-Type: application/json"
```

### JavaScript/Node.js Example
```javascript
const headers = {
  'auth-tenant-id': 'your-tenant-id',
  'auth-token': 'your-api-token',
  'Content-Type': 'application/json'
};

const response = await fetch(
  'https://your-qmplus-instance.com/api/provisioning/directory/checkpoint',
  {
    method: 'POST',
    headers: headers
  }
);
```

### Python Example
```python
import requests

headers = {
    'auth-tenant-id': 'your-tenant-id',
    'auth-token': 'your-api-token',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://your-qmplus-instance.com/api/provisioning/directory/checkpoint',
    headers=headers
)
```

## Error Responses

### Missing Authentication Headers
```http
HTTP 401 Unauthorized
```
```json
{
  "status": false,
  "message": "Authentication failed",
  "error": "Missing auth-tenant-id header"
}
```

### Invalid Token
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

### Insufficient Permissions
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

### Invalid Tenant
```http
HTTP 401 Unauthorized
```
```json
{
  "status": false,
  "message": "Authentication failed",
  "error": "Invalid tenant ID"
}
```

## Security Best Practices

### Token Management
- **Store securely**: Use environment variables or secure vaults
- **Rotate regularly**: Generate new tokens periodically
- **Monitor usage**: Track API calls for suspicious activity
- **Revoke unused tokens**: Clean up old or unused tokens

### Network Security
- **Use HTTPS**: Always use encrypted connections
- **IP Whitelisting**: Restrict access to known IP ranges
- **Rate Limiting**: Implement client-side rate limiting
- **Firewall Rules**: Secure your integration servers

### Code Security
```javascript
// ✅ Good: Use environment variables
const API_TOKEN = process.env.QMPLUS_API_TOKEN;
const TENANT_ID = process.env.QMPLUS_TENANT_ID;

// ❌ Bad: Hard-coded credentials
const API_TOKEN = "abc123..."; // Never do this!
```

## Environment Configuration

### Production Environment
```bash
# Environment Variables
QMPLUS_BASE_URL=https://your-company.qmplus.com/api
QMPLUS_TENANT_ID=company-prod
QMPLUS_API_TOKEN=your-production-token

# SSL/TLS Settings
SSL_VERIFY=true
TIMEOUT=30000
```

### Development Environment
```bash
# Environment Variables  
QMPLUS_BASE_URL=https://staging.qmplus.com/api
QMPLUS_TENANT_ID=company-dev
QMPLUS_API_TOKEN=your-development-token

# Development Settings
SSL_VERIFY=true
TIMEOUT=10000
DEBUG=true
```

## Testing Authentication

### Health Check Script
```bash
#!/bin/bash

# Test authentication
curl -s -w "HTTP Status: %{http_code}\n" \
  -H "auth-tenant-id: $QMPLUS_TENANT_ID" \
  -H "auth-token: $QMPLUS_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$QMPLUS_BASE_URL/provisioning/directory/transactions?pageSize=1"
```

### Node.js Validation
```javascript
async function validateAuth() {
  try {
    const response = await fetch(
      `${process.env.QMPLUS_BASE_URL}/provisioning/directory/transactions?pageSize=1`,
      {
        headers: {
          'auth-tenant-id': process.env.QMPLUS_TENANT_ID,
          'auth-token': process.env.QMPLUS_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.error(`❌ Authentication failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}
```

## Troubleshooting

### Common Issues

**Problem**: "Invalid tenant ID"
- **Solution**: Verify tenant ID with your administrator
- **Check**: Ensure no extra spaces or characters

**Problem**: "Invalid or expired auth-token"  
- **Solution**: Generate a new API token
- **Check**: Verify token hasn't been revoked

**Problem**: "Missing required role"
- **Solution**: Contact administrator to assign roles
- **Check**: Verify user has PROVISIONING_UPDATE and/or PROVISIONING_SEARCH

**Problem**: Network timeout
- **Solution**: Check network connectivity and firewall settings
- **Check**: Verify QMPlus instance URL is correct

### Debug Headers
Add these headers for debugging (development only):
```http
X-Debug-Auth: true
X-Trace-Request: true
```

---

**Next**: See [Workflow Examples](./examples.md) for integration patterns.