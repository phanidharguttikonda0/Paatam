const fs = require('fs');
const path = require('path');

// Master API definitions with comprehensive details
const apiCatalog = [
  // =========================================================================
  // PUBLIC & AUTHENTICATION FLOW
  // =========================================================================
  {
    id: 'health-check',
    title: 'System Health & Liveness Check',
    method: 'GET',
    url: '/api/health',
    roles: ['PUBLIC'],
    category: 'System & Utility',
    description: 'Returns the current server health status and ISO timestamp. Used by frontend load balancers, ping services, and startup connection checks.',
    frontendNotes: 'Call this on application bootstrap or in Axios interceptors when testing connectivity to the backend.',
    headers: [{ key: 'Accept', value: 'application/json', required: false, desc: 'Expected response format' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Backend service is online and healthy.',
        body: { status: 'ok', timestamp: '2026-10-16T18:00:00.000Z' }
      },
      errors: []
    }
  },
  {
    id: 'corporate-create',
    title: 'Initial Corporate Entity Registration',
    method: 'POST',
    url: '/api/corporate/create',
    roles: ['PUBLIC', 'CORPORATE_ADMIN'],
    category: 'Corporate Setup',
    description: 'Registers a new enterprise educational corporate entity (e.g. "Narayana Group", "Chaitanya Academy"). Returns a temporary verification token to onboard the first Super Admin.',
    frontendNotes: 'Used on the initial organization onboarding wizard. Store verification_token in memory to proceed to admin creation.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      name: 'Narayana Educational Institutions',
      registration_no: 'REG-HYD-2026-001'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Corporate registered successfully.',
        body: {
          status: 'success',
          message: 'Corporate registered successfully',
          data: {
            id: '1001',
            name: 'Narayana Educational Institutions',
            registration_no: 'REG-HYD-2026-001',
            verification_token: 'abc123token...'
          }
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Validation error or duplicate registration number.',
          body: { status: 'error', message: 'Registration number already exists' }
        }
      ]
    }
  },
  {
    id: 'auth-corporate-login',
    title: 'Corporate Admin OTP Login Initiation',
    method: 'POST',
    url: '/api/auth/corporate/login',
    roles: ['PUBLIC', 'CORPORATE_ADMIN'],
    category: 'Authentication',
    description: 'Initiates 2-Factor OTP login for Corporate Super Admins. Dispatches a 6-digit OTP to the registered corporate email and mobile number.',
    frontendNotes: 'On submit, advance UI to OTP verification screen. Inform user that OTP is valid for 10 minutes.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'admin@corporate.edu'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'OTP generated and sent to email/mobile.',
        body: {
          status: 'success',
          message: 'OTP sent to registered email and mobile',
          data: { identifier: 'admin@corporate.edu', expires_in: '10 minutes' }
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Identifier is missing or not a valid email/mobile format.',
          body: { status: 'error', message: 'Validation error: Identifier is required' }
        },
        {
          code: 404,
          status: 'Not Found',
          desc: 'No corporate admin found with this email/mobile.',
          body: { status: 'error', message: 'Corporate admin not found' }
        }
      ]
    }
  },
  {
    id: 'auth-corporate-verify',
    title: 'Corporate Admin Verify OTP & Issue Tokens',
    method: 'POST',
    url: '/api/auth/corporate/verify',
    roles: ['PUBLIC', 'CORPORATE_ADMIN'],
    category: 'Authentication',
    description: 'Verifies the 6-digit OTP for Corporate Admin. On success, sets an httpOnly refresh token cookie and returns a short-lived (15 min) JWT access token.',
    frontendNotes: 'Store accessToken in application state (Zustand/Redux). The refresh token cookie is handled automatically by the browser.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'admin@corporate.edu',
      otp: '123456'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'OTP verified. Access token returned and refresh cookie set.',
        body: {
          status: 'success',
          message: 'Login successful',
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsIn...',
            user: {
              id: '2001',
              name: 'Dr. Ramesh Rao',
              email: 'admin@corporate.edu',
              role: 'CORPORATE_ADMIN'
            }
          }
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Invalid or expired OTP code.',
          body: { status: 'error', message: 'Invalid or expired OTP' }
        }
      ]
    }
  },
  {
    id: 'auth-admin-login',
    title: 'Branch Admin (Dean / Principal / VP) Password Login',
    method: 'POST',
    url: '/api/auth/admin/login',
    roles: ['PUBLIC', 'BRANCH_ADMIN'],
    category: 'Authentication',
    description: 'Password authentication for Branch Administrators (Deans, Principals, Vice Principals). Returns a JWT access token and sets an httpOnly refresh token cookie.',
    frontendNotes: 'User role in response will be DEAN, PRINCIPAL, VICE_PRINCIPAL, or BRANCH_ADMIN. Redirect to Branch Admin Dashboard.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'principal.madhapur@school.edu',
      password: 'SecurePassword123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Branch admin authenticated.',
        body: {
          status: 'success',
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsIn...',
            user: {
              id: '3001',
              name: 'K. S. Verma',
              role: 'PRINCIPAL',
              email: 'principal.madhapur@school.edu'
            }
          }
        }
      },
      errors: [
        {
          code: 401,
          status: 'Unauthorized',
          desc: 'Invalid credentials or incorrect password.',
          body: { status: 'error', message: 'Invalid email/mobile or password' }
        }
      ]
    }
  },
  {
    id: 'auth-admin-forgot-pwd',
    title: 'Branch Admin Forgot Password (OTP Request)',
    method: 'POST',
    url: '/api/auth/admin/forgot-password',
    roles: ['PUBLIC', 'BRANCH_ADMIN'],
    category: 'Authentication',
    description: 'Initiates a password reset for a Branch Admin (Dean, Principal, Vice Principal). Sends an OTP to their registered email (SES) or mobile (Twilio SMS).',
    frontendNotes: 'Requires corporateId and the admin\'s email or mobile number.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'principal.madhapur@school.edu',
      corporateId: '1512528182029314'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Reset OTP sent successfully.',
        body: {
          status: 'success',
          message: 'Password reset OTP sent successfully'
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Missing required identifier or corporateId.',
          body: { status: 'error', message: 'Validation error: corporateId is required' }
        },
        {
          code: 404,
          status: 'Not Found',
          desc: 'Admin not found in this corporate entity.',
          body: { status: 'error', message: 'Admin not found' }
        }
      ]
    }
  },
  {
    id: 'auth-admin-reset-pwd',
    title: 'Branch Admin Reset Password',
    method: 'POST',
    url: '/api/auth/admin/reset-password',
    roles: ['PUBLIC', 'BRANCH_ADMIN'],
    category: 'Authentication',
    description: 'Completes password reset by verifying the 6-digit OTP and updating the branch admin\'s password.',
    frontendNotes: 'Requires corporateId, identifier, 6-digit OTP, and new_password (min 6 characters).',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'principal.madhapur@school.edu',
      corporateId: '1512528182029314',
      otp: '123456',
      new_password: 'NewSecurePassword123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Password reset successfully.',
        body: {
          status: 'success',
          message: 'Password has been reset successfully'
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Invalid or expired OTP code.',
          body: { status: 'error', message: 'Invalid or expired OTP' }
        }
      ]
    }
  },
  {
    id: 'auth-teacher-login',
    title: 'Teacher Password Login',
    method: 'POST',
    url: '/api/auth/teacher/login',
    roles: ['PUBLIC', 'TEACHER'],
    category: 'Authentication',
    description: 'Authenticates a Subject Teacher using email or mobile and password. Sets an httpOnly refresh cookie and returns a JWT access token with role `TEACHER`.',
    frontendNotes: 'Redirect to `/teacher/dashboard`. Store accessToken in memory for subsequent API requests.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'raina@school.edu',
      password: 'TeacherPassword123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher authenticated successfully.',
        body: {
          status: 'success',
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsIn...',
            user: {
              id: '4001',
              name: 'Suresh Raina',
              role: 'TEACHER',
              email: 'raina@school.edu'
            }
          }
        }
      },
      errors: [
        {
          code: 401,
          status: 'Unauthorized',
          desc: 'Invalid identifier or password.',
          body: { status: 'error', message: 'Invalid email/mobile or password' }
        }
      ]
    }
  },
  {
    id: 'auth-teacher-forgot-pwd',
    title: 'Teacher Forgot Password (OTP Request)',
    method: 'POST',
    url: '/api/auth/teacher/forgot-password',
    roles: ['PUBLIC', 'TEACHER'],
    category: 'Authentication',
    description: 'Sends a 6-digit password reset OTP to the teacher\'s registered email (via AWS SES) or mobile (SMS).',
    frontendNotes: 'Display confirmation screen prompting for the 6-digit OTP and new password.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'raina@school.edu'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Reset OTP sent successfully.',
        body: {
          status: 'success',
          message: 'Password reset OTP sent to registered email/mobile'
        }
      },
      errors: [
        {
          code: 404,
          status: 'Not Found',
          desc: 'No teacher found with this email/mobile.',
          body: { status: 'error', message: 'Teacher not found' }
        }
      ]
    }
  },
  {
    id: 'auth-teacher-reset-pwd',
    title: 'Teacher Reset Password with OTP',
    method: 'POST',
    url: '/api/auth/teacher/reset-password',
    roles: ['PUBLIC', 'TEACHER'],
    category: 'Authentication',
    description: 'Verifies the OTP and updates the teacher\'s password with bcrypt salted hashing.',
    frontendNotes: 'Provide strong password validation rules on frontend (min 8 chars, 1 uppercase, 1 special char).',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'raina@school.edu',
      otp: '654321',
      new_password: 'NewTeacherPassword123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Password updated. Redirect user to login.',
        body: {
          status: 'success',
          message: 'Password reset successfully'
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Invalid OTP or expired OTP.',
          body: { status: 'error', message: 'Invalid or expired OTP' }
        }
      ]
    }
  },
  {
    id: 'auth-student-login',
    title: 'Student Admission Number Login',
    method: 'POST',
    url: '/api/auth/student/login',
    roles: ['PUBLIC', 'STUDENT'],
    category: 'Authentication',
    description: 'Student login using unique School Admission Number (or email) and password. Issues JWT access token with role `STUDENT` and sets httpOnly refresh cookie.',
    frontendNotes: 'Accepts admission_no (e.g. ADM-2026-001) or email. Redirect to `/student/dashboard`.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      admission_no: 'ADM-2026-001',
      password: 'StudentPassword123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student authenticated successfully.',
        body: {
          status: 'success',
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsIn...',
            user: {
              id: '5001',
              name: 'Aarav Sharma',
              admission_no: 'ADM-2026-001',
              role: 'STUDENT'
            }
          }
        }
      },
      errors: [
        {
          code: 401,
          status: 'Unauthorized',
          desc: 'Invalid admission number or password.',
          body: { status: 'error', message: 'Invalid admission number/identifier or password' }
        }
      ]
    }
  },
  {
    id: 'auth-student-forgot-pwd',
    title: 'Student Forgot Password (OTP Request)',
    method: 'POST',
    url: '/api/auth/student/forgot-password',
    roles: ['PUBLIC', 'STUDENT'],
    category: 'Authentication',
    description: 'Dispatches password reset OTP to student or parent registered email/mobile.',
    frontendNotes: 'Allows student or parent to recover account credentials.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'ADM-2026-001'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Reset OTP dispatched.',
        body: {
          status: 'success',
          message: 'Password reset OTP sent to registered student/parent contact'
        }
      },
      errors: [
        {
          code: 404,
          status: 'Not Found',
          desc: 'Student not found.',
          body: { status: 'error', message: 'Student not found' }
        }
      ]
    }
  },
  {
    id: 'auth-student-reset-pwd',
    title: 'Student Reset Password with OTP',
    method: 'POST',
    url: '/api/auth/student/reset-password',
    roles: ['PUBLIC', 'STUDENT'],
    category: 'Authentication',
    description: 'Verifies OTP and sets new password for student.',
    frontendNotes: 'Direct student to student login screen upon success.',
    headers: [{ key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      identifier: 'ADM-2026-001',
      otp: '789123',
      new_password: 'NewStudentPass123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student password reset successfully.',
        body: {
          status: 'success',
          message: 'Password reset successfully'
        }
      },
      errors: [
        {
          code: 400,
          status: 'Bad Request',
          desc: 'Invalid or expired OTP.',
          body: { status: 'error', message: 'Invalid or expired OTP' }
        }
      ]
    }
  },
  {
    id: 'auth-refresh-token',
    title: 'Stateless JWT Access Token Refresh',
    method: 'POST',
    url: '/api/auth/refresh',
    roles: ['PUBLIC', 'CORPORATE_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT'],
    category: 'Authentication',
    description: 'Rotates access token using the secure httpOnly refreshToken cookie. Call this automatically in an HTTP client response interceptor when receiving a 401 response.',
    frontendNotes: 'Crucial for single-page apps: Send credentials with request (withCredentials: true in Axios). Do NOT pass token in body.',
    headers: [{ key: 'Cookie', value: 'refreshToken=<token>', required: true, desc: 'Browser httpOnly cookie' }],
    urlParams: [],
    queryParams: [],
    requestBody: {},
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'New access token issued.',
        body: {
          status: 'success',
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsIn...'
          }
        }
      },
      errors: [
        {
          code: 401,
          status: 'Unauthorized',
          desc: 'Refresh token cookie missing, expired, or invalid. User must log in again.',
          body: { status: 'error', message: 'Unauthorized: Invalid refresh token' }
        }
      ]
    }
  },

  // =========================================================================
  // CORPORATE ADMIN ROLE APIS
  // =========================================================================
  {
    id: 'corp-add-admin',
    title: 'Add Additional Corporate Admin',
    method: 'POST',
    url: '/api/corporate/addAdmin',
    roles: ['CORPORATE_ADMIN'],
    category: 'Corporate Administration',
    description: 'Creates another Super Admin under the same corporate account. Can perform all corporate-level actions.',
    frontendNotes: 'Available on the Corporate Settings > Administrators screen.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      name: 'Sunita Sharma',
      email: 'sunita.sharma@corporate.edu',
      mobile: '9876543211'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Corporate Admin created.',
        body: {
          status: 'success',
          message: 'Corporate admin added successfully',
          data: { id: '2002', name: 'Sunita Sharma', email: 'sunita.sharma@corporate.edu' }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Email or mobile already in use.', body: { status: 'error', message: 'Email already registered' } },
        { code: 403, status: 'Forbidden', desc: 'Insufficient role permissions.', body: { message: 'Forbidden: Insufficient permissions' } }
      ]
    }
  },
  {
    id: 'corp-list-admins',
    title: 'List Corporate Admins (Paginated)',
    method: 'POST',
    url: '/api/corporate/admins',
    roles: ['CORPORATE_ADMIN'],
    category: 'Corporate Administration',
    description: 'Returns paginated list of all administrators assigned to the corporate entity.',
    frontendNotes: 'Supports cursor pagination. Send cursor parameter for subsequent pages.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      limit: 10,
      cursor: '2001'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of corporate admins.',
        body: {
          status: 'success',
          data: [
            { id: '2001', name: 'Dr. Ramesh Rao', email: 'admin@corporate.edu', mobile: '9876543210' },
            { id: '2002', name: 'Sunita Sharma', email: 'sunita@corporate.edu', mobile: '9876543211' }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: [
        { code: 401, status: 'Unauthorized', desc: 'Missing or expired token.', body: { message: 'Unauthorized: Missing or invalid token' } }
      ]
    }
  },
  {
    id: 'corp-create-branch',
    title: 'Create Branch / Campus under Corporate',
    method: 'POST',
    url: '/api/branch/create',
    roles: ['CORPORATE_ADMIN'],
    category: 'Branch Management',
    description: 'Creates a physical school campus or branch under the corporate organization.',
    frontendNotes: 'Rendered on the "Add Campus / Branch" modal. Pincode must be 6 digits.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      name: 'Madhapur Campus',
      pincode: '500081',
      address: 'Plot 45, Hitech City Main Rd, Madhapur, Hyderabad',
      branch_contact_mail: 'madhapur@school.edu',
      mobile_number: '9876543220'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Branch created.',
        body: {
          status: 'success',
          message: 'Branch created successfully',
          data: { id: '301', name: 'Madhapur Campus', pincode: '500081' }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Validation failure.', body: { status: 'error', message: 'Pincode must be exactly 6 digits' } }
      ]
    }
  },
  {
    id: 'corp-list-branches',
    title: 'List All Branches under Corporate',
    method: 'GET',
    url: '/api/branch/corporate',
    roles: ['CORPORATE_ADMIN'],
    category: 'Branch Management',
    description: 'Retrieves all branches belonging to the authenticated corporate organization with cursor pagination.',
    frontendNotes: 'Use on Corporate Overview Dashboard / Branch Switcher dropdown.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' }],
    urlParams: [],
    queryParams: [
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Items per page (max 10)' },
      { key: 'cursor', type: 'string', required: false, desc: 'Cursor ID for next page' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Paginated list of branches.',
        body: {
          status: 'success',
          data: [
            { id: '301', name: 'Madhapur Campus', pincode: '500081', address: 'Plot 45...', branch_contact_mail: 'madhapur@school.edu' }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: []
    }
  },
  {
    id: 'corp-search-branches',
    title: 'Autocomplete Search Branches',
    method: 'GET',
    url: '/api/branch/corporate/search',
    roles: ['CORPORATE_ADMIN'],
    category: 'Branch Management',
    description: 'Live autocomplete search across branches by name or city.',
    frontendNotes: 'Debounce input by 300ms before sending query.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' }],
    urlParams: [],
    queryParams: [{ key: 'q', type: 'string', required: true, desc: 'Search query string' }],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Matching branches.',
        body: {
          status: 'success',
          data: [
            { id: '301', name: 'Madhapur Campus', address: 'Hyderabad' }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'corp-create-admin',
    title: 'Create Branch Admin (Dean / Principal / VP)',
    method: 'POST',
    url: '/api/admin/create',
    roles: ['CORPORATE_ADMIN'],
    category: 'Admin Management',
    description: 'Onboards a new branch-level administrator (Dean, Principal, Vice Principal, or Other) with a salt-hashed initial password.',
    frontendNotes: 'Allow Corporate Admin to assign role from enum: [DEAN, PRINCIPAL, VICE_PRINCIPAL, OTHER].',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      admin_name: 'Dr. K. S. Verma',
      contact_email: 'principal.madhapur@school.edu',
      mobile: '9876543230',
      role: 'PRINCIPAL',
      password: 'SecurePassword123!'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Branch Admin created successfully.',
        body: {
          status: 'success',
          message: 'Branch Admin created successfully',
          data: { id: '3001', admin_name: 'Dr. K. S. Verma', role: 'PRINCIPAL' }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Email or mobile already in use.', body: { status: 'error', message: 'Email already registered' } }
      ]
    }
  },
  {
    id: 'corp-assign-branch-access',
    title: 'Assign Branch Access to Admin',
    method: 'POST',
    url: '/api/admin/assign-branches',
    roles: ['CORPORATE_ADMIN'],
    category: 'Admin Management',
    description: 'Maps one or more branches to a Branch Admin, allowing them to manage those specific campuses.',
    frontendNotes: 'Multi-select dropdown on frontend: allow selecting multiple branch IDs.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      admin_id: '3001',
      branch_ids: ['301', '302']
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Branches mapped to admin.',
        body: {
          status: 'success',
          message: 'Branches assigned successfully'
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Admin or branch not found.', body: { status: 'error', message: 'Branch not found' } }
      ]
    }
  },
  {
    id: 'corp-remove-branch-admin',
    title: 'Revoke Admin Assignment from Branch',
    method: 'DELETE',
    url: '/api/branch/:branchId/admins/:adminId',
    roles: ['CORPORATE_ADMIN'],
    category: 'Admin Management',
    description: 'Revokes a Branch Admin\'s access to a specific branch.',
    frontendNotes: 'Provide a confirmation modal before triggering deletion.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Corporate Admin JWT' }],
    urlParams: [
      { key: 'branchId', type: 'string', required: true, desc: 'Branch ID' },
      { key: 'adminId', type: 'string', required: true, desc: 'Admin ID' }
    ],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Access revoked.',
        body: { status: 'success', message: 'Admin access removed from branch successfully' }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Access record not found.', body: { status: 'error', message: 'Admin access record not found' } }
      ]
    }
  },

  // =========================================================================
  // BRANCH ADMIN (DEAN, PRINCIPAL, VICE PRINCIPAL) APIS
  // =========================================================================
  {
    id: 'admin-my-branches',
    title: 'Get Branches Assigned to Logged-in Admin',
    method: 'GET',
    url: '/api/branch-admin/my-branches',
    roles: ['BRANCH_ADMIN'],
    category: 'Branch Admin Profile',
    description: 'Lists all physical campuses/branches that the authenticated administrator has permissions to oversee.',
    frontendNotes: 'Populate the active campus switcher in the top navigation bar with this list.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Branch Admin JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of assigned branches.',
        body: {
          status: 'success',
          data: [
            { id: '301', name: 'Madhapur Campus', pincode: '500081', address: 'Hitech City' }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'admin-profile',
    title: 'Get Logged-in Branch Admin Profile',
    method: 'GET',
    url: '/api/branch-admin/profile',
    roles: ['BRANCH_ADMIN'],
    category: 'Branch Admin Profile',
    description: 'Returns profile details for the currently logged-in Dean, Principal, or Vice Principal.',
    frontendNotes: 'Use on header user avatar / settings menu.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Branch Admin JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Profile details.',
        body: {
          status: 'success',
          data: {
            id: '3001',
            admin_name: 'Dr. K. S. Verma',
            contact_email: 'principal@school.edu',
            mobile: '9876543230',
            role: 'PRINCIPAL'
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'ay-list',
    title: 'List Academic Years in Branch',
    method: 'GET',
    url: '/api/branch/:branchId/academic-years',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Academic Structure',
    description: 'Retrieves all academic years for a branch. Current active session is automatically placed first.',
    frontendNotes: 'Use in Academic Session switcher dropdown throughout the admin portal.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Page limit' },
      { key: 'cursor', type: 'string', required: false, desc: 'Cursor ID for next page' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of academic sessions.',
        body: {
          status: 'success',
          data: [
            { id: '401', branch_id: '301', start_year: 2026, end_year: 2027, is_active: true }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: [
        { code: 403, status: 'Forbidden', desc: 'No access to this branch.', body: { message: 'Forbidden: You do not have access to this branch' } }
      ]
    }
  },
  {
    id: 'ay-create',
    title: 'Create Academic Year in Branch',
    method: 'POST',
    url: '/api/branch/:branchId/academic-years',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Academic Structure',
    description: 'Creates a new academic year session (e.g. start_year: 2026 -> automatically sets end_year: 2027). Only one session can be active at a time.',
    frontendNotes: 'If is_active: true is sent, the backend automatically deactivates previous active sessions.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [],
    requestBody: {
      start_year: 2026,
      is_active: true
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Academic year created.',
        body: {
          status: 'success',
          message: 'Academic year created successfully',
          data: { id: '401', branch_id: '301', start_year: 2026, end_year: 2027, is_active: true }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Academic year already exists for this start year.', body: { status: 'error', message: 'Academic year already exists for this start year' } }
      ]
    }
  },
  {
    id: 'ay-update',
    title: 'Update / Toggle Active Academic Year',
    method: 'PUT',
    url: '/api/academic-years/:id',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Academic Structure',
    description: 'Updates active status or start/end years of an academic calendar session.',
    frontendNotes: 'Used when toggling the active session switch.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Academic Year ID' }],
    queryParams: [],
    requestBody: {
      is_active: true
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Academic year updated.',
        body: {
          status: 'success',
          message: 'Academic year updated successfully',
          data: { id: '401', is_active: true }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Academic year not found.', body: { status: 'error', message: 'Academic year not found' } }
      ]
    }
  },
  {
    id: 'ay-delete',
    title: 'Delete Academic Year',
    method: 'DELETE',
    url: '/api/academic-years/:id',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Academic Structure',
    description: 'Deletes an academic year. Protected: BLOCKED with 400 Bad Request if classes or enrolled students exist.',
    frontendNotes: 'Warn user that deletion is only possible if zero classes are attached.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Academic Year ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Academic year deleted.',
        body: { status: 'success', message: 'Academic year deleted successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Cannot delete: classes exist in session.', body: { status: 'error', message: 'Cannot delete academic year: 5 classes exist in this session' } }
      ]
    }
  },
  {
    id: 'class-list',
    title: 'List Classes in Academic Year',
    method: 'GET',
    url: '/api/academic-years/:academicYearId/classes',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Academic Structure',
    description: 'Returns all classes in an academic year, ordered sequentially by class_order (e.g. Grade 1, Grade 2... Grade 10).',
    frontendNotes: 'Primary navigation list for school curriculum hierarchy.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'academicYearId', type: 'string', required: true, desc: 'Academic Year ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Ordered class list.',
        body: {
          status: 'success',
          data: [
            { id: '501', name: 'Grade 10', class_order: 10, sections_count: 3, subjects_count: 5 }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'class-create',
    title: 'Create Class with Optional Sections',
    method: 'POST',
    url: '/api/academic-years/:academicYearId/classes',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Academic Structure',
    description: 'Adds a class to the academic session. Can optionally auto-generate sections (e.g. sections: ["A", "B", "C"]).',
    frontendNotes: 'Checkboxes for auto-creating sections A, B, C on class creation wizard.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'academicYearId', type: 'string', required: true, desc: 'Academic Year ID' }],
    queryParams: [],
    requestBody: {
      name: 'Grade 10',
      class_order: 10,
      sections: ['A', 'B', 'C']
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Class and sections created.',
        body: {
          status: 'success',
          message: 'Class created successfully',
          data: { id: '501', name: 'Grade 10', class_order: 10, sections: [{ id: '601', section_name: 'A' }] }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Class with this name already exists in this year.', body: { status: 'error', message: 'Class with name "Grade 10" already exists in this academic year' } }
      ]
    }
  },
  {
    id: 'class-get',
    title: 'Get Class Details (with Sections & Subjects)',
    method: 'GET',
    url: '/api/classes/:classId',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Academic Structure',
    description: 'Retrieves full details for a class including attached sections, seating capacities, and assigned curriculum subjects.',
    frontendNotes: 'Main landing page for Class Detail View.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Class details with sections and subjects.',
        body: {
          status: 'success',
          data: {
            id: '501',
            name: 'Grade 10',
            class_order: 10,
            sections: [
              { id: '601', section_name: 'A', strength: 30, class_teacher: { id: '4001', name: 'Suresh Raina' } }
            ],
            subjects: [
              { id: '701', name: 'Physics', code: 'PHY-10' },
              { id: '702', name: 'Mathematics', code: 'MTH-10' }
            ]
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Class not found.', body: { status: 'error', message: 'Class not found' } }
      ]
    }
  },
  {
    id: 'class-update',
    title: 'Update Class Name or Order',
    method: 'PUT',
    url: '/api/classes/:classId',
    roles: ['BRANCH_ADMIN'],
    category: 'Academic Structure',
    description: 'Updates class name or reorders class hierarchy position.',
    frontendNotes: 'Supports drag-and-drop reordering on frontend.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: { name: 'Grade 10 - Advanced', class_order: 10 },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Class updated.',
        body: { status: 'success', message: 'Class updated successfully', data: { id: '501', name: 'Grade 10 - Advanced' } }
      },
      errors: []
    }
  },
  {
    id: 'class-delete',
    title: 'Delete Class',
    method: 'DELETE',
    url: '/api/classes/:classId',
    roles: ['BRANCH_ADMIN'],
    category: 'Academic Structure',
    description: 'Deletes a class. Protected: Blocked if sections exist.',
    frontendNotes: 'All sections must be deleted first before deleting the class.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Class deleted.',
        body: { status: 'success', message: 'Class deleted successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Cannot delete: sections exist.', body: { status: 'error', message: 'Cannot delete class: 2 sections exist' } }
      ]
    }
  },
  {
    id: 'section-list',
    title: 'List Sections in Class',
    method: 'GET',
    url: '/api/classes/:classId/sections',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Sections & Rosters',
    description: 'Lists all sections under a class with student counts and designated class teachers.',
    frontendNotes: 'Renders the section pill buttons on the class dashboard.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of sections.',
        body: {
          status: 'success',
          data: [
            { id: '601', section_name: 'A', strength: 30, enrolled_students: 28, class_teacher_name: 'Suresh Raina' }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'section-create',
    title: 'Create Section under Class',
    method: 'POST',
    url: '/api/classes/:classId/sections',
    roles: ['BRANCH_ADMIN'],
    category: 'Sections & Rosters',
    description: 'Adds a new section with a designated seating capacity (strength).',
    frontendNotes: 'Rendered in "Add Section" dialog.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: { section_name: 'B', strength: 35 },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Section created.',
        body: { status: 'success', message: 'Section created successfully', data: { id: '602', section_name: 'B', strength: 35 } }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Duplicate section name in class.', body: { status: 'error', message: 'Section "B" already exists in this class' } }
      ]
    }
  },
  {
    id: 'section-get',
    title: 'Get Section Details with Teacher & Student Count',
    method: 'GET',
    url: '/api/sections/:sectionId',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Sections & Rosters',
    description: 'Returns section profile, designated class teacher, capacity, and current enrolled student count.',
    frontendNotes: 'Section header summary view.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Section details.',
        body: {
          status: 'success',
          data: {
            id: '601',
            section_name: 'A',
            strength: 30,
            enrolled_students: 28,
            class_teacher: { id: '4001', name: 'Suresh Raina', email: 'raina@school.edu' }
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'section-update',
    title: 'Update Section Name or Strength',
    method: 'PUT',
    url: '/api/sections/:sectionId',
    roles: ['BRANCH_ADMIN'],
    category: 'Sections & Rosters',
    description: 'Updates section display name or classroom seating capacity.',
    frontendNotes: 'Validation: strength must be a positive integer.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: { section_name: 'A-Ruby', strength: 32 },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Section updated.',
        body: { status: 'success', message: 'Section updated successfully' }
      },
      errors: []
    }
  },
  {
    id: 'section-delete',
    title: 'Delete Section',
    method: 'DELETE',
    url: '/api/sections/:sectionId',
    roles: ['BRANCH_ADMIN'],
    category: 'Sections & Rosters',
    description: 'Deletes a section. Blocked with 400 if students are enrolled.',
    frontendNotes: 'Prompt admin to transfer students out of the section prior to deletion.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Section deleted.',
        body: { status: 'success', message: 'Section deleted successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Students are currently enrolled.', body: { status: 'error', message: 'Cannot delete section: 28 students are enrolled' } }
      ]
    }
  },
  {
    id: 'section-assign-ct',
    title: 'Assign / Change Class Teacher for Section',
    method: 'PUT',
    url: '/api/sections/:sectionId/class-teacher',
    roles: ['BRANCH_ADMIN'],
    category: 'Sections & Rosters',
    description: 'Designates a teacher as the primary Class Teacher for this section.',
    frontendNotes: 'Shows in Teacher Dashboard as their class teacher responsibility.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: { teacher_id: '4001' },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Class teacher assigned.',
        body: { status: 'success', message: 'Class teacher assigned successfully', data: { section_id: '601', class_teacher_id: '4001' } }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Teacher not found.', body: { status: 'error', message: 'Teacher not found' } }
      ]
    }
  },
  {
    id: 'section-remove-ct',
    title: 'Remove Class Teacher from Section',
    method: 'DELETE',
    url: '/api/sections/:sectionId/class-teacher',
    roles: ['BRANCH_ADMIN'],
    category: 'Sections & Rosters',
    description: 'Unassigns the current class teacher from the section.',
    frontendNotes: 'Reverts section to having no class teacher.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Class teacher removed.',
        body: { status: 'success', message: 'Class teacher removed from section successfully' }
      },
      errors: []
    }
  },
  {
    id: 'subject-master-list',
    title: 'List Master Subject Catalog in Branch',
    method: 'GET',
    url: '/api/branch/:branchId/subjects',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Subject Catalog',
    description: 'Retrieves the master repository of all subjects offered at this campus (e.g. Physics, Chemistry, Calculus, Social Studies).',
    frontendNotes: 'Populates subject selection multi-selects throughout the admin and teacher workflows.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Subject list.',
        body: {
          status: 'success',
          data: [
            { id: '701', name: 'Physics', code: 'PHY-10' },
            { id: '702', name: 'Mathematics', code: 'MTH-10' }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'subject-master-create',
    title: 'Add New Subject to Master Catalog',
    method: 'POST',
    url: '/api/branch/:branchId/subjects',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Subject Catalog',
    description: 'Registers a new subject with unique code in the branch catalog.',
    frontendNotes: 'Rendered in "Add New Subject" modal.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [],
    requestBody: { name: 'Computer Science', code: 'CS-10' },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Subject created.',
        body: { status: 'success', message: 'Subject created successfully', data: { id: '703', name: 'Computer Science', code: 'CS-10' } }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Subject code already exists in this branch.', body: { status: 'error', message: 'Subject with code "CS-10" already exists in this branch' } }
      ]
    }
  },
  {
    id: 'subject-update',
    title: 'Update Subject Name or Code',
    method: 'PUT',
    url: '/api/subjects/:id',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Subject Catalog',
    description: 'Updates subject name or course code.',
    frontendNotes: 'Changes propagate across all classes and past tests linked to this subject.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Subject ID' }],
    queryParams: [],
    requestBody: { name: 'Physics & Applied Mechanics', code: 'PHY-10A' },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Subject updated.',
        body: { status: 'success', message: 'Subject updated successfully' }
      },
      errors: []
    }
  },
  {
    id: 'subject-delete',
    title: 'Delete Subject from Catalog',
    method: 'DELETE',
    url: '/api/subjects/:id',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Subject Catalog',
    description: 'Deletes a subject from the catalog. Blocked if assigned to classes.',
    frontendNotes: 'Warn user that subject must be unassigned from all classes before deletion.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Subject ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Subject deleted.',
        body: { status: 'success', message: 'Subject deleted successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Subject assigned to class.', body: { status: 'error', message: 'Cannot delete subject: mapped to 2 classes' } }
      ]
    }
  },
  {
    id: 'class-subjects-list',
    title: 'List Subjects Assigned to Class',
    method: 'GET',
    url: '/api/classes/:classId/subjects',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Class Curriculum Mapping',
    description: 'Lists all curriculum subjects assigned to a class.',
    frontendNotes: 'Shows in Class Curriculum tab.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Assigned subjects.',
        body: {
          status: 'success',
          data: [
            { class_subject_id: '801', subject_id: '701', name: 'Physics', code: 'PHY-10' }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'class-subjects-assign',
    title: 'Assign Subjects to Class Curriculum',
    method: 'POST',
    url: '/api/classes/:classId/subjects',
    roles: ['BRANCH_ADMIN'],
    category: 'Class Curriculum Mapping',
    description: 'Maps master subjects to a class (e.g. adding Physics and Math to Grade 10).',
    frontendNotes: 'Allows multi-select array of subject IDs.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'classId', type: 'string', required: true, desc: 'Class ID' }],
    queryParams: [],
    requestBody: { subject_ids: ['701', '702'] },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Subjects assigned.',
        body: { status: 'success', message: 'Subjects assigned to class successfully' }
      },
      errors: []
    }
  },
  {
    id: 'class-subjects-remove',
    title: 'Unassign Subject from Class',
    method: 'DELETE',
    url: '/api/classes/:classId/subjects/:subjectId',
    roles: ['BRANCH_ADMIN'],
    category: 'Class Curriculum Mapping',
    description: 'Removes a subject from a class curriculum. Blocked if test papers have been published.',
    frontendNotes: 'Confirmation modal before removal.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [
      { key: 'classId', type: 'string', required: true, desc: 'Class ID' },
      { key: 'subjectId', type: 'string', required: true, desc: 'Subject ID' }
    ],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Subject removed from class.',
        body: { status: 'success', message: 'Subject unassigned from class successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Assignments exist.', body: { status: 'error', message: 'Cannot unassign: 3 assignments exist under this subject' } }
      ]
    }
  },
  {
    id: 'section-teachers-list',
    title: 'List Subject Teachers Assigned to Section',
    method: 'GET',
    url: '/api/sections/:sectionId/teachers',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN', 'TEACHER'],
    category: 'Teacher Allocations',
    description: 'Lists all teachers assigned to teach specific subjects in this section.',
    frontendNotes: 'Shows teacher-subject matrix for the section (e.g. Physics -> Mr. Raina, Math -> Ms. Rao).',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher allocations.',
        body: {
          status: 'success',
          data: [
            {
              teacher_subject_id: '901',
              subject_name: 'Physics',
              subject_code: 'PHY-10',
              teacher: { id: '4001', name: 'Suresh Raina', email: 'raina@school.edu' }
            }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'section-teachers-assign',
    title: 'Allocate Teacher to Subject in Section',
    method: 'POST',
    url: '/api/sections/:sectionId/teachers',
    roles: ['BRANCH_ADMIN'],
    category: 'Teacher Allocations',
    description: 'Allocates a teacher to teach a specific subject in a section.',
    frontendNotes: 'Dropdown with teachers and subjects available in this class.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: { teacher_id: '4001', subject_id: '701' },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Teacher assigned to subject.',
        body: { status: 'success', message: 'Teacher allocated to subject in section successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Allocation already exists.', body: { status: 'error', message: 'Teacher is already assigned to this subject in this section' } }
      ]
    }
  },
  {
    id: 'section-teachers-remove',
    title: 'Unassign Teacher from Section Subject',
    method: 'DELETE',
    url: '/api/sections/:sectionId/teachers/:teacherId',
    roles: ['BRANCH_ADMIN'],
    category: 'Teacher Allocations',
    description: 'Removes a teacher allocation from a section.',
    frontendNotes: 'Specify subject_id as query parameter if teacher teaches multiple subjects in section.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [
      { key: 'sectionId', type: 'string', required: true, desc: 'Section ID' },
      { key: 'teacherId', type: 'string', required: true, desc: 'Teacher ID' }
    ],
    queryParams: [{ key: 'subject_id', type: 'string', required: false, desc: 'Optional specific subject ID' }],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher unassigned.',
        body: { status: 'success', message: 'Teacher allocation removed successfully' }
      },
      errors: []
    }
  },
  {
    id: 'teacher-list',
    title: 'List Teachers in Branch (Paginated)',
    method: 'GET',
    url: '/api/branch/:branchId/teachers',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Teacher Directory',
    description: 'Retrieves all teachers employed at the branch with cursor pagination.',
    frontendNotes: 'Teacher Directory master table view.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Page size limit' },
      { key: 'cursor', type: 'string', required: false, desc: 'Cursor ID for next page' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Paginated teacher directory.',
        body: {
          status: 'success',
          data: [
            { id: '4001', name: 'Suresh Raina', teacher_id: 'TCH-001', contact_email: 'raina@school.edu', contact_mobile: '9876543240' }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: []
    }
  },
  {
    id: 'teacher-search',
    title: 'Autocomplete Search Teachers in Branch',
    method: 'GET',
    url: '/api/branch/:branchId/teachers/search',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Teacher Directory',
    description: 'Quick search for teachers by name, teacher ID, email, or mobile.',
    frontendNotes: 'Debounce search input on frontend by 300ms.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [{ key: 'q', type: 'string', required: true, desc: 'Search keyword' }],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Matching teachers.',
        body: {
          status: 'success',
          data: [
            { id: '4001', name: 'Suresh Raina', teacher_id: 'TCH-001', contact_email: 'raina@school.edu' }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'teacher-onboard',
    title: 'Onboard New Teacher in Branch',
    method: 'POST',
    url: '/api/branch/:branchId/teachers',
    roles: ['BRANCH_ADMIN'],
    category: 'Teacher Directory',
    description: 'Onboards a new faculty member with teacher ID and salt-hashed password.',
    frontendNotes: 'Rendered on the "Add Teacher" form. Teacher ID must be unique in branch.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [],
    requestBody: {
      teacher_id: 'TCH-001',
      name: 'Suresh Raina',
      contact_email: 'raina@school.edu',
      contact_mobile: '9876543240',
      password: 'TeacherPassword123!'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Teacher onboarded.',
        body: {
          status: 'success',
          message: 'Teacher onboarded successfully',
          data: { id: '4001', teacher_id: 'TCH-001', name: 'Suresh Raina' }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Duplicate teacher ID or email.', body: { status: 'error', message: 'Teacher ID or Email already exists' } }
      ]
    }
  },
  {
    id: 'teacher-get-details',
    title: 'Get Full Teacher Profile & Assigned Sections',
    method: 'GET',
    url: '/api/teachers/:teacherId',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Teacher Directory',
    description: 'Retrieves complete teacher dossier: contact info, assigned teaching subjects, class teacher duties, and past assignments.',
    frontendNotes: 'Teacher profile details page view.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'teacherId', type: 'string', required: true, desc: 'Teacher ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher details.',
        body: {
          status: 'success',
          data: {
            id: '4001',
            teacher_id: 'TCH-001',
            name: 'Suresh Raina',
            contact_email: 'raina@school.edu',
            contact_mobile: '9876543240',
            assigned_sections: [
              { section_id: '601', class_name: 'Grade 10', section_name: 'A', subject: 'Physics' }
            ]
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Teacher not found.', body: { status: 'error', message: 'Teacher not found' } }
      ]
    }
  },
  {
    id: 'teacher-update-info',
    title: 'Update Teacher Profile & Contact Info',
    method: 'PUT',
    url: '/api/teachers/:teacherId',
    roles: ['BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Teacher Directory',
    description: 'Updates teacher contact email, mobile, or name.',
    frontendNotes: 'Used in the "Edit Teacher" modal.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'teacherId', type: 'string', required: true, desc: 'Teacher ID' }],
    queryParams: [],
    requestBody: { name: 'Dr. Suresh Raina', contact_mobile: '9876543241' },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher updated.',
        body: { status: 'success', message: 'Teacher updated successfully' }
      },
      errors: []
    }
  },
  {
    id: 'teacher-delete-profile',
    title: 'Delete Teacher Profile',
    method: 'DELETE',
    url: '/api/teachers/:teacherId',
    roles: ['BRANCH_ADMIN'],
    category: 'Teacher Directory',
    description: 'Deletes a teacher. Protected: Blocked if teacher is designated as Class Teacher or has published assignments.',
    frontendNotes: 'Reallocate class teacher and subject assignments before deleting.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'teacherId', type: 'string', required: true, desc: 'Teacher ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher deleted.',
        body: { status: 'success', message: 'Teacher deleted successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Assigned as class teacher or has assignments.', body: { status: 'error', message: 'Cannot delete teacher: assigned as Class Teacher for Section A' } }
      ]
    }
  },

  // =========================================================================
  // STUDENT ROSTER & ENROLLMENT APIS (BRANCH ADMIN & TEACHER)
  // =========================================================================
  {
    id: 'student-roster-list',
    title: 'List Student Roster in Section (Paginated)',
    method: 'GET',
    url: '/api/sections/:sectionId/students',
    roles: ['BRANCH_ADMIN', 'TEACHER'],
    category: 'Student Roster',
    description: 'Retrieves all enrolled students in a specific section, ordered by roll number or admission number.',
    frontendNotes: 'Main Section Roster table. Supports pagination with nextCursor.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Page size limit' },
      { key: 'cursor', type: 'string', required: false, desc: 'Cursor ID for next page' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Section student roster.',
        body: {
          status: 'success',
          data: [
            {
              id: '5001',
              admission_no: 'ADM-2026-001',
              roll_no: '101',
              name: 'Aarav Sharma',
              contact_email: 'aarav@school.edu',
              contact_mobile: '9876543250'
            }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: []
    }
  },
  {
    id: 'student-branch-search',
    title: 'Search Students Across Branch',
    method: 'GET',
    url: '/api/branch/:branchId/students/search',
    roles: ['BRANCH_ADMIN', 'TEACHER', 'CORPORATE_ADMIN'],
    category: 'Student Roster',
    description: 'Searches students across the entire campus by student name or admission number.',
    frontendNotes: 'Used for global student search bar in header. Debounce input by 300ms.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'branchId', type: 'string', required: true, desc: 'Branch ID' }],
    queryParams: [
      { key: 'q', type: 'string', required: true, desc: 'Search query' },
      { key: 'section_id', type: 'string', required: false, desc: 'Filter within specific section' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Matching students.',
        body: {
          status: 'success',
          data: [
            {
              id: '5001',
              name: 'Aarav Sharma',
              admission_no: 'ADM-2026-001',
              class_name: 'Grade 10',
              section_name: 'A'
            }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'student-enroll-single',
    title: 'Enroll Single Student into Section',
    method: 'POST',
    url: '/api/sections/:sectionId/students',
    roles: ['BRANCH_ADMIN', 'TEACHER'],
    category: 'Student Roster',
    description: 'Enrolls a student into a section with admission number, roll number, and initial login password.',
    frontendNotes: 'Rendered in "Enroll Student" modal. Admission number must be unique across branch.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: {
      admission_no: 'ADM-2026-001',
      roll_no: '101',
      name: 'Aarav Sharma',
      contact_email: 'aarav@school.edu',
      contact_mobile: '9876543250',
      parent_name: 'Rajesh Sharma',
      parent_contact: '9876543251',
      password: 'StudentPassword123!'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Student enrolled successfully.',
        body: {
          status: 'success',
          message: 'Student enrolled successfully',
          data: { id: '5001', name: 'Aarav Sharma', admission_no: 'ADM-2026-001' }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Admission number or roll number already in use.', body: { status: 'error', message: 'Admission number already exists' } }
      ]
    }
  },
  {
    id: 'student-enroll-bulk',
    title: 'Bulk Enroll Students via CSV / JSON',
    method: 'POST',
    url: '/api/sections/:sectionId/students/bulk',
    roles: ['BRANCH_ADMIN', 'TEACHER'],
    category: 'Student Roster',
    description: 'Batch enrollment of students with row-by-row validation. Returns exact counts of successful and failed rows with error descriptions.',
    frontendNotes: 'Frontend CSV upload feature: parse CSV to JSON array and post to this endpoint. Display summary cards of successes and errors.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: {
      students: [
        {
          admission_no: 'ADM-2026-001',
          roll_no: '101',
          name: 'Aarav Sharma',
          contact_email: 'aarav@school.edu',
          contact_mobile: '9876543250',
          password: 'Password123!'
        },
        {
          admission_no: 'ADM-2026-002',
          roll_no: '102',
          name: 'Diya Patel',
          contact_email: 'diya@school.edu',
          contact_mobile: '9876543252',
          password: 'Password123!'
        }
      ]
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Bulk enrollment summary.',
        body: {
          status: 'success',
          message: 'Enrolled 2 students successfully (0 failed)',
          data: {
            total_processed: 2,
            successful_count: 2,
            failed_count: 0,
            errors: []
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Malformed student array.', body: { status: 'error', message: 'students must be a non-empty array' } }
      ]
    }
  },
  {
    id: 'student-get-profile',
    title: 'Get Student Full Profile Details',
    method: 'GET',
    url: '/api/students/:studentId',
    roles: ['BRANCH_ADMIN', 'TEACHER', 'STUDENT'],
    category: 'Student Profile',
    description: 'Retrieves complete student dossier: academic enrollment, roll number, contact info, and parent details.',
    frontendNotes: 'Student profile modal / page view.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'studentId', type: 'string', required: true, desc: 'Student ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student profile.',
        body: {
          status: 'success',
          data: {
            id: '5001',
            admission_no: 'ADM-2026-001',
            roll_no: '101',
            name: 'Aarav Sharma',
            contact_email: 'aarav@school.edu',
            contact_mobile: '9876543250',
            parent_name: 'Rajesh Sharma',
            parent_contact: '9876543251',
            class_name: 'Grade 10',
            section_name: 'A'
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Student not found.', body: { status: 'error', message: 'Student not found' } }
      ]
    }
  },
  {
    id: 'student-update-profile',
    title: 'Update Student Profile & Demographics',
    method: 'PUT',
    url: '/api/students/:studentId',
    roles: ['BRANCH_ADMIN', 'TEACHER'],
    category: 'Student Profile',
    description: 'Updates student demographic and contact information.',
    frontendNotes: 'Used in the "Edit Student" drawer.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'studentId', type: 'string', required: true, desc: 'Student ID' }],
    queryParams: [],
    requestBody: {
      name: 'Aarav K. Sharma',
      contact_mobile: '9876543259',
      parent_contact: '9876543258'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student updated.',
        body: { status: 'success', message: 'Student profile updated successfully' }
      },
      errors: []
    }
  },
  {
    id: 'student-update-password',
    title: 'Admin / Class Teacher Update Student Password',
    method: 'PUT',
    url: '/api/students/:studentId/password',
    roles: ['BRANCH_ADMIN', 'TEACHER', 'CORPORATE_ADMIN'],
    category: 'Student Profile',
    description: 'Allows an authorized Branch Admin, Corporate Admin, or the assigned Section Class Teacher to update/reset a student\'s password directly without requiring student mobile OTP. Specially designed for K-12 school environments where students do not possess personal mobile phones.',
    frontendNotes: 'Role access rules: Branch Admin can reset password for any student in their branch; Class Teacher can reset password for any student enrolled in their assigned section; Corporate Admin can reset across the entity. Regular subject teachers without Class Teacher assignment for that section receive 403 Forbidden.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'studentId', type: 'string (BigInt)', required: true, desc: 'Student ID' }],
    queryParams: [],
    requestBody: {
      new_password: 'NewStudentPassword123!'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student password successfully updated.',
        body: { status: 'success', message: 'Student password updated successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Password shorter than 6 characters.', body: { status: 'error', message: 'Password must be at least 6 characters' } },
        { code: 401, status: 'Unauthorized', desc: 'Missing or invalid token.', body: { status: 'error', message: 'Unauthorized' } },
        { code: 403, status: 'Forbidden', desc: 'Teacher is not the designated class teacher of this section, or admin lacks branch access.', body: { status: 'error', message: 'Forbidden: Only the assigned class teacher of this section or a branch administrator can update this student\'s password' } },
        { code: 404, status: 'Not Found', desc: 'Student not found.', body: { status: 'error', message: 'Student not found' } }
      ]
    }
  },
  {
    id: 'student-delete-profile',
    title: 'Delete Student',
    method: 'DELETE',
    url: '/api/students/:studentId',
    roles: ['BRANCH_ADMIN'],
    category: 'Student Profile',
    description: 'Deletes a student. Protected: BLOCKED with 400 Bad Request if past evaluated test submissions exist on record.',
    frontendNotes: 'Warn user that students with exam history cannot be deleted to maintain academic integrity.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'studentId', type: 'string', required: true, desc: 'Student ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student deleted.',
        body: { status: 'success', message: 'Student deleted successfully' }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Evaluated submissions exist.', body: { status: 'error', message: 'Cannot delete student: 4 evaluated test submissions exist on record' } }
      ]
    }
  },
  {
    id: 'student-submissions-history',
    title: 'Student Test Submissions & Scorecard History',
    method: 'GET',
    url: '/api/students/:studentId/submissions',
    roles: ['BRANCH_ADMIN', 'TEACHER', 'STUDENT'],
    category: 'Scorecards & History',
    description: 'Retrieves all historical test submissions, scorecards, percentage trends, and teacher feedback for a student.',
    frontendNotes: 'Use on Student Performance / Report Card tab. Displays chart of scores over time.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'studentId', type: 'string', required: true, desc: 'Student ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Test submissions history.',
        body: {
          status: 'success',
          data: [
            {
              submission_id: '1401',
              assignment_title: 'Midterm Physics Assessment',
              subject_name: 'Physics',
              score: 36,
              max_score: 40,
              percentage: 90.0,
              status: 'approved',
              submitted_at: '2026-10-15T10:15:00.000Z'
            }
          ]
        }
      },
      errors: []
    }
  },

  // =========================================================================
  // TEACHER PORTAL APIS
  // =========================================================================
  {
    id: 'teacher-self-profile',
    title: 'Get Logged-in Teacher Profile',
    method: 'GET',
    url: '/api/teacher/profile',
    roles: ['TEACHER'],
    category: 'Teacher Portal',
    description: 'Returns profile details for the authenticated teacher.',
    frontendNotes: 'Render on top-right user menu in Teacher Portal.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Teacher JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher profile.',
        body: {
          status: 'success',
          data: {
            id: '4001',
            teacher_id: 'TCH-001',
            name: 'Suresh Raina',
            contact_email: 'raina@school.edu',
            contact_mobile: '9876543240'
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'teacher-dashboard',
    title: 'Teacher Home Dashboard Summary',
    method: 'GET',
    url: '/api/teacher/dashboard',
    roles: ['TEACHER'],
    category: 'Teacher Portal',
    description: 'Primary landing view for teachers. Returns all teaching sections, subjects taught, designated class teacher responsibilities, and pending grading counters.',
    frontendNotes: 'Renders the Teacher Home Page with cards for each assigned section/class.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Teacher JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Teacher dashboard overview.',
        body: {
          status: 'success',
          data: {
            teacher_id: 'TCH-001',
            teacher_name: 'Suresh Raina',
            assigned_sections: [
              { section_id: '601', class_name: 'Grade 10', section_name: 'A', subject_name: 'Physics', subject_code: 'PHY-10' }
            ],
            class_teacher_sections: [
              { section_id: '601', class_name: 'Grade 10', section_name: 'A', total_students: 28 }
            ]
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'teacher-section-subjects',
    title: 'Subjects Teacher Specifically Teaches in Section',
    method: 'GET',
    url: '/api/teacher/sections/:sectionId/subjects',
    roles: ['TEACHER'],
    category: 'Teacher Portal',
    description: 'Retrieves the specific subject(s) the teacher is assigned to teach within a given section.',
    frontendNotes: 'When a teacher opens a section, use this to populate the Subject tabs.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Teacher JWT' }],
    urlParams: [{ key: 'sectionId', type: 'string', required: true, desc: 'Section ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Subjects taught by teacher.',
        body: {
          status: 'success',
          data: [
            { subject_id: '701', subject_name: 'Physics', code: 'PHY-10', class_subject_id: '801' }
          ]
        }
      },
      errors: []
    }
  },

  // =========================================================================
  // ASSIGNMENT INGESTION & PIPELINE APIS (TEACHER & BRANCH ADMIN)
  // =========================================================================
  {
    id: 'assign-upload-urls',
    title: 'Generate Pre-signed S3 Upload URLs',
    method: 'POST',
    url: '/api/assignments/upload-urls',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Generates secure AWS S3 Pre-signed PUT URLs for direct client-side uploads of question paper PDFs and optional teacher answer keys.',
    frontendNotes: 'Workflow Step 1: Upload file directly to data.question_paper_presigned_url with PUT method, then call /process-async.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      question_paper_filename: 'physics_midterm.pdf',
      answer_key_filename: 'physics_midterm_key.pdf'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Pre-signed S3 URLs generated.',
        body: {
          status: 'success',
          data: {
            question_paper_presigned_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/...',
            question_paper_s3_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/papers/physics_midterm.pdf',
            answer_key_presigned_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/...',
            answer_key_s3_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/keys/physics_midterm_key.pdf'
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Missing filename.', body: { status: 'error', message: 'question_paper_filename is required' } }
      ]
    }
  },
  {
    id: 'assign-process-async',
    title: 'Enqueue Papers for Async OCR & AI Model Routing',
    method: 'POST',
    url: '/api/assignments/process-async',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Enqueues uploaded paper S3 URLs into the processing pipeline for OCR question extraction and dynamic LLM reasoning model selection.',
    frontendNotes: 'Workflow Step 2: Returns assignment_id and status: ocr_processing. Next, poll pipeline-status.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      section_id: '601',
      class_subject_id: '801',
      title: 'Physics Unit Test 1',
      difficulty: 'Medium',
      duration_minutes: 60,
      question_paper_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/papers/physics_midterm.pdf',
      answer_key_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/keys/physics_midterm_key.pdf'
    },
    responses: {
      success: {
        code: 202,
        status: 'Accepted',
        desc: 'Processing job accepted.',
        body: {
          status: 'success',
          message: 'Assignment queued for async OCR extraction',
          data: {
            assignment_id: '1501',
            status: 'ocr_processing',
            poll_url: '/api/assignments/1501/pipeline-status'
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'assign-pipeline-status',
    title: 'Poll OCR & AI Reasoning Pipeline Status',
    method: 'GET',
    url: '/api/assignments/:id/pipeline-status',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Polls the status of question extraction and reasoning model selection. When ready, returns extracted questions for teacher review.',
    frontendNotes: 'Poll every 3 seconds until status is ready or failed. Stop polling once ready.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Assignment ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Pipeline status with extracted questions.',
        body: {
          status: 'success',
          data: {
            assignment_id: '1501',
            status: 'ready',
            reasoning_model: 'gemini-1.5-pro',
            extracted_questions: [
              { question_number: 1, question_text: 'Define Ohm\'s Law.', max_marks: 5 }
            ]
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Assignment not found.', body: { status: 'error', message: 'Assignment not found' } }
      ]
    }
  },
  {
    id: 'assign-create-sync',
    title: 'Synchronous Upload & Inline OCR Fallback',
    method: 'POST',
    url: '/api/assignments/create-sync',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Synchronous fallback for manual question entry or offline question papers.',
    frontendNotes: 'Use when teacher manually types questions or uploads pre-structured test papers.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      section_id: '601',
      class_subject_id: '801',
      title: 'Physics Quick Quiz',
      difficulty: 'Easy',
      duration_minutes: 30,
      question_paper_url: 'https://...',
      questions: [
        { question_number: 1, question_text: 'What is SI unit of Force?', max_marks: 5 }
      ]
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Assignment created.',
        body: {
          status: 'success',
          data: { id: '1502', title: 'Physics Quick Quiz', status: 'ready' }
        }
      },
      errors: []
    }
  },
  {
    id: 'assign-publish',
    title: 'Finalize, Review Questions & Publish to Section',
    method: 'POST',
    url: '/api/assignments',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Finalizes teacher edits to questions, sets due date, and publishes the assignment. It becomes immediately visible to students in the section.',
    frontendNotes: 'Workflow Final Step: Confirms and publishes test to student portal.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      assignment_id: '1501',
      title: 'Midterm Physics Assessment',
      due_date: '2026-10-25T23:59:59.000Z',
      questions_json: [
        { question_number: 1, question_text: 'Define electric potential.', max_marks: 10 }
      ]
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Assignment published.',
        body: {
          status: 'success',
          message: 'Assignment finalized and published successfully',
          data: { id: '1501', status: 'published' }
        }
      },
      errors: []
    }
  },
  {
    id: 'assign-list',
    title: 'List Assignments for Section Subject',
    method: 'GET',
    url: '/api/assignments',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Filterable list of assignments with submission counters and publication statuses.',
    frontendNotes: 'Filter by section_id and class_subject_id.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [
      { key: 'section_id', type: 'string', required: true, desc: 'Section ID' },
      { key: 'class_subject_id', type: 'string', required: false, desc: 'Subject filter' },
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Limit' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of assignments.',
        body: {
          status: 'success',
          data: [
            { id: '1501', title: 'Midterm Physics Assessment', status: 'published', total_submissions: 28 }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'assign-get-details',
    title: 'Get Assignment Details & Questions',
    method: 'GET',
    url: '/api/assignments/:id',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'STUDENT'],
    category: 'Assignment Pipeline',
    description: 'Retrieves complete test paper details, question paper URL, and question breakdown. Answer keys are included for teachers/admins.',
    frontendNotes: 'Students use this to view test details before submission.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Assignment ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Assignment details.',
        body: {
          status: 'success',
          data: {
            id: '1501',
            title: 'Midterm Physics Assessment',
            question_paper_url: 'https://...',
            questions_json: [
              { question_number: 1, question_text: 'Define electric potential.', max_marks: 10 }
            ]
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'assign-delete',
    title: 'Delete Assignment & Purge Submissions',
    method: 'DELETE',
    url: '/api/assignments/:id',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Assignment Pipeline',
    description: 'Deletes an assignment and cascades deletion across related student submissions, scorecards, and batch jobs.',
    frontendNotes: 'Show destructive action warning modal.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Assignment ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Assignment deleted.',
        body: { status: 'success', message: 'Assignment and associated student submissions deleted successfully' }
      },
      errors: []
    }
  },

  // =========================================================================
  // TEACHER GRADING & REVIEW WORKFLOW (SECTION 12)
  // =========================================================================
  {
    id: 'grading-list-submissions',
    title: 'List Student Submissions for Assignment',
    method: 'GET',
    url: '/api/assignments/:id/submissions',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Grading & Review',
    description: 'Lists all student answer sheet submissions for a specific test paper, showing submission time, score, and review status.',
    frontendNotes: 'Grading queue table view. Filter by status: pending_review, submitted, approved.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Assignment ID' }],
    queryParams: [
      { key: 'status', type: 'string', required: false, desc: 'submitted | approved | pending_review' },
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Limit per page' },
      { key: 'cursor', type: 'string', required: false, desc: 'Cursor for next page' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Submissions list.',
        body: {
          status: 'success',
          data: [
            {
              id: '1401',
              student_id: '5001',
              student_name: 'Aarav Sharma',
              roll_no: '101',
              score: 34,
              max_score: 40,
              status: 'pending_review',
              submitted_at: '2026-10-15T10:15:00.000Z'
            }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: [
        { code: 403, status: 'Forbidden', desc: 'Access denied to branch.', body: { message: 'Forbidden: You do not have access to this branch' } },
        { code: 404, status: 'Not Found', desc: 'Assignment not found.', body: { status: 'error', message: 'Assignment not found' } }
      ]
    }
  },
  {
    id: 'grading-get-submission',
    title: 'Inspect Submission Scorecard, OCR & Feedback',
    method: 'GET',
    url: '/api/submissions/:id',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Grading & Review',
    description: 'Retrieves complete submission inspection data: high-resolution scanned paper URLs, OCR transcript text, question-by-question scoring breakdown, and feedback.',
    frontendNotes: 'Side-by-side grading interface: render handwritten image on the left, OCR text & scoring breakdown on the right.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Submission ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Submission inspection data.',
        body: {
          status: 'success',
          data: {
            id: '1401',
            assignment_id: '1501',
            student: { id: '5001', name: 'Aarav Sharma', roll_no: '101' },
            sample_paper_urls: ['https://.../page1.jpg', 'https://.../page2.jpg'],
            ocr_text: 'Question 1: Electric potential unit is Volt...',
            score: 34,
            max_score: 40,
            feedback: 'Clear diagrams and accurate formula usage.',
            socratic_hint: 'Double check units when multiplying power and time.',
            status: 'pending_review',
            question_breakdown: [
              { question_number: 1, marks_awarded: 10, max_marks: 10, verdict: 'correct' },
              { question_number: 2, marks_awarded: 24, max_marks: 30, verdict: 'partial' }
            ]
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Submission not found.', body: { status: 'error', message: 'Submission not found' } }
      ]
    }
  },
  {
    id: 'grading-approve-submission',
    title: 'Approve Evaluated Paper & Notify Student',
    method: 'POST',
    url: '/api/submissions/:id/approve',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Grading & Review',
    description: 'Teacher reviews, adjusts score/comments, and approves the paper. Sets status to approved and dispatches a scorecard release notification to the student.',
    frontendNotes: 'On click "Approve Scorecard", triggers instant student notification.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Submission ID' }],
    queryParams: [],
    requestBody: {
      final_score: 36,
      final_feedback: 'Excellent work. Checked and approved by Subject Teacher.',
      final_hint: 'Review kinetic friction equation before next unit test.'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Submission approved.',
        body: {
          status: 'success',
          message: 'Submission approved successfully',
          data: {
            id: '1401',
            status: 'approved',
            final_score: 36,
            final_feedback: 'Excellent work. Checked and approved by Subject Teacher.'
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Negative score.', body: { status: 'error', message: 'Final score must be non-negative' } }
      ]
    }
  },
  {
    id: 'grading-override-score',
    title: 'Teacher Manual Score Override',
    method: 'POST',
    url: '/api/submissions/:id/override',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Grading & Review',
    description: 'Teacher directly overrides the awarded score and question step marks.',
    frontendNotes: 'Use when teacher manually adjusts AI-awarded marks.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Submission ID' }],
    queryParams: [],
    requestBody: {
      score: 38,
      feedback: 'Marks adjusted following re-evaluation of Q2 step marks.'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Score overridden.',
        body: {
          status: 'success',
          data: { id: '1401', score: 38, status: 'approved' }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Score must be non-negative.', body: { status: 'error', message: 'Score must be non-negative' } }
      ]
    }
  },
  {
    id: 'grading-bulk-upload',
    title: 'Bulk Upload Section Answer Sheets Stack (BatchJob)',
    method: 'POST',
    url: '/api/submissions/bulk',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Grading & Review',
    description: 'Uploads a combined physical paper stack for an entire section. Initiates an async BatchJob for page splitting, student identification, OCR, and AI grading.',
    frontendNotes: 'Returns HTTP 202 Accepted with poll_url. Frontend displays batch processing progress bar.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      assignment_id: '1501',
      bulk_mode: 'combined_pdf',
      total_files: 35,
      sample_paper_urls: ['https://paatam-uploads.s3.ap-south-2.amazonaws.com/batch/master_stack_35_students.pdf']
    },
    responses: {
      success: {
        code: 202,
        status: 'Accepted',
        desc: 'Batch job queued.',
        body: {
          status: 'success',
          data: {
            job_id: '1701',
            status: 'queued',
            stage: 'splitting',
            total_files: 35,
            poll_url: '/api/submissions/batch/1701'
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Missing assignment_id.', body: { status: 'error', message: 'assignment_id is required' } }
      ]
    }
  },
  {
    id: 'grading-batch-status',
    title: 'Poll Batch Paper Splitting & Evaluation Progress',
    method: 'GET',
    url: '/api/submissions/batch/:jobId',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Grading & Review',
    description: 'Status polling endpoint for batch paper upload jobs. Returns processed counts, status, and created submissions list.',
    frontendNotes: 'Poll every 3 seconds to update progress bar (processed_count / total_files * 100).',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'jobId', type: 'string', required: true, desc: 'Batch Job ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Batch job progress status.',
        body: {
          status: 'success',
          data: {
            job_id: '1701',
            status: 'completed',
            stage: 'completed',
            total_files: 35,
            processed_count: 35,
            successful_count: 35,
            failed_count: 0,
            created_submissions: [
              { submission_id: '1401', student_name: 'Aarav Sharma' },
              { submission_id: '1402', student_name: 'Diya Patel' }
            ]
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Batch job not found.', body: { status: 'error', message: 'Batch job not found' } }
      ]
    }
  },

  // =========================================================================
  // STUDENT PORTAL APIS (STUDENT ROLE)
  // =========================================================================
  {
    id: 'student-self-profile',
    title: 'Get Logged-in Student Profile',
    method: 'GET',
    url: '/api/student/profile',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Retrieves current student personal profile, class, section, and contact details.',
    frontendNotes: 'Displays in Student Portal top bar / settings.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student profile details.',
        body: {
          status: 'success',
          data: {
            id: '5001',
            name: 'Aarav Sharma',
            admission_no: 'ADM-2026-001',
            roll_no: '101',
            email: 'aarav@school.edu',
            mobile: '9876543250',
            class_name: 'Grade 10',
            section_name: 'A'
          }
        }
      },
      errors: []
    }
  },
  {
    id: 'student-dashboard',
    title: 'Student Landing Dashboard & Summary',
    method: 'GET',
    url: '/api/student/dashboard',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Primary landing screen for students. Returns enrolled class, section, designated class teacher name/email, active subjects, and real-time pending vs. completed test counters.',
    frontendNotes: 'Renders the Student Home Page. Use pending_count badge on the Assignments tab.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student dashboard overview.',
        body: {
          status: 'success',
          data: {
            class_name: 'Grade 10',
            section_name: 'A',
            class_teacher: {
              id: '4001',
              name: 'Suresh Raina',
              email: 'raina@school.edu'
            },
            subjects: [
              { id: '701', name: 'Physics', code: 'PHY-10' },
              { id: '702', name: 'Mathematics', code: 'MTH-10' }
            ],
            pending_count: 2,
            completed_count: 5
          }
        }
      },
      errors: [
        { code: 403, status: 'Forbidden', desc: 'Non-student role access.', body: { message: 'Forbidden: Insufficient permissions' } }
      ]
    }
  },
  {
    id: 'student-assignments-list',
    title: 'Filterable Student Assignments List',
    method: 'GET',
    url: '/api/student/assignments',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Filterable list of assignments published to the student\'s section. Supports filtering by status: pending (unsubmitted) or completed (already submitted).',
    frontendNotes: 'Tabs on frontend: "Pending Tests" (?status=pending) and "Completed Tests" (?status=completed).',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' }],
    urlParams: [],
    queryParams: [
      { key: 'status', type: 'string', required: false, desc: 'pending | completed' },
      { key: 'limit', type: 'number', required: false, default: '10', desc: 'Limit' },
      { key: 'cursor', type: 'string', required: false, desc: 'Next cursor' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student assignments list.',
        body: {
          status: 'success',
          data: [
            {
              id: '1501',
              title: 'Midterm Physics Assessment',
              subject_name: 'Physics',
              difficulty: 'Medium',
              duration_minutes: 60,
              due_date: '2026-10-25T23:59:59.000Z',
              is_submitted: false,
              submission_id: null
            }
          ],
          meta: { nextCursor: null, hasNextPage: false }
        }
      },
      errors: []
    }
  },
  {
    id: 'student-assignment-details',
    title: 'Student View of Test Paper & Questions',
    method: 'GET',
    url: '/api/student/assignments/:id',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Student view of a test paper. Returns question paper URL and question prompts. Crucially: teacher answer keys and grading rubrics are scrubbed for exam integrity.',
    frontendNotes: 'Student exam taking screen. Shows PDF viewer and question checklist.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Assignment ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Sanitized question paper view.',
        body: {
          status: 'success',
          data: {
            id: '1501',
            title: 'Midterm Physics Assessment',
            difficulty: 'Medium',
            duration_minutes: 60,
            question_paper_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/papers/midterm.pdf',
            questions: [
              { question_number: 1, question_text: 'Define electric potential and write its SI unit.', max_marks: 10 }
            ]
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Assignment not found or in different section.', body: { status: 'error', message: 'Assignment not found' } }
      ]
    }
  },
  {
    id: 'student-submit-paper',
    title: 'Submit Handwritten Answer Sheets',
    method: 'POST',
    url: '/api/student/assignments/:id/submit',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Student submits handwritten answer sheets (S3 URLs or file uploads). Creates a Submission record in status submitted and triggers an immediate confirmation notification.',
    frontendNotes: 'Upload photos/scans of student handwritten answer sheets. Displays submission receipt modal on completion.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Assignment ID' }],
    queryParams: [],
    requestBody: {
      sample_paper_urls: [
        'https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/aarav_page1.jpg',
        'https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/aarav_page2.jpg'
      ]
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Submission received.',
        body: {
          status: 'success',
          message: 'Answer sheets submitted successfully',
          data: {
            submission_id: '1401',
            assignment_id: '1501',
            status: 'submitted',
            submitted_at: '2026-10-16T12:00:00.000Z'
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Assignment not found in student section.', body: { status: 'error', message: 'Assignment not found' } }
      ]
    }
  },
  {
    id: 'student-submission-scorecard',
    title: 'Student View Graded Scorecard & Socratic Hints',
    method: 'GET',
    url: '/api/student/submissions/:id',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Student views their graded scorecard, marks breakdown, teacher comments, and AI Socratic hints. Strictly guarded: access by any other student is blocked with 403 Forbidden.',
    frontendNotes: 'Scorecard Modal / Results Screen. Socratic hints offer guidance on areas for improvement.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Submission ID' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student graded scorecard.',
        body: {
          status: 'success',
          data: {
            id: '1401',
            assignment_title: 'Midterm Physics Assessment',
            status: 'approved',
            score: 36,
            max_score: 40,
            feedback: 'Excellent work. Checked and approved by Subject Teacher.',
            socratic_hint: 'Review kinetic friction equation before next unit test.',
            submitted_at: '2026-10-15T10:15:00.000Z'
          }
        }
      },
      errors: [
        { code: 403, status: 'Forbidden', desc: 'Cross-student access attempt.', body: { status: 'error', message: 'Forbidden: Access denied to this submission' } },
        { code: 404, status: 'Not Found', desc: 'Submission not found.', body: { status: 'error', message: 'Submission not found' } }
      ]
    }
  },
  {
    id: 'student-notifications-feed',
    title: 'Student Notification Feed',
    method: 'GET',
    url: '/api/student/notifications',
    roles: ['STUDENT'],
    category: 'Student Portal',
    description: 'Retrieves chronological notification feed for the student: assignments published, answer sheets received, and approved scorecards released.',
    frontendNotes: 'Notification Bell dropdown on student dashboard header. Poll every 60 seconds or on page focus.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Student JWT' }],
    urlParams: [],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Notification feed.',
        body: {
          status: 'success',
          data: [
            {
              id: '1601',
              type: 'GRADE_RELEASED',
              title: 'Scorecard Released',
              message: 'Your scorecard for "Midterm Physics Assessment" has been approved and released.',
              timestamp: '2026-10-16T12:05:00.000Z',
              read: false
            },
            {
              id: '1600',
              type: 'SUBMISSION_RECEIVED',
              title: 'Assignment Submitted',
              message: 'Your answer sheets for "Midterm Physics Assessment" have been submitted successfully.',
              timestamp: '2026-10-16T12:00:00.000Z',
              read: false
            }
          ]
        }
      },
      errors: []
    }
  },
  {
    id: 'assignment-ai-generate',
    title: 'Generate Question Paper with AI Blueprint',
    method: 'POST',
    url: '/api/assignments/generate',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Generates a complete, structured CBSE/ICSE exam question paper with section headings, MCQs, short, and descriptive questions based on syllabus topics or textbook chapters.',
    frontendNotes: 'Used in the Paper Creation Wizard when the teacher selects "Generate with AI". Provides a complete questions preview for review before publishing.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      class_subject_id: '1001',
      exam_title: 'Class 10 CBSE Midterm Science Examination',
      target_marks: 40,
      language: 'English',
      difficulty: 'Medium',
      chapter_titles: ['Acids, Bases and Salts', 'Chemical Reactions'],
      subtopics: ['Neutralisation reactions', 'pH scale', 'Types of chemical reactions'],
      question_counts: {
        mcqCount: 10,
        veryShortCount: 5,
        shortCount: 3,
        descriptiveCount: 2
      }
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'AI exam paper generated successfully.',
        body: {
          status: 'success',
          message: 'AI Exam Paper generated successfully',
          data: {
            exam_title: 'Class 10 CBSE Midterm Science Examination',
            target_marks: 40,
            total_marks: 40,
            questions_count: 20,
            questions: [
              {
                id: 'q1',
                questionNo: '1',
                section: 'Section A',
                type: 'mcq',
                text: 'Which of the following turns blue litmus red?',
                marks: 1,
                options: ['Dilute HCl', 'Sodium hydroxide', 'Distilled water', 'Baking soda'],
                correctAnswer: 'Dilute HCl',
                hasVisual: false
              }
            ]
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Invalid payload.', body: { status: 'error', message: 'Validation failed' } },
        { code: 403, status: 'Forbidden', desc: 'Branch access denied.', body: { message: 'Forbidden: You do not have access to this branch' } }
      ]
    }
  },
  {
    id: 'assignment-ai-regenerate-question',
    title: 'Regenerate Single Alternative Question',
    method: 'POST',
    url: '/api/assignments/regenerate-question',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Generates a single alternative question targeting the same subtopic and marks weightage while avoiding rejected or duplicate questions.',
    frontendNotes: 'Add a "Shuffle / Regenerate" button next to each question on the paper review step.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      class_subject_id: '1001',
      question_to_replace: {
        id: 'q1',
        questionNo: '1',
        section: 'Section A',
        type: 'mcq',
        text: 'What is the pH of pure water at 25°C?',
        marks: 1,
        options: ['7', '1', '14', '0'],
        correctAnswer: '7'
      },
      chapter_title: 'Acids, Bases and Salts',
      subtopic: 'pH scale',
      difficulty: 'Medium',
      language: 'English',
      avoid_texts: ['What is the pH of pure water at 25°C?']
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Alternative question generated.',
        body: {
          status: 'success',
          message: 'Alternative question generated successfully',
          data: {
            question: {
              id: 'q1-alt-1',
              questionNo: '1',
              section: 'Section A',
              type: 'mcq',
              text: 'Which of the following substances has a pH value strictly greater than 7?',
              marks: 1,
              options: ['Milk of Magnesia', 'Lemon juice', 'Tomato juice', 'Gastric juice'],
              correctAnswer: 'Milk of Magnesia',
              hasVisual: false
            }
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Invalid payload.', body: { status: 'error', message: 'Validation failed' } }
      ]
    }
  },
  {
    id: 'assignment-ai-generate-diagram',
    title: 'Generate Technical STEM Question Diagram',
    method: 'POST',
    url: '/api/assignments/generate-diagram',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Generates high-resolution diagrams, geometric figures, or circuit schematics for STEM questions using AI image rendering with SVG vector fallback.',
    frontendNotes: 'Allows teachers to auto-generate illustrations for questions that require visual diagrams.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      question_text: 'Draw a ray diagram illustrating the formation of image by a concave mirror when object is placed at centre of curvature.',
      subject: 'Physics'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Diagram generated successfully.',
        body: {
          status: 'success',
          message: 'Technical diagram generated successfully',
          data: {
            image_url: 'https://s3.amazonaws.com/paatam/diagrams/diagram-17610283.png',
            diagram_svg: '<svg width="100%" height="auto">...</svg>',
            type: 'image'
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'question_text is required.', body: { status: 'error', message: 'Validation failed' } }
      ]
    }
  },
  {
    id: 'curriculum-chapter-ingest',
    title: 'Ingest Textbook Chapter Document (RAG)',
    method: 'POST',
    url: '/api/curriculum/chapters/ingest',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Ingests textbook chapter content, automatically extracts chapter title, number, subtopics, and prerequisites, generates 1536-dimensional vector embeddings, and stores them in PostgreSQL pgvector.',
    frontendNotes: 'Teachers upload PDF chapters or paste chapter text to populate the school knowledge base.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      class_subject_id: '1001',
      chapter_title: 'Acids, Bases and Salts',
      chapter_number: 2,
      chapter_text: 'Acids have sour taste and turn blue litmus red...',
      pdf_url: 'https://s3.amazonaws.com/paatam/curriculum/ch2.pdf',
      file_name: 'science_ch2.pdf'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Chapter indexed and vectorized.',
        body: {
          status: 'success',
          message: 'Chapter indexed into curriculum and vectorized into vector store',
          data: {
            chapter_id: '102',
            chapter_number: 2,
            chapter_title: 'Acids, Bases and Salts',
            subtopics: ['Properties of Acids', 'Bases', 'pH Scale', 'Salts'],
            chunk_count: 14
          }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'ClassSubject not found.', body: { status: 'error', message: 'ClassSubject not found' } }
      ]
    }
  },
  {
    id: 'curriculum-chapter-list',
    title: 'List Indexed Textbook Chapters',
    method: 'GET',
    url: '/api/curriculum/chapters',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Retrieves all textbook chapters, identified subtopics, and chunk counts for a given subject.',
    frontendNotes: 'Populates the multi-select chapter filter in the AI Question Paper generator.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [{ key: 'class_subject_id', type: 'string', required: true, desc: 'ClassSubject ID' }],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of chapters.',
        body: {
          status: 'success',
          data: [
            {
              id: '102',
              chapter_number: 2,
              chapter_title: 'Acids, Bases and Salts',
              subtopics: ['Properties of Acids', 'Bases', 'pH Scale', 'Salts'],
              chunk_count: 14,
              pdf_url: 'https://s3.amazonaws.com/paatam/curriculum/ch2.pdf'
            }
          ]
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'ClassSubject not found.', body: { status: 'error', message: 'ClassSubject not found' } }
      ]
    }
  },
  {
    id: 'curriculum-syllabus-ingest',
    title: 'Ingest Syllabus Structure & Weightage',
    method: 'POST',
    url: '/api/curriculum/syllabus/ingest',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Extracts curriculum units, syllabus topics, and exam marks weightages using AI.',
    frontendNotes: 'Allows importing the official board syllabus breakdown for blueprint alignment.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [],
    requestBody: {
      class_subject_id: '1001',
      syllabus_text: 'Unit I: Chemical Substances - Nature and Behaviour (25 Marks)...'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Syllabus indexed.',
        body: {
          status: 'success',
          message: 'Syllabus topics parsed and indexed successfully',
          data: {
            topics_count: 5,
            topics: [{ name: 'Chemical Substances - Nature and Behaviour', marks: 25, unit: 'Unit I' }]
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Invalid input.', body: { status: 'error', message: 'Validation failed' } }
      ]
    }
  },
  {
    id: 'curriculum-topics-list',
    title: 'List Syllabus Topics & Marks Weightage',
    method: 'GET',
    url: '/api/curriculum/topics',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'AI Question Generator & Curriculum RAG',
    description: 'Lists all curriculum syllabus topics and marks weightage breakdown for a class subject.',
    frontendNotes: 'Displays unit weightage bars and topic checklist in the exam generator UI.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [{ key: 'class_subject_id', type: 'string', required: true, desc: 'ClassSubject ID' }],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'List of syllabus topics.',
        body: {
          status: 'success',
          data: [
            {
              id: '501',
              topic_name: 'Chemical Substances - Nature and Behaviour',
              subtopics: ['Chemical reactions', 'Acids, bases and salts'],
              weightage: 25,
              unit: 'Unit I'
            }
          ]
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'ClassSubject not found.', body: { status: 'error', message: 'ClassSubject not found' } }
      ]
    }
  },
  {
    id: 'submissions-list-global',
    title: 'Global Review Queue & Submissions Feed',
    method: 'GET',
    url: '/api/submissions',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Grading & Review',
    description: 'Fetches a branch-wide or teacher-assigned list of all student submissions for the evaluation review queue. Supports filtering by status, assignment_id, class_id, section_id, and cursor pagination.',
    frontendNotes: 'Used in Overview.tsx, ReviewQueue.tsx, and Dashboard.tsx to display all pending or completed submissions across all assignments in one central table.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [
      { key: 'assignment_id', type: 'string', required: false, desc: 'Filter by specific assignment' },
      { key: 'status', type: 'string', required: false, desc: 'Filter by status (e.g. submitted, pending_review, graded, approved)' },
      { key: 'class_id', type: 'string', required: false, desc: 'Filter by class' },
      { key: 'section_id', type: 'string', required: false, desc: 'Filter by section' },
      { key: 'cursor', type: 'string', required: false, desc: 'Pagination cursor ID' },
      { key: 'limit', type: 'number', required: false, desc: 'Items per page (max 10, default 10)' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Submissions list with pagination metadata.',
        body: {
          status: 'success',
          data: [
            {
              id: '3233756592734400',
              assignment_id: '1001',
              assignment_title: 'Mid-Term Mathematics Exam',
              subject_name: 'Mathematics',
              student_id: '2001',
              student_name: 'Aryabhata',
              roll_no: '101',
              admission_no: 'ADM-2026-001',
              class_name: 'Grade 10',
              section_name: 'A',
              score: 36,
              max_score: 40,
              status: 'graded',
              evaluation_status: 'completed',
              submitted_at: '2026-10-23T12:00:00.000Z',
              sample_paper_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/paper-1.pdf'
            }
          ],
          meta: { nextCursor: '3233756592734400', hasNextPage: false }
        }
      },
      errors: [
        { code: 401, status: 'Unauthorized', desc: 'Missing or invalid token.', body: { message: 'Unauthorized: Missing or invalid token' } },
        { code: 403, status: 'Forbidden', desc: 'Insufficient role permissions.', body: { message: 'Forbidden: Insufficient permissions' } }
      ]
    }
  },
  {
    id: 'submissions-create-single',
    title: 'Direct Single-Script Upload & Evaluation Queue',
    method: 'POST',
    url: '/api/submissions',
    roles: ['TEACHER', 'BRANCH_ADMIN'],
    category: 'Grading & Review',
    description: 'Allows a teacher to directly upload an individual student handwritten paper or single scanned script, and immediately enqueue it for automated OCR extraction and AI evaluation.',
    frontendNotes: 'Used in ScanGrade.tsx and Dashboard.tsx when teachers scan a physical exam paper on a smartphone camera or desktop scanner.',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      assignment_id: '1001',
      student_id: '2001',
      sample_paper_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/sheet-1.pdf',
      submission_mode: 'HANDWRITTEN'
    },
    responses: {
      success: {
        code: 201,
        status: 'Created',
        desc: 'Single submission created and dispatched to SQS AI evaluation pipeline.',
        body: {
          status: 'success',
          message: 'Submission created and queued for AI evaluation',
          data: {
            submission_id: '3233756592734400',
            assignment_id: '1001',
            student_id: '2001',
            status: 'submitted',
            evaluation_status: 'pending_ocr',
            sample_paper_url: 'https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/sheet-1.pdf',
            submitted_at: '2026-10-23T12:00:00.000Z'
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Student does not belong to assignment section or URL missing.', body: { status: 'error', message: 'Student does not belong to this assignment section' } },
        { code: 404, status: 'Not Found', desc: 'Assignment or student not found.', body: { status: 'error', message: 'Assignment not found' } }
      ]
    }
  },
  {
    id: 'submissions-delete-single',
    title: 'Delete Single Student Submission',
    method: 'DELETE',
    url: '/api/submissions/:id',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Grading & Review',
    description: 'Deletes an individual student submission from the review queue (e.g. if blurry, corrupt, or re-scanned) without deleting the entire assignment or affecting other classmates.',
    frontendNotes: 'Call this from PaperDetail.tsx or ReviewQueue.tsx when a teacher clicks "Delete & Re-scan Paper".',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [{ key: 'id', type: 'string', required: true, desc: 'Submission ID to delete' }],
    queryParams: [],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Submission purged successfully.',
        body: {
          status: 'success',
          message: 'Submission deleted successfully',
          data: { id: '3233756592734400' }
        }
      },
      errors: [
        { code: 404, status: 'Not Found', desc: 'Submission not found.', body: { status: 'error', message: 'Submission not found' } }
      ]
    }
  },
  {
    id: 'analytics-overview',
    title: 'Branch & Class Academic Performance Overview',
    method: 'GET',
    url: '/api/analytics/overview',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Analytics & Reporting',
    description: 'Supplies aggregated KPIs, average percentages, pass percentages, letter grade distributions (A, B, C, D, F), score buckets, and subject breakdown for the Analytics dashboard.',
    frontendNotes: 'Powers the charts, bell curves, and KPI summary tiles on Analytics.tsx.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [
      { key: 'class_id', type: 'string', required: false, desc: 'Filter by Class ID' },
      { key: 'section_id', type: 'string', required: false, desc: 'Filter by Section ID' },
      { key: 'subject_id', type: 'string', required: false, desc: 'Filter by Subject ID' },
      { key: 'assignment_id', type: 'string', required: false, desc: 'Filter by Assignment ID' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Aggregated analytics metrics.',
        body: {
          status: 'success',
          data: {
            total_assignments: 12,
            total_submissions: 340,
            evaluated_submissions: 325,
            unique_students_evaluated: 28,
            average_score_percentage: 76.4,
            pass_percentage: 92.3,
            grade_distribution: { A: 120, B: 95, C: 60, D: 25, F: 25 },
            score_distribution: { '0-20%': 10, '21-40%': 25, '41-60%': 60, '61-80%': 110, '81-100%': 120 },
            subject_performance: [
              { subject_name: 'Mathematics', average_score: 78.2, total_evaluations: 160 },
              { subject_name: 'Physics', average_score: 74.5, total_evaluations: 165 }
            ]
          }
        }
      },
      errors: [
        { code: 401, status: 'Unauthorized', desc: 'Missing or invalid token.', body: { message: 'Unauthorized' } }
      ]
    }
  },
  {
    id: 'analytics-students',
    title: 'Student Roster Performance & Grade Rankings',
    method: 'GET',
    url: '/api/analytics/students',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Analytics & Reporting',
    description: 'Returns student-by-student academic performance metrics including average percentage scores, overall letter grades, and highest/lowest test marks with cursor pagination.',
    frontendNotes: 'Powers the student rank list and performance table on Analytics.tsx.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [
      { key: 'class_id', type: 'string', required: false, desc: 'Filter by Class ID' },
      { key: 'section_id', type: 'string', required: false, desc: 'Filter by Section ID' },
      { key: 'cursor', type: 'string', required: false, desc: 'Cursor ID for pagination' },
      { key: 'limit', type: 'number', required: false, desc: 'Page size (default 10, max 50)' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Student analytics list with cursor pagination.',
        body: {
          status: 'success',
          data: [
            {
              id: '2001',
              name: 'Aryabhata',
              roll_no: '101',
              admission_no: 'ADM-2026-001',
              class_name: 'Grade 10',
              section_name: 'A',
              total_submissions: 5,
              evaluated_submissions: 5,
              average_score: 90,
              grade: 'A',
              highest_score: 95,
              lowest_score: 85
            }
          ],
          meta: { nextCursor: '2001', hasNextPage: false }
        }
      },
      errors: []
    }
  },
  {
    id: 'notifications-list',
    title: 'System & Parent Notification Delivery Feed',
    method: 'GET',
    url: '/api/notifications',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN', 'STUDENT'],
    category: 'Notifications & Alerts',
    description: 'Lists system notifications, parent SMS/WhatsApp delivery receipts, and student submission alerts with delivery status (delivered, sent, pending, failed).',
    frontendNotes: 'Used in ParentPortal.tsx to view WhatsApp and SMS delivery logs sent to student guardians.',
    headers: [{ key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' }],
    urlParams: [],
    queryParams: [
      { key: 'type', type: 'string', required: false, desc: 'Filter by notification type' },
      { key: 'delivery_status', type: 'string', required: false, desc: 'Filter by delivery status' },
      { key: 'cursor', type: 'string', required: false, desc: 'Pagination cursor ID' },
      { key: 'limit', type: 'number', required: false, desc: 'Limit per page' }
    ],
    requestBody: null,
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Notification logs feed.',
        body: {
          status: 'success',
          data: [
            {
              id: '5001',
              type: 'SMS_TEST',
              title: 'Test SMS to PARENT',
              message: 'Your child Aryabhata scored 36/40 in Mathematics.',
              delivery_status: 'delivered',
              provider_message_id: 'SM1234567890',
              submission_id: null,
              timestamp: '2026-10-23T12:00:00.000Z',
              details: { channel: 'SMS', recipient: '+919888999888', recipient_type: 'PARENT' }
            }
          ],
          meta: { nextCursor: '5001', hasNextPage: false }
        }
      },
      errors: []
    }
  },
  {
    id: 'notifications-test',
    title: 'Trigger Test SMS, WhatsApp or Email Alert',
    method: 'POST',
    url: '/api/notifications/test',
    roles: ['TEACHER', 'BRANCH_ADMIN', 'CORPORATE_ADMIN'],
    category: 'Notifications & Alerts',
    description: 'Dispatches a test notification via SMS, WhatsApp, or Email to verify parent communication channels, Twilio/SES configurations, and gateway delivery status.',
    frontendNotes: 'Used in ParentPortal.tsx when an administrator or teacher clicks "Send Test Alert".',
    headers: [
      { key: 'Authorization', value: 'Bearer <token>', required: true, desc: 'Bearer JWT token' },
      { key: 'Content-Type', value: 'application/json', required: true, desc: 'JSON payload' }
    ],
    urlParams: [],
    queryParams: [],
    requestBody: {
      channel: 'SMS',
      recipient: '+919888999888',
      message: 'Paatam test SMS alert: Parent communication gateway active.',
      recipient_type: 'PARENT'
    },
    responses: {
      success: {
        code: 200,
        status: 'OK',
        desc: 'Test notification dispatched and logged.',
        body: {
          status: 'success',
          message: 'Test notification dispatched successfully',
          data: {
            id: '5001',
            channel: 'SMS',
            recipient: '+919888999888',
            recipient_type: 'PARENT',
            message: 'Paatam test SMS alert: Parent communication gateway active.',
            delivery_status: 'delivered',
            provider_message_id: 'SM1234567890',
            timestamp: '2026-10-23T12:00:00.000Z'
          }
        }
      },
      errors: [
        { code: 400, status: 'Bad Request', desc: 'Invalid channel or missing recipient.', body: { status: 'error', message: 'Recipient phone or email is required' } }
      ]
    }
  }
];


