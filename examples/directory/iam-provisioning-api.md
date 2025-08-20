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
  "departments": [
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
  ],
  "totalCount": 25,
  "skip": 0,
  "limit": 50
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | Boolean | Indicates if the request was successful |
| `departments` | Array | List of department objects |
| `totalCount` | Integer | Total number of departments matching the filter criteria |
| `skip` | Integer | Number of records skipped (pagination) |
| `limit` | Integer | Maximum number of records returned |

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