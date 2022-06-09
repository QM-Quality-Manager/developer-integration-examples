# Retrieve Form Entries and needed data

> REST API documentation can be found at `https://qmplus.app/documentation`

This example deals with how to fetch messages using the REST API and the associated information needed.

## Getting your API key and Tenant Id
![Example API Key](./img/image_1.png)
Go to the list API tokens and select the correct API key or generate a new one.

The key is tied to the current logged in user, department and user type this controls the 
deparment and access restrictions of the token.

> `Setting up REST calls`
> 
> All requests need the token and tenantId set on the `HTTP header` for the call to work.
>
>| Field | Description |
>| --- | --- |
>| `auth-token` | The auth token from the token page above. |
>| `auth-tenant-id` | The tenant id shown in the token page above. |

## Recommended way to retrieve messages and associated data
We recommend to first get the messages you want from the backend and then access the API to retrieve the needed entities to unpack the messages.

> The reason for this is that for certain types of entities fetching them could take considerable time due to 
> amount of data. Examples of this could be retieve `formVersions` as the return objects can be of significant size.

## Retrieving Messages
Lets focus on how to retrieve messages first. The mechanism to retrive messages is based on the `Expression engine` of the platform that lets you query and transform the data.

Lets look at a query to fetch the latest 30 days of message and then with a custom search range.

> `https://qmplus.app/api/expression/execute?departmentId={departmentId}`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/expressions/executeExpression)

The expression API lets use execute a `pipeline` of operations. The HTTP method is `POST`. Below is an
example that shows how to peform a `lAST_30_DAYS` query against `Messages` using a preset.

```js
.post(`/expression/execute?departmentId=${departmentId}`, {
  pipeline: [{
    $select: {
      caseTypeId: { $eq: "1" },
      visibility: visibility,
      registeredOnDate: {
        preset: "LAST_30_DAYS"
      }
    }
  }]
});
```

> **Available presets**
>
> `CUSTOM, THIS_YEAR, TODAY, YESTERDAY, LAST_7_DAYS, LAST_WEEK, LAST_MONTH, LAST_3_MONTHS, LAST_6_MONTHS, LAST_12_MONTHS, LAST_30_DAYS, LAST_90_DAYS, LAST_180_DAYS, LAST_360_DAYS, THIS_WEEK, THIS_MONTH, THIS_HALF_YEAR, THIS_QUARTER, ALL`
>
> **Available caseTypeIds**
>
> | CaseTypeId | Description |
> | --- | --- |
> | `1` | Messages |
> | `2` | Actions |
> | `4` | Audits |
> | `4` | Audits |
> | `5` | Documents |

Below is an expression executing a `CUSTOM` preset query using a star and end date.

```js
.post(`/expression/execute?departmentId=${departmentId}`, {
  pipeline: [{
    $select: {
      caseTypeId: { $eq: "1" },
      visibility: visibility,
      registeredOnDate: {
        preset: "CUSTOM",
        start: {
          $gte: '2022-03-01T00:00:00.000Z'
        }
        end: {
          $lte: '2022-05-31T00:00:00.000Z'
        }
      }
    }
  }]
});
```

A message result might look like the message below.