// Helper to escape HTML characters
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate the complete HTML document
function generateHtml() {
  const totalApis = apiCatalog.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paatam Backend — Complete Frontend Developer API Reference</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0B0F19;
      --bg-card: #131A2B;
      --bg-card-hover: #192237;
      --bg-inner: #0E1422;
      --border-color: #232E48;
      --border-focus: #4F46E5;
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
      
      --color-get: #10B981;
      --color-get-bg: rgba(16, 185, 129, 0.12);
      --color-post: #3B82F6;
      --color-post-bg: rgba(59, 130, 246, 0.12);
      --color-put: #F59E0B;
      --color-put-bg: rgba(245, 158, 11, 0.12);
      --color-delete: #EF4444;
      --color-delete-bg: rgba(239, 68, 68, 0.12);
      
      --badge-corporate: #A855F7;
      --badge-corporate-bg: rgba(168, 85, 247, 0.15);
      --badge-branch: #06B6D4;
      --badge-branch-bg: rgba(6, 182, 212, 0.15);
      --badge-teacher: #F97316;
      --badge-teacher-bg: rgba(249, 115, 22, 0.15);
      --badge-student: #EC4899;
      --badge-student-bg: rgba(236, 72, 153, 0.15);
      --badge-public: #64748B;
      --badge-public-bg: rgba(100, 116, 139, 0.2);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
      line-height: 1.5;
      padding-bottom: 80px;
    }

    /* Top Sticky Header */
    .top-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(11, 15, 25, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-color);
      padding: 16px 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      color: #fff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .brand-title {
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-subtitle {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 400;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      min-width: 280px;
    }

    .search-input {
      width: 100%;
      background: var(--bg-inner);
      border: 1px solid var(--border-color);
      color: #fff;
      padding: 9px 16px 9px 38px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      pointer-events: none;
    }

    .btn-toggle-all {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-toggle-all:hover {
      background: var(--bg-card-hover);
      border-color: #6366F1;
    }

    /* Container */
    .container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 24px 32px;
    }

    /* Hero Banner */
    .hero-banner {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9));
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 28px 32px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .hero-info h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      background: linear-gradient(to right, #FFFFFF, #CBD5E1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-info p {
      color: var(--text-secondary);
      font-size: 14px;
      max-width: 780px;
    }

    .stats-ribbon {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: var(--bg-inner);
      border: 1px solid var(--border-color);
      padding: 10px 16px;
      border-radius: 10px;
      text-align: center;
    }

    .stat-val {
      font-size: 20px;
      font-weight: 800;
      color: #6366F1;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-lbl {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    /* Async Processing & Real-Time Sync Guide Styles */
    .async-guide-card {
      background: linear-gradient(135deg, rgba(19, 26, 43, 0.95), rgba(14, 20, 34, 0.98));
      border: 1px solid rgba(59, 130, 246, 0.4);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
    }

    .async-guide-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 14px;
    }

    .async-guide-title {
      font-size: 17px;
      font-weight: 700;
      color: #60A5FA;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .async-flow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 18px;
    }

    .async-flow-box {
      background: var(--bg-inner);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px;
    }

    .async-flow-box h4 {
      font-size: 14px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .async-step-list {
      list-style: none;
      font-size: 12.5px;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      gap: 8px;
      line-height: 1.5;
    }

    .async-step-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-queued { background: rgba(148, 163, 184, 0.2); color: #CBD5E1; }
    .badge-processing { background: rgba(59, 130, 246, 0.2); color: #60A5FA; }
    .badge-ready { background: rgba(16, 185, 129, 0.2); color: #34D399; }
    .badge-evaluating { background: rgba(245, 158, 11, 0.2); color: #FBBF24; }

    /* Role Filter Tabs */
    .role-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .role-tab-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 10px 18px;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .role-tab-btn:hover {
      background: var(--bg-card-hover);
      color: #fff;
    }

    .role-tab-btn.active {
      background: #6366F1;
      border-color: #6366F1;
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }

    .role-tab-badge {
      background: rgba(0, 0, 0, 0.25);
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Section Headers */
    .role-section-header {
      margin-top: 36px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }

    .role-section-title {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .role-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    /* API Card Component */
    .api-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      margin-bottom: 14px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .api-card:hover {
      border-color: #3b4d75;
    }

    .api-card.is-open {
      border-color: #4F46E5;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    }

    /* Clickable Header Dropdown Trigger */
    .api-card-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }

    .api-card-header:hover {
      background: var(--bg-card-hover);
    }

    .api-card-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      flex: 1;
    }

    /* Method Badges */
    .badge-method {
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.05em;
    }

    .method-GET {
      color: var(--color-get);
      background: var(--color-get-bg);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .method-POST {
      color: var(--color-post);
      background: var(--color-post-bg);
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .method-PUT {
      color: var(--color-put);
      background: var(--color-put-bg);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .method-DELETE {
      color: var(--color-delete);
      background: var(--color-delete-bg);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .api-endpoint-url {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 600;
      color: #E2E8F0;
    }

    .api-title {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .api-card-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Role Badges */
    .badge-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .role-CORPORATE_ADMIN { color: var(--badge-corporate); background: var(--badge-corporate-bg); }
    .role-BRANCH_ADMIN, .role-DEAN, .role-PRINCIPAL, .role-VICE_PRINCIPAL { color: var(--badge-branch); background: var(--badge-branch-bg); }
    .role-TEACHER { color: var(--badge-teacher); background: var(--badge-teacher-bg); }
    .role-STUDENT { color: var(--badge-student); background: var(--badge-student-bg); }
    .role-PUBLIC { color: var(--badge-public); background: var(--badge-public-bg); }

    .chevron-icon {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      transition: transform 0.25s ease;
    }

    .api-card.is-open .chevron-icon {
      transform: rotate(180deg);
      color: #6366F1;
    }

    /* Accordion Body */
    .api-card-body {
      display: none;
      padding: 24px;
      background: var(--bg-inner);
      border-top: 1px solid var(--border-color);
    }

    .api-card.is-open .api-card-body {
      display: block;
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Detail Grid */
    .section-block {
      margin-bottom: 20px;
    }

    .section-block:last-child {
      margin-bottom: 0;
    }

    .section-heading {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .desc-text {
      color: #CBD5E1;
      font-size: 14px;
      line-height: 1.6;
    }

    .frontend-tip-box {
      background: rgba(99, 102, 241, 0.08);
      border-left: 3px solid #6366F1;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      color: #C7D2FE;
      font-size: 13px;
      margin-top: 10px;
    }

    /* Parameter Tables */
    .param-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 6px;
    }

    .param-table th {
      background: rgba(255, 255, 255, 0.03);
      text-align: left;
      padding: 8px 12px;
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      border-bottom: 1px solid var(--border-color);
    }

    .param-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #E2E8F0;
    }

    .param-name {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #93C5FD;
    }

    .param-type {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #F472B6;
    }

    .param-req {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .req-yes { color: #EF4444; background: rgba(239, 68, 68, 0.15); }
    .req-no { color: #64748B; background: rgba(100, 116, 139, 0.15); }

    /* Code Blocks */
    .code-wrapper {
      position: relative;
      margin-top: 6px;
      background: #080B12;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 11px;
      color: var(--text-muted);
    }

    .btn-copy {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-copy:hover {
      background: #1E293B;
      color: #fff;
    }

    pre code {
      display: block;
      padding: 14px 16px;
      color: #A5B4FC;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      line-height: 1.5;
      overflow-x: auto;
    }

    /* Response Tabs */
    .response-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 10px;
    }

    .resp-card {
      background: #080B12;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .resp-card-header {
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .resp-code-badge {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .code-200, .code-201, .code-202 {
      color: #10B981;
      background: rgba(16, 185, 129, 0.15);
    }

    .code-400 {
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.15);
    }

    .code-401, .code-403, .code-404 {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.15);
    }

    .resp-title {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Empty search state */
    .empty-state {
      display: none;
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    .empty-state.show {
      display: block;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    @media (max-width: 768px) {
      .top-header { padding: 12px 16px; }
      .container { padding: 16px; }
      .hero-banner { padding: 20px; }
      .search-box { width: 100%; min-width: auto; }
      .api-card-header { flex-direction: column; align-items: flex-start; }
      .api-card-right { width: 100%; justify-content: space-between; }
    }
  </style>
</head>
<body>

  <!-- Top Sticky Header -->
  <header class="top-header">
    <div class="brand">
      <div class="brand-logo">P</div>
      <div>
        <div class="brand-title">Paatam API Hub</div>
        <div class="brand-subtitle">Interactive Frontend Developer Documentation &amp; Contract Reference</div>
      </div>
    </div>
    <div class="header-actions">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="apiSearchInput" class="search-input" placeholder="Search API by path, title, method, or keyword... (/ to focus)">
      </div>
      <button class="btn-toggle-all" id="btnToggleAll">Expand All</button>
    </div>
  </header>

  <div class="container">
    <!-- Hero Banner -->
    <div class="hero-banner">
      <div class="hero-info">
        <h1>Role-Based API Implementation Blueprint</h1>
        <p>Complete HTTP specification organized by user persona for seamless frontend integration. Every endpoint features interactive dropdown cards with complete request schemas, header contracts, and exhaustive response status codes.</p>
      </div>
      <div class="stats-ribbon">
        <div class="stat-pill">
          <div class="stat-val">${totalApis}</div>
          <div class="stat-lbl">Active APIs</div>
        </div>
        <div class="stat-pill">
          <div class="stat-val">5</div>
          <div class="stat-lbl">User Roles</div>
        </div>
        <div class="stat-pill">
          <div class="stat-val">100%</div>
          <div class="stat-lbl">Live on ALB</div>
        </div>
      </div>
    </div>

    <!-- Async Processing & Real-time State Synchronization Guide -->
    <div class="async-guide-card">
      <div class="async-guide-header">
        <div class="async-guide-title">
          <span>⚡</span>
          <span>Asynchronous Workflows &amp; Frontend State Synchronization Guide</span>
        </div>
        <div style="font-size: 12px; color: #94A3B8;">
          AWS SQS + Lambda Serverless Architecture (No Timeout Latency)
        </div>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.6;">
        All heavy AI tasks (PDF OCR, Question Paper Extraction, Bulk Stack Slicing, and Rubric Grading) run asynchronously in the background via dedicated AWS SQS queues and Lambda workers. The REST API responds instantly (&lt;100ms) with tracking IDs. Follow the status transitions below to implement real-time progress bars and automated polling in the frontend.
      </p>
      <div class="async-flow-grid">
        <!-- Flow 1 -->
        <div class="async-flow-box">
          <h4><span>📄</span> Assignment Paper &amp; Key Ingestion</h4>
          <ul class="async-step-list">
            <li><strong>Trigger:</strong> <code style="color:#60A5FA;">POST /api/assignments/process-async</code></li>
            <li><strong>State 1:</strong> <span class="async-step-badge badge-processing">ocr_processing</span> &mdash; Lambda runs Vision OCR (Sarvam/Gemini) to extract hierarchical questions &amp; rubric keys. Render a progress bar at 45%.</li>
            <li><strong>State 2:</strong> <span class="async-step-badge badge-ready">ready</span> &mdash; Extraction complete. Questions &amp; answer key text are populated. Progress hits 100%.</li>
            <li><strong>Polling:</strong> Poll <code style="color:#60A5FA;">GET /api/assignments/:id/pipeline-status</code> every <strong>3 seconds</strong> until ready.</li>
          </ul>
        </div>

        <!-- Flow 2 -->
        <div class="async-flow-box">
          <h4><span>📦</span> Bulk Class Stack Splitting</h4>
          <ul class="async-step-list">
            <li><strong>Trigger:</strong> <code style="color:#60A5FA;">POST /api/submissions/bulk</code> (35-student PDF)</li>
            <li><strong>State 1:</strong> <span class="async-step-badge badge-queued">queued</span> &rarr; <span class="async-step-badge badge-processing">splitting</span> &mdash; Lambda scans page headers, names, and QR codes to slice the multi-page stack into individual student PDFs.</li>
            <li><strong>State 2:</strong> <span class="async-step-badge badge-evaluating">grading</span> &mdash; Sliced papers are enqueued to the OCR and Evaluation workers. Submissions start appearing in the review table.</li>
            <li><strong>State 3:</strong> <span class="async-step-badge badge-ready">completed</span> &mdash; All student submissions generated.</li>
            <li><strong>Polling:</strong> Poll <code style="color:#60A5FA;">GET /api/submissions/batch/:jobId</code> every <strong>5 seconds</strong>.</li>
          </ul>
        </div>

        <!-- Flow 3 -->
        <div class="async-flow-box">
          <h4><span>✍️</span> Student Paper Evaluation &amp; Grading</h4>
          <ul class="async-step-list">
            <li><strong>Trigger:</strong> Student upload or Bulk Stack slice</li>
            <li><strong>Stage 1:</strong> <span class="async-step-badge badge-processing">ocr_processing</span> &mdash; Lambda transcribes handwritten answers line-by-line (Indic via Sarvam DocAI, STEM via Gemini).</li>
            <li><strong>Stage 2:</strong> <span class="async-step-badge badge-evaluating">evaluating</span> &mdash; Rubric scoring, ground truth comparison, and Socratic hint synthesis via LLM reasoning.</li>
            <li><strong>Terminal:</strong> <span class="async-step-badge badge-ready">graded</span> / <code>pending_review</code> &mdash; Marks &amp; feedback published. Student receives scorecard notification.</li>
            <li><strong>Polling:</strong> Poll <code style="color:#60A5FA;">GET /api/submissions/:id</code> every <strong>4 seconds</strong>.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Role Filter Tabs -->
    <div class="role-tabs">
      <button class="role-tab-btn active" data-role="ALL">
        <span>All Roles (Full Blueprint)</span>
        <span class="role-tab-badge">153</span>
      </button>
      <button class="role-tab-btn" data-role="PUBLIC">
        <span>Public &amp; Auth</span>
        <span class="role-tab-badge">12</span>
      </button>
      <button class="role-tab-btn" data-role="CORPORATE_ADMIN">
        <span>Corporate Admin</span>
        <span class="role-tab-badge">34</span>
      </button>
      <button class="role-tab-btn" data-role="BRANCH_ADMIN">
        <span>Branch Admin (Dean / Principal / VP)</span>
        <span class="role-tab-badge">58</span>
      </button>
      <button class="role-tab-btn" data-role="TEACHER">
        <span>Teacher</span>
        <span class="role-tab-badge">35</span>
      </button>
      <button class="role-tab-btn" data-role="STUDENT">
        <span>Student</span>
        <span class="role-tab-badge">14</span>
      </button>
    </div>

    <!-- API Cards Container Grouped by Role -->
    <main id="apiContainer">
      ${renderApiSections()}
    </main>

    <!-- Empty State for Search -->
    <div class="empty-state" id="emptySearchState">
      <div class="empty-icon">🔍</div>
      <h3>No matching endpoints found</h3>
      <p>Try searching for a different keyword, path, or switch to "All Roles".</p>
    </div>
  </div>

  <script>
    // Accordion Toggle Logic
    document.querySelectorAll('.api-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.api-card');
        card.classList.toggle('is-open');
      });
    });

    // Expand / Collapse All Toggle
    const btnToggleAll = document.getElementById('btnToggleAll');
    let allExpanded = false;
    btnToggleAll.addEventListener('click', () => {
      allExpanded = !allExpanded;
      document.querySelectorAll('.api-card').forEach(card => {
        if (card.style.display !== 'none') {
          if (allExpanded) {
            card.classList.add('is-open');
          } else {
            card.classList.remove('is-open');
          }
        }
      });
      btnToggleAll.textContent = allExpanded ? 'Collapse All' : 'Expand All';
    });

    // Copy to Clipboard
    function copyJson(btn, text) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = '#10B981';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
        }, 1800);
      });
    }

    // Role Tab Filtering
    let currentRole = 'ALL';
    const roleTabBtns = document.querySelectorAll('.role-tab-btn');
    roleTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        roleTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRole = btn.getAttribute('data-role');
        filterApis();
      });
    });

    // Search Filtering
    const searchInput = document.getElementById('apiSearchInput');
    searchInput.addEventListener('input', () => {
      filterApis();
    });

    // Keyboard shortcut / to focus search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    function filterApis() {
      const query = searchInput.value.toLowerCase().trim();
      const sections = document.querySelectorAll('.role-group-section');
      let totalVisible = 0;

      sections.forEach(section => {
        const sectionRole = section.getAttribute('data-role-section');
        const roleMatches = currentRole === 'ALL' || currentRole === sectionRole;

        if (!roleMatches) {
          section.style.display = 'none';
          return;
        }

        let sectionVisibleCards = 0;
        const cards = section.querySelectorAll('.api-card');
        cards.forEach(card => {
          const searchContent = card.getAttribute('data-search') || '';
          const searchMatches = !query || searchContent.includes(query);

          if (searchMatches) {
            card.style.display = 'block';
            sectionVisibleCards++;
            totalVisible++;
          } else {
            card.style.display = 'none';
          }
        });

        // Toggle category header visibility
        const categories = section.querySelectorAll('.category-group');
        categories.forEach(cat => {
          const visibleCards = cat.querySelectorAll('.api-card[style*="display: block"]');
          cat.style.display = visibleCards.length > 0 ? 'block' : 'none';
        });

        section.style.display = sectionVisibleCards > 0 ? 'block' : 'none';
      });

      const emptyState = document.getElementById('emptySearchState');
      if (totalVisible === 0) {
        emptyState.classList.add('show');
      } else {
        emptyState.classList.remove('show');
      }
    }
  </script>
</body>
</html>`;
}

// Role definitions
const roleDefinitions = [
  {
    roleKey: 'PUBLIC',
    title: 'Public & Authentication Flow',
    subtitle: 'Authentication gateways, OTP issuance, password recovery workflows, access token renewal, and system health checks accessible without prior authorization.',
    badge: 'Public / Unauthenticated',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.15)',
    filterFn: (api) => api.roles.includes('PUBLIC')
  },
  {
    roleKey: 'CORPORATE_ADMIN',
    title: 'Role 1: Corporate Admin (Super Admin)',
    subtitle: 'Institutional super-admin operations: organization setup, campus branch creation, assigning Dean / Principal leadership, and macro-level academic oversight.',
    badge: 'CORPORATE_ADMIN',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    filterFn: (api) => api.roles.includes('CORPORATE_ADMIN')
  },
  {
    roleKey: 'BRANCH_ADMIN',
    title: 'Role 2: Branch Admin & Leadership (Dean, Principal, Vice Principal)',
    subtitle: 'Full campus operations: academic calendar, class and section structural hierarchy, master subject catalog, faculty allocations, student enrollment, assignment publishing, and evaluation review.',
    badge: 'BRANCH_ADMIN / DEAN / PRINCIPAL / VICE_PRINCIPAL',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    filterFn: (api) => api.roles.some(r => ['BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(r))
  },
  {
    roleKey: 'TEACHER',
    title: 'Role 3: Teacher (Subject & Class Faculty)',
    subtitle: 'Classroom teaching workflows: assigned sections & subjects home dashboard, student rosters, exam creation pipeline, answer sheet grading, score approvals, overrides, and bulk paper stack uploads.',
    badge: 'TEACHER',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    filterFn: (api) => api.roles.includes('TEACHER')
  },
  {
    roleKey: 'STUDENT',
    title: 'Role 4: Student (Learner Portal)',
    subtitle: 'Student learning portal: home dashboard with designated class teacher and test counters, assignments feed, question paper view, handwritten answer sheet upload, graded scorecards with Socratic hints, and notifications.',
    badge: 'STUDENT',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    filterFn: (api) => api.roles.includes('STUDENT')
  }
];

// Render sections grouped by role
function renderApiSections() {
  return roleDefinitions.map(roleDef => {
    const roleApis = apiCatalog.filter(roleDef.filterFn);

    // Group APIs by category within this role
    const categories = [];
    roleApis.forEach(api => {
      const cat = api.category || 'General';
      if (!categories.includes(cat)) categories.push(cat);
    });

    const categoriesHtml = categories.map(cat => {
      const catApis = roleApis.filter(a => (a.category || 'General') === cat);
      const cardsHtml = catApis.map(api => renderSingleApiCard(api, roleDef.roleKey)).join('\n');

      return `
        <div class="category-group" data-category="${escapeHtml(cat)}">
          <div class="category-header">
            <span class="category-title">${escapeHtml(cat)}</span>
            <span class="category-count">${catApis.length} APIs</span>
          </div>
          ${cardsHtml}
        </div>
      `;
    }).join('\n');

    return `
      <section class="role-group-section" id="section-${roleDef.roleKey}" data-role-section="${roleDef.roleKey}">
        <div class="role-section-banner">
          <div class="role-banner-left">
            <span class="role-pill" style="color: ${roleDef.color}; background: ${roleDef.bgColor}; border: 1px solid ${roleDef.color}40;">
              ${escapeHtml(roleDef.badge)}
            </span>
            <h2 class="role-title">${escapeHtml(roleDef.title)}</h2>
            <p class="role-subtitle">${escapeHtml(roleDef.subtitle)}</p>
          </div>
          <div class="role-banner-right">
            <div class="role-count-box">
              <span class="role-count-num" style="color: ${roleDef.color};">${roleApis.length}</span>
              <span class="role-count-lbl">APIs in Role</span>
            </div>
          </div>
        </div>
        ${categoriesHtml}
      </section>
    `;
  }).join('\n\n');
}

// Render individual card for an API
function renderSingleApiCard(api, activeRoleContext) {
  const rolesStr = api.roles.join(' ');
  const searchTerms = `${api.method} ${api.url} ${api.title} ${api.description} ${api.category} ${api.roles.join(' ')}`.toLowerCase();

  // Headers table
  const headersHtml = api.headers && api.headers.length > 0 ? `
    <div class="section-block">
      <div class="section-heading">Required HTTP Headers</div>
      <table class="param-table">
        <thead>
          <tr><th>Header</th><th>Example Value</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${api.headers.map(h => `
            <tr>
              <td class="param-name">${escapeHtml(h.key)}</td>
              <td class="param-type">${escapeHtml(h.value)}</td>
              <td><span class="param-req ${h.required ? 'req-yes' : 'req-no'}">${h.required ? 'Required' : 'Optional'}</span></td>
              <td>${escapeHtml(h.desc)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  // URL Params table
  const urlParamsHtml = api.urlParams && api.urlParams.length > 0 ? `
    <div class="section-block">
      <div class="section-heading">URL Path Parameters</div>
      <table class="param-table">
        <thead>
          <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${api.urlParams.map(p => `
            <tr>
              <td class="param-name">:${escapeHtml(p.key)}</td>
              <td class="param-type">${escapeHtml(p.type)}</td>
              <td><span class="param-req req-yes">Required</span></td>
              <td>${escapeHtml(p.desc)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  // Query Params table
  const queryParamsHtml = api.queryParams && api.queryParams.length > 0 ? `
    <div class="section-block">
      <div class="section-heading">URL Query Parameters</div>
      <table class="param-table">
        <thead>
          <tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${api.queryParams.map(q => `
            <tr>
              <td class="param-name">?${escapeHtml(q.key)}</td>
              <td class="param-type">${escapeHtml(q.type)}</td>
              <td>${q.default ? `<span class="param-type">${escapeHtml(q.default)}</span>` : '<span style="color:#64748B">—</span>'}</td>
              <td>${escapeHtml(q.desc)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  // Request Body
  const requestBodyHtml = api.requestBody !== null ? `
    <div class="section-block">
      <div class="section-heading">JSON Request Body Payload</div>
      <div class="code-wrapper">
        <div class="code-header">
          <span>application/json</span>
          <button class="btn-copy" onclick="copyJson(this, '${escapeHtml(JSON.stringify(api.requestBody, null, 2)).replace(/'/g, "\\'")}')">Copy JSON</button>
        </div>
        <pre><code>${escapeHtml(JSON.stringify(api.requestBody, null, 2))}</code></pre>
      </div>
    </div>
  ` : '';

  // Responses
  const successResp = api.responses.success;
  const errorsResp = api.responses.errors || [];

  const responsesHtml = `
    <div class="section-block">
      <div class="section-heading">Possible HTTP Responses &amp; Status Codes</div>
      <div class="response-cards-grid">
        <!-- Success Response -->
        <div class="resp-card">
          <div class="resp-card-header">
            <span class="resp-code-badge code-${successResp.code}">${successResp.code} ${escapeHtml(successResp.status)}</span>
            <span class="resp-title">${escapeHtml(successResp.desc)}</span>
            <button class="btn-copy" onclick="copyJson(this, '${escapeHtml(JSON.stringify(successResp.body, null, 2)).replace(/'/g, "\\'")}')">Copy</button>
          </div>
          <pre><code>${escapeHtml(JSON.stringify(successResp.body, null, 2))}</code></pre>
        </div>

        <!-- Error Responses -->
        ${errorsResp.map(err => `
          <div class="resp-card">
            <div class="resp-card-header">
              <span class="resp-code-badge code-${err.code}">${err.code} ${escapeHtml(err.status)}</span>
              <span class="resp-title">${escapeHtml(err.desc)}</span>
              <button class="btn-copy" onclick="copyJson(this, '${escapeHtml(JSON.stringify(err.body, null, 2)).replace(/'/g, "\\'")}')">Copy</button>
            </div>
            <pre><code>${escapeHtml(JSON.stringify(err.body, null, 2))}</code></pre>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Role tags
  const roleBadges = api.roles.map(r => `<span class="badge-role role-${r}">${r.replace('_', ' ')}</span>`).join(' ');

  return `
    <div class="api-card" data-roles="${rolesStr}" data-search="${escapeHtml(searchTerms)}">
      <div class="api-card-header">
        <div class="api-card-left">
          <span class="badge-method method-${api.method}">${api.method}</span>
          <span class="api-endpoint-url">${escapeHtml(api.url)}</span>
          <span class="api-title">• ${escapeHtml(api.title)}</span>
        </div>
        <div class="api-card-right">
          ${roleBadges}
          <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <div class="api-card-body">
        <div class="section-block">
          <div class="section-heading">Detailed Description &amp; Business Logic</div>
          <div class="desc-text">${escapeHtml(api.description)}</div>
          ${api.frontendNotes ? `<div class="frontend-tip-box"><strong>Frontend Developer Note:</strong> ${escapeHtml(api.frontendNotes)}</div>` : ''}
        </div>

        ${headersHtml}
        ${urlParamsHtml}
        ${queryParamsHtml}
        ${requestBodyHtml}
        ${responsesHtml}
      </div>
    </div>
  `;
}

// Write to file
const outputPath = path.join(__dirname, '..', 'API_DOCUMENTATION_FOR_FRONTEND.html');
fs.writeFileSync(outputPath, generateHtml(), 'utf-8');
console.log(`Successfully generated frontend documentation at: ${outputPath}`);
