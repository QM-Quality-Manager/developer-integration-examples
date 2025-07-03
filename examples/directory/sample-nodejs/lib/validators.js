/**
 * Data validation utilities for QMPlus Directory Integration
 */

/**
 * Validate user object
 * @param {Object} user - User object to validate
 * @returns {Array<string>} Array of validation errors
 */
function validateUser(user) {
  const errors = [];
  
  // Required fields
  if (!user.externalId) {
    errors.push('Missing required field: externalId');
  }
  
  if (!user.email) {
    errors.push('Missing required field: email');
  } else if (!isValidEmail(user.email)) {
    errors.push('Invalid email format');
  }
  
  if (!user.firstName) {
    errors.push('Missing required field: firstName');
  }
  
  if (!user.lastName) {
    errors.push('Missing required field: lastName');
  }
  
  if (user.active === undefined || user.active === null) {
    errors.push('Missing required field: active');
  } else if (typeof user.active !== 'boolean') {
    errors.push('Field "active" must be boolean');
  }
  
  // Validate userTypes
  if (!user.userTypes || !Array.isArray(user.userTypes)) {
    errors.push('Missing or invalid userTypes array');
  } else if (user.userTypes.length === 0) {
    errors.push('User must have at least one userType');
  } else {
    user.userTypes.forEach((userType, index) => {
      const userTypeErrors = validateUserType(userType);
      userTypeErrors.forEach(error => {
        errors.push(`userTypes[${index}]: ${error}`);
      });
    });
  }
  
  // Optional field validation
  if (user.phoneNumber && !isValidPhoneNumber(user.phoneNumber)) {
    errors.push('Invalid phone number format');
  }
  
  return errors;
}

/**
 * Validate user type object
 * @param {Object} userType - UserType object to validate
 * @returns {Array<string>} Array of validation errors
 */
function validateUserType(userType) {
  const errors = [];
  
  if (!userType.departmentExternalId) {
    errors.push('Missing required field: departmentExternalId');
  }
  
  if (!userType.userTypeId) {
    errors.push('Missing required field: userTypeId');
  }
  
  return errors;
}

/**
 * Validate department object
 * @param {Object} department - Department object to validate
 * @returns {Array<string>} Array of validation errors
 */
function validateDepartment(department) {
  const errors = [];
  
  // Required fields
  if (!department.externalId) {
    errors.push('Missing required field: externalId');
  }
  
  if (!department.departmentName) {
    errors.push('Missing required field: departmentName');
  }
  
  if (department.active === undefined || department.active === null) {
    errors.push('Missing required field: active');
  } else if (typeof department.active !== 'boolean') {
    errors.push('Field "active" must be boolean');
  }
  
  // Optional field validation
  if (department.cascadeToChildren !== undefined && 
      typeof department.cascadeToChildren !== 'boolean') {
    errors.push('Field "cascadeToChildren" must be boolean');
  }
  
  return errors;
}

/**
 * Validate sync data structure
 * @param {Object} data - Sync data object
 * @returns {Object} Validation result with errors grouped by type
 */
function validateSyncData(data) {
  const result = {
    valid: true,
    departmentErrors: [],
    userErrors: [],
    generalErrors: []
  };
  
  // Validate structure
  if (!data || typeof data !== 'object') {
    result.generalErrors.push('Invalid data structure');
    result.valid = false;
    return result;
  }
  
  // Validate departments
  if (data.departments) {
    if (!Array.isArray(data.departments)) {
      result.generalErrors.push('departments must be an array');
      result.valid = false;
    } else {
      data.departments.forEach((dept, index) => {
        const errors = validateDepartment(dept);
        if (errors.length > 0) {
          result.departmentErrors.push({
            index,
            externalId: dept.externalId || 'unknown',
            errors
          });
          result.valid = false;
        }
      });
    }
  }
  
  // Validate users
  if (data.users) {
    if (!Array.isArray(data.users)) {
      result.generalErrors.push('users must be an array');
      result.valid = false;
    } else {
      data.users.forEach((user, index) => {
        const errors = validateUser(user);
        if (errors.length > 0) {
          result.userErrors.push({
            index,
            externalId: user.externalId || 'unknown',
            email: user.email || 'unknown',
            errors
          });
          result.valid = false;
        }
      });
    }
  }
  
  // Check for at least one data type
  if (!data.departments && !data.users) {
    result.generalErrors.push('Must provide either departments or users data');
    result.valid = false;
  }
  
  return result;
}

/**
 * Validate department hierarchy for circular dependencies
 * @param {Array<Object>} departments - Array of department objects
 * @returns {Object} Validation result
 */