```js
{
  "anonymous": false,
  "caseHandlerDepartment": {
    "departmentId": "7",
    "departmentName": "Quality Manager"
  },
  "caseStatusGroup": "OPEN",
  "caseStatusId": "d9c7f1b925424fefa639bc4fa9c25968",
  "categories": [
    {
      "categoryGroupId": "741a2556a3804600b25bbd33854e49b5",
      "categoryId": "63b2eb3828114ce4a40f60876558d6cf",
      "categoryVersionId": "ebae3dfc705e427cace6d6b41d45c418",
      "messageCategoryId": "80f2f34718894733804a41e94d682970",
      "name": {
        "en-GB": "Bug"
      },
      "value": 1
    }
  ],
  "categoryGroupIds": [
    "741a2556a3804600b25bbd33854e49b5"
  ],
  "categoryIds": [
    "63b2eb3828114ce4a40f60876558d6cf"
  ],
  "cost": 0,
  "createdBy": "7",
  "createdOn": 1654589251731,
  "departmentIds": [
    "7"
  ],
  "fields": [
    {
      "formTextId": "1",
      "messageTextId": "e770019b546045f8a771d3b965d98030",
      "value": "7"
    }
  ],
  "formVersion": {
    "formId": "343ea0b84d3a49d2a82c64610d75553c",
    "formTypeId": "2c9c4e7fdd8a4657bd7fe1c308248424",
    "formVersionId": "8d6ed8ecfe8e4a4fbe56147656c605a7",
    "name": {
      "en-GB": "Story"
    }
  },
  "id": "7744731720414b29ab4da08fdfe4aa9e",
  "incidentOn": 1654589116146,
  "priorityId": "3",
  "registerBy": {
    "email": "tn@qmplus.com",
    "firstName": "Thomas",
    "lastName": "Nordbrekken",
    "middleName": "",
    "userId": "7"
  },
  "registeredOn": 1654589251709,
  "registeredOnBehalfOf": {
    "email": "tn@qmplus.com",
    "firstName": "Thomas",
    "lastName": "Nordbrekken",
    "middleName": "",
    "userId": "7"
  },
  "registeredOnDepartment": {
    "departmentId": "7",
    "departmentName": "Quality Manager"
  },
  "registeredUserIds": [
    "7"
  ],
  "riskModelValues": [],
  "title": "Kvinesdaltest\nSkjemaet: HMS-melding / uønsket hendelse\nFår ikke endret farge på infofelt og obligatoriske felt. Er bare lysegrått.",
  "updatedBy": "7",
  "updatedOn": 1654589251731,
  "workflowId": "7d8b3307f0604d8291345483c9f8c375",
  "pendingUserIdsByParticipantType": {}
}
```

> The most efficent way to retrive the data is.
>
> 1. Query the messages
> 2. Build the list of category group ids, category version ids, form type ids,
     form version ids, priority ids, risk version ids, department ids and workflow ids
> 3. Query the endpoint to retrive the needed groups
> 4. Merge the results

The alternative is to query the different groups based on the last time you updated your data storage.

To do this you can query using the update field and a date expression.



## Required Entities
To resolve all the fields in a form entry we need to extract the following entities.

- Category Groups
- Category Versions
- Form Types
- Form Versions
- Priorities
- Risk Version Models
- Departments
- Workflows

Lets look at each of the entities and how to fetch them.

### Category Group
To fetch category groups we use the following REST API endpoints.

#### `To fetch a specific set of category groups by ids`
> `https://qmplus.app/api/categorygroups/ids?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/categorygroups/getCategoryGroups)

### Category Versions
To fetch the category versions we use the following REST API endpoints.

> `https://qmplus.app/api/categoryversions/ids?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/categories/getCategoryVersionsByIds)

### Form Types
To fetch the form tyoes, we use the following REST API endpoints.

> `https://qmplus.app/api/formtype?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/formtypes/listFormTypes)

### Form Versions
To fetch the form versions, we use the following REST API endpoints.

> `https://qmplus.app/api/form/versions?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/forms/getFormVersions)

### Priorities
To fetch the priorities, we use the following REST API endpoints.

> `https://qmplus.app/api/priority?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/priorities/listPriorities)

### Risk Version Models
To fetch the risk model versions, we use the following REST API endpoints.

> `https://qmplus.app/api/riskmodel/version/ids?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/riskmodels/getVersionsByIds)

### Department
To fetch the departments, we use the following REST API endpoints.

> `https://qmplus.app/api/department/ids?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/departments/getDepartmentsByIds)

### Workflows
To fetch the departments, we use the following REST API endpoints.

> `https://qmplus.app/api/workflow/ids?ids=1&ids=2`
> [API Documentation](https://qmplus.app/swagger-ui/index.html?contextPath=&requestServerName=qmplus.app#/workflows/getWorkflowByIds)
