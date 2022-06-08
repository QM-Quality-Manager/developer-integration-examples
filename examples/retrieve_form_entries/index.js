const axios = require('axios');
const inspect = require('util').inspect;

/**
 * This example requires a API token to be used
 * 
 * Set this token as part of the environment of your shell or 
 * command line before running the examples
 * 
 * linux/osx:
 *    export QM_TENANT_ID=
 *    export QM_API_TOKEN=dasasdasdasdasdsdasdas
 * windows:
 *    setx QM_API_TOKEN "dasasdasdasdasdsdasdas"
 * 
 * The example will retrieve the last months form entries and unpack the ids to create
 * a fully featured feed.
 */
async function execute() {
  // Get our token
  let token = process.env.QM_API_TOKEN;
  let tenantId = process.env.QM_TENANT_ID;
  if (token == null) throw "Ensure QM_API_TOKEN environmental setting is set up before running";
  if (tenantId == null) throw "Ensure QM_TENANT_ID environmental setting is set up before running";

  // The departmentId we want to start looking for activityGroups
  const departmentId = "1";
  const visibility = "DEPARTMENT_AND_CHILDREN";

  // // Build an axios instance
  // const axiosInstance = axios.create({
  //   baseURL: "https://qmplus.app/api/",
  //   timeout: 10000,
  //   headers: {
  //     'auth-token': token,
  //     'auth-tenant-id': tenantId
  //   }
  // });

  // Build an axios instance
  const axiosInstance = axios.create({
    baseURL: "http://localhost:8080/api/",
    timeout: 60000,
    headers: {
      'auth-token': token,
      'auth-tenant-id': tenantId
    }
  });

  // /** ***********************************************************************************
  //  * Fetch departments
  //  * ***********************************************************************************/
  // console.log(`= Fetch departments`);

  // // Retrieve the departments
  // let departmentsResponse = await axiosInstance
  //   .get(`/department?departmentId=${departmentId}&visibility=${visibility}&active=true&includeFields=id&includeFields=name`)
  // let departments = departmentsResponse.data.entries ?? [];
  // let departmentById = {};
  // departments.forEach(department => departmentById[department.id] = department);
  // console.log(departments)

  // /** ***********************************************************************************
  //  * Fetch category groups
  //  * ***********************************************************************************/
  // console.log(`= Fetch category groups`);

  // // Retrieve the category groups
  // let categoryGroupsResponse = await axiosInstance
  //   .get(`/categoryversions`)
  // // let categoryGroups = categoryGroupsResponse.data.entries ?? [];
  // let categoryGroups = categoryGroupsResponse.data.entries ?? [];

  // // Build map of categoryGroups by id
  // let categoryGroupsById = {};
  // categoryGroups.forEach(categoryGroup => categoryGroupsById[categoryGroup.id] = categoryGroup);

  // /** ***********************************************************************************
  //  * Fetch category versions
  //  * ***********************************************************************************/
  // console.log(`= Fetch category versions`);

  // // Skip entries
  // let skip = 0;
  // let limit = 100;
  // let categoryVersions = [];

  // // Retrieve the category groups
  // // Iterate until we have no more results
  // while (true) {
  //   console.log(`    = fetch category versions [${skip}, ${skip + limit}]`);

  //   let categoryVersionsResponse = await axiosInstance
  //     .get(`/categoryversions?skip=${skip}&limit=${limit}`);
  //   let entries = categoryVersionsResponse.data.entries ?? []
  //   if (entries.length == 0) break;
  //   categoryVersions = categoryVersions.concat(entries);
  //   skip = skip + entries.length;
  // }

  // /** ***********************************************************************************
  //  * Fetch form types
  //  * ***********************************************************************************/
  // console.log(`= Fetch form types`);

  //  // Retrieve the form types
  //  let formTypesResponse = await axiosInstance
  //    .get(`/formtype?active=true&includeFields=id&includeFields=name`)
  //  let formTypes = formTypesResponse.data.entries ?? [];
  //  let formTypesById = {};
  //  formTypes.forEach(formType => formTypesById[formType.id] = formType);
  //  console.log(formTypes)

  // /** ***********************************************************************************
  //  * Fetch forms
  //  * ***********************************************************************************/
  // console.log(`= Fetch forms`);

  // // Fetch all the form versions (we need to use these to map form entries to forms)
  // let formsResponse = await axiosInstance
  //   .get(`/form?departmentId=${departmentId}&visibility=${visibility}`);
  // let forms = formsResponse.data.entries ?? [];

  // /** ***********************************************************************************
  //  * Fetch the form versions
  //  * ***********************************************************************************/
  // console.log(`= Fetch form versions`);

  // // Get the formVersions by formId
  // let formVersionsByForm = {};

  // // For each form fetch the form versions
  // for (let form of forms) {
  //   console.log(`  = fetch form ${form.id}`);
  //   // Skip entries
  //   let skip = 0;
  //   let limit = 100;
  //   let results = [];

  //   // Iterate until we have no more results
  //   while (true) {
  //     console.log(`    = fetch form ${form.id} [${skip}, ${skip + limit}]`);

  //     let formVersionsResult = await axiosInstance
  //       .get(`/form/${form.id}/versions?skip=${skip}&limit=${limit}`);
  //     let formVersions = formVersionsResult.data.entries ?? []
  //     if (formVersions.length == 0) break;
  //     results = results.concat(formVersions);
  //     skip = skip + formVersions.length;
  //   }

  //   // Entries
  //   formVersionsByForm[form.id] = results ?? [];
  // }

  /** ***********************************************************************************
   * Latest month of messages
   * ***********************************************************************************/

  // Get date 30 days ago
  const today = new Date();
  const date30DaysAgo = new Date();
  date30DaysAgo.setDate(today.getDate() - 60);

  // Retrieve the latest 30 days of messages
  let messagesResponse = await axiosInstance
    .post(`/expression/execute?departmentId=${departmentId}`, {
      pipeline: [{
        $select: {
          caseTypeId: { $eq: "1" },
          visibility: visibility,
          registeredOnDate: {
            // preset: "LAST_3_MONTHS"
            preset: "CUSTOM",
            start: {
              $gte: date30DaysAgo.toISOString()
            }
          }
        }
      }]
    });

  // Get the messages themselves
  let messages = messagesResponse.data ?? [];

  // Fetch the formVersions
  console.log(`========================== formVersions`)
  let formVersions = await fetchFormVersionsFromMessages(axiosInstance, messages);
  console.log(formVersions.length)

  // Fetch the categoryVersions
  console.log(`========================== categoryVersions`)
  let categoryVersions = await fetchCategoryVersionsFromMessages(axiosInstance, messages);
  console.log(categoryVersions.length)

  // Fetch the categoryGroups
  console.log(`========================== categoryGroups`)
  let categoryGroups = await fetchCategoryGroupsFromMessages(axiosInstance, messages);
  console.log(categoryGroups.length)

  // Fetch the formTypes
  console.log(`========================== formTypes`)
  let formTypes = await fetchFormTypesFromMessages(axiosInstance, messages);
  console.log(formTypes.length)

  // Get the workflows
  console.log(`========================== workflows`)
  let workflows = await fetchWorkflowsFromMessages(axiosInstance, messages);
  console.log(workflows.length)

  // Get the departments
  console.log(`========================== departments`)
  let departments = await fetchDepartmentsFromMessages(axiosInstance, messages);
  console.log(departments.length)

  // Get the riskmodelVersions
  console.log(`========================== riskModelVersions`)
  let riskModelVersions = await fetchRiskModelVersionsFromMessages(axiosInstance, messages);
  console.log(riskModelVersions.length)

  // Get the priorities
  console.log(`========================== priorities`)
  let priorities = await fetchPrioritiesFromMessages(axiosInstance, messages);
  console.log(priorities.length)

  // console.log(`========================== messageResponses`)
  // messages.forEach(message => {
  //   console.log(inspect(message, { colors: true, depth: 50 }));
  // })
}

