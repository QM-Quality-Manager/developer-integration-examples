# QMPlus Directory Integration (Identum) API

This documentation describes the QMPlus Directory Integration API, also known as the Identum integration. This API allows external systems to synchronize users and departments with QMPlus in a transactional, reliable manner.

## Overview

The Identum integration provides a REST API for:
- **User Management**: Create, update, and manage users from external directory systems
- **Department Management**: Synchronize department hierarchies with cascade operations
- **Transaction Support**: Reliable, atomic operations using checkpoint/commit pattern
- **Audit Trail**: Complete transaction history and monitoring capabilities

## Key Features

### 🔄 Transaction-Based Operations
- **Checkpoint/Commit Pattern**: Queue operations and execute atomically
- **Rollback Support**: Partial success handling and error recovery
- **Operation Ordering**: Automatic dependency resolution (departments before users)

### 🏢 Department Hierarchy Management
- **Unlimited Depth**: Support for complex organizational structures
- **Cascade Operations**: Activate/deactivate entire branches
- **Parent-Child Relationships**: Automatic relationship management

### 👥 User Synchronization
- **Multi-Department Users**: Users can belong to multiple departments
- **User Type Management**: Role and permission synchronization
- **External ID Mapping**: Maintain references to external systems

### 📊 Monitoring & Auditing
- **Transaction History**: Complete audit trail of all operations
- **Status Tracking**: Real-time monitoring of operation progress
- **Error Reporting**: Detailed error information and troubleshooting

## Quick Start

1. **Authentication**: Obtain tenant credentials and API token
2. **Authorization**: Ensure user has required roles (`PROVISIONING_UPDATE`, `PROVISIONING_SEARCH`)
3. **Basic Workflow**:
   ```
   POST /api/provisioning/iam/checkpoint    # Create transaction
   POST /api/provisioning/iam/department    # Add departments
   POST /api/provisioning/iam/user         # Add users
   POST /api/provisioning/iam/commit       # Execute atomically
   ```

## Documentation Structure

- **[API Reference](./api-reference.md)** - Complete endpoint documentation
- **[Authentication Guide](./authentication.md)** - Security and access control
- **[Workflow Examples](./examples.md)** - Common integration patterns
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## Sample Projects

- **[Node.js Integration Example](./sample-nodejs/)** - Complete working example
- **[Python Client](./sample-python/)** - Python implementation
- **[.NET Integration](./sample-dotnet/)** - C# example

## Base URL

```
https://your-qmplus-instance.com/api
```

## Required Headers

All requests must include authentication headers:

```http
auth-tenant-id: your-tenant-id
auth-token: your-api-token
Content-Type: application/json
```

## Support

For technical support and questions:
- **Documentation**: See individual guide sections
- **Sample Code**: Check the sample projects
- **Issues**: Contact your QMPlus administrator

---

**Next**: Start with the [Authentication Guide](./authentication.md) to set up API access.