function validateDepartmentHierarchy(departments) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  if (!Array.isArray(departments)) {
    result.errors.push('departments must be an array');
    result.valid = false;
    return result;
  }
  
  const departmentMap = new Map();
  const parentChildMap = new Map();
  
  // Build maps
  departments.forEach(dept => {
    if (dept.externalId) {
      departmentMap.set(dept.externalId, dept);
      
      if (dept.parentExternalId) {
        if (!parentChildMap.has(dept.parentExternalId)) {
          parentChildMap.set(dept.parentExternalId, []);
        }
        parentChildMap.get(dept.parentExternalId).push(dept.externalId);
      }
    }
  });
  
  // Check for circular dependencies
  function checkCircular(deptId, visited = new Set(), path = []) {
    if (visited.has(deptId)) {
      result.errors.push(`Circular dependency detected: ${path.join(' -> ')} -> ${deptId}`);
      result.valid = false;
      return;
    }
    
    visited.add(deptId);
    path.push(deptId);
    
    const dept = departmentMap.get(deptId);
    if (dept && dept.parentExternalId) {
      checkCircular(dept.parentExternalId, visited, path);
    }
    
    visited.delete(deptId);
    path.pop();
  }
  
  // Check each department
  departments.forEach(dept => {
    if (dept.externalId) {
      checkCircular(dept.externalId);
    }
  });
  
  // Check for orphaned departments (parent doesn't exist)
  departments.forEach(dept => {
    if (dept.parentExternalId && !departmentMap.has(dept.parentExternalId)) {
      result.warnings.push(`Department "${dept.externalId}" references non-existent parent "${dept.parentExternalId}"`);
    }
  });
  
  return result;
}

/**
 * Validate authentication configuration
 * @param {Object} config - Configuration object
 * @returns {Array<string>} Array of validation errors
 */
function validateAuthConfig(config) {
  const errors = [];
  
  if (!config.baseUrl) {
    errors.push('Missing required config: baseUrl');
  } else if (!isValidUrl(config.baseUrl)) {
    errors.push('Invalid baseUrl format');
  }
  
  if (!config.tenantId) {
    errors.push('Missing required config: tenantId');
  }
  
  if (!config.apiToken) {
    errors.push('Missing required config: apiToken');
  }
  
  return errors;
}

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Array<string>} Array of validation errors
 */
function validatePagination(params) {
  const errors = [];
  
  if (params.page !== undefined) {
    if (!Number.isInteger(params.page) || params.page < 0) {
      errors.push('page must be a non-negative integer');
    }
  }
  
  if (params.pageSize !== undefined) {
    if (!Number.isInteger(params.pageSize) || params.pageSize < 1 || params.pageSize > 1000) {
      errors.push('pageSize must be an integer between 1 and 1000');
    }
  }
  
  return errors;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhoneNumber(phone) {
  // Basic validation - adjust regex based on requirements
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean and normalize user data
 * @param {Object} user - User object to clean
 * @returns {Object} Cleaned user object
 */
function cleanUserData(user) {
  const cleaned = { ...user };
  
  // Trim strings
  if (cleaned.firstName) cleaned.firstName = cleaned.firstName.trim();
  if (cleaned.middleName) cleaned.middleName = cleaned.middleName.trim();
  if (cleaned.lastName) cleaned.lastName = cleaned.lastName.trim();
  if (cleaned.email) cleaned.email = cleaned.email.trim().toLowerCase();
  if (cleaned.externalId) cleaned.externalId = cleaned.externalId.trim();
  
  // Clean phone number
  if (cleaned.phoneNumber) {
    cleaned.phoneNumber = cleaned.phoneNumber.replace(/\s+/g, '');
  }
  
  return cleaned;
}

/**
 * Clean and normalize department data
 * @param {Object} department - Department object to clean
 * @returns {Object} Cleaned department object
 */
function cleanDepartmentData(department) {
  const cleaned = { ...department };
  
  // Trim strings
  if (cleaned.externalId) cleaned.externalId = cleaned.externalId.trim();
  if (cleaned.departmentName) cleaned.departmentName = cleaned.departmentName.trim();
  if (cleaned.parentExternalId) cleaned.parentExternalId = cleaned.parentExternalId.trim();
  
  return cleaned;
}

module.exports = {
  validateUser,
  validateUserType,
  validateDepartment,
  validateSyncData,
  validateDepartmentHierarchy,
  validateAuthConfig,
  validatePagination,
  cleanUserData,
  cleanDepartmentData,
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl
};