/**
 * Fetch the priorities
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchPrioritiesFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.priorityId).flat());
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/priority?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch the risk model versions
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchRiskModelVersionsFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.riskVersionModelIds).flat());
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/riskmodel/version/ids?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch the departments from messages
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchDepartmentsFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.departmentIds).flat());
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/department/ids?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch the workflows from messages
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchWorkflowsFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.workflowId));
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/workflow/ids?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch form types from messages
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchFormTypesFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.formVersion.formTypeId));
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/formtype?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch category groups from messages
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchCategoryGroupsFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.categories.map(cat => cat.categoryGroupId)).flat());
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/categorygroups/ids?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch category versions from messages
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
 async function fetchCategoryVersionsFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.categories.map(cat => cat.categoryVersionId)).flat());
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/categoryversions/ids?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

/**
 * Fetch the needed form versions for the messages retrieved
 * @param {*} instance 
 * @param {*} messages 
 * @returns 
 */
async function fetchFormVersionsFromMessages(instance, messages) {
  if (messages.length == 0) return {};
  const ids = unique(messages.map(message => message.formVersion.formVersionId));
  // Retrieve the latest 30 days of messages
  let entries = await instance
    .get(`/form/versions?${ids.map(id => `ids=${id}`).join('&')}`);
  return entries.data.entries ?? [];
}

function unique(ids) {
  let map = {};
  for (let id of ids) map[id] = true;
  return Object.keys(map);
}

// Execute the execute function
execute()
  .then(() => { })
  .catch(ex => {
    console.log(`======================================== error`)
    console.log(ex)
    console.log(inspect(ex.response.data, { colors: true, depth: 50 }));
    process.exit(0);
  });