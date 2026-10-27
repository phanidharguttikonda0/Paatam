const fs = require('fs');
const path = require('path');

// Master API definitions with comprehensive details
const apiCatalog = [
  {
    "id": "health-check",
    "title": "System Health & Liveness Check",
    "method": "GET",
    "url": "/api/health",
    "roles": [
      "PUBLIC"
    ],
    "category": "System & Utility",
    "description": "Returns the current server health status and ISO timestamp. Used by frontend load balancers, ping services, and startup connection checks.",
    "frontendNotes": "No authentication required. Alias for GET /health used by reverse proxies and load balancers.",
    "headers": [
      {
        "key": "Accept",
        "value": "application/json",
        "required": false,
        "desc": "Expected response format"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Backend service is online and healthy.",
        "body": {
          "status": "ok",
          "timestamp": "2026-10-16T18:00:00.000Z"
        }
      },
      "errors": []
    }
  },
  {
    "id": "corporate-create",
    "title": "Initial Corporate Entity Registration",
    "method": "POST",
    "url": "/api/corporate/create",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN"
    ],
    "description": "Registers a new enterprise educational corporate entity (e.g. \"Narayana Group\", \"Chaitanya Academy\") along with the initial Super Admin. Requires a pre-registration verificationToken obtained after verifying email/mobile via OTP.",
    "frontendNotes": "Pre-requisite: Call POST /api/auth/send-otp and POST /api/auth/verify-otp for the admin email & mobile first to obtain the verificationToken. Pass the same email/mobile under the admin object.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "name": "Narayana Educational Institutions",
      "registration_no": "REG-HYD-2026-001",
      "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJpZmllZEVtYWlsIjoiYWRtaW5AbmFyYXlhbmEuYWMuaW4iLCJ2ZXJpZmllZE1vYmlsZSI6Ijk4NzY1NDMyMTAiLCJwdXJwb3NlIjoicmVnaXN0cmF0aW9uIn0...",
      "admin": {
        "name": "Super Admin",
        "email": "admin@narayana.ac.in",
        "mobile": "9876543210"
      }
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Corporate and Initial Super Admin registered successfully.",
        "body": {
          "status": "success",
          "data": {
            "id": "1001",
            "name": "Narayana Educational Institutions",
            "registration_no": "REG-HYD-2026-001",
            "created_at": "2026-10-27T10:24:00.000Z",
            "admin": {
              "id": "2001",
              "name": "Super Admin",
              "email": "admin@narayana.ac.in",
              "mobile": "9876543210"
            }
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Validation error or duplicate registration number.",
          "body": {
            "status": "error",
            "message": "Registration number already exists"
          }
        }
      ]
    },
    "category": "Corporate Setup & Onboarding"
  },
  {
    "id": "auth-corporate-login",
    "title": "Corporate Admin OTP Login Initiation",
    "method": "POST",
    "url": "/api/auth/corporate/login",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN"
    ],
    "category": "Authentication",
    "description": "Initiates 2-Factor OTP login for Corporate Super Admins. Dispatches a 6-digit OTP to the registered corporate email and mobile number.",
    "frontendNotes": "On submit, advance UI to OTP verification screen. Inform user that OTP is valid for 10 minutes.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin@corporate.edu"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "OTP generated and sent to email/mobile.",
        "body": {
          "status": "success",
          "message": "OTP sent to registered email and mobile",
          "data": {
            "identifier": "admin@corporate.edu",
            "expires_in": "10 minutes"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Identifier is missing or not a valid email/mobile format.",
          "body": {
            "status": "error",
            "message": "Validation error: Identifier is required"
          }
        },
        {
          "code": 404,
          "status": "Not Found",
          "desc": "No corporate admin found with this email/mobile.",
          "body": {
            "status": "error",
            "message": "Corporate admin not found"
          }
        }
      ]
    }
  },
  {
    "id": "auth-corporate-verify",
    "title": "Corporate Admin Verify OTP & Issue Tokens",
    "method": "POST",
    "url": "/api/auth/corporate/verify",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN"
    ],
    "category": "Authentication",
    "description": "Verifies the 6-digit OTP for Corporate Admin. On success, sets an httpOnly refresh token cookie and returns a short-lived (15 min) JWT access token.",
    "frontendNotes": "Store accessToken in application state (Zustand/Redux). The refresh token cookie is handled automatically by the browser.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin@corporate.edu",
      "otp": "123456"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "OTP verified. Access token returned and refresh cookie set.",
        "body": {
          "status": "success",
          "message": "Login successful",
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
            "user": {
              "id": "2001",
              "name": "Dr. Ramesh Rao",
              "email": "admin@corporate.edu",
              "role": "CORPORATE_ADMIN"
            }
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid or expired OTP code.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP"
          }
        }
      ]
    }
  },
  {
    "id": "auth-admin-login",
    "title": "Branch Admin (Dean / Principal / VP) Password Login",
    "method": "POST",
    "url": "/api/auth/admin/login",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "category": "Authentication",
    "description": "Password authentication for Branch Administrators (Deans, Principals, Vice Principals). Returns a JWT access token and sets an httpOnly refresh token cookie.",
    "frontendNotes": "User role in response will be DEAN, PRINCIPAL, VICE_PRINCIPAL, or BRANCH_ADMIN. Redirect to Branch Admin Dashboard.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "principal.madhapur@school.edu",
      "password": "SecurePassword123!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Branch admin authenticated.",
        "body": {
          "status": "success",
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
            "user": {
              "id": "3001",
              "name": "K. S. Verma",
              "role": "PRINCIPAL",
              "email": "principal.madhapur@school.edu"
            }
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Invalid credentials or incorrect password.",
          "body": {
            "status": "error",
            "message": "Invalid email/mobile or password"
          }
        }
      ]
    }
  },
  {
    "id": "auth-admin-forgot-pwd",
    "title": "Branch Admin Forgot Password (OTP Request)",
    "method": "POST",
    "url": "/api/auth/admin/forgot-password",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "category": "Authentication",
    "description": "Initiates a password reset for a Branch Admin (Dean, Principal, Vice Principal). Sends an OTP to their registered email (SES) or mobile (Twilio SMS).",
    "frontendNotes": "Requires corporateId and the admin's email or mobile number.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "principal.madhapur@school.edu",
      "corporateId": "1512528182029314"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Reset OTP sent successfully.",
        "body": {
          "status": "success",
          "message": "Password reset OTP sent successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Missing required identifier or corporateId.",
          "body": {
            "status": "error",
            "message": "Validation error: corporateId is required"
          }
        },
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin not found in this corporate entity.",
          "body": {
            "status": "error",
            "message": "Admin not found"
          }
        }
      ]
    }
  },
  {
    "id": "auth-admin-reset-pwd",
    "title": "Branch Admin Reset Password",
    "method": "POST",
    "url": "/api/auth/admin/reset-password",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "category": "Authentication",
    "description": "Completes password reset by verifying the 6-digit OTP and updating the branch admin's password.",
    "frontendNotes": "Requires corporateId, identifier, 6-digit OTP, and new_password (min 6 characters).",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "principal.madhapur@school.edu",
      "corporateId": "1512528182029314",
      "otp": "123456",
      "new_password": "NewSecurePassword123!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Password reset successfully.",
        "body": {
          "status": "success",
          "message": "Password has been reset successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid or expired OTP code.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP"
          }
        }
      ]
    }
  },
  {
    "id": "auth-teacher-login",
    "title": "Teacher Password Login",
    "method": "POST",
    "url": "/api/auth/teacher/login",
    "roles": [
      "PUBLIC",
      "TEACHER"
    ],
    "category": "Authentication",
    "description": "Authenticates a Subject Teacher using email or mobile and password. Sets an httpOnly refresh cookie and returns a JWT access token with role `TEACHER`.",
    "frontendNotes": "Redirect to `/teacher/dashboard`. Store accessToken in memory for subsequent API requests.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "raina@school.edu",
      "password": "TeacherPassword123!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher authenticated successfully.",
        "body": {
          "status": "success",
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
            "user": {
              "id": "4001",
              "name": "Suresh Raina",
              "role": "TEACHER",
              "email": "raina@school.edu"
            }
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Invalid identifier or password.",
          "body": {
            "status": "error",
            "message": "Invalid email/mobile or password"
          }
        }
      ]
    }
  },
  {
    "id": "auth-teacher-forgot-pwd",
    "title": "Teacher Forgot Password (OTP Request)",
    "method": "POST",
    "url": "/api/auth/teacher/forgot-password",
    "roles": [
      "PUBLIC",
      "TEACHER"
    ],
    "category": "Authentication",
    "description": "Sends a 6-digit password reset OTP to the teacher's registered email (via AWS SES) or mobile (SMS).",
    "frontendNotes": "Display confirmation screen prompting for the 6-digit OTP and new password.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "raina@school.edu"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Reset OTP sent successfully.",
        "body": {
          "status": "success",
          "message": "Password reset OTP sent to registered email/mobile"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "No teacher found with this email/mobile.",
          "body": {
            "status": "error",
            "message": "Teacher not found"
          }
        }
      ]
    }
  },
  {
    "id": "auth-teacher-reset-pwd",
    "title": "Teacher Reset Password with OTP",
    "method": "POST",
    "url": "/api/auth/teacher/reset-password",
    "roles": [
      "PUBLIC",
      "TEACHER"
    ],
    "category": "Authentication",
    "description": "Verifies the OTP and updates the teacher's password with bcrypt salted hashing.",
    "frontendNotes": "Provide strong password validation rules on frontend (min 8 chars, 1 uppercase, 1 special char).",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "raina@school.edu",
      "otp": "654321",
      "new_password": "NewTeacherPassword123!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Password updated. Redirect user to login.",
        "body": {
          "status": "success",
          "message": "Password reset successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid OTP or expired OTP.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP"
          }
        }
      ]
    }
  },
  {
    "id": "auth-student-login",
    "title": "Student Admission Number Login",
    "method": "POST",
    "url": "/api/auth/student/login",
    "roles": [
      "PUBLIC",
      "STUDENT"
    ],
    "category": "Authentication",
    "description": "Student login using unique School Admission Number (or email) and password. Issues JWT access token with role `STUDENT` and sets httpOnly refresh cookie.",
    "frontendNotes": "Accepts admission_no (e.g. ADM-2026-001) or email. Redirect to `/student/dashboard`.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "admission_no": "ADM-2026-001",
      "password": "StudentPassword123!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student authenticated successfully.",
        "body": {
          "status": "success",
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
            "user": {
              "id": "5001",
              "name": "Aarav Sharma",
              "admission_no": "ADM-2026-001",
              "role": "STUDENT"
            }
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Invalid admission number or password.",
          "body": {
            "status": "error",
            "message": "Invalid admission number/identifier or password"
          }
        }
      ]
    }
  },
  {
    "id": "auth-student-forgot-pwd",
    "title": "Student Forgot Password (OTP Request)",
    "method": "POST",
    "url": "/api/auth/student/forgot-password",
    "roles": [
      "PUBLIC",
      "STUDENT"
    ],
    "category": "Authentication",
    "description": "Dispatches password reset OTP to student or parent registered email/mobile.",
    "frontendNotes": "Allows student or parent to recover account credentials.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "ADM-2026-001"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Reset OTP dispatched.",
        "body": {
          "status": "success",
          "message": "Password reset OTP sent to registered student/parent contact"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Student not found.",
          "body": {
            "status": "error",
            "message": "Student not found"
          }
        }
      ]
    }
  },
  {
    "id": "auth-student-reset-pwd",
    "title": "Student Reset Password with OTP",
    "method": "POST",
    "url": "/api/auth/student/reset-password",
    "roles": [
      "PUBLIC",
      "STUDENT"
    ],
    "category": "Authentication",
    "description": "Verifies OTP and sets new password for student.",
    "frontendNotes": "Direct student to student login screen upon success.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "ADM-2026-001",
      "otp": "789123",
      "new_password": "NewStudentPass123!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student password reset successfully.",
        "body": {
          "status": "success",
          "message": "Password reset successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid or expired OTP.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP"
          }
        }
      ]
    }
  },
  {
    "id": "auth-refresh-token",
    "title": "Stateless JWT Access Token Refresh",
    "method": "POST",
    "url": "/api/auth/refresh",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN",
      "BRANCH_ADMIN",
      "TEACHER",
      "STUDENT"
    ],
    "category": "Authentication",
    "description": "Rotates access token using the secure httpOnly refreshToken cookie. Call this automatically in an HTTP client response interceptor when receiving a 401 response.",
    "frontendNotes": "Crucial for single-page apps: Send credentials with request (withCredentials: true in Axios). Do NOT pass token in body.",
    "headers": [
      {
        "key": "Cookie",
        "value": "refreshToken=<token>",
        "required": true,
        "desc": "Browser httpOnly cookie"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {},
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "New access token issued.",
        "body": {
          "status": "success",
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Refresh token cookie missing, expired, or invalid. User must log in again.",
          "body": {
            "status": "error",
            "message": "Unauthorized: Invalid refresh token"
          }
        }
      ]
    }
  },
  {
    "id": "corp-create-branch",
    "title": "Create Branch / Campus under Corporate",
    "method": "POST",
    "url": "/api/branch/create",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Branch Management",
    "description": "Creates a physical school campus or branch under the corporate organization.",
    "frontendNotes": "Rendered on the \"Add Campus / Branch\" modal. Pincode must be 6 digits.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "name": "Madhapur Campus",
      "pincode": "500081",
      "address": "Plot 45, Hitech City Main Rd, Madhapur, Hyderabad",
      "branch_contact_mail": "madhapur@school.edu",
      "mobile_number": "9876543220"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Branch created.",
        "body": {
          "status": "success",
          "message": "Branch created successfully",
          "data": {
            "id": "301",
            "name": "Madhapur Campus",
            "pincode": "500081"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Validation failure.",
          "body": {
            "status": "error",
            "message": "Pincode must be exactly 6 digits"
          }
        }
      ]
    }
  },
  {
    "id": "corp-search-branches",
    "title": "Autocomplete Search Branches",
    "method": "GET",
    "url": "/api/branch/corporate/search",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Branch Management",
    "description": "Live autocomplete search across branches by name or city.",
    "frontendNotes": "Debounce input by 300ms before sending query.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "q",
        "type": "string",
        "required": true,
        "desc": "Search query string"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Matching branches.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "301",
              "name": "Madhapur Campus",
              "address": "Hyderabad"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "corp-create-admin",
    "title": "Create Branch Admin (Dean / Principal / VP)",
    "method": "POST",
    "url": "/api/admin/create",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Admin Management",
    "description": "Onboards a new branch-level administrator (Dean, Principal, Vice Principal, or Other) with a salt-hashed initial password.",
    "frontendNotes": "Allow Corporate Admin to assign role from enum: [DEAN, PRINCIPAL, VICE_PRINCIPAL, OTHER].",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "admin_name": "Dr. K. S. Verma",
      "contact_email": "principal.madhapur@school.edu",
      "mobile": "9876543230",
      "role": "PRINCIPAL",
      "password": "SecurePassword123!"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Branch Admin created successfully.",
        "body": {
          "status": "success",
          "message": "Branch Admin created successfully",
          "data": {
            "id": "3001",
            "admin_name": "Dr. K. S. Verma",
            "role": "PRINCIPAL"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Email or mobile already in use.",
          "body": {
            "status": "error",
            "message": "Email already registered"
          }
        }
      ]
    }
  },
  {
    "id": "corp-remove-branch-admin",
    "title": "Revoke Admin Assignment from Branch",
    "method": "DELETE",
    "url": "/api/branch/:branchId/admins/:adminId",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Admin Management",
    "description": "Revokes a Branch Admin's access to a specific branch.",
    "frontendNotes": "Provide a confirmation modal before triggering deletion.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      },
      {
        "key": "adminId",
        "type": "string",
        "required": true,
        "desc": "Admin ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Access revoked.",
        "body": {
          "status": "success",
          "message": "Admin access removed from branch successfully"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Access record not found.",
          "body": {
            "status": "error",
            "message": "Admin access record not found"
          }
        }
      ]
    }
  },
  {
    "id": "admin-my-branches",
    "title": "Get Branches Assigned to Logged-in Admin",
    "method": "GET",
    "url": "/api/branch-admin/my-branches",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Branch Admin Profile",
    "description": "Lists all physical campuses/branches that the authenticated administrator has permissions to oversee.",
    "frontendNotes": "Populate the active campus switcher in the top navigation bar with this list.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Branch Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of assigned branches.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "301",
              "name": "Madhapur Campus",
              "pincode": "500081",
              "address": "Hitech City"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "admin-profile",
    "title": "Get Logged-in Branch Admin Profile",
    "method": "GET",
    "url": "/api/branch-admin/profile",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Branch Admin Profile",
    "description": "Returns profile details for the currently logged-in Dean, Principal, or Vice Principal.",
    "frontendNotes": "Use on header user avatar / settings menu.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Branch Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Profile details.",
        "body": {
          "status": "success",
          "data": {
            "id": "3001",
            "admin_name": "Dr. K. S. Verma",
            "contact_email": "principal@school.edu",
            "mobile": "9876543230",
            "role": "PRINCIPAL"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "ay-list",
    "title": "List Academic Years in Branch",
    "method": "GET",
    "url": "/api/branch/:branchId/academic-years",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Retrieves all academic years for a branch. Current active session is automatically placed first.",
    "frontendNotes": "Use in Academic Session switcher dropdown throughout the admin portal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Page limit"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Cursor ID for next page"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of academic sessions.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "401",
              "branch_id": "301",
              "start_year": 2026,
              "end_year": 2027,
              "is_active": true
            }
          ],
          "meta": {
            "nextCursor": null,
            "hasNextPage": false
          }
        }
      },
      "errors": [
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "No access to this branch.",
          "body": {
            "message": "Forbidden: You do not have access to this branch"
          }
        }
      ]
    }
  },
  {
    "id": "ay-create",
    "title": "Create Academic Year in Branch",
    "method": "POST",
    "url": "/api/branch/:branchId/academic-years",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Creates a new academic year session (e.g. start_year: 2026 -> automatically sets end_year: 2027). Only one session can be active at a time.",
    "frontendNotes": "If is_active: true is sent, the backend automatically deactivates previous active sessions.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "start_year": 2026,
      "is_active": true
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Academic year created.",
        "body": {
          "status": "success",
          "message": "Academic year created successfully",
          "data": {
            "id": "401",
            "branch_id": "301",
            "start_year": 2026,
            "end_year": 2027,
            "is_active": true
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Academic year already exists for this start year.",
          "body": {
            "status": "error",
            "message": "Academic year already exists for this start year"
          }
        }
      ]
    }
  },
  {
    "id": "ay-update",
    "title": "Update / Toggle Active Academic Year",
    "method": "PUT",
    "url": "/api/academic-years/:id",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Updates active status or start/end years of an academic calendar session.",
    "frontendNotes": "Used when toggling the active session switch.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Academic Year ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "is_active": true
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Academic year updated.",
        "body": {
          "status": "success",
          "message": "Academic year updated successfully",
          "data": {
            "id": "401",
            "is_active": true
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Academic year not found.",
          "body": {
            "status": "error",
            "message": "Academic year not found"
          }
        }
      ]
    }
  },
  {
    "id": "ay-delete",
    "title": "Delete Academic Year",
    "method": "DELETE",
    "url": "/api/academic-years/:id",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Deletes an academic year. Protected: BLOCKED with 400 Bad Request if classes or enrolled students exist.",
    "frontendNotes": "Warn user that deletion is only possible if zero classes are attached.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Academic Year ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Academic year deleted.",
        "body": {
          "status": "success",
          "message": "Academic year deleted successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Cannot delete: classes exist in session.",
          "body": {
            "status": "error",
            "message": "Cannot delete academic year: 5 classes exist in this session"
          }
        }
      ]
    }
  },
  {
    "id": "class-list",
    "title": "List Classes in Academic Year",
    "method": "GET",
    "url": "/api/academic-years/:academicYearId/classes",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Academic Structure",
    "description": "Returns all classes in an academic year, ordered sequentially by class_order (e.g. Grade 1, Grade 2... Grade 10).",
    "frontendNotes": "Primary navigation list for school curriculum hierarchy.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "academicYearId",
        "type": "string",
        "required": true,
        "desc": "Academic Year ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Ordered class list.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "501",
              "name": "Grade 10",
              "class_order": 10,
              "sections_count": 3,
              "subjects_count": 5
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "class-create",
    "title": "Create Class with Optional Sections",
    "method": "POST",
    "url": "/api/academic-years/:academicYearId/classes",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Adds a class to the academic session. Can optionally auto-generate sections (e.g. sections: [\"A\", \"B\", \"C\"]).",
    "frontendNotes": "Checkboxes for auto-creating sections A, B, C on class creation wizard.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "academicYearId",
        "type": "string",
        "required": true,
        "desc": "Academic Year ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Class 10 (SSC)",
      "class_order": 10,
      "initial_sections": [
        "A",
        "B",
        "C"
      ]
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Class and sections created.",
        "body": {
          "status": "success",
          "message": "Class created successfully",
          "data": {
            "id": "501",
            "name": "Grade 10",
            "class_order": 10,
            "sections": [
              {
                "id": "601",
                "section_name": "A"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Class with this name already exists in this year.",
          "body": {
            "status": "error",
            "message": "Class with name \"Grade 10\" already exists in this academic year"
          }
        }
      ]
    }
  },
  {
    "id": "class-get",
    "title": "Get Class Details (with Sections & Subjects)",
    "method": "GET",
    "url": "/api/classes/:classId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Academic Structure",
    "description": "Retrieves full details for a class including attached sections, seating capacities, and assigned curriculum subjects.",
    "frontendNotes": "Main landing page for Class Detail View.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Class details with sections and subjects.",
        "body": {
          "status": "success",
          "data": {
            "id": "501",
            "name": "Grade 10",
            "class_order": 10,
            "sections": [
              {
                "id": "601",
                "section_name": "A",
                "strength": 30,
                "class_teacher": {
                  "id": "4001",
                  "name": "Suresh Raina"
                }
              }
            ],
            "subjects": [
              {
                "id": "701",
                "name": "Physics",
                "code": "PHY-10"
              },
              {
                "id": "702",
                "name": "Mathematics",
                "code": "MTH-10"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Class not found.",
          "body": {
            "status": "error",
            "message": "Class not found"
          }
        }
      ]
    }
  },
  {
    "id": "class-update",
    "title": "Update Class Name or Order",
    "method": "PUT",
    "url": "/api/classes/:classId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Updates class name or reorders class hierarchy position.",
    "frontendNotes": "Supports drag-and-drop reordering on frontend.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Grade 10 - Advanced",
      "class_order": 10
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Class updated.",
        "body": {
          "status": "success",
          "message": "Class updated successfully",
          "data": {
            "id": "501",
            "name": "Grade 10 - Advanced"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "class-delete",
    "title": "Delete Class",
    "method": "DELETE",
    "url": "/api/classes/:classId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Academic Structure",
    "description": "Deletes a class. Protected: Blocked if sections exist.",
    "frontendNotes": "All sections must be deleted first before deleting the class.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Class deleted.",
        "body": {
          "status": "success",
          "message": "Class deleted successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Cannot delete: sections exist.",
          "body": {
            "status": "error",
            "message": "Cannot delete class: 2 sections exist"
          }
        }
      ]
    }
  },
  {
    "id": "section-list",
    "title": "List Sections in Class",
    "method": "GET",
    "url": "/api/classes/:classId/sections",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Sections & Rosters",
    "description": "Lists all sections under a class with student counts and designated class teachers.",
    "frontendNotes": "Renders the section pill buttons on the class dashboard.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of sections.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "601",
              "section_name": "A",
              "strength": 30,
              "enrolled_students": 28,
              "class_teacher_name": "Suresh Raina"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "section-create",
    "title": "Create Section under Class",
    "method": "POST",
    "url": "/api/classes/:classId/sections",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Sections & Rosters",
    "description": "Adds a new section with a designated seating capacity (strength).",
    "frontendNotes": "Rendered in \"Add Section\" dialog.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "section_name": "B",
      "strength": 35
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Section created.",
        "body": {
          "status": "success",
          "message": "Section created successfully",
          "data": {
            "id": "602",
            "section_name": "B",
            "strength": 35
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Duplicate section name in class.",
          "body": {
            "status": "error",
            "message": "Section \"B\" already exists in this class"
          }
        }
      ]
    }
  },
  {
    "id": "section-get",
    "title": "Get Section Details with Teacher & Student Count",
    "method": "GET",
    "url": "/api/sections/:sectionId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Sections & Rosters",
    "description": "Returns section profile, designated class teacher, capacity, and current enrolled student count.",
    "frontendNotes": "Section header summary view.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Section details.",
        "body": {
          "status": "success",
          "data": {
            "id": "601",
            "section_name": "A",
            "strength": 30,
            "enrolled_students": 28,
            "class_teacher": {
              "id": "4001",
              "name": "Suresh Raina",
              "email": "raina@school.edu"
            }
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "section-update",
    "title": "Update Section Name or Strength",
    "method": "PUT",
    "url": "/api/sections/:sectionId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Sections & Rosters",
    "description": "Updates section display name or classroom seating capacity.",
    "frontendNotes": "Validation: strength must be a positive integer.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "section_name": "A-Ruby",
      "strength": 32
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Section updated.",
        "body": {
          "status": "success",
          "message": "Section updated successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "section-delete",
    "title": "Delete Section",
    "method": "DELETE",
    "url": "/api/sections/:sectionId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Sections & Rosters",
    "description": "Deletes a section. Blocked with 400 if students are enrolled.",
    "frontendNotes": "Prompt admin to transfer students out of the section prior to deletion.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Section deleted.",
        "body": {
          "status": "success",
          "message": "Section deleted successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Students are currently enrolled.",
          "body": {
            "status": "error",
            "message": "Cannot delete section: 28 students are enrolled"
          }
        }
      ]
    }
  },
  {
    "id": "section-assign-ct",
    "title": "Assign / Change Class Teacher for Section",
    "method": "PUT",
    "url": "/api/sections/:sectionId/class-teacher",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Sections & Rosters",
    "description": "Designates a teacher as the primary Class Teacher for this section.",
    "frontendNotes": "Shows in Teacher Dashboard as their class teacher responsibility.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "teacher_id": "4001"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Class teacher assigned.",
        "body": {
          "status": "success",
          "message": "Class teacher assigned successfully",
          "data": {
            "section_id": "601",
            "class_teacher_id": "4001"
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Teacher not found.",
          "body": {
            "status": "error",
            "message": "Teacher not found"
          }
        }
      ]
    }
  },
  {
    "id": "section-remove-ct",
    "title": "Remove Class Teacher from Section",
    "method": "DELETE",
    "url": "/api/sections/:sectionId/class-teacher",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Sections & Rosters",
    "description": "Unassigns the current class teacher from the section.",
    "frontendNotes": "Reverts section to having no class teacher.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Class teacher removed.",
        "body": {
          "status": "success",
          "message": "Class teacher removed from section successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "subject-master-list",
    "title": "List Master Subject Catalog in Branch",
    "method": "GET",
    "url": "/api/branch/:branchId/subjects",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Subject Catalog",
    "description": "Retrieves the master repository of all subjects offered at this campus (e.g. Physics, Chemistry, Calculus, Social Studies).",
    "frontendNotes": "Populates subject selection multi-selects throughout the admin and teacher workflows.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subject list.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "701",
              "name": "Physics",
              "code": "PHY-10"
            },
            {
              "id": "702",
              "name": "Mathematics",
              "code": "MTH-10"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "subject-master-create",
    "title": "Add New Subject to Master Catalog",
    "method": "POST",
    "url": "/api/branch/:branchId/subjects",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Subject Catalog",
    "description": "Registers a new subject with unique code in the branch catalog.",
    "frontendNotes": "Rendered in \"Add New Subject\" modal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Computer Science",
      "code": "CS-10"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Subject created.",
        "body": {
          "status": "success",
          "message": "Subject created successfully",
          "data": {
            "id": "703",
            "name": "Computer Science",
            "code": "CS-10"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Subject code already exists in this branch.",
          "body": {
            "status": "error",
            "message": "Subject with code \"CS-10\" already exists in this branch"
          }
        }
      ]
    }
  },
  {
    "id": "class-subjects-list",
    "title": "List Subjects Assigned to Class",
    "method": "GET",
    "url": "/api/classes/:classId/subjects",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Class Curriculum Mapping",
    "description": "Lists all curriculum subjects assigned to a class.",
    "frontendNotes": "Shows in Class Curriculum tab.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assigned subjects.",
        "body": {
          "status": "success",
          "data": [
            {
              "class_subject_id": "801",
              "subject_id": "701",
              "name": "Physics",
              "code": "PHY-10"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "class-subjects-assign",
    "title": "Assign Subjects to Class Curriculum",
    "method": "POST",
    "url": "/api/classes/:classId/subjects",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Class Curriculum Mapping",
    "description": "Maps master subjects to a class (e.g. adding Physics and Math to Grade 10).",
    "frontendNotes": "Allows multi-select array of subject IDs.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "classId",
        "type": "string",
        "required": true,
        "desc": "Class ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "subject_id": "6001"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subjects assigned.",
        "body": {
          "status": "success",
          "message": "Subjects assigned to class successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-list",
    "title": "List Teachers in Branch (Paginated)",
    "method": "GET",
    "url": "/api/branch/:branchId/teachers",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Teacher Directory",
    "description": "Retrieves all teachers employed at the branch with cursor pagination.",
    "frontendNotes": "Teacher Directory master table view.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Page size limit"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Cursor ID for next page"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Paginated teacher directory.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "4001",
              "name": "Suresh Raina",
              "teacher_id": "TCH-001",
              "contact_email": "raina@school.edu",
              "contact_mobile": "9876543240"
            }
          ],
          "meta": {
            "nextCursor": null,
            "hasNextPage": false
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-search",
    "title": "Autocomplete Search Teachers in Branch",
    "method": "GET",
    "url": "/api/branch/:branchId/teachers/search",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Teacher Directory",
    "description": "Quick search for teachers by name, teacher ID, email, or mobile.",
    "frontendNotes": "Debounce search input on frontend by 300ms.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [
      {
        "key": "q",
        "type": "string",
        "required": true,
        "desc": "Search keyword"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Matching teachers.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "4001",
              "name": "Suresh Raina",
              "teacher_id": "TCH-001",
              "contact_email": "raina@school.edu"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-onboard",
    "title": "Onboard New Teacher in Branch",
    "method": "POST",
    "url": "/api/branch/:branchId/teachers",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Teacher Directory",
    "description": "Onboards a new faculty member with teacher ID and salt-hashed password.",
    "frontendNotes": "Rendered on the \"Add Teacher\" form. Teacher ID must be unique in branch.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "teacher_id": "TCH-001",
      "name": "Suresh Raina",
      "contact_email": "raina@school.edu",
      "contact_mobile": "9876543240",
      "password": "TeacherPassword123!"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Teacher onboarded.",
        "body": {
          "status": "success",
          "message": "Teacher onboarded successfully",
          "data": {
            "id": "4001",
            "teacher_id": "TCH-001",
            "name": "Suresh Raina"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Duplicate teacher ID or email.",
          "body": {
            "status": "error",
            "message": "Teacher ID or Email already exists"
          }
        }
      ]
    }
  },
  {
    "id": "teacher-get-details",
    "title": "Get Full Teacher Profile & Assigned Sections",
    "method": "GET",
    "url": "/api/teachers/:teacherId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Teacher Directory",
    "description": "Retrieves complete teacher dossier: contact info, assigned teaching subjects, class teacher duties, and past assignments.",
    "frontendNotes": "Teacher profile details page view.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "teacherId",
        "type": "string",
        "required": true,
        "desc": "Teacher ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher details.",
        "body": {
          "status": "success",
          "data": {
            "id": "4001",
            "teacher_id": "TCH-001",
            "name": "Suresh Raina",
            "contact_email": "raina@school.edu",
            "contact_mobile": "9876543240",
            "assigned_sections": [
              {
                "section_id": "601",
                "class_name": "Grade 10",
                "section_name": "A",
                "subject": "Physics"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Teacher not found.",
          "body": {
            "status": "error",
            "message": "Teacher not found"
          }
        }
      ]
    }
  },
  {
    "id": "teacher-update-info",
    "title": "Update Teacher Profile & Contact Info",
    "method": "PUT",
    "url": "/api/teachers/:teacherId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Teacher Directory",
    "description": "Updates teacher contact email, mobile, or name.",
    "frontendNotes": "Used in the \"Edit Teacher\" modal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "teacherId",
        "type": "string",
        "required": true,
        "desc": "Teacher ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Dr. Suresh Raina",
      "contact_mobile": "9876543241"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher updated.",
        "body": {
          "status": "success",
          "message": "Teacher updated successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-delete-profile",
    "title": "Delete Teacher Profile",
    "method": "DELETE",
    "url": "/api/teachers/:teacherId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Teacher Directory",
    "description": "Deletes a teacher. Protected: Blocked if teacher is designated as Class Teacher or has published assignments.",
    "frontendNotes": "Reallocate class teacher and subject assignments before deleting.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "teacherId",
        "type": "string",
        "required": true,
        "desc": "Teacher ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher deleted.",
        "body": {
          "status": "success",
          "message": "Teacher deleted successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Assigned as class teacher or has assignments.",
          "body": {
            "status": "error",
            "message": "Cannot delete teacher: assigned as Class Teacher for Section A"
          }
        }
      ]
    }
  },
  {
    "id": "student-roster-list",
    "title": "List Student Roster in Section (Paginated)",
    "method": "GET",
    "url": "/api/sections/:sectionId/students",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER"
    ],
    "category": "Student Roster",
    "description": "Retrieves all enrolled students in a specific section, ordered by roll number or admission number.",
    "frontendNotes": "Main Section Roster table. Supports pagination with nextCursor.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Page size limit"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Cursor ID for next page"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Section student roster.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "5001",
              "admission_no": "ADM-2026-001",
              "roll_no": "101",
              "name": "Aarav Sharma",
              "contact_email": "aarav@school.edu",
              "contact_mobile": "9876543250"
            }
          ],
          "meta": {
            "nextCursor": null,
            "hasNextPage": false
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "student-branch-search",
    "title": "Search Students Across Branch",
    "method": "GET",
    "url": "/api/branch/:branchId/students/search",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "CORPORATE_ADMIN"
    ],
    "category": "Student Roster",
    "description": "Searches students across the entire campus by student name or admission number.",
    "frontendNotes": "Used for global student search bar in header. Debounce input by 300ms.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "branchId",
        "type": "string",
        "required": true,
        "desc": "Branch ID"
      }
    ],
    "queryParams": [
      {
        "key": "q",
        "type": "string",
        "required": true,
        "desc": "Search query"
      },
      {
        "key": "section_id",
        "type": "string",
        "required": false,
        "desc": "Filter within specific section"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Matching students.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "5001",
              "name": "Aarav Sharma",
              "admission_no": "ADM-2026-001",
              "class_name": "Grade 10",
              "section_name": "A"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "student-enroll-single",
    "title": "Enroll Single Student into Section",
    "method": "POST",
    "url": "/api/sections/:sectionId/students",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER"
    ],
    "category": "Student Roster",
    "description": "Enrolls a student into a section with admission number, roll number, and initial login password.",
    "frontendNotes": "Rendered in \"Enroll Student\" modal. Admission number must be unique across branch.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "admission_no": "ADM-2026-001",
      "roll_no": "101",
      "name": "Aarav Sharma",
      "contact_email": "aarav@school.edu",
      "contact_mobile": "9876543250",
      "parent_name": "Rajesh Sharma",
      "parent_contact": "9876543251",
      "password": "StudentPassword123!"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Student enrolled successfully.",
        "body": {
          "status": "success",
          "message": "Student enrolled successfully",
          "data": {
            "id": "5001",
            "name": "Aarav Sharma",
            "admission_no": "ADM-2026-001"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Admission number or roll number already in use.",
          "body": {
            "status": "error",
            "message": "Admission number already exists"
          }
        }
      ]
    }
  },
  {
    "id": "student-enroll-bulk",
    "title": "Bulk Enroll Students via CSV / JSON",
    "method": "POST",
    "url": "/api/sections/:sectionId/students/bulk",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER"
    ],
    "category": "Student Roster",
    "description": "Batch enrollment of students with row-by-row validation. Returns exact counts of successful and failed rows with error descriptions.",
    "frontendNotes": "Frontend CSV upload feature: parse CSV to JSON array and post to this endpoint. Display summary cards of successes and errors.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "students": [
        {
          "admission_no": "ADM-2026-001",
          "roll_no": "101",
          "name": "Aarav Sharma",
          "contact_email": "aarav@school.edu",
          "contact_mobile": "9876543250",
          "password": "Password123!"
        },
        {
          "admission_no": "ADM-2026-002",
          "roll_no": "102",
          "name": "Diya Patel",
          "contact_email": "diya@school.edu",
          "contact_mobile": "9876543252",
          "password": "Password123!"
        }
      ]
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Bulk enrollment summary.",
        "body": {
          "status": "success",
          "message": "Enrolled 2 students successfully (0 failed)",
          "data": {
            "total_processed": 2,
            "successful_count": 2,
            "failed_count": 0,
            "errors": []
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Malformed student array.",
          "body": {
            "status": "error",
            "message": "students must be a non-empty array"
          }
        }
      ]
    }
  },
  {
    "id": "student-get-profile",
    "title": "Get Student Full Profile Details",
    "method": "GET",
    "url": "/api/students/:studentId",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "STUDENT"
    ],
    "category": "Student Profile",
    "description": "Retrieves complete student dossier: academic enrollment, roll number, contact info, and parent details.",
    "frontendNotes": "Student profile modal / page view.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "studentId",
        "type": "string",
        "required": true,
        "desc": "Student ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student profile.",
        "body": {
          "status": "success",
          "data": {
            "id": "5001",
            "admission_no": "ADM-2026-001",
            "roll_no": "101",
            "name": "Aarav Sharma",
            "contact_email": "aarav@school.edu",
            "contact_mobile": "9876543250",
            "parent_name": "Rajesh Sharma",
            "parent_contact": "9876543251",
            "class_name": "Grade 10",
            "section_name": "A"
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Student not found.",
          "body": {
            "status": "error",
            "message": "Student not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-update-profile",
    "title": "Update Student Profile & Demographics",
    "method": "PUT",
    "url": "/api/students/:studentId",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER"
    ],
    "category": "Student Profile",
    "description": "Updates student demographic and contact information.",
    "frontendNotes": "Used in the \"Edit Student\" drawer.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "studentId",
        "type": "string",
        "required": true,
        "desc": "Student ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Aarav K. Sharma",
      "contact_mobile": "9876543259",
      "parent_contact": "9876543258"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student updated.",
        "body": {
          "status": "success",
          "message": "Student profile updated successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "student-update-password",
    "title": "Admin / Class Teacher Update Student Password",
    "method": "PUT",
    "url": "/api/students/:studentId/password",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "CORPORATE_ADMIN"
    ],
    "category": "Student Profile",
    "description": "Allows an authorized Branch Admin, Corporate Admin, or the assigned Section Class Teacher to update/reset a student's password directly without requiring student mobile OTP. Specially designed for K-12 school environments where students do not possess personal mobile phones.",
    "frontendNotes": "Role access rules: Branch Admin can reset password for any student in their branch; Class Teacher can reset password for any student enrolled in their assigned section; Corporate Admin can reset across the entity. Regular subject teachers without Class Teacher assignment for that section receive 403 Forbidden.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "studentId",
        "type": "string (BigInt)",
        "required": true,
        "desc": "Student ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "new_password": "NewStudentPassword2026!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student password successfully updated.",
        "body": {
          "status": "success",
          "message": "Student password updated successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Password shorter than 6 characters.",
          "body": {
            "status": "error",
            "message": "Password must be at least 6 characters"
          }
        },
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Missing or invalid token.",
          "body": {
            "status": "error",
            "message": "Unauthorized"
          }
        },
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Teacher is not the designated class teacher of this section, or admin lacks branch access.",
          "body": {
            "status": "error",
            "message": "Forbidden: Only the assigned class teacher of this section or a branch administrator can update this student's password"
          }
        },
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Student not found.",
          "body": {
            "status": "error",
            "message": "Student not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-delete-profile",
    "title": "Delete Student",
    "method": "DELETE",
    "url": "/api/students/:studentId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Student Profile",
    "description": "Deletes a student. Protected: BLOCKED with 400 Bad Request if past evaluated test submissions exist on record.",
    "frontendNotes": "Warn user that students with exam history cannot be deleted to maintain academic integrity.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "studentId",
        "type": "string",
        "required": true,
        "desc": "Student ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student deleted.",
        "body": {
          "status": "success",
          "message": "Student deleted successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Evaluated submissions exist.",
          "body": {
            "status": "error",
            "message": "Cannot delete student: 4 evaluated test submissions exist on record"
          }
        }
      ]
    }
  },
  {
    "id": "student-submissions-history",
    "title": "Student Test Submissions & Scorecard History",
    "method": "GET",
    "url": "/api/students/:studentId/submissions",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "STUDENT"
    ],
    "category": "Scorecards & History",
    "description": "Retrieves all historical test submissions, scorecards, percentage trends, and teacher feedback for a student.",
    "frontendNotes": "Use on Student Performance / Report Card tab. Displays chart of scores over time.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "studentId",
        "type": "string",
        "required": true,
        "desc": "Student ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Test submissions history.",
        "body": {
          "status": "success",
          "data": [
            {
              "submission_id": "1401",
              "assignment_title": "Midterm Physics Assessment",
              "subject_name": "Physics",
              "score": 36,
              "max_score": 40,
              "percentage": 90,
              "status": "approved",
              "submitted_at": "2026-10-15T10:15:00.000Z"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-self-profile",
    "title": "Get Logged-in Teacher Profile",
    "method": "GET",
    "url": "/api/teacher/profile",
    "roles": [
      "TEACHER"
    ],
    "category": "Teacher Portal",
    "description": "Returns profile details for the authenticated teacher.",
    "frontendNotes": "Render on top-right user menu in Teacher Portal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Teacher JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher profile.",
        "body": {
          "status": "success",
          "data": {
            "id": "4001",
            "teacher_id": "TCH-001",
            "name": "Suresh Raina",
            "contact_email": "raina@school.edu",
            "contact_mobile": "9876543240"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-dashboard",
    "title": "Teacher Home Dashboard Summary",
    "method": "GET",
    "url": "/api/teacher/dashboard",
    "roles": [
      "TEACHER"
    ],
    "category": "Teacher Portal",
    "description": "Primary landing view for teachers. Returns all teaching sections, subjects taught, designated class teacher responsibilities, and pending grading counters.",
    "frontendNotes": "Renders the Teacher Home Page with cards for each assigned section/class.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Teacher JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher dashboard overview.",
        "body": {
          "status": "success",
          "data": {
            "teacher_id": "TCH-001",
            "teacher_name": "Suresh Raina",
            "assigned_sections": [
              {
                "section_id": "601",
                "class_name": "Grade 10",
                "section_name": "A",
                "subject_name": "Physics",
                "subject_code": "PHY-10"
              }
            ],
            "class_teacher_sections": [
              {
                "section_id": "601",
                "class_name": "Grade 10",
                "section_name": "A",
                "total_students": 28
              }
            ]
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "teacher-section-subjects",
    "title": "Subjects Teacher Specifically Teaches in Section",
    "method": "GET",
    "url": "/api/teacher/sections/:sectionId/subjects",
    "roles": [
      "TEACHER"
    ],
    "category": "Teacher Portal",
    "description": "Retrieves the specific subject(s) the teacher is assigned to teach within a given section.",
    "frontendNotes": "When a teacher opens a section, use this to populate the Subject tabs.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Teacher JWT"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subjects taught by teacher.",
        "body": {
          "status": "success",
          "data": [
            {
              "subject_id": "701",
              "subject_name": "Physics",
              "code": "PHY-10",
              "class_subject_id": "801"
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "assign-upload-urls",
    "title": "Generate Pre-signed S3 Upload URLs",
    "method": "POST",
    "url": "/api/assignments/upload-urls",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Generates secure AWS S3 Pre-signed PUT URLs for direct client-side uploads of question paper PDFs and optional teacher answer keys.",
    "frontendNotes": "Workflow Step 1: Upload file directly to data.question_paper_presigned_url with PUT method, then call /process-async.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "section_id": "8001",
      "files": [
        {
          "file_name": "class10_math_midterm_qp.pdf",
          "file_type": "application/pdf",
          "purpose": "question_paper"
        },
        {
          "file_name": "class10_math_midterm_key.pdf",
          "file_type": "application/pdf",
          "purpose": "answer_key"
        }
      ]
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Pre-signed S3 URLs generated.",
        "body": {
          "status": "success",
          "data": {
            "urls": [
              {
                "file_name": "class10_math_midterm_qp.pdf",
                "upload_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/assignments/raw/guid-qp.pdf?AWSAccessKeyId=...",
                "file_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/assignments/raw/guid-qp.pdf"
              },
              {
                "file_name": "class10_math_midterm_key.pdf",
                "upload_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/assignments/raw/guid-key.pdf?AWSAccessKeyId=...",
                "file_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/assignments/raw/guid-key.pdf"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Missing filename.",
          "body": {
            "status": "error",
            "message": "question_paper_filename is required"
          }
        }
      ]
    }
  },
  {
    "id": "assign-process-async",
    "title": "Enqueue Papers for Async OCR & AI Model Routing",
    "method": "POST",
    "url": "/api/assignments/process-async",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Enqueues uploaded paper S3 URLs into the processing pipeline for OCR question extraction and dynamic LLM reasoning model selection.",
    "frontendNotes": "Workflow Step 2: Returns assignment_id and status: ocr_processing. Next, poll pipeline-status.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "section_id": "601",
      "class_subject_id": "801",
      "title": "Physics Unit Test 1",
      "difficulty": "Medium",
      "duration_minutes": 60,
      "question_paper_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/papers/physics_midterm.pdf",
      "answer_key_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/keys/physics_midterm_key.pdf"
    },
    "responses": {
      "success": {
        "code": 202,
        "status": "Accepted",
        "desc": "Processing job accepted.",
        "body": {
          "status": "success",
          "message": "Assignment queued for async OCR extraction",
          "data": {
            "assignment_id": "1501",
            "status": "ocr_processing",
            "poll_url": "/api/assignments/1501/pipeline-status"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "assign-pipeline-status",
    "title": "Poll OCR & AI Reasoning Pipeline Status",
    "method": "GET",
    "url": "/api/assignments/:id/pipeline-status",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Polls the status of question extraction and reasoning model selection. When ready, returns extracted questions for teacher review.",
    "frontendNotes": "Poll every 3 seconds until status is ready or failed. Stop polling once ready.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Assignment ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Pipeline status with extracted questions.",
        "body": {
          "status": "success",
          "data": {
            "assignment_id": "1501",
            "status": "ready",
            "reasoning_model": "gemini-1.5-pro",
            "extracted_questions": [
              {
                "question_number": 1,
                "question_text": "Define Ohm's Law.",
                "max_marks": 5
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Assignment not found.",
          "body": {
            "status": "error",
            "message": "Assignment not found"
          }
        }
      ]
    }
  },
  {
    "id": "assign-create-sync",
    "title": "Synchronous Upload & Inline OCR Fallback",
    "method": "POST",
    "url": "/api/assignments/create-sync",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Synchronous fallback for manual question entry or offline question papers.",
    "frontendNotes": "Use when teacher manually types questions or uploads pre-structured test papers.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "section_id": "601",
      "class_subject_id": "801",
      "title": "Physics Quick Quiz",
      "difficulty": "Easy",
      "duration_minutes": 30,
      "question_paper_url": "https://...",
      "questions": [
        {
          "question_number": 1,
          "question_text": "What is SI unit of Force?",
          "max_marks": 5
        }
      ]
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Assignment created.",
        "body": {
          "status": "success",
          "data": {
            "id": "1502",
            "title": "Physics Quick Quiz",
            "status": "ready"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "assign-publish",
    "title": "Finalize, Review Questions & Publish to Section",
    "method": "POST",
    "url": "/api/assignments",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Finalizes teacher edits to questions, sets due date, and publishes the assignment. It becomes immediately visible to students in the section.",
    "frontendNotes": "Workflow Final Step: Confirms and publishes test to student portal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "assignment_id": "1501",
      "title": "Midterm Physics Assessment",
      "due_date": "2026-10-25T23:59:59.000Z",
      "questions_json": [
        {
          "question_number": 1,
          "question_text": "Define electric potential.",
          "max_marks": 10
        }
      ]
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assignment published.",
        "body": {
          "status": "success",
          "message": "Assignment finalized and published successfully",
          "data": {
            "id": "1501",
            "status": "published"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "assign-list",
    "title": "List Assignments for Section Subject",
    "method": "GET",
    "url": "/api/assignments",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Filterable list of assignments with submission counters and publication statuses.",
    "frontendNotes": "Filter by section_id and class_subject_id.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "section_id",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      },
      {
        "key": "class_subject_id",
        "type": "string",
        "required": false,
        "desc": "Subject filter"
      },
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Limit"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of assignments.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "1501",
              "title": "Midterm Physics Assessment",
              "status": "published",
              "total_submissions": 28
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "assign-get-details",
    "title": "Get Assignment Details & Questions",
    "method": "GET",
    "url": "/api/assignments/:id",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "STUDENT"
    ],
    "category": "Assignment Pipeline",
    "description": "Retrieves complete test paper details, question paper URL, and question breakdown. Answer keys are included for teachers/admins.",
    "frontendNotes": "Students use this to view test details before submission.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Assignment ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assignment details.",
        "body": {
          "status": "success",
          "data": {
            "id": "1501",
            "title": "Midterm Physics Assessment",
            "question_paper_url": "https://...",
            "questions_json": [
              {
                "question_number": 1,
                "question_text": "Define electric potential.",
                "max_marks": 10
              }
            ]
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "assign-delete",
    "title": "Delete Assignment & Purge Submissions",
    "method": "DELETE",
    "url": "/api/assignments/:id",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Assignment Pipeline",
    "description": "Deletes an assignment and cascades deletion across related student submissions, scorecards, and batch jobs.",
    "frontendNotes": "Show destructive action warning modal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Assignment ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assignment deleted.",
        "body": {
          "status": "success",
          "message": "Assignment and associated student submissions deleted successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "grading-list-submissions",
    "title": "List Student Submissions for Assignment",
    "method": "GET",
    "url": "/api/assignments/:id/submissions",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Lists all student answer sheet submissions for a specific test paper, showing submission time, score, and review status.",
    "frontendNotes": "Grading queue table view. Filter by status: pending_review, submitted, approved.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Assignment ID"
      }
    ],
    "queryParams": [
      {
        "key": "status",
        "type": "string",
        "required": false,
        "desc": "submitted | approved | pending_review"
      },
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Limit per page"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Cursor for next page"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Submissions list.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "1401",
              "student_id": "5001",
              "student_name": "Aarav Sharma",
              "roll_no": "101",
              "score": 34,
              "max_score": 40,
              "status": "pending_review",
              "submitted_at": "2026-10-15T10:15:00.000Z"
            }
          ],
          "meta": {
            "nextCursor": null,
            "hasNextPage": false
          }
        }
      },
      "errors": [
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Access denied to branch.",
          "body": {
            "message": "Forbidden: You do not have access to this branch"
          }
        },
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Assignment not found.",
          "body": {
            "status": "error",
            "message": "Assignment not found"
          }
        }
      ]
    }
  },
  {
    "id": "grading-get-submission",
    "title": "Inspect Submission Scorecard, OCR & Feedback",
    "method": "GET",
    "url": "/api/submissions/:id",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Retrieves complete submission inspection data: high-resolution scanned paper URLs, OCR transcript text, question-by-question scoring breakdown, and feedback.",
    "frontendNotes": "Side-by-side grading interface: render handwritten image on the left, OCR text & scoring breakdown on the right.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Submission ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Submission inspection data.",
        "body": {
          "status": "success",
          "data": {
            "id": "1401",
            "assignment_id": "1501",
            "student": {
              "id": "5001",
              "name": "Aarav Sharma",
              "roll_no": "101"
            },
            "sample_paper_urls": [
              "https://.../page1.jpg",
              "https://.../page2.jpg"
            ],
            "ocr_text": "Question 1: Electric potential unit is Volt...",
            "score": 34,
            "max_score": 40,
            "feedback": "Clear diagrams and accurate formula usage.",
            "socratic_hint": "Double check units when multiplying power and time.",
            "status": "pending_review",
            "question_breakdown": [
              {
                "question_number": 1,
                "marks_awarded": 10,
                "max_marks": 10,
                "verdict": "correct"
              },
              {
                "question_number": 2,
                "marks_awarded": 24,
                "max_marks": 30,
                "verdict": "partial"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Submission not found.",
          "body": {
            "status": "error",
            "message": "Submission not found"
          }
        }
      ]
    }
  },
  {
    "id": "grading-approve-submission",
    "title": "Approve Evaluated Paper & Notify Student",
    "method": "POST",
    "url": "/api/submissions/:id/approve",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Teacher reviews, adjusts score/comments, and approves the paper. Sets status to approved and dispatches a scorecard release notification to the student.",
    "frontendNotes": "On click \"Approve Scorecard\", triggers instant student notification.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Submission ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "final_score": 36,
      "final_feedback": "Excellent work. Checked and approved by Subject Teacher.",
      "final_hint": "Review kinetic friction equation before next unit test."
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Submission approved.",
        "body": {
          "status": "success",
          "message": "Submission approved successfully",
          "data": {
            "id": "1401",
            "status": "approved",
            "final_score": 36,
            "final_feedback": "Excellent work. Checked and approved by Subject Teacher."
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Negative score.",
          "body": {
            "status": "error",
            "message": "Final score must be non-negative"
          }
        }
      ]
    }
  },
  {
    "id": "grading-override-score",
    "title": "Teacher Manual Score Override",
    "method": "POST",
    "url": "/api/submissions/:id/override",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Teacher directly overrides the awarded score and question step marks.",
    "frontendNotes": "Use when teacher manually adjusts AI-awarded marks.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Submission ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "score": 38,
      "feedback": "Marks adjusted following re-evaluation of Q2 step marks."
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Score overridden.",
        "body": {
          "status": "success",
          "data": {
            "id": "1401",
            "score": 38,
            "status": "approved"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Score must be non-negative.",
          "body": {
            "status": "error",
            "message": "Score must be non-negative"
          }
        }
      ]
    }
  },
  {
    "id": "grading-bulk-upload",
    "title": "Bulk Upload Section Answer Sheets Stack (BatchJob)",
    "method": "POST",
    "url": "/api/submissions/bulk",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Uploads a combined physical paper stack for an entire section. Initiates an async BatchJob for page splitting, student identification, OCR, and AI grading.",
    "frontendNotes": "Returns HTTP 202 Accepted with poll_url. Frontend displays batch processing progress bar.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "assignment_id": "8001",
      "bulk_mode": "combined_pdf",
      "total_files": 1,
      "file_urls": [
        "https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/raw/all_students_combined.pdf"
      ]
    },
    "responses": {
      "success": {
        "code": 202,
        "status": "Accepted",
        "desc": "Batch job queued.",
        "body": {
          "status": "success",
          "data": {
            "job_id": "1701",
            "status": "queued",
            "stage": "splitting",
            "total_files": 35,
            "poll_url": "/api/submissions/batch/1701"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Missing assignment_id.",
          "body": {
            "status": "error",
            "message": "assignment_id is required"
          }
        }
      ]
    }
  },
  {
    "id": "grading-batch-status",
    "title": "Poll Batch Paper Splitting & Evaluation Progress",
    "method": "GET",
    "url": "/api/submissions/batch/:jobId",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Status polling endpoint for batch paper upload jobs. Returns processed counts, status, and created submissions list.",
    "frontendNotes": "Poll every 3 seconds to update progress bar (processed_count / total_files * 100).",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "jobId",
        "type": "string",
        "required": true,
        "desc": "Batch Job ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Batch job progress status.",
        "body": {
          "status": "success",
          "data": {
            "job_id": "1701",
            "status": "completed",
            "stage": "completed",
            "total_files": 35,
            "processed_count": 35,
            "successful_count": 35,
            "failed_count": 0,
            "created_submissions": [
              {
                "submission_id": "1401",
                "student_name": "Aarav Sharma"
              },
              {
                "submission_id": "1402",
                "student_name": "Diya Patel"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Batch job not found.",
          "body": {
            "status": "error",
            "message": "Batch job not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-self-profile",
    "title": "Get Logged-in Student Profile",
    "method": "GET",
    "url": "/api/student/profile",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Retrieves current student personal profile, class, section, and contact details.",
    "frontendNotes": "Displays in Student Portal top bar / settings.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student profile details.",
        "body": {
          "status": "success",
          "data": {
            "id": "5001",
            "name": "Aarav Sharma",
            "admission_no": "ADM-2026-001",
            "roll_no": "101",
            "email": "aarav@school.edu",
            "mobile": "9876543250",
            "class_name": "Grade 10",
            "section_name": "A"
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "student-dashboard",
    "title": "Student Landing Dashboard & Summary",
    "method": "GET",
    "url": "/api/student/dashboard",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Primary landing screen for students. Returns enrolled class, section, designated class teacher name/email, active subjects, and real-time pending vs. completed test counters.",
    "frontendNotes": "Renders the Student Home Page. Use pending_count badge on the Assignments tab.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student dashboard overview.",
        "body": {
          "status": "success",
          "data": {
            "class_name": "Grade 10",
            "section_name": "A",
            "class_teacher": {
              "id": "4001",
              "name": "Suresh Raina",
              "email": "raina@school.edu"
            },
            "subjects": [
              {
                "id": "701",
                "name": "Physics",
                "code": "PHY-10"
              },
              {
                "id": "702",
                "name": "Mathematics",
                "code": "MTH-10"
              }
            ],
            "pending_count": 2,
            "completed_count": 5
          }
        }
      },
      "errors": [
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Non-student role access.",
          "body": {
            "message": "Forbidden: Insufficient permissions"
          }
        }
      ]
    }
  },
  {
    "id": "student-assignments-list",
    "title": "Filterable Student Assignments List",
    "method": "GET",
    "url": "/api/student/assignments",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Filterable list of assignments published to the student's section. Supports filtering by status: pending (unsubmitted) or completed (already submitted).",
    "frontendNotes": "Tabs on frontend: \"Pending Tests\" (?status=pending) and \"Completed Tests\" (?status=completed).",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "status",
        "type": "string",
        "required": false,
        "desc": "pending | completed"
      },
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Limit"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Next cursor"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student assignments list.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "1501",
              "title": "Midterm Physics Assessment",
              "subject_name": "Physics",
              "difficulty": "Medium",
              "duration_minutes": 60,
              "due_date": "2026-10-25T23:59:59.000Z",
              "is_submitted": false,
              "submission_id": null
            }
          ],
          "meta": {
            "nextCursor": null,
            "hasNextPage": false
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "student-assignment-details",
    "title": "Student View of Test Paper & Questions",
    "method": "GET",
    "url": "/api/student/assignments/:id",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Student view of a test paper. Returns question paper URL and question prompts. Crucially: teacher answer keys and grading rubrics are scrubbed for exam integrity.",
    "frontendNotes": "Student exam taking screen. Shows PDF viewer and question checklist.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Assignment ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Sanitized question paper view.",
        "body": {
          "status": "success",
          "data": {
            "id": "1501",
            "title": "Midterm Physics Assessment",
            "difficulty": "Medium",
            "duration_minutes": 60,
            "question_paper_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/papers/midterm.pdf",
            "questions": [
              {
                "question_number": 1,
                "question_text": "Define electric potential and write its SI unit.",
                "max_marks": 10
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Assignment not found or in different section.",
          "body": {
            "status": "error",
            "message": "Assignment not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-submit-paper",
    "title": "Submit Handwritten Answer Sheets",
    "method": "POST",
    "url": "/api/student/assignments/:id/submit",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Student submits handwritten answer sheets (S3 URLs or file uploads). Creates a Submission record in status submitted and triggers an immediate confirmation notification.",
    "frontendNotes": "Upload photos/scans of student handwritten answer sheets. Displays submission receipt modal on completion.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Assignment ID"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "sample_paper_urls": [
        "https://paatam-uploads.s3.ap-south-2.amazonaws.com/student-uploads/sheet_pg1.jpg",
        "https://paatam-uploads.s3.ap-south-2.amazonaws.com/student-uploads/sheet_pg2.jpg"
      ]
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Submission received.",
        "body": {
          "status": "success",
          "message": "Answer sheets submitted successfully",
          "data": {
            "submission_id": "1401",
            "assignment_id": "1501",
            "status": "submitted",
            "submitted_at": "2026-10-16T12:00:00.000Z"
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Assignment not found in student section.",
          "body": {
            "status": "error",
            "message": "Assignment not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-submission-scorecard",
    "title": "Student View Graded Scorecard & Socratic Hints",
    "method": "GET",
    "url": "/api/student/submissions/:id",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Student views their graded scorecard, marks breakdown, teacher comments, and AI Socratic hints. Strictly guarded: access by any other student is blocked with 403 Forbidden.",
    "frontendNotes": "Scorecard Modal / Results Screen. Socratic hints offer guidance on areas for improvement.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Submission ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student graded scorecard.",
        "body": {
          "status": "success",
          "data": {
            "id": "1401",
            "assignment_title": "Midterm Physics Assessment",
            "status": "approved",
            "score": 36,
            "max_score": 40,
            "feedback": "Excellent work. Checked and approved by Subject Teacher.",
            "socratic_hint": "Review kinetic friction equation before next unit test.",
            "submitted_at": "2026-10-15T10:15:00.000Z"
          }
        }
      },
      "errors": [
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Cross-student access attempt.",
          "body": {
            "status": "error",
            "message": "Forbidden: Access denied to this submission"
          }
        },
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Submission not found.",
          "body": {
            "status": "error",
            "message": "Submission not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-notifications-feed",
    "title": "Student Notification Feed",
    "method": "GET",
    "url": "/api/student/notifications",
    "roles": [
      "STUDENT"
    ],
    "category": "Student Portal",
    "description": "Retrieves chronological notification feed for the student: assignments published, answer sheets received, and approved scorecards released.",
    "frontendNotes": "Notification Bell dropdown on student dashboard header. Poll every 60 seconds or on page focus.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Student JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Notification feed.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "1601",
              "type": "GRADE_RELEASED",
              "title": "Scorecard Released",
              "message": "Your scorecard for \"Midterm Physics Assessment\" has been approved and released.",
              "timestamp": "2026-10-16T12:05:00.000Z",
              "read": false
            },
            {
              "id": "1600",
              "type": "SUBMISSION_RECEIVED",
              "title": "Assignment Submitted",
              "message": "Your answer sheets for \"Midterm Physics Assessment\" have been submitted successfully.",
              "timestamp": "2026-10-16T12:00:00.000Z",
              "read": false
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "assignment-ai-generate",
    "title": "Generate Question Paper with AI Blueprint",
    "method": "POST",
    "url": "/api/assignments/generate",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Generates a complete, structured CBSE/ICSE exam question paper with section headings, MCQs, short, and descriptive questions based on syllabus topics or textbook chapters.",
    "frontendNotes": "Used in the Paper Creation Wizard when the teacher selects \"Generate with AI\". Provides a complete questions preview for review before publishing.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "class_subject_id": "9001",
      "exam_title": "Mathematics Unit Test - Polynomials & Quadratic Equations",
      "target_marks": 40,
      "language": "English",
      "difficulty": "Standard",
      "selected_chapters": [
        "Polynomials",
        "Quadratic Equations"
      ],
      "selected_subtopics": [
        "Roots of quadratic equations",
        "Zeroes of a polynomial"
      ],
      "question_counts": {
        "mcq_count": 5,
        "very_short_count": 3,
        "short_count": 3,
        "descriptive_count": 2
      },
      "marks_config": {
        "mcq": 1,
        "vsa": 2,
        "sa": 3,
        "long": 5
      }
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "AI exam paper generated successfully.",
        "body": {
          "status": "success",
          "message": "AI Exam Paper generated successfully",
          "data": {
            "exam_title": "Class 10 CBSE Midterm Science Examination",
            "target_marks": 40,
            "total_marks": 40,
            "questions_count": 20,
            "questions": [
              {
                "id": "q1",
                "questionNo": "1",
                "section": "Section A",
                "type": "mcq",
                "text": "Which of the following turns blue litmus red?",
                "marks": 1,
                "options": [
                  "Dilute HCl",
                  "Sodium hydroxide",
                  "Distilled water",
                  "Baking soda"
                ],
                "correctAnswer": "Dilute HCl",
                "hasVisual": false
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid payload.",
          "body": {
            "status": "error",
            "message": "Validation failed"
          }
        },
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Branch access denied.",
          "body": {
            "message": "Forbidden: You do not have access to this branch"
          }
        }
      ]
    }
  },
  {
    "id": "assignment-ai-regenerate-question",
    "title": "Regenerate Single Alternative Question",
    "method": "POST",
    "url": "/api/assignments/regenerate-question",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Generates a single alternative question targeting the same subtopic and marks weightage while avoiding rejected or duplicate questions.",
    "frontendNotes": "Add a \"Shuffle / Regenerate\" button next to each question on the paper review step.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "class_subject_id": "9001",
      "chapter_title": "Quadratic Equations",
      "question_type": "SHORT_ANSWER",
      "marks": 3,
      "current_question_text": "Find the discriminant of 2x^2 - 4x + 3 = 0 and discuss nature of roots.",
      "subtopics": [
        "Discriminant and nature of roots"
      ],
      "language": "English",
      "difficulty": "Standard"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Alternative question generated.",
        "body": {
          "status": "success",
          "message": "Alternative question generated successfully",
          "data": {
            "question": {
              "id": "q1-alt-1",
              "questionNo": "1",
              "section": "Section A",
              "type": "mcq",
              "text": "Which of the following substances has a pH value strictly greater than 7?",
              "marks": 1,
              "options": [
                "Milk of Magnesia",
                "Lemon juice",
                "Tomato juice",
                "Gastric juice"
              ],
              "correctAnswer": "Milk of Magnesia",
              "hasVisual": false
            }
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid payload.",
          "body": {
            "status": "error",
            "message": "Validation failed"
          }
        }
      ]
    }
  },
  {
    "id": "assignment-ai-generate-diagram",
    "title": "Generate Technical STEM Question Diagram",
    "method": "POST",
    "url": "/api/assignments/generate-diagram",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Generates high-resolution diagrams, geometric figures, or circuit schematics for STEM questions using AI image rendering with SVG vector fallback.",
    "frontendNotes": "Allows teachers to auto-generate illustrations for questions that require visual diagrams.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "question_text": "Draw a ray diagram illustrating the formation of image by a concave mirror when object is placed at centre of curvature.",
      "subject": "Physics"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Diagram generated successfully.",
        "body": {
          "status": "success",
          "message": "Technical diagram generated successfully",
          "data": {
            "image_url": "https://s3.amazonaws.com/paatam/diagrams/diagram-17610283.png",
            "diagram_svg": "<svg width=\"100%\" height=\"auto\">...</svg>",
            "type": "image"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "question_text is required.",
          "body": {
            "status": "error",
            "message": "Validation failed"
          }
        }
      ]
    }
  },
  {
    "id": "curriculum-chapter-ingest",
    "title": "Ingest Textbook Chapter Document (RAG)",
    "method": "POST",
    "url": "/api/curriculum/chapters/ingest",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Ingests textbook chapter content, automatically extracts chapter title, number, subtopics, and prerequisites, generates 1536-dimensional vector embeddings, and stores them in PostgreSQL pgvector.",
    "frontendNotes": "Teachers upload PDF chapters or paste chapter text to populate the school knowledge base.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "class_subject_id": "1001",
      "chapter_title": "Acids, Bases and Salts",
      "chapter_number": 2,
      "chapter_text": "Acids have sour taste and turn blue litmus red...",
      "pdf_url": "https://s3.amazonaws.com/paatam/curriculum/ch2.pdf",
      "file_name": "science_ch2.pdf"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Chapter indexed and vectorized.",
        "body": {
          "status": "success",
          "message": "Chapter indexed into curriculum and vectorized into vector store",
          "data": {
            "chapter_id": "102",
            "chapter_number": 2,
            "chapter_title": "Acids, Bases and Salts",
            "subtopics": [
              "Properties of Acids",
              "Bases",
              "pH Scale",
              "Salts"
            ],
            "chunk_count": 14
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "ClassSubject not found.",
          "body": {
            "status": "error",
            "message": "ClassSubject not found"
          }
        }
      ]
    }
  },
  {
    "id": "curriculum-chapter-list",
    "title": "List Indexed Textbook Chapters",
    "method": "GET",
    "url": "/api/curriculum/chapters",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Retrieves all textbook chapters, identified subtopics, and chunk counts for a given subject.",
    "frontendNotes": "Populates the multi-select chapter filter in the AI Question Paper generator.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "class_subject_id",
        "type": "string",
        "required": true,
        "desc": "ClassSubject ID"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of chapters.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "102",
              "chapter_number": 2,
              "chapter_title": "Acids, Bases and Salts",
              "subtopics": [
                "Properties of Acids",
                "Bases",
                "pH Scale",
                "Salts"
              ],
              "chunk_count": 14,
              "pdf_url": "https://s3.amazonaws.com/paatam/curriculum/ch2.pdf"
            }
          ]
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "ClassSubject not found.",
          "body": {
            "status": "error",
            "message": "ClassSubject not found"
          }
        }
      ]
    }
  },
  {
    "id": "curriculum-syllabus-ingest",
    "title": "Ingest Syllabus Structure & Weightage",
    "method": "POST",
    "url": "/api/curriculum/syllabus/ingest",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Extracts curriculum units, syllabus topics, and exam marks weightages using AI.",
    "frontendNotes": "Allows importing the official board syllabus breakdown for blueprint alignment.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "class_subject_id": "1001",
      "syllabus_text": "Unit I: Chemical Substances - Nature and Behaviour (25 Marks)..."
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Syllabus indexed.",
        "body": {
          "status": "success",
          "message": "Syllabus topics parsed and indexed successfully",
          "data": {
            "topics_count": 5,
            "topics": [
              {
                "name": "Chemical Substances - Nature and Behaviour",
                "marks": 25,
                "unit": "Unit I"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid input.",
          "body": {
            "status": "error",
            "message": "Validation failed"
          }
        }
      ]
    }
  },
  {
    "id": "curriculum-topics-list",
    "title": "List Syllabus Topics & Marks Weightage",
    "method": "GET",
    "url": "/api/curriculum/topics",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "AI Question Generator & Curriculum RAG",
    "description": "Lists all curriculum syllabus topics and marks weightage breakdown for a class subject.",
    "frontendNotes": "Displays unit weightage bars and topic checklist in the exam generator UI.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "class_subject_id",
        "type": "string",
        "required": true,
        "desc": "ClassSubject ID"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of syllabus topics.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "501",
              "topic_name": "Chemical Substances - Nature and Behaviour",
              "subtopics": [
                "Chemical reactions",
                "Acids, bases and salts"
              ],
              "weightage": 25,
              "unit": "Unit I"
            }
          ]
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "ClassSubject not found.",
          "body": {
            "status": "error",
            "message": "ClassSubject not found"
          }
        }
      ]
    }
  },
  {
    "id": "submissions-list-global",
    "title": "Global Review Queue & Submissions Feed",
    "method": "GET",
    "url": "/api/submissions",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Fetches a branch-wide or teacher-assigned list of all student submissions for the evaluation review queue. Supports filtering by status, assignment_id, class_id, section_id, and cursor pagination.",
    "frontendNotes": "Used in Overview.tsx, ReviewQueue.tsx, and Dashboard.tsx to display all pending or completed submissions across all assignments in one central table.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "assignment_id",
        "type": "string",
        "required": false,
        "desc": "Filter by specific assignment"
      },
      {
        "key": "status",
        "type": "string",
        "required": false,
        "desc": "Filter by status (e.g. submitted, pending_review, graded, approved)"
      },
      {
        "key": "class_id",
        "type": "string",
        "required": false,
        "desc": "Filter by class"
      },
      {
        "key": "section_id",
        "type": "string",
        "required": false,
        "desc": "Filter by section"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Pagination cursor ID"
      },
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "desc": "Items per page (max 10, default 10)"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Submissions list with pagination metadata.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "3233756592734400",
              "assignment_id": "1001",
              "assignment_title": "Mid-Term Mathematics Exam",
              "subject_name": "Mathematics",
              "student_id": "2001",
              "student_name": "Aryabhata",
              "roll_no": "101",
              "admission_no": "ADM-2026-001",
              "class_name": "Grade 10",
              "section_name": "A",
              "score": 36,
              "max_score": 40,
              "status": "graded",
              "evaluation_status": "completed",
              "submitted_at": "2026-10-23T12:00:00.000Z",
              "sample_paper_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/paper-1.pdf"
            }
          ],
          "meta": {
            "nextCursor": "3233756592734400",
            "hasNextPage": false
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Missing or invalid token.",
          "body": {
            "message": "Unauthorized: Missing or invalid token"
          }
        },
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Insufficient role permissions.",
          "body": {
            "message": "Forbidden: Insufficient permissions"
          }
        }
      ]
    }
  },
  {
    "id": "submissions-create-single",
    "title": "Direct Single-Script Upload & Evaluation Queue",
    "method": "POST",
    "url": "/api/submissions",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Allows a teacher to directly upload an individual student handwritten paper or single scanned script, and immediately enqueue it for automated OCR extraction and AI evaluation.",
    "frontendNotes": "Used in ScanGrade.tsx and Dashboard.tsx when teachers scan a physical exam paper on a smartphone camera or desktop scanner.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "assignment_id": "8001",
      "student_id": "4001",
      "sample_paper_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/raw/student4001_exam.pdf",
      "submission_mode": "HANDWRITTEN"
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Single submission created and dispatched to SQS AI evaluation pipeline.",
        "body": {
          "status": "success",
          "message": "Submission created and queued for AI evaluation",
          "data": {
            "submission_id": "3233756592734400",
            "assignment_id": "1001",
            "student_id": "2001",
            "status": "submitted",
            "evaluation_status": "pending_ocr",
            "sample_paper_url": "https://paatam-uploads.s3.ap-south-2.amazonaws.com/submissions/sheet-1.pdf",
            "submitted_at": "2026-10-23T12:00:00.000Z"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Student does not belong to assignment section or URL missing.",
          "body": {
            "status": "error",
            "message": "Student does not belong to this assignment section"
          }
        },
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Assignment or student not found.",
          "body": {
            "status": "error",
            "message": "Assignment not found"
          }
        }
      ]
    }
  },
  {
    "id": "submissions-delete-single",
    "title": "Delete Single Student Submission",
    "method": "DELETE",
    "url": "/api/submissions/:id",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Grading & Review",
    "description": "Deletes an individual student submission from the review queue (e.g. if blurry, corrupt, or re-scanned) without deleting the entire assignment or affecting other classmates.",
    "frontendNotes": "Call this from PaperDetail.tsx or ReviewQueue.tsx when a teacher clicks \"Delete & Re-scan Paper\".",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "id",
        "type": "string",
        "required": true,
        "desc": "Submission ID to delete"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Submission purged successfully.",
        "body": {
          "status": "success",
          "message": "Submission deleted successfully",
          "data": {
            "id": "3233756592734400"
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Submission not found.",
          "body": {
            "status": "error",
            "message": "Submission not found"
          }
        }
      ]
    }
  },
  {
    "id": "analytics-overview",
    "title": "Branch & Class Academic Performance Overview",
    "method": "GET",
    "url": "/api/analytics/overview",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Analytics & Reporting",
    "description": "Supplies aggregated KPIs, average percentages, pass percentages, letter grade distributions (A, B, C, D, F), score buckets, and subject breakdown for the Analytics dashboard.",
    "frontendNotes": "Powers the charts, bell curves, and KPI summary tiles on Analytics.tsx.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "class_id",
        "type": "string",
        "required": false,
        "desc": "Filter by Class ID"
      },
      {
        "key": "section_id",
        "type": "string",
        "required": false,
        "desc": "Filter by Section ID"
      },
      {
        "key": "subject_id",
        "type": "string",
        "required": false,
        "desc": "Filter by Subject ID"
      },
      {
        "key": "assignment_id",
        "type": "string",
        "required": false,
        "desc": "Filter by Assignment ID"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Aggregated analytics metrics.",
        "body": {
          "status": "success",
          "data": {
            "total_assignments": 12,
            "total_submissions": 340,
            "evaluated_submissions": 325,
            "unique_students_evaluated": 28,
            "average_score_percentage": 76.4,
            "pass_percentage": 92.3,
            "grade_distribution": {
              "A": 120,
              "B": 95,
              "C": 60,
              "D": 25,
              "F": 25
            },
            "score_distribution": {
              "0-20%": 10,
              "21-40%": 25,
              "41-60%": 60,
              "61-80%": 110,
              "81-100%": 120
            },
            "subject_performance": [
              {
                "subject_name": "Mathematics",
                "average_score": 78.2,
                "total_evaluations": 160
              },
              {
                "subject_name": "Physics",
                "average_score": 74.5,
                "total_evaluations": 165
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Missing or invalid token.",
          "body": {
            "message": "Unauthorized"
          }
        }
      ]
    }
  },
  {
    "id": "analytics-students",
    "title": "Student Roster Performance & Grade Rankings",
    "method": "GET",
    "url": "/api/analytics/students",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Analytics & Reporting",
    "description": "Returns student-by-student academic performance metrics including average percentage scores, overall letter grades, and highest/lowest test marks with cursor pagination.",
    "frontendNotes": "Powers the student rank list and performance table on Analytics.tsx.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "class_id",
        "type": "string",
        "required": false,
        "desc": "Filter by Class ID"
      },
      {
        "key": "section_id",
        "type": "string",
        "required": false,
        "desc": "Filter by Section ID"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Cursor ID for pagination"
      },
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "desc": "Page size (default 10, max 50)"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Student analytics list with cursor pagination.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "2001",
              "name": "Aryabhata",
              "roll_no": "101",
              "admission_no": "ADM-2026-001",
              "class_name": "Grade 10",
              "section_name": "A",
              "total_submissions": 5,
              "evaluated_submissions": 5,
              "average_score": 90,
              "grade": "A",
              "highest_score": 95,
              "lowest_score": 85
            }
          ],
          "meta": {
            "nextCursor": "2001",
            "hasNextPage": false
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "notifications-list",
    "title": "System & Parent Notification Delivery Feed",
    "method": "GET",
    "url": "/api/notifications",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "STUDENT"
    ],
    "category": "Notifications & Alerts",
    "description": "Lists system notifications, parent SMS/WhatsApp delivery receipts, and student submission alerts with delivery status (delivered, sent, pending, failed).",
    "frontendNotes": "Used in ParentPortal.tsx to view WhatsApp and SMS delivery logs sent to student guardians.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "type",
        "type": "string",
        "required": false,
        "desc": "Filter by notification type"
      },
      {
        "key": "delivery_status",
        "type": "string",
        "required": false,
        "desc": "Filter by delivery status"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Pagination cursor ID"
      },
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "desc": "Limit per page"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Notification logs feed.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "5001",
              "type": "SMS_TEST",
              "title": "Test SMS to PARENT",
              "message": "Your child Aryabhata scored 36/40 in Mathematics.",
              "delivery_status": "delivered",
              "provider_message_id": "SM1234567890",
              "submission_id": null,
              "timestamp": "2026-10-23T12:00:00.000Z",
              "details": {
                "channel": "SMS",
                "recipient": "+919888999888",
                "recipient_type": "PARENT"
              }
            }
          ],
          "meta": {
            "nextCursor": "5001",
            "hasNextPage": false
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "notifications-test",
    "title": "Trigger Test SMS, WhatsApp or Email Alert",
    "method": "POST",
    "url": "/api/notifications/test",
    "roles": [
      "TEACHER",
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Notifications & Alerts",
    "description": "Dispatches a test notification via SMS, WhatsApp, or Email to verify parent communication channels, Twilio/SES configurations, and gateway delivery status.",
    "frontendNotes": "Used in ParentPortal.tsx when an administrator or teacher clicks \"Send Test Alert\".",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "channel": "SMS",
      "recipient": "+919888999888",
      "message": "Paatam test SMS alert: Parent communication gateway active.",
      "recipient_type": "PARENT"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Test notification dispatched and logged.",
        "body": {
          "status": "success",
          "message": "Test notification dispatched successfully",
          "data": {
            "id": "5001",
            "channel": "SMS",
            "recipient": "+919888999888",
            "recipient_type": "PARENT",
            "message": "Paatam test SMS alert: Parent communication gateway active.",
            "delivery_status": "delivered",
            "provider_message_id": "SM1234567890",
            "timestamp": "2026-10-23T12:00:00.000Z"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid channel or missing recipient.",
          "body": {
            "status": "error",
            "message": "Recipient phone or email is required"
          }
        }
      ]
    }
  },
  {
    "id": "corp-add-admin",
    "title": "Add Additional Corporate Admin",
    "method": "POST",
    "url": "/api/corporate/addAdmin/:corporateId",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Creates another Super Admin under the same corporate account. Can perform all corporate-level actions.",
    "frontendNotes": "Requires pre-registration verificationToken via /api/auth/send-otp and /api/auth/verify-otp.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "param": "corporateId",
        "desc": "Unique BigInt ID of the Corporate entity",
        "example": "1001"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Sunita Sharma",
      "email": "sunita.sharma@corporate.edu",
      "mobile": "9876543211",
      "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJpZmllZEVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInZlcmlmaWVkTW9iaWxlIjoiOTg3NjU0MzIxMSIsInB1cnBvc2UiOiJyZWdpc3RyYXRpb24ifQ..."
    },
    "responses": {
      "success": {
        "code": 201,
        "status": "Created",
        "desc": "Corporate Admin created.",
        "body": {
          "status": "success",
          "message": "Corporate admin added successfully",
          "data": {
            "id": "2002",
            "name": "Sunita Sharma",
            "email": "sunita.sharma@corporate.edu"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Email or mobile already in use.",
          "body": {
            "status": "error",
            "message": "Email already registered"
          }
        },
        {
          "code": 403,
          "status": "Forbidden",
          "desc": "Insufficient role permissions.",
          "body": {
            "message": "Forbidden: Insufficient permissions"
          }
        }
      ]
    }
  },
  {
    "id": "corp-list-branches",
    "title": "List All Branches under Corporate",
    "method": "GET",
    "url": "/api/branch/corporate/all",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Branch Management",
    "description": "Retrieves all branches belonging to the authenticated corporate organization with cursor pagination.",
    "frontendNotes": "Use on Corporate Overview Dashboard / Branch Switcher dropdown.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "key": "limit",
        "type": "number",
        "required": false,
        "default": "10",
        "desc": "Items per page (max 10)"
      },
      {
        "key": "cursor",
        "type": "string",
        "required": false,
        "desc": "Cursor ID for next page"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Paginated list of branches.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "301",
              "name": "Madhapur Campus",
              "pincode": "500081",
              "address": "Plot 45...",
              "branch_contact_mail": "madhapur@school.edu"
            }
          ],
          "meta": {
            "nextCursor": null,
            "hasNextPage": false
          }
        }
      },
      "errors": []
    }
  },
  {
    "id": "corp-assign-branch-access",
    "title": "Assign Branch Access to Admin",
    "method": "POST",
    "url": "/api/admin/:adminId/assign-branches",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Admin Management",
    "description": "Maps one or more branches to a Branch Admin, allowing them to manage those specific campuses.",
    "frontendNotes": "Accepts an array of BigInt/string IDs as branch_ids.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "param": "adminId",
        "desc": "ID of the Branch Admin to assign branches to",
        "example": "3001"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "branch_ids": [
        "5001",
        "5002"
      ]
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Branches mapped to admin.",
        "body": {
          "status": "success",
          "message": "Branches assigned successfully"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin or branch not found.",
          "body": {
            "status": "error",
            "message": "Branch not found"
          }
        }
      ]
    }
  },
  {
    "id": "subject-update",
    "title": "Update Subject Name or Code",
    "method": "PUT",
    "url": "/api/subjects/:subjectId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Subject Catalog",
    "description": "Updates subject name or course code.",
    "frontendNotes": "Changes propagate across all classes and past tests linked to this subject.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "param": "subjectId",
        "desc": "Subject unique identifier",
        "example": "6001"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "name": "Physics & Applied Mechanics",
      "code": "PHY-10A"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subject updated.",
        "body": {
          "status": "success",
          "message": "Subject updated successfully"
        }
      },
      "errors": []
    }
  },
  {
    "id": "subject-delete",
    "title": "Delete Subject from Catalog",
    "method": "DELETE",
    "url": "/api/subjects/:subjectId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Subject Catalog",
    "description": "Deletes a subject from the catalog. Blocked if assigned to classes.",
    "frontendNotes": "Warn user that subject must be unassigned from all classes before deletion.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "param": "subjectId",
        "desc": "Subject unique identifier",
        "example": "6001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subject deleted.",
        "body": {
          "status": "success",
          "message": "Subject deleted successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Subject assigned to class.",
          "body": {
            "status": "error",
            "message": "Cannot delete subject: mapped to 2 classes"
          }
        }
      ]
    }
  },
  {
    "id": "class-subjects-remove",
    "title": "Unassign Subject from Class",
    "method": "DELETE",
    "url": "/api/classes/:classId/subjects/:classSubjectId",
    "roles": [
      "BRANCH_ADMIN"
    ],
    "category": "Class Curriculum Mapping",
    "description": "Removes a subject from a class curriculum. Blocked if test papers have been published.",
    "frontendNotes": "Confirmation modal before removal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "param": "classId",
        "desc": "Class unique ID",
        "example": "8001"
      },
      {
        "param": "classSubjectId",
        "desc": "ID of the class-subject mapping record",
        "example": "9001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subject removed from class.",
        "body": {
          "status": "success",
          "message": "Subject unassigned from class successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Assignments exist.",
          "body": {
            "status": "error",
            "message": "Cannot unassign: 3 assignments exist under this subject"
          }
        }
      ]
    }
  },
  {
    "id": "section-teachers-list",
    "title": "Get Section Subjects & Assigned Teachers",
    "method": "GET",
    "url": "/api/sections/:sectionId/subjects-teachers",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN",
      "TEACHER"
    ],
    "category": "Teacher Allocations",
    "description": "Retrieves all subject offerings in a section along with their designated faculty members.",
    "frontendNotes": "Shows teacher-subject matrix for the section (e.g. Physics -> Mr. Raina, Math -> Ms. Rao).",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Bearer JWT token"
      }
    ],
    "urlParams": [
      {
        "key": "sectionId",
        "type": "string",
        "required": true,
        "desc": "Section ID"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Teacher allocations.",
        "body": {
          "status": "success",
          "data": [
            {
              "teacher_subject_id": "901",
              "subject_name": "Physics",
              "subject_code": "PHY-10",
              "teacher": {
                "id": "4001",
                "name": "Suresh Raina",
                "email": "raina@school.edu"
              }
            }
          ]
        }
      },
      "errors": []
    }
  },
  {
    "id": "auth-send-otp",
    "title": "Dispatch Verification / Login OTP",
    "method": "POST",
    "url": "/api/auth/send-otp",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN",
      "BRANCH_ADMIN",
      "TEACHER",
      "STUDENT"
    ],
    "category": "Authentication",
    "description": "Generates and dispatches a 6-digit one-time password (OTP) via SMS (Evolution API) and Email (AWS SES) for identity verification and pre-registration.",
    "frontendNotes": "Call before registration or during 2FA login. The OTP is valid for 10 minutes.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "email": "admin@narayana.ac.in",
      "mobile": "9876543210"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "OTP dispatched successfully.",
        "body": {
          "status": "success",
          "message": "OTP sent successfully",
          "data": null
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Missing email and mobile.",
          "body": {
            "status": "error",
            "message": "At least one contact identifier is required"
          }
        }
      ]
    }
  },
  {
    "id": "auth-verify-otp",
    "title": "Verify OTP & Issue Pre-Registration Token",
    "method": "POST",
    "url": "/api/auth/verify-otp",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN",
      "BRANCH_ADMIN",
      "TEACHER",
      "STUDENT"
    ],
    "category": "Authentication",
    "description": "Validates a 6-digit OTP against the database and returns a cryptographic JWT verificationToken (valid for 15 minutes) required to create a Corporate or Admin account.",
    "frontendNotes": "Store verificationToken in state and pass it in POST /api/corporate/create or POST /api/corporate/addAdmin/:corporateId.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "email": "admin@narayana.ac.in",
      "mobile": "9876543210",
      "otp": "123456"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "OTP verified and verification token issued.",
        "body": {
          "status": "success",
          "message": "OTP verified successfully",
          "data": {
            "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJpZmllZEVtYWlsIjoiYWRtaW5AbmFyYXlhbmEuYWMuaW4iLCJ2ZXJpZmllZE1vYmlsZSI6Ijk4NzY1NDMyMTAiLCJwdXJwb3NlIjoicmVnaXN0cmF0aW9uIn0..."
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid or expired OTP.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP"
          }
        }
      ]
    }
  },
  {
    "id": "auth-branch-admin-login",
    "title": "Branch Admin (Dean / Principal) Login",
    "method": "POST",
    "url": "/api/auth/branch-admin/login",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "category": "Authentication",
    "description": "Authenticates a campus Branch Admin (Dean, Principal, Vice Principal) using their email/mobile and password under a specific corporate organization. Sets an httpOnly refresh token cookie and returns a JWT access token.",
    "frontendNotes": "Login with either registered email address or 10-digit mobile number as identifier.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin.koramangala@narayana.ac.in",
      "password": "SecureBranchPassword2026!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Branch admin authenticated.",
        "body": {
          "status": "success",
          "message": "Login successful",
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "admin": {
              "id": "3001",
              "name": "Principal Skinner",
              "email": "skinner@maincampus.com",
              "role": "PRINCIPAL",
              "corporateId": "1001",
              "branches": [
                {
                  "id": "5001",
                  "name": "Main Campus"
                }
              ]
            }
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Invalid credentials.",
          "body": {
            "status": "error",
            "message": "Invalid email or password"
          }
        }
      ]
    }
  },
  {
    "id": "auth-branch-admin-forgot-password",
    "title": "Branch Admin Forgot Password OTP",
    "method": "POST",
    "url": "/api/auth/branch-admin/forgot-password",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "category": "Authentication",
    "description": "Dispatches a password reset OTP to the branch admin contact email/mobile.",
    "frontendNotes": "On success, transition UI to password reset OTP input screen.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin.koramangala@narayana.ac.in",
      "corporateId": "1001"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Reset OTP sent.",
        "body": {
          "status": "success",
          "message": "Password reset OTP sent to registered contact"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin not found.",
          "body": {
            "status": "error",
            "message": "Admin not found in this corporate organization"
          }
        }
      ]
    }
  },
  {
    "id": "auth-branch-admin-reset-password",
    "title": "Branch Admin Reset Password with OTP",
    "method": "POST",
    "url": "/api/auth/branch-admin/reset-password",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "category": "Authentication",
    "description": "Verifies the password reset OTP and updates the admin password with argon2 hashing.",
    "frontendNotes": "Redirect user to branch admin login upon success.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin.koramangala@narayana.ac.in",
      "corporateId": "1001",
      "otp": "654321",
      "new_password": "NewSecureBranchPass2026!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Password updated.",
        "body": {
          "status": "success",
          "message": "Password reset successfully. Please login with your new password."
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid OTP or weak password.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP"
          }
        }
      ]
    }
  },
  {
    "id": "corporate-lookup",
    "title": "Lookup Corporate Entity by Registration Number",
    "method": "GET",
    "url": "/api/corporate/lookup/:registrationNo",
    "roles": [
      "PUBLIC",
      "CORPORATE_ADMIN",
      "BRANCH_ADMIN"
    ],
    "category": "Corporate Setup",
    "description": "Searches for a registered enterprise corporate entity by its government or institutional registration number. Used on login and onboarding screens.",
    "frontendNotes": "Call during branch admin or teacher login to dynamically obtain corporateId.",
    "headers": [
      {
        "key": "Accept",
        "value": "application/json",
        "required": false,
        "desc": "Expected response format"
      }
    ],
    "urlParams": [
      {
        "param": "registrationNo",
        "desc": "Corporate registration number",
        "example": "REG-HYD-2026-001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Corporate found.",
        "body": {
          "status": "success",
          "data": {
            "corporateId": "1001",
            "name": "Narayana Educational Institutions",
            "registration_no": "REG-HYD-2026-001"
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "No entity exists with this registration number.",
          "body": {
            "status": "error",
            "message": "Corporate entity not found"
          }
        }
      ]
    }
  },
  {
    "id": "corporate-admins-all",
    "title": "List All Corporate Admins (Paginated)",
    "method": "GET",
    "url": "/api/corporate/admins/all",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Retrieves all Corporate Super Admins belonging to the authenticated corporate tenant with cursor pagination.",
    "frontendNotes": "Renders the Super Admin table on Corporate Settings.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "param": "cursor",
        "desc": "Cursor ID for next page",
        "example": "2001"
      },
      {
        "param": "limit",
        "desc": "Results per page (default: 20)",
        "example": "20"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of corporate admins.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "2001",
              "name": "Super Admin",
              "email": "admin@corporate.edu",
              "mobile": "9876543210",
              "created_at": "2026-10-27T10:00:00.000Z"
            }
          ],
          "pagination": {
            "nextCursor": null,
            "hasMore": false
          }
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Missing authentication.",
          "body": {
            "status": "error",
            "message": "Unauthorized"
          }
        }
      ]
    }
  },
  {
    "id": "corporate-admin-profile",
    "title": "Get Specific Corporate Admin Profile",
    "method": "GET",
    "url": "/api/corporate/admin-profile/:adminId",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Retrieves profile details and corporate affiliation for a specific corporate admin by ID.",
    "frontendNotes": "Useful for user management modals and profile detail cards.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [
      {
        "param": "adminId",
        "desc": "Unique BigInt ID of the corporate admin",
        "example": "2001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Admin details.",
        "body": {
          "status": "success",
          "data": {
            "id": "2001",
            "name": "Super Admin",
            "email": "admin@corporate.edu",
            "mobile": "9876543210",
            "corporate": {
              "id": "1001",
              "name": "Narayana Educational Institutions",
              "registration_no": "REG-HYD-2026-001"
            }
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin not found.",
          "body": {
            "status": "error",
            "message": "Corporate admin not found"
          }
        }
      ]
    }
  },
  {
    "id": "admin-get-branches",
    "title": "Get Branches Assigned to a Branch Admin",
    "method": "GET",
    "url": "/api/admin/:adminId/branches",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Returns all campus branches currently assigned to a Dean, Principal, or Vice Principal.",
    "frontendNotes": "Populates the branch assignment checklist modal in the Corporate Admin portal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [
      {
        "param": "adminId",
        "desc": "Unique BigInt ID of the branch admin",
        "example": "3001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assigned branches.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "5001",
              "name": "Hyderabad Main Campus",
              "pincode": "500081",
              "address": "Madhapur, Hyderabad"
            }
          ]
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin not found.",
          "body": {
            "status": "error",
            "message": "Admin not found"
          }
        }
      ]
    }
  },
  {
    "id": "admin-update",
    "title": "Update Branch Admin Profile & Role",
    "method": "PUT",
    "url": "/api/admin/:adminId",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Modifies a branch admin name, email, mobile, or designated role (DEAN, PRINCIPAL, VICE_PRINCIPAL).",
    "frontendNotes": "Used on the Edit Administrator drawer in Corporate Portal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "param": "adminId",
        "desc": "Unique BigInt ID of the branch admin",
        "example": "3001"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "admin_name": "Dr. Ramesh Gupta",
      "contact_email": "ramesh.gupta@branch.edu",
      "mobile": "9876543220",
      "role": "DEAN"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Admin updated successfully.",
        "body": {
          "status": "success",
          "message": "Admin updated successfully",
          "data": {
            "id": "3001",
            "admin_name": "Dr. Ramesh Gupta",
            "contact_email": "ramesh.gupta@branch.edu",
            "role": "DEAN"
          }
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Validation failure.",
          "body": {
            "status": "error",
            "message": "Invalid admin details"
          }
        }
      ]
    }
  },
  {
    "id": "admin-delete",
    "title": "Delete Branch Admin Account",
    "method": "DELETE",
    "url": "/api/admin/:adminId",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Permanently removes a branch admin from the corporate system and unlinks all assigned campus branches.",
    "frontendNotes": "Include a confirmation prompt before calling this endpoint.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [
      {
        "param": "adminId",
        "desc": "Unique BigInt ID of the branch admin",
        "example": "3001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Admin deleted successfully.",
        "body": {
          "status": "success",
          "message": "Admin deleted successfully"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin not found.",
          "body": {
            "status": "error",
            "message": "Admin not found"
          }
        }
      ]
    }
  },
  {
    "id": "admin-corporate-all",
    "title": "List All Branch Admins in Corporate (Overview)",
    "method": "GET",
    "url": "/api/admin/corporate/all",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Retrieves all campus leadership personnel across all branches in the corporate organization.",
    "frontendNotes": "Powers the master administrators table in Corporate Admin portal.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "List of all administrators.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "3001",
              "admin_name": "Dr. Ramesh Gupta",
              "contact_email": "ramesh.gupta@branch.edu",
              "role": "PRINCIPAL",
              "branches": [
                {
                  "id": "5001",
                  "name": "Hyderabad Main Campus"
                }
              ]
            }
          ]
        }
      },
      "errors": [
        {
          "code": 401,
          "status": "Unauthorized",
          "desc": "Missing authorization.",
          "body": {
            "status": "error",
            "message": "Unauthorized"
          }
        }
      ]
    }
  },
  {
    "id": "admin-corporate-search",
    "title": "Search Branch Admins by Name or Email",
    "method": "GET",
    "url": "/api/admin/corporate/search",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Searches for branch administrators within the corporate account matching a search query string.",
    "frontendNotes": "Connected to the search bar in the Administrator Directory screen.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [],
    "queryParams": [
      {
        "param": "query",
        "desc": "Name or email search keyword",
        "example": "Ramesh"
      }
    ],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Matching administrators.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "3001",
              "admin_name": "Dr. Ramesh Gupta",
              "contact_email": "ramesh.gupta@branch.edu",
              "role": "PRINCIPAL"
            }
          ]
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Missing query param.",
          "body": {
            "status": "error",
            "message": "Query parameter is required"
          }
        }
      ]
    }
  },
  {
    "id": "admin-profile-by-id",
    "title": "Get Full Branch Admin Profile by ID",
    "method": "GET",
    "url": "/api/admin/profile/:adminId",
    "roles": [
      "CORPORATE_ADMIN"
    ],
    "category": "Corporate Administration",
    "description": "Retrieves complete profile, contact information, role, and branch associations for a specific administrator.",
    "frontendNotes": "Used on the Administrator Details screen.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Corporate Admin JWT"
      }
    ],
    "urlParams": [
      {
        "param": "adminId",
        "desc": "Unique BigInt ID of the branch admin",
        "example": "3001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Administrator profile.",
        "body": {
          "status": "success",
          "data": {
            "id": "3001",
            "admin_name": "Dr. Ramesh Gupta",
            "contact_email": "ramesh.gupta@branch.edu",
            "role": "PRINCIPAL",
            "mobile": "9876543220",
            "branches": [
              {
                "id": "5001",
                "name": "Hyderabad Main Campus"
              }
            ]
          }
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Admin not found.",
          "body": {
            "status": "error",
            "message": "Admin not found"
          }
        }
      ]
    }
  },
  {
    "id": "branch-get-admins",
    "title": "List All Admins Assigned to a Branch",
    "method": "GET",
    "url": "/api/branch/:branchId/admins",
    "roles": [
      "CORPORATE_ADMIN",
      "BRANCH_ADMIN"
    ],
    "category": "Campus & Hierarchy",
    "description": "Retrieves the list of Deans, Principals, and Vice Principals assigned to a specific campus branch.",
    "frontendNotes": "Displays leadership cards on the Branch Details screen.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "JWT token"
      }
    ],
    "urlParams": [
      {
        "param": "branchId",
        "desc": "Branch unique BigInt ID",
        "example": "5001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Branch administrators.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "3001",
              "admin_name": "Principal Skinner",
              "contact_email": "skinner@maincampus.com",
              "role": "PRINCIPAL"
            }
          ]
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Branch not found.",
          "body": {
            "status": "error",
            "message": "Branch not found"
          }
        }
      ]
    }
  },
  {
    "id": "student-update-password",
    "title": "Set or Reset Student Password",
    "method": "POST",
    "url": "/api/students/:studentId/password",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "CORPORATE_ADMIN"
    ],
    "category": "Student Directory",
    "description": "Allows a Branch Admin or designated Class Teacher to manually reset or set a student login password.",
    "frontendNotes": "Also available via PUT /api/students/:studentId/password. Used on the Student Actions menu.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Staff JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "param": "studentId",
        "desc": "Student unique BigInt ID",
        "example": "10001"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "new_password": "NewStudentPassword2026!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Password updated.",
        "body": {
          "status": "success",
          "message": "Password updated successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Password validation failed.",
          "body": {
            "status": "error",
            "message": "Password must be at least 6 characters"
          }
        }
      ]
    }
  },
  {
    "id": "teacher-get-sections",
    "title": "Get Sections Assigned to Teacher",
    "method": "GET",
    "url": "/api/teachers/:teacherId/sections",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "CORPORATE_ADMIN"
    ],
    "category": "Faculty & Teachers",
    "description": "Retrieves all classroom sections assigned to a faculty member, indicating whether they serve as the primary Class Teacher.",
    "frontendNotes": "Populates the section selector in the Teacher assessment creation wizard.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "JWT token"
      }
    ],
    "urlParams": [
      {
        "param": "teacherId",
        "desc": "Teacher unique BigInt ID",
        "example": "4001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assigned sections.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "7001",
              "name": "Section A",
              "class": {
                "id": "8001",
                "name": "Grade 10"
              },
              "isClassTeacher": true
            }
          ]
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Teacher not found.",
          "body": {
            "status": "error",
            "message": "Teacher not found"
          }
        }
      ]
    }
  },
  {
    "id": "teacher-get-subjects",
    "title": "Get Subjects Taught by Teacher",
    "method": "GET",
    "url": "/api/teachers/:teacherId/subjects",
    "roles": [
      "BRANCH_ADMIN",
      "TEACHER",
      "CORPORATE_ADMIN"
    ],
    "category": "Faculty & Teachers",
    "description": "Retrieves the subject specializations and courses mapped to a teacher in the academic branch.",
    "frontendNotes": "Used on the Faculty Profile and Course Allocation screens.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "JWT token"
      }
    ],
    "urlParams": [
      {
        "param": "teacherId",
        "desc": "Teacher unique BigInt ID",
        "example": "4001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Assigned subjects.",
        "body": {
          "status": "success",
          "data": [
            {
              "id": "6001",
              "name": "Mathematics",
              "subject_code": "MATH-10"
            }
          ]
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Teacher not found.",
          "body": {
            "status": "error",
            "message": "Teacher not found"
          }
        }
      ]
    }
  },
  {
    "id": "teacher-assign-subject",
    "title": "Assign Subject to Teacher",
    "method": "POST",
    "url": "/api/teachers/:teacherId/subjects",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Faculty & Teachers",
    "description": "Maps an academic subject catalog offering to a teacher in the campus branch.",
    "frontendNotes": "Available in the Teacher Edit Modal under Subject Allocations.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Admin JWT"
      },
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [
      {
        "param": "teacherId",
        "desc": "Teacher unique BigInt ID",
        "example": "4001"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "subject_id": "6001"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subject assigned.",
        "body": {
          "status": "success",
          "message": "Subject mapped to teacher successfully"
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Subject already mapped.",
          "body": {
            "status": "error",
            "message": "Subject already assigned to teacher"
          }
        }
      ]
    }
  },
  {
    "id": "teacher-remove-subject",
    "title": "Unassign Subject from Teacher",
    "method": "DELETE",
    "url": "/api/teachers/:teacherId/subjects/:subjectId",
    "roles": [
      "BRANCH_ADMIN",
      "CORPORATE_ADMIN"
    ],
    "category": "Faculty & Teachers",
    "description": "Removes a subject assignment from a teacher.",
    "frontendNotes": "Invoked by clicking the remove badge on the teacher subject allocation list.",
    "headers": [
      {
        "key": "Authorization",
        "value": "Bearer <token>",
        "required": true,
        "desc": "Admin JWT"
      }
    ],
    "urlParams": [
      {
        "param": "teacherId",
        "desc": "Teacher unique BigInt ID",
        "example": "4001"
      },
      {
        "param": "subjectId",
        "desc": "Subject unique BigInt ID",
        "example": "6001"
      }
    ],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Subject unassigned.",
        "body": {
          "status": "success",
          "message": "Subject unmapped from teacher successfully"
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Mapping not found.",
          "body": {
            "status": "error",
            "message": "Subject assignment not found"
          }
        }
      ]
    }
  },
  {
    "id": "system-health",
    "title": "System Health Check",
    "method": "GET",
    "url": "/health",
    "roles": [
      "PUBLIC"
    ],
    "description": "ALB and container health check endpoint returning server liveness, status, and current UTC ISO timestamp.",
    "frontendNotes": "No authentication required. Also available at GET /api/health.",
    "headers": [],
    "urlParams": [],
    "queryParams": [],
    "requestBody": null,
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Server is healthy and responding to requests.",
        "body": {
          "status": "ok",
          "timestamp": "2026-10-27T10:45:00.000Z"
        }
      }
    },
    "category": "System Health & Diagnostics"
  },
  {
    "id": "auth-branch-forgot-pw-alias",
    "title": "Branch Admin Password Reset OTP Request (Alias)",
    "method": "POST",
    "url": "/api/auth/branch/forgot-password",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "description": "Triggers a 6-digit OTP to the registered email/mobile of a branch administrator. Alias of /api/auth/branch-admin/forgot-password.",
    "frontendNotes": "Provide the branch admin email or mobile and their corporate ID.",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin.koramangala@narayana.ac.in",
      "corporateId": "1001"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "OTP generated and sent to email/mobile.",
        "body": {
          "status": "success",
          "message": "Password reset OTP sent to registered contact."
        }
      },
      "errors": [
        {
          "code": 404,
          "status": "Not Found",
          "desc": "Branch admin not found for corporate.",
          "body": {
            "status": "error",
            "message": "No administrator found with provided identifier."
          }
        }
      ]
    },
    "category": "Branch Admin Authentication"
  },
  {
    "id": "auth-branch-reset-pw-alias",
    "title": "Branch Admin Complete Password Reset (Alias)",
    "method": "POST",
    "url": "/api/auth/branch/reset-password",
    "roles": [
      "PUBLIC",
      "BRANCH_ADMIN"
    ],
    "description": "Verifies the 6-digit OTP and resets the branch admin password. Alias of /api/auth/branch-admin/reset-password.",
    "frontendNotes": "Submit the 6-digit OTP along with the corporate ID and the new password (min 6 characters).",
    "headers": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "required": true,
        "desc": "JSON payload"
      }
    ],
    "urlParams": [],
    "queryParams": [],
    "requestBody": {
      "identifier": "admin.koramangala@narayana.ac.in",
      "corporateId": "1001",
      "otp": "654321",
      "new_password": "NewSecureBranchPass2026!"
    },
    "responses": {
      "success": {
        "code": 200,
        "status": "OK",
        "desc": "Password updated successfully.",
        "body": {
          "status": "success",
          "message": "Password reset successfully. You can now login."
        }
      },
      "errors": [
        {
          "code": 400,
          "status": "Bad Request",
          "desc": "Invalid or expired OTP.",
          "body": {
            "status": "error",
            "message": "Invalid or expired OTP."
          }
        }
      ]
    },
    "category": "Branch Admin Authentication"
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
  const publicCount = apiCatalog.filter(a => a.roles.includes('PUBLIC')).length;
  const corpCount = apiCatalog.filter(a => a.roles.includes('CORPORATE_ADMIN')).length;
  const branchCount = apiCatalog.filter(a => a.roles.some(r => ['BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(r))).length;
  const teacherCount = apiCatalog.filter(a => a.roles.includes('TEACHER')).length;
  const studentCount = apiCatalog.filter(a => a.roles.includes('STUDENT')).length;
  const totalRoleEndpoints = publicCount + corpCount + branchCount + teacherCount + studentCount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paatam API Hub — Interactive Frontend Developer Reference</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=JetBrains+Mono:wght@400;500;600;700&family=Kalam:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Paatam.ai Brand Palette */
      --color-ink: #12242b;
      --color-ink-soft: #33454c;
      --color-muted: #55656b;
      --color-paper: #faf7f1;
      --color-paper-deep: #f3eee4;
      --color-surface: #ffffff;
      --color-line: #e6dfd2;
      --color-line-strong: #d3cabb;
      --color-primary: #0e5a5f;
      --color-primary-strong: #0a4246;
      --color-primary-soft: #e2efed;
      --color-accent: #f0a53a;
      --color-accent-strong: #9a5d0c;
      --color-accent-soft: #fcefd8;
      --color-approved: #1c7148;
      --color-approved-soft: #e3f2e9;
      --color-gap: #a84a22;
      --color-gap-soft: #fbece3;
      --color-redpen: #b3261e;
      --color-ruling: #c9dbe8;
      --color-night: #0e171b;
      --color-night-2: #142228;

      /* Method Badges */
      --method-get: #0e5a5f;
      --method-get-bg: #e2efed;
      --method-post: #1d4ed8;
      --method-post-bg: #eff6ff;
      --method-put: #b45309;
      --method-put-bg: #fef3c7;
      --method-delete: #b3261e;
      --method-delete-bg: #fdecea;

      /* Typography */
      --font-display: 'Fraunces', ui-serif, Georgia, serif;
      --font-sans: 'Figtree', ui-sans-serif, system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
      --font-hand: 'Kalam', cursive;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--color-paper);
      background-image: 
        linear-gradient(to right, rgba(14, 90, 95, 0.045) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(14, 90, 95, 0.045) 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--color-ink);
      line-height: 1.5;
      padding-bottom: 80px;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Sticky Header */
    .top-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(250, 247, 241, 0.94);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--color-line);
      padding: 14px 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 1px 4px rgba(18, 36, 43, 0.03);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-link {
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .brand-svg {
      height: 34px;
      width: auto;
      max-width: 140px;
      aspect-ratio: 1217 / 655;
      display: block;
    }

    .brand-divider {
      height: 28px;
      width: 1px;
      background: var(--color-line-strong);
    }

    .brand-title {
      font-family: var(--font-display);
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--color-ink);
      line-height: 1.2;
    }

    .brand-subtitle {
      font-size: 12px;
      color: var(--color-muted);
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      min-width: 290px;
    }

    .search-input {
      width: 100%;
      background: var(--color-surface);
      border: 1px solid var(--color-line-strong);
      color: var(--color-ink);
      padding: 9px 16px 9px 38px;
      border-radius: 999px;
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(18, 36, 43, 0.04);
    }

    .search-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(14, 90, 95, 0.15);
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-muted);
      pointer-events: none;
    }

    .btn-toggle-all {
      background: var(--color-surface);
      border: 1px solid var(--color-line-strong);
      color: var(--color-ink);
      padding: 9px 16px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(18, 36, 43, 0.04);
    }

    .btn-toggle-all:hover {
      background: var(--color-primary-soft);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    /* Container */
    .container {
      max-width: 1380px;
      margin: 0 auto;
      padding: 24px 32px;
    }

    /* Ruled Hero Banner */
    .hero-banner {
      background-color: #fffdf8;
      background-image: 
        linear-gradient(to right, transparent 3.5rem, rgba(179, 38, 30, 0.35) 3.5rem, rgba(179, 38, 30, 0.35) calc(3.5rem + 1px), transparent calc(3.5rem + 1px)),
        repeating-linear-gradient(to bottom, transparent 0, transparent calc(2rem - 1px), var(--color-ruling) calc(2rem - 1px), var(--color-ruling) 2rem);
      background-position: 0 1rem;
      border: 1px solid var(--color-line);
      border-radius: 14px;
      padding: 28px 36px 28px 4.5rem;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px -8px rgba(18, 36, 43, 0.08);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      position: relative;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--color-surface);
      border: 1px solid var(--color-line-strong);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: 10px;
    }

    .hero-badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-accent);
    }

    .hero-info h1 {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      color: var(--color-ink);
      line-height: 1.25;
    }

    .hero-info h1 .hero-accent {
      color: var(--color-primary);
    }

    .hero-info p {
      color: var(--color-muted);
      font-size: 14px;
      line-height: 1.6;
      max-width: 780px;
    }

    .stats-ribbon {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: var(--color-surface);
      border: 1px solid var(--color-line);
      padding: 12px 18px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(18, 36, 43, 0.04);
      min-width: 105px;
    }

    .stat-val {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-primary);
      font-family: var(--font-display);
      line-height: 1.1;
    }

    .stat-lbl {
      font-size: 11px;
      color: var(--color-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }

    /* Async Processing & Real-Time Sync Guide */
    .async-guide-card {
      background: var(--color-surface);
      border: 1px solid var(--color-line);
      border-left: 4px solid var(--color-primary);
      box-shadow: 0 4px 16px -4px rgba(18, 36, 43, 0.08);
      border-radius: 14px;
      padding: 24px 28px;
      margin-bottom: 28px;
    }

    .async-guide-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--color-line);
      padding-bottom: 12px;
    }

    .async-guide-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .async-guide-badge {
      font-size: 12px;
      color: var(--color-muted);
      background: var(--color-paper-deep);
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid var(--color-line);
      font-weight: 500;
    }

    .async-flow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 18px;
    }

    .async-flow-box {
      background: #fffdf8;
      border: 1px solid var(--color-line);
      border-radius: 10px;
      padding: 18px;
      box-shadow: 0 1px 4px rgba(18, 36, 43, 0.03);
    }

    .async-flow-box h4 {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 600;
      color: var(--color-ink);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .async-step-list {
      list-style: none;
      font-size: 12.5px;
      color: var(--color-ink-soft);
      display: flex;
      flex-direction: column;
      gap: 8px;
      line-height: 1.5;
    }

    .async-step-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
    }

    .badge-queued { background: var(--color-paper-deep); color: var(--color-muted); border: 1px solid var(--color-line-strong); }
    .badge-processing { background: var(--color-primary-soft); color: var(--color-primary); border: 1px solid rgba(14, 90, 95, 0.25); }
    .badge-ready { background: var(--color-approved-soft); color: var(--color-approved); border: 1px solid rgba(28, 113, 72, 0.25); }
    .badge-evaluating { background: var(--color-accent-soft); color: var(--color-accent-strong); border: 1px solid rgba(240, 165, 58, 0.4); }

    /* Role Filter Tabs */
    .role-tabs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-line);
    }

    .role-tab-btn {
      background: var(--color-surface);
      border: 1px solid var(--color-line-strong);
      color: var(--color-muted);
      padding: 9px 18px;
      border-radius: 999px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(18, 36, 43, 0.04);
    }

    .role-tab-btn:hover {
      background: var(--color-paper-deep);
      color: var(--color-ink);
      border-color: var(--color-primary);
    }

    .role-tab-btn.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(14, 90, 95, 0.25);
    }

    .role-tab-badge {
      background: rgba(0, 0, 0, 0.08);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 700;
    }

    .role-tab-btn.active .role-tab-badge {
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
    }

    /* Role Group Section Banner */
    .role-section-banner {
      background: var(--color-surface);
      border: 1px solid var(--color-line);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(18, 36, 43, 0.03);
    }

    .role-pill {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 999px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .role-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--color-ink);
    }

    .role-subtitle {
      font-size: 13.5px;
      color: var(--color-muted);
      margin-top: 4px;
      max-width: 820px;
      line-height: 1.55;
    }

    .role-count-box {
      text-align: center;
      background: var(--color-paper);
      border: 1px solid var(--color-line);
      padding: 10px 18px;
      border-radius: 10px;
      min-width: 90px;
    }

    .role-count-num {
      font-size: 24px;
      font-weight: 700;
      font-family: var(--font-display);
      line-height: 1.1;
    }

    .role-count-lbl {
      font-size: 10.5px;
      color: var(--color-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Category Headers */
    .category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 4px;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px dashed var(--color-line-strong);
    }

    .category-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 600;
      color: var(--color-ink);
    }

    .category-count {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--color-muted);
      background: var(--color-paper-deep);
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid var(--color-line);
    }

    /* API Card Component */
    .api-card {
      background: var(--color-surface);
      border: 1px solid var(--color-line);
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: 0 1px 3px rgba(18, 36, 43, 0.04);
    }

    .api-card:hover {
      border-color: var(--color-primary);
      box-shadow: 0 4px 14px rgba(14, 90, 95, 0.08);
    }

    .api-card.is-open {
      border-color: var(--color-primary);
      box-shadow: 0 6px 20px rgba(14, 90, 95, 0.12);
    }

    /* Clickable Header Dropdown Trigger */
    .api-card-header {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      user-select: none;
      background: var(--color-surface);
      transition: background 0.15s;
    }

    .api-card-header:hover {
      background: #fdfbf7;
    }

    .api-card.is-open .api-card-header {
      background: #faf7f1;
      border-bottom: 1px solid var(--color-line);
    }

    .api-card-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      flex: 1;
    }

    /* Method Badges */
    .badge-method {
      padding: 4px 9px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
    }

    .method-GET {
      color: var(--method-get);
      background: var(--method-get-bg);
      border: 1px solid rgba(14, 90, 95, 0.25);
    }

    .method-POST {
      color: var(--method-post);
      background: var(--method-post-bg);
      border: 1px solid rgba(29, 78, 216, 0.25);
    }

    .method-PUT {
      color: var(--method-put);
      background: var(--method-put-bg);
      border: 1px solid rgba(180, 83, 9, 0.25);
    }

    .method-DELETE {
      color: var(--method-delete);
      background: var(--method-delete-bg);
      border: 1px solid rgba(179, 38, 30, 0.25);
    }

    .api-endpoint-url {
      font-family: var(--font-mono);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--color-ink);
    }

    .api-title {
      font-size: 13px;
      color: var(--color-muted);
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
      border-radius: 999px;
      letter-spacing: 0.05em;
    }

    .role-CORPORATE_ADMIN { color: #0e5a5f; background: #e2efed; border: 1px solid rgba(14, 90, 95, 0.2); }
    .role-BRANCH_ADMIN, .role-DEAN, .role-PRINCIPAL, .role-VICE_PRINCIPAL { color: #33454c; background: #f3eee4; border: 1px solid #d3cabb; }
    .role-TEACHER { color: #a84a22; background: #fbece3; border: 1px solid rgba(168, 74, 34, 0.2); }
    .role-STUDENT { color: #4553a0; background: #eceefa; border: 1px solid rgba(69, 83, 160, 0.2); }
    .role-PUBLIC { color: #55656b; background: #f3eee4; border: 1px solid #d3cabb; }

    .chevron-icon {
      width: 20px;
      height: 20px;
      color: var(--color-muted);
      transition: transform 0.25s ease;
    }

    .api-card.is-open .chevron-icon {
      transform: rotate(180deg);
      color: var(--color-primary);
    }

    /* Accordion Body */
    .api-card-body {
      display: none;
      padding: 22px 24px;
      background: #faf7f1;
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
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .desc-text {
      color: var(--color-ink-soft);
      font-size: 14px;
      line-height: 1.6;
    }

    .frontend-tip-box {
      background: var(--color-primary-soft);
      border-left: 3px solid var(--color-primary);
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      color: var(--color-primary-strong);
      font-size: 13px;
      margin-top: 10px;
      line-height: 1.5;
    }

    /* Parameter Tables */
    .param-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: var(--color-surface);
      border: 1px solid var(--color-line);
      border-radius: 8px;
      overflow: hidden;
      margin-top: 6px;
    }

    .param-table th {
      background: var(--color-paper-deep);
      text-align: left;
      padding: 8px 12px;
      color: var(--color-muted);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      border-bottom: 1px solid var(--color-line);
    }

    .param-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--color-line);
      color: var(--color-ink);
    }

    .param-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-primary);
    }

    .param-type {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: #7c3aed;
    }

    .param-req {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .req-yes { color: var(--color-redpen); background: #fdecea; }
    .req-no { color: var(--color-muted); background: var(--color-paper-deep); }

    /* Code Blocks */
    .code-wrapper {
      position: relative;
      margin-top: 6px;
      background: var(--color-night);
      border: 1px solid #23373f;
      border-radius: 8px;
      overflow: hidden;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px;
      color: #94a3b8;
      font-family: var(--font-mono);
    }

    .btn-copy {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      border-radius: 4px;
      padding: 3px 9px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-copy:hover {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #ffffff;
    }

    pre code {
      display: block;
      padding: 14px 16px;
      color: #cdeee9;
      font-family: var(--font-mono);
      font-size: 12.5px;
      line-height: 1.5;
      overflow-x: auto;
    }

    /* Response Cards Grid */
    .response-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 10px;
    }

    .resp-card {
      background: var(--color-night);
      border: 1px solid #23373f;
      border-radius: 8px;
      overflow: hidden;
    }

    .resp-card-header {
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .resp-code-badge {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .code-200, .code-201, .code-202 {
      color: #34d399;
      background: rgba(16, 185, 129, 0.2);
    }

    .code-400 {
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.2);
    }

    .code-401, .code-403, .code-404, .code-409, .code-422, .code-500 {
      color: #f87171;
      background: rgba(239, 68, 68, 0.2);
    }

    .resp-title {
      font-size: 12px;
      color: #cbd5e1;
      font-weight: 500;
    }

    /* Empty search state */
    .empty-state {
      display: none;
      text-align: center;
      padding: 60px 20px;
      color: var(--color-muted);
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
      .hero-banner { padding: 20px 20px 20px 24px; background-image: none; }
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
      <a href="https://www.paatam.ai" target="_blank" rel="noopener noreferrer" class="brand-logo-link" title="Paatam.ai — Turning Assessments into Learning Intelligence">
        <svg viewBox="10 10 1217 655" class="brand-svg" aria-label="Paatam.ai">
          <path fill="#12242b" fill-rule="evenodd" d="M 685.7 11.8 C 682.9 14.9,669 44.2,669 47 C 669 48.2,707.6 48.4,708.4 47.2 C 708.8 46.5,698.8 23.2,694.7 15.3 C 692 10.2,688.4 8.8,685.7 11.8 M 655.7 79.4 C 655.1 80.9,656.5 133.7,657.4 147.6 C 657.8 152.3,657.6 155,656.8 155.8 C 656 156.6,651.2 157,642.6 157 C 627.5 157,623.4 158.3,618.2 164.5 C 610.4 174,612.7 189.9,622.8 196.2 C 626.1 198.3,628 198.5,642.5 199 L 658.5 199.5 658.7 211 C 658.9 217.3,659.7 242.1,660.5 266 C 661.3 289.9,662 317.2,662 326.5 C 662 363.2,667.1 381.8,680.6 395.2 C 700.5 414.9,741.7 418.1,752.4 400.7 C 759.8 388.7,754.2 371.4,742.3 369.5 C 732.1 367.8,727.9 364.8,725 357 C 723.5 353.1,721.8 268.6,722.2 224.5 L 722.5 199.5 744 199 C 767.8 198.4,769.1 198.1,774.8 191.6 C 783.8 181.3,780.7 165,768.6 159.4 C 763.8 157.2,762.4 157,744 157 C 733.3 157,723.8 156.5,723 156 C 721.7 155.2,721.5 149.7,721.5 116.8 L 721.5 78.5 715.3 78.2 C 706.8 77.8,702.2 79.2,695 84.7 L 688.9 89.3 686.2 87.2 C 678 80.7,672.7 78.5,664.4 78.2 C 657.7 77.9,656.2 78.1,655.7 79.4 M 348.5 114.2 C 344.2 116.5,344 117.4,344 140.2 C 344 161.3,344.1 162,346.2 164 C 348.8 166.4,353.7 166.6,356.8 164.4 C 359 162.9,359 162.5,359 140 L 359 117.1 356.4 115.1 C 353.4 112.8,351.5 112.5,348.5 114.2 M 1069 120.5 C 1061 123.4,1052 126.8,1049 127.9 C 1046 129.1,1039.9 131.4,1035.5 133 C 1026.1 136.3,1002.8 144.9,977.2 154.5 C 958.6 161.5,955.9 163.2,957.9 166.8 C 959.3 169.4,1060 209,1065.3 209 C 1067.1 209,1078.7 206.3,1091 202.9 C 1117.3 195.9,1203.9 174,1205.8 174 C 1206.7 174,1207 179.5,1207 197.9 L 1207 221.9 1204 224 C 1191.7 232.7,1199.1 252.6,1213.8 250.6 C 1222.7 249.4,1228 242.1,1226.5 233 C 1225.8 229.1,1221.1 223,1218.7 223 C 1216.3 223,1216.1 221.1,1215.4 196.4 L 1214.7 172.9 1217.3 170.4 C 1221.9 166.2,1220.3 165,1202.1 158 C 1189.1 153.1,1122.4 126.8,1118 124.9 C 1091.1 113.1,1089.6 113,1069 120.5 M 408.2 135 C 407 135.5,404.9 137.9,403.5 140.2 C 390 162.9,388 166.8,388 169.6 C 388 175.6,395.5 178.6,400.1 174.4 C 403.6 171.2,419 144.6,419 141.6 C 419 136.3,413.5 132.9,408.2 135 M 289 137.2 C 285.5 141,286.4 144.4,295.1 158.9 C 299.6 166.4,304.1 173.5,305.3 174.8 C 309.6 179.5,318 176,318 169.5 C 318 166.9,313.9 159.2,303.7 142.7 C 298.8 134.8,293.2 132.7,289 137.2 M 119.8 174 C 100.2 176.5,80.8 183.8,64.9 194.6 C 60.5 197.6,56.8 200,56.6 200 C 56.4 200,56 197.5,55.7 194.5 C 54.7 184.6,50.3 180,39.3 177.3 C 27.6 174.4,16.1 178.9,12.3 188 C 11 190.8,10.8 199.2,10.8 238.5 C 10.8 264.3,10.8 293.2,10.7 302.5 C 10.6 311.9,11.1 324,11.8 329.5 C 12.5 335,13.5 353.9,14 371.5 C 14.5 389.1,15.5 414.3,16 427.5 C 20.3 524.8,19.1 515.4,27.4 518.5 C 34.3 521.2,58.9 520.3,65.2 517.2 C 73.7 513,73.5 514.8,72.1 459.7 C 71.4 433.4,71 411.6,71.3 411.4 C 71.5 411.2,74.4 412.3,77.6 413.9 C 115.9 432.7,166.1 429,201.3 404.7 C 227.4 386.7,245.8 360.2,253 330.2 C 254.3 325.1,255.5 321.1,255.8 321.4 C 256 321.7,256.8 325.9,257.6 330.7 C 264 373.2,293.8 404.7,334.9 412.1 C 348.7 414.6,357.3 414.5,370.1 411.6 C 381.2 409.1,390.3 405.4,399.9 399.5 C 403.1 397.6,406 396,406.4 396 C 406.7 396,407 398,407 400.5 C 407 404,407.6 405.7,409.5 407.5 C 411.8 409.9,412.3 410,426.2 410 C 443.9 410,445.1 409.3,446 400.3 C 446.3 397.1,446.2 368,445.9 335.5 C 445.3 280.2,445.2 276,443.2 268.5 C 438.3 249.3,430.8 236.7,416.7 223.4 C 384.8 193.4,337 190.1,299.5 215.3 C 279.4 228.9,264.4 251.9,258.4 278.1 C 257.5 282,256.7 285,256.5 284.8 C 256.3 284.6,255.2 279.8,254.1 274.1 C 243.4 220.9,208.7 185.9,156.1 175.1 C 148.7 173.5,128 172.9,119.8 174 M 44.5 194 C 41 195.3,39.9 197.6,38.4 206.7 C 36.3 220.1,36.3 220.3,41.9 214.2 C 46.8 208.9,48 205.4,48 196.9 C 48 193.6,47.2 193,44.5 194 M 1148.5 199.2 C 1128.9 204.2,1100.1 212.4,1095.8 214.1 C 1092.9 215.2,1085.6 217.9,1079.5 220 C 1073.5 222.1,1066.7 224.6,1064.6 225.5 C 1060.8 227.1,1060.6 227.1,1058.1 225.1 C 1052.2 220.3,1044.5 215.7,1038.2 213.3 C 1028.4 209.5,1008.8 208.8,997.4 211.9 C 974.8 218.1,960.2 232.4,953.3 255 C 951.8 259.9,951.6 268.6,951.3 331.8 L 950.9 403.1 953.9 406 L 956.8 409 971.8 409 L 986.8 409 989.4 405.9 L 992 402.8 992 346.1 C 992 284.9,992.2 282.4,997.4 274.2 C 1002.5 266.1,1010 261.8,1019.5 261.8 C 1029.9 261.6,1039.5 268.1,1044.1 278.3 L 1046.5 283.5 1047 343.8 L 1047.5 404.2 1050.3 406.6 C 1053 408.9,1053.7 409,1068 409 L 1082.8 409 1085.4 405.9 L 1088 402.8 1088 347.9 C 1088 301.6,1088.2 291.8,1089.6 286 C 1093.1 270.4,1104.2 261.5,1120.1 261.7 C 1132.2 261.9,1141.3 268.1,1146.9 280 L 1149.5 285.5 1150 344.8 L 1150.5 404.2 1153.3 406.6 C 1156 408.9,1156.7 409,1170.6 409 C 1178.7 409,1186 408.5,1187.1 408 C 1192 405.3,1192 405.6,1192 338.3 C 1192 273,1191.7 266.6,1187.6 254.5 C 1182.7 240.2,1170.8 225.1,1159.9 219.4 C 1157.1 218,1157.1 217.8,1156.8 208.2 C 1156.5 197.3,1156.4 197.2,1148.5 199.2 M 534 206 C 515.2 210,501.9 216.7,489 228.7 C 452.1 262.9,445.1 324.4,473.4 366.9 C 490.5 392.7,516.7 406.5,548 406.3 C 566.7 406.2,580.3 402.4,596.1 392.9 C 600.6 390.2,604.5 388,604.7 388 C 604.8 388,605 390.5,605 393.6 C 605 398.4,605.4 399.5,607.9 402.1 L 610.8 405 624.2 405 C 636.7 405,637.7 404.9,640.5 402.6 L 643.5 400.2 643.8 311.3 C 644 228.3,643.9 222.3,642.3 219 C 639.4 213.4,635.2 211.6,624.6 211.7 C 613.7 211.7,609.6 213.4,607.4 218.6 C 606.6 220.6,605.6 222,605.2 221.8 C 604.8 221.6,601.3 219.6,597.4 217.2 C 578.6 205.9,554.3 201.6,534 206 M 830.8 206 C 819.2 208.4,816 209.5,805.9 214.6 C 772.1 231.5,751 267.8,751 309.1 C 751 353,774.5 390.9,811 405.7 C 838.5 416.9,871.4 413.9,894.4 398.1 C 900.3 394,901 394.2,901 399.5 C 901 403.2,901.5 404.6,903.6 406.5 C 906.2 408.9,906.8 409,920.2 409 C 934.1 409,934.2 409,936.9 406.2 L 939.7 403.5 940.4 347.5 C 941.2 286.3,940.9 280.2,936.1 265.3 C 931.3 250.4,926.6 242.5,916.1 231.7 C 894.8 209.6,861.3 199.5,830.8 206 M 117.2 216.6 C 87.2 223.2,63.9 243.9,53.1 273.7 C 47.5 289,47.3 293.8,49.8 335.5 C 50.7 350.2,53.1 360.5,55.5 360.5 C 56.1 360.5,57.9 356.5,59.6 351.5 C 64.9 335.7,68.6 330.3,76.9 326.3 C 82.2 323.7,83.3 323.5,96 323.5 C 111.6 323.5,115.3 324.7,130.4 334.4 C 135 337.4,139.6 340.1,140.6 340.4 C 142.1 340.9,145.3 338.3,154.5 329.2 C 161 322.8,167.7 317,169.4 316.4 C 171.5 315.7,173.6 313.2,177.3 306.9 C 190.6 284.6,198.6 272,199.8 271.5 C 201.5 270.9,204 272.7,204 274.5 C 204 275.1,200.3 281.7,195.9 289.1 C 177.6 319.3,178.7 317,180 321.3 C 181.5 326.3,179.9 331,175.7 334.6 C 173.9 336,171.6 339,170.5 341 C 167.5 346.7,154.4 361.8,149.9 364.6 C 145.2 367.5,139.4 367.7,134.2 365.1 C 126.9 361.4,126.5 361.6,126.8 369 C 126.9 372.6,127.3 377.3,127.6 379.4 L 128.2 383.3 137.5 382.7 C 177.9 380.3,209.4 350.8,215.6 309.8 C 221.2 272.5,197.9 233.1,162.6 220.1 C 148.8 215,130.7 213.6,117.2 216.6 M 1204.4 233.4 C 1202.2 235.1,1203.2 237.7,1206.9 239.6 C 1211.3 241.8,1215.2 238.2,1213.4 233.6 C 1212.6 231.6,1207.1 231.5,1204.4 233.4 M 340 236.5 C 323.7 240.6,312.1 249,302.8 263.4 C 298.2 270.5,298 272.5,301.8 273.5 C 306 274.5,317.7 281.8,319.7 284.6 C 320.7 286,325.1 289.5,329.5 292.5 C 333.9 295.5,340 300.2,343 303 C 348.4 307.9,348.5 308,349 314.7 C 349.7 324.8,349.1 370,348.1 370 C 347.7 370,344.9 368.2,341.9 365.9 C 332.3 358.7,324.5 355.6,316.3 355.6 C 312.3 355.6,308.7 355.9,308.3 356.4 C 306.7 358,320.1 369.2,327.8 372.7 C 345.2 380.8,361 380.7,377.5 372.6 C 384.7 369,397 358.9,397 356.5 C 397 354.8,392.2 354.3,385.5 355.2 C 379.4 356.1,367.9 361.7,362.3 366.4 C 360.1 368.4,357.7 370,357.1 370 C 356.3 370,356 360.9,356 339.8 L 356 309.6 362.8 303 C 366.5 299.4,372.1 294.9,375.4 293.1 C 378.6 291.2,383.5 287.5,386.3 284.8 C 389.2 282,394.8 278.2,399.6 275.8 L 407.9 271.7 405.5 267.1 C 399.1 254.6,385.1 242.7,371.4 238.1 C 362.7 235.2,348 234.4,340 236.5 M 833.4 239.4 C 828.1 244.7,828.9 252,835.3 257 C 837.9 259.1,838 259.4,838 269 C 838 279.8,837.2 281.5,833.7 277.8 C 832.5 276.5,830.2 274.5,828.5 273.4 C 826.1 271.6,825.6 270.6,825.8 267.4 C 826.2 260,818.8 253,812 254.5 C 807.6 255.5,803 261.3,803 265.8 C 803 274.5,812 280.7,819.1 277 C 820.8 276.1,822.2 277,829 283.2 L 837 290.5 837 304.8 C 837 312.6,836.8 319,836.5 319 C 836.2 319,833.4 317,830.1 314.5 C 825.8 311.2,823.8 308.9,823 306.2 C 822.3 304.2,820.7 300.8,819.4 298.8 C 817.1 295.2,816.7 295,811.6 295 L 806.2 295 803.9 290.3 C 797.1 276.6,777.9 284.7,783.5 298.8 C 786.4 305.9,794.5 308.1,800.6 303.5 C 804 300.9,809.6 300.2,812.9 302 C 813.9 302.5,815.8 305.4,817 308.5 C 818.9 313.1,820.7 315.3,827.9 321.3 L 836.5 328.6 836.8 345.8 C 836.9 355.3,836.7 363,836.3 363 C 835.8 363,833.4 361.2,830.8 358.9 C 826.4 355.2,826 354.5,826 350.3 C 826 341.7,821.9 336.1,813.7 333.6 C 811.9 333,811.6 332.4,810.6 327.8 C 808.3 317.3,795.6 315.1,790 324.3 C 786.5 330.1,788.6 337.2,794.9 340.5 C 798.9 342.5,801.6 342.4,805.1 339.9 C 807.8 338,808.1 338,811.5 339.6 C 818.1 342.7,821.9 351.7,817.7 354.4 C 816.2 355.3,815.5 355.1,814 353.3 C 811.9 350.6,810.7 350.4,809 352.5 C 807.3 354.6,808.6 358.7,811.6 360.7 C 813.8 362.1,814.7 362.2,817.7 361.1 C 820.9 359.9,821.5 360,823.9 361.9 C 825.3 363.1,828.9 365.6,831.8 367.6 C 836.6 370.8,837 371.4,837 375 C 837 379.4,839.2 381.5,842.2 379.9 C 843.9 379,844 375.4,844 319.6 L 844 260.3 848.5 255.8 C 852.4 251.8,853 250.6,853 247 C 853 240.7,848 236,841.5 236 C 837.5 236,836.3 236.5,833.4 239.4 M 534.8 244.4 C 515.1 250.2,499 267.8,493.9 289 C 491.9 297.1,492.4 314.1,494.7 322.1 C 499.2 337.2,510.6 351.6,523.2 357.7 C 574.8 383,626.6 326.7,600.8 273.3 C 596.3 263.9,584.8 252.4,576 248.3 C 561.9 241.7,548.3 240.4,534.8 244.4 M 838 244 C 835.5 246.5,835.5 248.2,837.8 250.3 C 841.5 253.7,846 251.8,846 246.8 C 846 242.3,841.4 240.6,838 244 M 875.9 254.7 C 871.7 257.3,869.7 261.6,870.3 266.4 C 870.9 270.5,870.8 270.8,864.5 277 L 858 283.4 858 331.1 C 858 373.7,858.2 378.9,859.6 379.4 C 861.7 380.2,861.6 380.2,863.4 378.4 C 864.7 377.2,865 374.5,865 366.1 L 865 355.3 875 347.1 L 884.9 339 888.3 340.6 C 892.9 342.8,897.8 341.8,901.6 337.9 C 904.1 335.3,904.5 334.1,904.5 329.3 C 904.5 324.4,904.2 323.6,901.5 321.4 C 897.1 317.9,893 317.4,888.2 319.9 C 883.3 322.4,882 324.5,882 329.7 C 882 333.3,881.5 333.8,873.8 339.8 L 865.5 346 864.8 341.8 C 864.5 339.4,864.1 333.9,864.1 329.5 L 864 321.5 874.1 312.2 C 886.5 300.7,887.7 300.2,893.4 303.5 C 902.8 309,912 304.2,912 293.9 C 912 288.1,909.4 284.5,904.1 282.9 C 897.4 280.9,892.3 284.5,889.6 293.3 C 889.2 294.4,888 295,886 295 C 883.6 295,881.3 296.6,874.9 302.5 C 867.5 309.5,865.1 311.1,864.9 309.3 C 864.9 308.8,864.8 303.4,864.8 297.2 L 864.6 286 869.5 281 C 874.1 276.4,874.8 276,879.3 276 C 886.7 276,891.3 272.7,892.5 266.4 C 894.4 257.2,883.8 249.8,875.9 254.7 M 877.6 262.2 C 876 264.4,876.6 266.6,879.4 269 C 883.1 272,888.2 264.6,884.8 261.2 C 882.9 259.3,879.3 259.8,877.6 262.2 M 93 261.9 C 81 265.6,73 276.4,73 289.2 C 73 314.7,99.4 327.8,119.6 312.4 C 128 305.9,131.4 290.8,127 279 C 122.1 265.8,106.3 257.9,93 261.9 M 811.2 262.6 C 806.4 265.9,810.1 272.4,815.7 270.4 C 819.4 269.1,820.1 264.9,816.8 262.6 C 815.6 261.7,814.3 261,814 261 C 813.7 261,812.4 261.7,811.2 262.6 M 292.1 301.3 C 292.2 322.5,293.5 353.4,294.4 354.8 C 294.9 355.7,295.8 355.6,298.1 354.5 L 301 352.9 301 320 L 301 287 296.5 287 L 292 287 292.1 301.3 M 404.5 292.3 C 404.2 295.1,404 310.3,404.2 325.9 L 404.5 354.3 407.3 355.3 C 408.9 355.8,410.5 355.8,411 355.4 C 411.4 354.9,412 339.3,412.4 320.8 L 413 287 409.1 287 L 405.1 287 404.5 292.3 M 898.2 290.6 C 893.8 293.6,896.2 299.5,901.7 298.8 C 905.9 298.3,907.4 293.5,904.1 290.9 C 901.3 288.6,901 288.6,898.2 290.6 M 790.2 291.2 C 789.5 291.9,789 293.3,789 294.5 C 789 295.7,789.5 297.1,790.2 297.8 C 790.9 298.5,792.3 299,793.5 299 C 794.7 299,796.1 298.5,796.8 297.8 C 797.5 297.1,798 295.7,798 294.5 C 798 293.3,797.5 291.9,796.8 291.2 C 796.1 290.5,794.7 290,793.5 290 C 792.3 290,790.9 290.5,790.2 291.2 M 796.8 326.1 C 794.7 327.3,794.4 332,796.2 333.8 C 799.1 336.7,804 334.5,804 330.4 C 804 326.2,800.3 324,796.8 326.1 M 890.8 326.1 C 888.7 327.3,888.4 332,890.2 333.8 C 892.1 335.7,895.8 335.2,897.4 332.8 C 899.4 329.9,899.4 329.4,897 327 C 894.8 324.8,893.3 324.6,890.8 326.1"/>
          <path fill="#0e5a5f" d="M 285.5 445 C 232.8 451.3,189.2 468.1,150.5 497.1 C 138.9 505.8,130.2 513.5,131.2 514.5 C 131.8 515.1,150.2 511.6,165.5 508 C 169.5 507.1,178.8 505.4,195 502.6 C 220.7 498.2,259.4 494.8,297 493.7 C 320.5 493,367.9 495.9,391.5 499.6 C 473.4 512.4,542 542,596 587.8 C 601.2 592.3,605.6 595.5,605.8 595 C 606.5 593.1,595.7 574.1,586.7 561.5 C 542.1 498.7,460.8 455.8,365.5 445 C 343.2 442.4,307.1 442.4,285.5 445 M 856.5 444.1 C 796.7 451.6,752.4 465.8,709.3 491.4 C 674.5 512.1,646.4 538.9,625.1 571.4 C 619.6 579.9,612.5 593.9,613.4 594.7 C 613.7 595,618.4 591.5,623.8 586.9 C 647.4 567,665.7 554.9,693.4 541 C 720.4 527.4,735.5 521.5,766.4 512.5 C 850.4 488.2,955.3 487.8,1062.8 511.4 C 1085.6 516.4,1086 516.4,1078.4 509.2 C 1057.9 489.6,1024.5 469.7,996.5 460.2 C 971.4 451.7,956.4 448.5,920 444 C 910 442.8,866.6 442.9,856.5 444.1 M 294.5 517.7 C 274.6 518.1,273 519.1,287.6 521.6 C 292.5 522.4,303.7 524.7,312.5 526.7 C 321.3 528.7,330.3 530.6,332.5 531.1 C 339.2 532.4,371.9 540.7,381.5 543.5 C 470.8 569.2,537.3 604.1,591.4 653.5 C 603.1 664.2,604.5 665,610 665 C 615.6 665,617 664.1,628 653.7 C 671 612.6,734.5 576.7,808 551.7 C 840 540.8,889.6 527.5,915.5 522.9 C 926.8 520.9,931 519.8,930.5 518.9 C 929.5 517.3,866.9 517.8,850.2 519.5 C 834.4 521.1,816 523.6,809.5 525 C 807.3 525.5,801.9 526.6,797.5 527.5 C 728.2 542.3,666.5 573.4,623.3 615.3 L 609.9 628.3 603.7 622.3 C 564.9 584.7,516.5 555.8,464 539.1 C 460.4 537.9,456.2 536.6,454.5 536 C 421.7 525.4,354.4 516.3,316 517.3 C 311.9 517.4,302.2 517.6,294.5 517.7"/>
        </svg>
      </a>
      <div class="brand-divider"></div>
      <div>
        <div class="brand-title">Paatam API Hub</div>
        <div class="brand-subtitle">Interactive Frontend Developer Contracts &amp; Schema Reference</div>
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
    <!-- Hero Banner with Ruled Paper Notebook Motif -->
    <div class="hero-banner">
      <div class="hero-info">
        <div class="hero-badge">
          <span class="hero-badge-dot"></span>
          <span>Paatam Engineering Specification</span>
        </div>
        <h1>Role-Based API Implementation Blueprint <span class="hero-accent">&amp; Contracts</span></h1>
        <p>Complete HTTP specification organized by user persona for seamless frontend integration. Every endpoint features interactive dropdown cards with complete request schemas, header contracts, and exhaustive response status codes.</p>
      </div>
      <div class="stats-ribbon">
        <div class="stat-pill">
          <div class="stat-val">${totalApis}</div>
          <div class="stat-lbl">Unique APIs</div>
        </div>
        <div class="stat-pill">
          <div class="stat-val">${totalRoleEndpoints}</div>
          <div class="stat-lbl">Role Endpoints</div>
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
        <div class="async-guide-badge">
          AWS SQS + Lambda Serverless Architecture (No Timeout Latency)
        </div>
      </div>
      <p style="font-size: 13.5px; color: var(--color-ink-soft); margin-bottom: 16px; line-height: 1.6;">
        All heavy AI tasks (PDF OCR, Question Paper Extraction, Bulk Stack Slicing, and Rubric Grading) run asynchronously in the background via dedicated AWS SQS queues and Lambda workers. The REST API responds instantly (&lt;100ms) with tracking IDs. Follow the status transitions below to implement real-time progress bars and automated polling in the frontend.
      </p>
      <div class="async-flow-grid">
        <!-- Flow 1 -->
        <div class="async-flow-box">
          <h4><span>📄</span> Assignment Paper &amp; Key Ingestion</h4>
          <ul class="async-step-list">
            <li><strong>Trigger:</strong> <code style="color:var(--color-primary); font-family:var(--font-mono);">POST /api/assignments/process-async</code></li>
            <li><strong>State 1:</strong> <span class="async-step-badge badge-processing">ocr_processing</span> &mdash; Lambda runs Vision OCR (Sarvam/Gemini) to extract hierarchical questions &amp; rubric keys. Render a progress bar at 45%.</li>
            <li><strong>State 2:</strong> <span class="async-step-badge badge-ready">ready</span> &mdash; Extraction complete. Questions &amp; answer key text are populated. Progress hits 100%.</li>
            <li><strong>Polling:</strong> Poll <code style="color:var(--color-primary); font-family:var(--font-mono);">GET /api/assignments/:id/pipeline-status</code> every <strong>3 seconds</strong> until ready.</li>
          </ul>
        </div>

        <!-- Flow 2 -->
        <div class="async-flow-box">
          <h4><span>📦</span> Bulk Class Stack Splitting</h4>
          <ul class="async-step-list">
            <li><strong>Trigger:</strong> <code style="color:var(--color-primary); font-family:var(--font-mono);">POST /api/submissions/bulk</code> (35-student PDF)</li>
            <li><strong>State 1:</strong> <span class="async-step-badge badge-queued">queued</span> &rarr; <span class="async-step-badge badge-processing">splitting</span> &mdash; Lambda scans page headers, names, and QR codes to slice the multi-page stack into individual student PDFs.</li>
            <li><strong>State 2:</strong> <span class="async-step-badge badge-evaluating">grading</span> &mdash; Sliced papers are enqueued to the OCR and Evaluation workers. Submissions start appearing in the review table.</li>
            <li><strong>State 3:</strong> <span class="async-step-badge badge-ready">completed</span> &mdash; All student submissions generated.</li>
            <li><strong>Polling:</strong> Poll <code style="color:var(--color-primary); font-family:var(--font-mono);">GET /api/submissions/batch/:jobId</code> every <strong>5 seconds</strong>.</li>
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
            <li><strong>Polling:</strong> Poll <code style="color:var(--color-primary); font-family:var(--font-mono);">GET /api/submissions/:id</code> every <strong>4 seconds</strong>.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Role Filter Tabs -->
    <div class="role-tabs">
      <button class="role-tab-btn active" data-role="ALL">
        <span>All Roles (Full Blueprint)</span>
        <span class="role-tab-badge">${totalApis}</span>
      </button>
      <button class="role-tab-btn" data-role="PUBLIC">
        <span>Public &amp; Auth</span>
        <span class="role-tab-badge">${publicCount}</span>
      </button>
      <button class="role-tab-btn" data-role="CORPORATE_ADMIN">
        <span>Corporate Admin</span>
        <span class="role-tab-badge">${corpCount}</span>
      </button>
      <button class="role-tab-btn" data-role="BRANCH_ADMIN">
        <span>Branch Admin (Dean / Principal / VP)</span>
        <span class="role-tab-badge">${branchCount}</span>
      </button>
      <button class="role-tab-btn" data-role="TEACHER">
        <span>Teacher</span>
        <span class="role-tab-badge">${teacherCount}</span>
      </button>
      <button class="role-tab-btn" data-role="STUDENT">
        <span>Student</span>
        <span class="role-tab-badge">${studentCount}</span>
      </button>
    </div>

    <!-- API Cards Container Grouped by Role -->
    <main id="apiContainer">
      ${renderApiSections()}
    </main>

    <!-- Empty State for Search -->
    <div class="empty-state" id="emptySearchState">
      <div class="empty-icon">🔍</div>
      <h3 style="font-family: var(--font-display); font-size: 18px; margin-bottom: 6px; color: var(--color-ink);">No matching endpoints found</h3>
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
        btn.style.color = '#34d399';
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
    color: '#55656b',
    bgColor: '#f3eee4',
    filterFn: (api) => api.roles.includes('PUBLIC')
  },
  {
    roleKey: 'CORPORATE_ADMIN',
    title: 'Role 1: Corporate Admin (Super Admin)',
    subtitle: 'Institutional super-admin operations: organization setup, campus branch creation, assigning Dean / Principal leadership, and macro-level academic oversight.',
    badge: 'CORPORATE_ADMIN',
    color: '#0e5a5f',
    bgColor: '#e2efed',
    filterFn: (api) => api.roles.includes('CORPORATE_ADMIN')
  },
  {
    roleKey: 'BRANCH_ADMIN',
    title: 'Role 2: Branch Admin & Leadership (Dean, Principal, Vice Principal)',
    subtitle: 'Full campus operations: academic calendar, class and section structural hierarchy, master subject catalog, faculty allocations, student enrollment, assignment publishing, and evaluation review.',
    badge: 'BRANCH_ADMIN / DEAN / PRINCIPAL / VICE_PRINCIPAL',
    color: '#12242b',
    bgColor: '#f3eee4',
    filterFn: (api) => api.roles.some(r => ['BRANCH_ADMIN', 'DEAN', 'PRINCIPAL', 'VICE_PRINCIPAL'].includes(r))
  },
  {
    roleKey: 'TEACHER',
    title: 'Role 3: Teacher (Subject & Class Faculty)',
    subtitle: 'Classroom teaching workflows: assigned sections & subjects home dashboard, student rosters, exam creation pipeline, answer sheet grading, score approvals, overrides, and bulk paper stack uploads.',
    badge: 'TEACHER',
    color: '#a84a22',
    bgColor: '#fbece3',
    filterFn: (api) => api.roles.includes('TEACHER')
  },
  {
    roleKey: 'STUDENT',
    title: 'Role 4: Student (Learner Portal)',
    subtitle: 'Student learning portal: home dashboard with designated class teacher and test counters, assignments feed, question paper view, handwritten answer sheet upload, graded scorecards with Socratic hints, and notifications.',
    badge: 'STUDENT',
    color: '#4553a0',
    bgColor: '#eceefa',
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
  const searchTerms = `${api.method} ${api.url} ${api.title} ${api.description} ${api.category || ''} ${api.roles.join(' ')}`.toLowerCase();

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
  const roleBadges = api.roles.map(r => `<span class="badge-role role-${r}">${r.replace(/_/g, ' ')}</span>`).join(' ');

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
