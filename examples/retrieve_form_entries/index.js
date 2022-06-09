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

  // Build an axios instance
  const axiosInstance = axios.create({
    baseURL: "https://qmplus.app/api/",
    timeout: 10000,
    headers: {
      'auth-token': token,
      'auth-tenant-id': tenantId
    }
  });

  /** ***********************************************************************************
   * Latest month of messages
   * ***********************************************************************************/

  // Get date 30 days ago
  const today = new Date();
  const date30DaysAgo = new Date();
  date30DaysAgo.setDate(today.getDate() - 30);

  // Retrieve the latest 30 days of messages
  console.log(`========================== messages`)
  let messagesResponse = await axiosInstance
    .post(`/expression/execute?departmentId=${departmentId}`, {
      pipeline: [{
        $select: {
          caseTypeId: { $eq: "1" },
          visibility: visibility,
          registeredOnDate: {
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
  console.log(messages.length)

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
    .get(`/riskmodel/version?${ids.map(id => `ids=${id}`).join('&')}`);
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
    .get(`/department?${ids.map(id => `ids=${id}`).join('&')}`);
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
    .get(`/workflow?${ids.map(id => `ids=${id}`).join('&')}`);
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
    .get(`/categorygroups?${ids.map(id => `ids=${id}`).join('&')}`);
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
    .get(`/categoryversions?${ids.map(id => `ids=${id}`).join('&')}`);
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