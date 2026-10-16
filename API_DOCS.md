# Paatam Backend - API Documentation

This document maintains a comprehensive list of all available API endpoints, their expected request formats, responses, and potential error codes.

---

## 1. Global Cursor Pagination
All endpoints that return a list of items support **Cursor Pagination**.
- **Query Parameters:**
  - `cursor` (string, optional): The ID of the last item received.
  - `limit` (number, optional): Max items to return. Hardcapped at `10`. Defaults to `10`.
- **Response Format:**
  Every paginated endpoint returns a `meta` object alongside the `data` array:
  ```json
  "meta": {
    "nextCursor": "931281239128", // Pass this to the next ?cursor= query
    "hasNextPage": true // True if there are more items to fetch
  }
  ```

---

## 2. Corporate Entities

### `GET /api/corporate/lookup/:registrationNo`
Looks up a Corporate entity by its registration number. Useful for the first step of the login flow.

- **URL Params:** `registrationNo` (string, required)
- **Authentication Required:** No
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "corporateId": "1",
      "name": "Acme Corp",
      "registration_no": "REG-123"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Corporate entity not found"

---

### `POST /api/corporate/create`
Creates a new Corporate entity and its first Corporate Admin. Requires a pre-registration OTP verification token.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "name": "Acme Corp",
    "registration_no": "REG-12345",
    "verificationToken": "<JWT_FROM_OTP_VERIFY>",
    "admin": {
      "name": "John Doe",
      "email": "john@acme.com",
      "mobile": "9876543210"
    }
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1",
      "name": "Acme Corp",
      "registration_no": "REG-12345",
      "created_at": "2023-10-04T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation errors (Zod)
  - `401 Unauthorized`: "Invalid or expired verification token."
  - `409 Conflict`: Unique constraint violation (e.g., registration number already exists)

---

### `POST /api/corporate/addAdmin/:corporateId`
Adds a new Corporate Admin to an existing corporate entity.

- **Authentication Required:** Yes (Requires valid Access Token in Header)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `corporateId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@acme.com",
    "mobile": "1234567890",
    "verificationToken": "<JWT_FROM_OTP_VERIFY>"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Admin added successfully",
    "data": {
      "id": "2",
      "corporate_id": "1",
      "name": "Jane Doe",
      "email": "jane@acme.com",
      "mobile": "1234567890"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Verification token is required. Please verify OTP first."
  - `401 Unauthorized`: "Invalid or expired verification token."
  - `403 Forbidden`: "Forbidden: You do not have permission to add admins to this corporate entity." (Fails tenancy check)

---

### `GET /api/corporate/admins/all`
Fetches a paginated list of Corporate Admins belonging to the logged-in Corporate Admin's entity. Only basic identifying information is returned.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "name": "Jane Doe",
        "email": "jane@acme.com",
        "mobile": "1234567890"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```

---

### `GET /api/corporate/admin-profile/:adminId`
Fetches the full profile details for a specific Corporate Admin. Includes a tenancy check.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `adminId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1",
      "corporate_id": "1",
      "name": "Jane Doe",
      "email": "jane@acme.com",
      "mobile": "1234567890",
      "created_at": "..."
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Corporate admin not found or access denied"

---

## 3. Authentication & OTP

### `POST /api/auth/send-otp`
Requests a pre-registration OTP for verifying an email or mobile number. Deletes any existing OTPs for the provided contact and generates a new one valid for 5 minutes.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "email": "john@acme.com",
    "mobile": "9876543210"
  }
  ```
  *(Note: At least one of email or mobile is required)*
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "OTP sent successfully",
    "data": { "otp": "123456" } // Only present in non-production environments
  }
  ```

---

### `POST /api/auth/verify-otp`
Verifies a pre-registration OTP. If valid, deletes the OTP and returns a signed Verification Token valid for 15 minutes.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "email": "john@acme.com",
    "mobile": "9876543210",
    "otp": "123456"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "OTP verified successfully",
    "data": {
      "verificationToken": "eyJhbGciOiJIUz..."
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Invalid or expired OTP"

---

### `POST /api/auth/corporate/login`
Initiates the login flow for a Corporate Admin by generating and dispatching an OTP. Requires the `corporateId` to ensure the user belongs to the correct tenant.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "email": "john@acme.com",
    "corporateId": "1"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Login OTP sent successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "corporateId is required for login"
  - `404 Not Found`: "Corporate Admin not found in this corporate entity"

---

### `POST /api/auth/corporate/verify`
Finalizes the login flow by verifying the OTP. Issues an Access Token and sets an `httpOnly` Refresh Token cookie.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "email": "john@acme.com",
    "corporateId": "1",
    "otp": "123456"
  }
  ```
- **Success Response (200 OK):**
  *Headers:* `Set-Cookie: refreshToken=...; HttpOnly; Max-Age=2592000`
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbG...",
      "user": {
        "id": "1",
        "name": "John Doe",
        "email": "john@acme.com",
        "role": "CORPORATE_ADMIN",
        "corporateId": "1"
      }
    }
  }
  ```
- **What is stored in the Access Token?**
  - `userId`: String representation of the BigInt ID.
  - `role`: e.g., "CORPORATE_ADMIN"
  - `corporateId`: String representation of the Corporate ID.
  - `iat`: Issued At timestamp.
  - `exp`: Expiration timestamp (15 minutes).
- **Error Responses:**
  - `400 Bad Request`: "corporateId is required for verification" or "Invalid or expired OTP"
  - `404 Not Found`: "Corporate Admin not found in this corporate entity"

---

### `POST /api/auth/refresh`
Refreshes an expired short-lived Access Token using the `refreshToken` HttpOnly cookie or request body.

- **Authentication Required:** No (Uses Refresh Token Cookie or Body)
- **Request Body (Optional if Cookie is present):**
  ```json
  {
    "refreshToken": "optional-if-sent-via-httponly-cookie"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Access token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOi..."
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Refresh token required" or "Invalid or expired refresh token"

---

### `POST /api/auth/admin/forgot-password`
Initiates a password reset for a Branch Admin. Sends an OTP to their registered email/mobile.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "skinner@paatam.in",
    "corporateId": "1512528182029314"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset OTP sent successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Schema validation failure
  - `404 Not Found`: Admin not found

---

### `POST /api/auth/admin/reset-password`
Completes password reset by verifying the OTP and updating the bcrypt password hash.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "skinner@paatam.in",
    "corporateId": "1512528182029314",
    "otp": "123456",
    "new_password": "NewSecurePassword123!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password has been reset successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Invalid or expired OTP" or schema validation failure

---

## 4. Branch Management

### `GET /api/branch/corporate/all`
Retrieves a paginated list of all Branches belonging to the currently logged-in Corporate Admin.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "corporate_id": "1",
        "name": "Main Branch",
        "pincode": "500081",
        "address": "HiTech City, Hyderabad",
        "branch_contact_mail": "contact@mainbranch.com",
        "mobile_number": "9876543210"
      }
    ],
    "meta": { "nextCursor": "1", "hasNextPage": false }
  }
  ```

---

### `POST /api/branch/create`
Creates a new Branch under the logged-in Corporate entity.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Request Body:**
  ```json
  {
    "name": "Main Branch",
    "pincode": "500081",
    "address": "HiTech City, Hyderabad",
    "branch_contact_mail": "contact@mainbranch.com",
    "mobile_number": "9876543210"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1",
      "corporate_id": "1",
      "name": "Main Branch",
      "pincode": "500081",
      "address": "HiTech City, Hyderabad",
      "branch_contact_mail": "contact@mainbranch.com",
      "mobile_number": "9876543210"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "A branch with this name already exists for your corporate"

---

### `GET /api/branch/:branchId/admins`
Retrieves a list of Branch Admins who have access to this specific branch.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "admin_name": "Alice Admin",
        "contact_email": "alice@branch.com",
        "mobile": "1112223334",
        "role": "PRINCIPAL"
      }
    ],
    "meta": { "nextCursor": "1", "hasNextPage": false }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Branch not found or does not belong to your corporate entity"

---

### `GET /api/branch/:branchId/teachers`
Retrieves a paginated list of Teachers assigned to this specific branch.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "branch_id": "1",
        "name": "Mr. Smith",
        "teacher_id": "TCH-001",
        "contact_email": "smith@school.com",
        "contact_mobile": "9998887776"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Branch not found or does not belong to your corporate entity"

---

### `GET /api/branch/corporate/search`
Performs an autocomplete search for branches by name or city across the Corporate entity. Filtered strictly by corporate tenancy and capped at 5 matches.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Query Params:**
  - `q` (string, required): Search query term (min 1 character).
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "corporate_id": "1",
        "name": "Whitefield Main Campus",
        "pincode": "560066",
        "address": "ITPL Main Road, Bangalore",
        "branch_contact_mail": "whitefield@school.edu"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Query parameter 'q' is required"

---

### `DELETE /api/branch/:branchId/admins/:adminId`
Removes a specific Branch Admin's access to a single branch without modifying other branch assignments.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:**
  - `branchId` (string, required): BigInt ID of the branch.
  - `adminId` (string, required): BigInt ID of the branch admin.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Admin access removed from branch successfully"
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Branch or admin not found, or admin is not assigned to this branch"

---

## 5. Branch Admin Management

### `POST /api/admin/create`
Creates a new Branch Admin (e.g., Dean, Principal) under the logged-in Corporate entity. Salting and hashing are performed on the password. Does NOT assign them to branches yet.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Request Body:**
  ```json
  {
    "admin_name": "Alice Admin",
    "contact_email": "alice@branch.com",
    "mobile": "1112223334",
    "role": "PRINCIPAL",
    "password": "SecurePassword123"
  }
  ```
- **Success Response (201 Created):**
  *(Note: `password_hash` is safely omitted from the response)*
  ```json
  {
    "status": "success",
    "data": {
      "id": "1",
      "corporate_id": "1",
      "admin_name": "Alice Admin",
      "contact_email": "alice@branch.com",
      "mobile": "1112223334",
      "role": "PRINCIPAL"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "An admin with this email or mobile already exists"

---

### `POST /api/admin/:adminId/assign-branches`
Assigns a Branch Admin to one or more branches. Wipes existing branch assignments and replaces them. Validates that the provided branches actually belong to the Corporate Entity.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `adminId` (string, required)
- **Request Body:**
  ```json
  {
    "branch_ids": ["1", "2"]
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Branches assigned successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "One or more branches are invalid or do not belong to your corporate entity"

---

### `PUT /api/admin/:adminId`
Updates the basic information of a Branch Admin. Includes strict tenancy checks to ensure the admin belongs to the logged-in Corporate Admin.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `adminId` (string, required)
- **Request Body:**
  ```json
  {
    "contact_email": "new.alice@branch.com",
    "mobile": "9998887776",
    "role": "DEAN",
    "admin_name": "Alice Modified"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": { ... }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Email or mobile already in use by another admin"

---

### `DELETE /api/admin/:adminId`
Deletes a Branch Admin and safely purges their branch access records (`AdminBranchAccess`) in a single transaction. Includes strict tenancy checks.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `adminId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Admin deleted successfully"
  }
  ```

---

### `GET /api/admin/:adminId/branches`
Fetches a list of Branch details that a specific admin currently has access to.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `adminId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "corporate_id": "1",
        "name": "Main Branch",
        "pincode": "500081",
        ...
      }
    ],
    "meta": { "nextCursor": "1", "hasNextPage": false }
  }
  ```

---

### `GET /api/admin/corporate/all`
Fetches a paginated list of all Branch Admins belonging to the currently logged-in Corporate Admin's entity. Only returns basic identifying information (`id`, `admin_name`, `contact_email`, `role`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "admin_name": "Alice Admin",
        "contact_email": "alice@branch.com",
        "role": "PRINCIPAL"
      }
    ],
    "meta": { "nextCursor": "1", "hasNextPage": false }
  }
  ```

---

### `GET /api/admin/profile/:adminId`
Fetches the full profile details for a specific Branch Admin. Includes strict tenancy checks.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **URL Params:** `adminId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1",
      "corporate_id": "1",
      "admin_name": "Alice Admin",
      "contact_email": "alice@branch.com",
      "mobile": "1112223334",
      "role": "PRINCIPAL"
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Admin not found or access denied"

---

### `GET /api/admin/corporate/search`
Performs an auto-complete search for Branch Admins by name within the Corporate entity. Strictly limits results to the top 5 matches.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `CORPORATE_ADMIN`
- **Query Params:** `q` (string, the search query)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1",
        "admin_name": "Alice Admin",
        "contact_email": "alice@branch.com",
        "role": "PRINCIPAL"
      }
    ]
  }
  ```

---

### `GET /api/branch-admin/my-branches`
Retrieves all branches linked to the currently logged-in Branch Admin (`AdminBranchAccess`). Called immediately after Branch Admin login to populate the branch selector dashboard.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN` (`PRINCIPAL`, `DEAN`, `VICE_PRINCIPAL`, `OTHER`)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "101",
        "name": "North Campus",
        "pincode": "500081",
        "address": "Madhapur, Hyderabad",
        "branch_contact_mail": "north@school.edu",
        "mobile_number": "9876543210",
        "role_in_branch": "PRINCIPAL",
        "active_academic_year": {
          "id": "501",
          "start_year": 2026,
          "end_year": 2027
        }
      }
    ]
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Unauthorized: Missing user identity" or "Invalid or expired token"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"

---

### `GET /api/branch-admin/profile`
Fetches the current logged-in Branch Admin's own profile and total count of assigned branches.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN` (`PRINCIPAL`, `DEAN`, `VICE_PRINCIPAL`, `OTHER`)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "2",
      "corporate_id": "1",
      "admin_name": "Alice Admin",
      "contact_email": "alice@branch.com",
      "mobile": "1112223334",
      "role": "PRINCIPAL",
      "assigned_branches_count": 2
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Unauthorized: Missing user identity"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"

---

### `POST /api/auth/admin/login`
Logs in a Branch Admin using their identifier (email or mobile) and their password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "alice@branch.com",
    "password": "SecurePassword123"
  }
  ```
- **Success Response (200 OK):**
  *Headers:* `Set-Cookie: refreshToken=...; HttpOnly; Max-Age=2592000`
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbG...",
      "user": {
        "id": "1",
        "name": "Alice Admin",
        "email": "alice@branch.com",
        "role": "PRINCIPAL"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Invalid credentials"

---

### `POST /api/auth/admin/forgot-password`
Initiates the password reset flow for a Branch Admin by generating and dispatching an OTP to their email or mobile.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "alice@branch.com",
    "corporateId": "1"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset OTP sent successfully"
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "No branch admin found with that identifier in this corporate entity"

---

### `POST /api/auth/admin/reset-password`
Finalizes the password reset flow by verifying the OTP and updating the Branch Admin's password with a new salted hash.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "alice@branch.com",
    "corporateId": "1",
    "otp": "123456",
    "new_password": "NewSecurePassword456"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password has been reset successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Invalid or expired OTP"
  - `404 Not Found`: "No branch admin found with that identifier in this corporate entity"

---

## 6. Academic Year Management

### `GET /api/branch/:branchId/academic-years`
Fetches a cursor-paginated list of academic years for a specific branch. The active/current academic year is returned at the top (`is_active: true`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "501",
        "branch_id": "101",
        "start_year": 2026,
        "end_year": 2027,
        "is_active": true,
        "created_at": "2026-03-01T00:00:00.000Z"
      },
      {
        "id": "500",
        "branch_id": "101",
        "start_year": 2025,
        "end_year": 2026,
        "is_active": false,
        "created_at": "2025-03-01T00:00:00.000Z"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Unauthorized: Missing or invalid token"
  - `403 Forbidden`: "Forbidden: You do not have access to this branch"
  - `404 Not Found`: "Branch not found or access denied"

---

### `POST /api/branch/:branchId/academic-years`
Creates a new academic year for a branch. If `is_active: true` is passed (default true), automatically and atomically deactivates previous active academic years for that branch.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Request Body:**
  ```json
  {
    "start_year": 2026,
    "end_year": 2027,
    "is_active": true
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Academic year created successfully",
    "data": {
      "id": "501",
      "branch_id": "101",
      "start_year": 2026,
      "end_year": 2027,
      "is_active": true
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "end_year must be start_year + 1"
  - `409 Conflict`: "Academic year 2026-2027 already exists for this branch"

---

### `PUT /api/academic-years/:id`
Updates academic year details or sets it as active/inactive. Setting `is_active: true` deactivates any other active year for that branch.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `id` (string, required)
- **Request Body:**
  ```json
  {
    "is_active": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "501",
      "branch_id": "101",
      "start_year": 2026,
      "end_year": 2027,
      "is_active": true
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "end_year must be start_year + 1"
  - `404 Not Found`: "Academic year not found"

---

### `DELETE /api/academic-years/:id`
Deletes an academic year. Blocked if classes are linked to it.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Academic year deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete academic year: active classes are linked to this session"
  - `404 Not Found`: "Academic year not found"

---

## 7. Class Management

### `GET /api/academic-years/:academicYearId/classes`
Lists all classes in an academic year, ordered by `class_order`. Includes summary counts of sections and attached subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER`
- **URL Params:** `academicYearId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "601",
        "branch_id": "101",
        "academic_year_id": "501",
        "name": "Grade 10",
        "class_order": 10,
        "sections_count": 2,
        "subjects_count": 5
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Academic year not found"

---

### `POST /api/academic-years/:academicYearId/classes`
Creates a class in an academic year. Supports optional initial sections creation in the same transaction.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `academicYearId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Grade 10",
    "class_order": 10,
    "initial_sections": ["A", "B"]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "601",
      "branch_id": "101",
      "academic_year_id": "501",
      "name": "Grade 10",
      "class_order": 10,
      "sections": [
        { "id": "701", "section_name": "A", "strength": 0 },
        { "id": "702", "section_name": "B", "strength": 0 }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Class name already exists in this academic year"
  - `404 Not Found`: "Academic year not found"

---

### `GET /api/classes/:classId`
Fetches class details, along with its list of sections, assigned class teachers, and linked subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "601",
      "name": "Grade 10",
      "class_order": 10,
      "academic_year": {
        "id": "501",
        "start_year": 2026,
        "end_year": 2027
      },
      "sections": [
        {
          "id": "701",
          "section_name": "A",
          "strength": 40,
          "class_teacher": {
            "id": "801",
            "name": "Suresh Raina",
            "teacher_id": "TCH-001"
          }
        }
      ],
      "subjects": [
        { "id": "901", "class_subject_id": "1101", "name": "Physics", "code": "PHY-10" }
      ]
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Class not found"

---

### `PUT /api/classes/:classId`
Updates class name or ordering index.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Grade 10 - ICSE",
    "class_order": 10
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "601",
      "name": "Grade 10 - ICSE",
      "class_order": 10
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Class name already exists in this academic year"
  - `404 Not Found`: "Class not found"

---

### `DELETE /api/classes/:classId`
Deletes a class. Blocked if sections exist.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Class deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete class: sections are linked to this class"
  - `404 Not Found`: "Class not found"

---

## 8. Section Management & Class Teacher Allocation

### `GET /api/classes/:classId/sections`
Lists all sections belonging to a specific class.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "701",
        "class_id": "601",
        "section_name": "A",
        "strength": 42,
        "class_teacher_id": "801",
        "class_teacher_name": "Suresh Raina"
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Class not found"

---

### `POST /api/classes/:classId/sections`
Adds a new section to an existing class.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Request Body:**
  ```json
  {
    "section_name": "C",
    "strength": 45,
    "class_teacher_id": "801"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "703",
      "class_id": "601",
      "section_name": "C",
      "strength": 45,
      "class_teacher_id": "801"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Section name already exists in this class" or "Teacher not found or does not belong to this branch"
  - `404 Not Found`: "Class not found"

---

### `GET /api/sections/:sectionId`
Returns complete section details: section name, capacity/strength, class teacher profile, enrolled student count, and class info.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `CORPORATE_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "701",
      "section_name": "A",
      "strength": 40,
      "enrolled_students_count": 38,
      "class": {
        "id": "601",
        "name": "Grade 10"
      },
      "class_teacher": {
        "id": "801",
        "name": "Suresh Raina",
        "teacher_id": "TCH-001",
        "contact_email": "suresh@school.edu",
        "contact_mobile": "9876500000"
      }
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Section not found"

---

### `PUT /api/sections/:sectionId`
Updates section name or capacity limit.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "section_name": "A-Star",
    "strength": 45
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "701",
      "section_name": "A-Star",
      "strength": 45
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Section name already exists in this class"
  - `404 Not Found`: "Section not found"

---

### `DELETE /api/sections/:sectionId`
Deletes a section. Blocked if any students are enrolled in this section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Section deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete section: 38 students are currently enrolled in this section"
  - `404 Not Found`: "Section not found"

---

### `PUT /api/sections/:sectionId/class-teacher`
Assigns or re-assigns a teacher as the Section Class Teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "teacher_id": "801"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Class teacher assigned successfully",
    "data": {
      "section_id": "701",
      "class_teacher_id": "801",
      "teacher_name": "Suresh Raina"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Teacher not found or does not belong to this branch"

---

### `DELETE /api/sections/:sectionId/class-teacher`
Removes the designated class teacher from a section (sets `class_teacher_id` to null).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Class teacher unassigned from section"
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Section not found"

---

### `GET /api/sections/:sectionId/subjects-teachers`
Retrieves a matrix of all subjects attached to the section's class, along with the specific teacher assigned to instruct each subject in this section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `CORPORATE_ADMIN`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "class_subject_id": "1101",
        "subject_name": "Physics",
        "subject_code": "PHY-10",
        "assigned_teacher": {
          "id": "801",
          "name": "Suresh Raina",
          "teacher_id": "TCH-001"
        }
      },
      {
        "class_subject_id": "1102",
        "subject_name": "Mathematics",
        "subject_code": "MTH-10",
        "assigned_teacher": null
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Section not found"

---

## 9. Branch Subject Catalog & Class-Subject Mapping

### `GET /api/branch/:branchId/subjects`
Retrieves all curriculum master subjects defined in the branch catalog with cursor pagination.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER`
- **URL Params:** `branchId` (string, required)
- **Query Params:** `cursor`, `limit`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "901",
        "branch_id": "101",
        "name": "Physics",
        "code": "PHY-10",
        "grade": "Grade 10",
        "board": "CBSE",
        "description": "Mechanics, Light, Electricity"
      }
    ],
    "meta": { "nextCursor": null, "hasNextPage": false }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Branch not found or access denied"

---

### `POST /api/branch/:branchId/subjects`
Creates a new curriculum subject in the branch catalog.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Chemistry",
    "code": "CHM-10",
    "grade": "Grade 10",
    "board": "CBSE",
    "description": "Organic, Inorganic and Physical Chemistry"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "902",
      "branch_id": "101",
      "name": "Chemistry",
      "code": "CHM-10",
      "grade": "Grade 10",
      "board": "CBSE"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Subject with this name and grade already exists in this branch"

---

### `PUT /api/subjects/:subjectId`
Updates master subject metadata (name, code, board, description).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `subjectId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Advanced Chemistry",
    "code": "CHM-10-ADV",
    "description": "Updated syllabus with practical laboratory modules"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "902",
      "name": "Advanced Chemistry",
      "code": "CHM-10-ADV"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Subject with this name and grade already exists in this branch"
  - `404 Not Found`: "Subject not found"

---

### `DELETE /api/subjects/:subjectId`
Deletes a subject from the branch catalog. Blocked if attached to any classes (`ClassSubject`) or teachers (`TeacherSubject`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `subjectId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Subject deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete subject: currently attached to 3 classes and 2 teachers. Remove associations first."
  - `404 Not Found`: "Subject not found"

---

### `GET /api/classes/:classId/subjects`
Lists all subjects attached to a specific class.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "class_subject_id": "1101",
        "subject_id": "901",
        "name": "Physics",
        "code": "PHY-10",
        "board": "CBSE"
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Class not found"

---

### `POST /api/classes/:classId/subjects`
Attaches a branch catalog subject to a class (`ClassSubject`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `classId` (string, required)
- **Request Body:**
  ```json
  {
    "subject_id": "901"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Subject attached to class successfully",
    "data": {
      "class_subject_id": "1101",
      "class_id": "601",
      "subject_id": "901"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Subject does not belong to this branch"
  - `409 Conflict`: "Subject is already attached to this class"

---

### `DELETE /api/classes/:classId/subjects/:classSubjectId`
Removes a subject from a class. Blocked if assignments have already been published under this class-subject.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:**
  - `classId` (string, required)
  - `classSubjectId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Subject removed from class successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot remove subject: 4 assignments have been created under this class subject"
  - `404 Not Found`: "Class subject attachment not found"

---

## 7. Teacher Directory, Subject Mapping & Profiles

### `POST /api/branch/:branchId/teachers`
Onboards a new Teacher into a branch. Generates salted password hash and stores contact credentials.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Suresh Raina",
    "teacher_id": "TCH-001",
    "contact_email": "suresh@school.edu",
    "contact_mobile": "9876500000",
    "password": "InitialTeacherPassword123"
  }
  ```
- **Validations:**
  - `name`: Non-empty string.
  - `teacher_id`: Unique within branch.
  - `contact_email` or `contact_mobile`: Must be unique.
  - `password`: Minimum 8 characters.
- **Success Response (201 Created):**
  *(Note: `password_hash` omitted)*
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "branch_id": "101",
      "name": "Suresh Raina",
      "teacher_id": "TCH-001",
      "contact_email": "suresh@school.edu",
      "contact_mobile": "9876500000"
    }
  }
  ```
- **Error Responses:**
  - `409 Conflict`: "Teacher with this teacher_id, email, or mobile already exists"

---

### `GET /api/branch/:branchId/teachers/search`
Fast auto-complete search for teachers by name or `teacher_id`. Essential for frontend autocomplete dropdowns when allocating teachers to sections or subjects.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `branchId` (string, required)
- **Query Params:**
  - `q` (string, required): Search term (min 1 char).
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "801",
        "name": "Suresh Raina",
        "teacher_id": "TCH-001",
        "contact_email": "suresh@school.edu",
        "is_class_teacher": true
      }
    ]
  }
  ```

---

### `GET /api/teachers/:teacherId`
Retrieves full profile for a teacher, including personal details, assigned subjects, and sections where they are Class Teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER` (self)
- **URL Params:** `teacherId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "branch_id": "101",
      "name": "Suresh Raina",
      "teacher_id": "TCH-001",
      "contact_email": "suresh@school.edu",
      "contact_mobile": "9876500000",
      "assigned_subjects": [
        { "id": "901", "name": "Physics", "code": "PHY-10" }
      ],
      "class_teacher_sections": [
        { "id": "701", "section_name": "A", "class_name": "Grade 10" }
      ]
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Teacher not found"

---

### `PUT /api/teachers/:teacherId`
Updates a teacher's personal and contact details.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `teacherId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Suresh Raina, M.Sc.",
    "contact_email": "suresh.raina@school.edu",
    "contact_mobile": "9876599999"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "branch_id": "101",
      "name": "Suresh Raina, M.Sc.",
      "teacher_id": "TCH-001",
      "contact_email": "suresh.raina@school.edu",
      "contact_mobile": "9876599999"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Teacher not found"
  - `409 Conflict`: "Email already in use by another teacher"

---

### `DELETE /api/teachers/:teacherId`
Deletes a teacher record. Blocked if the teacher has active subject assignments or is currently designated as Class Teacher for any section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `teacherId` (string, required)
- **Validations:**
  - Verifies teacher is not in `Section.class_teacher_id`.
  - Verifies no active rows in `TeacherSubject`.
  - Blocked with `400 Bad Request` if dependencies exist.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Teacher deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete teacher: actively assigned as Class Teacher for Grade 10-A and teaches 2 subjects"
  - `404 Not Found`: "Teacher not found"

---

### `GET /api/teachers/:teacherId/subjects`
Gets all subjects mapped to a specific teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER`
- **URL Params:** `teacherId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "teacher_subject_id": "1201",
        "subject_id": "901",
        "subject_name": "Physics",
        "code": "PHY-10"
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Teacher not found"

---

### `POST /api/teachers/:teacherId/subjects`
Maps a teacher to a subject (`TeacherSubject`).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:** `teacherId` (string, required)
- **Request Body:**
  ```json
  {
    "subject_id": "901"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Subject mapped to teacher successfully",
    "data": {
      "id": "1201",
      "teacher_id": "801",
      "subject_id": "901"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Subject not found or does not belong to this branch"
  - `409 Conflict`: "Subject is already mapped to this teacher"

---

### `DELETE /api/teachers/:teacherId/subjects/:subjectId`
Removes subject assignment from a teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`
- **URL Params:**
  - `teacherId` (string, required)
  - `subjectId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Subject removed from teacher successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot remove subject: active assignments are linked to this teacher-subject mapping"
  - `404 Not Found`: "Teacher subject mapping not found"

---

### `GET /api/teachers/:teacherId/sections`
Lists all sections where the teacher is designated as the Class Teacher.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `CORPORATE_ADMIN`, `TEACHER`
- **URL Params:** `teacherId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "section_id": "701",
        "section_name": "A",
        "class_id": "601",
        "class_name": "Grade 10",
        "enrolled_count": 38
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Teacher not found"

---

## 9. Teacher Portal & Workflow APIs

### `POST /api/auth/teacher/login`
Authenticates a Teacher using their identifier (`contact_email` or `teacher_id`) and password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "suresh@school.edu",
    "password": "SecurePassword123"
  }
  ```
- **Success Response (200 OK):**
  *Headers:* `Set-Cookie: refreshToken=...; HttpOnly; Max-Age=2592000`
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "801",
        "name": "Suresh Raina",
        "teacher_id": "TCH-001",
        "role": "TEACHER",
        "branch_id": "101"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Invalid credentials"

---

### `POST /api/auth/teacher/forgot-password`
Generates and dispatches a password reset OTP to the teacher's registered email or mobile.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "suresh@school.edu",
    "branch_id": "101"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset OTP sent successfully",
    "data": null
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Teacher not found"

---

### `POST /api/auth/teacher/reset-password`
Verifies OTP and resets the teacher's password.

- **Authentication Required:** No
- **Request Body:**
  ```json
  {
    "identifier": "suresh@school.edu",
    "branch_id": "101",
    "otp": "123456",
    "new_password": "NewSecurePassword456!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Invalid or expired OTP"
  - `404 Not Found`: "Teacher not found"

---

### `GET /api/teacher/profile`
Retrieves the logged-in teacher's profile.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "801",
      "name": "Suresh Raina",
      "teacher_id": "TCH-001",
      "email": "suresh@school.edu",
      "mobile": "9876500000",
      "branch_id": "101"
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Teacher not found"

---

### `GET /api/teacher/dashboard`
The primary landing API for the Teacher Home Page. Returns:
1. All sections where the teacher conducts classes, grouped by subject.
2. Any sections where the teacher is designated as the **Class Teacher** (giving them access to student management in that section).

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "teaching_allocations": [
        {
          "section_id": "701",
          "section_name": "A",
          "class_id": "601",
          "class_name": "Grade 10",
          "subject_id": "901",
          "subject_name": "Physics",
          "class_subject_id": "1101",
          "teacher_subject_id": "1201",
          "students_count": 38
        }
      ],
      "class_teacher_sections": [
        {
          "section_id": "701",
          "section_name": "A",
          "class_name": "Grade 10",
          "students_count": 38
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"

---

### `GET /api/teacher/sections/:sectionId/subjects`
Returns the specific subjects that the authenticated teacher teaches in the designated section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "class_subject_id": "1101",
        "teacher_subject_id": "1201",
        "subject_name": "Physics",
        "subject_code": "PHY-10"
      }
    ]
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Section not found"

---

## 8. Student Enrollment & Roster Management

### `GET /api/sections/:sectionId/students`
Retrieves a paginated list of students enrolled in a section. Supports optional `search` query parameter to filter by student name.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Query Params:**
  - `cursor` (string, optional)
  - `limit` (number, optional, max 10)
  - `search` (string, optional): Search keyword against student `name`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1401",
        "admission_no": "ADM-2026-001",
        "name": "Aarav Sharma",
        "roll_no": "101",
        "contact_email": "parent.aarav@example.com",
        "contact_mobile": "9876543210",
        "section_id": "701",
        "created_at": "2026-10-16T10:00:00.000Z"
      }
    ],
    "meta": {
      "nextCursor": "1401",
      "hasNextPage": false,
      "total": 1
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Section not found"

---

### `GET /api/branch/:branchId/students/search`
Searches for students across all sections within a branch by student name or admission number.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `branchId` (string, required)
- **Query Params:**
  - `q` (string, required): Search query string (minimum 1 character)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1401",
        "admission_no": "ADM-2026-001",
        "name": "Aarav Sharma",
        "roll_no": "101",
        "contact_email": "parent.aarav@example.com",
        "contact_mobile": "9876543210",
        "section": {
          "id": "701",
          "name": "A",
          "class": {
            "id": "601",
            "name": "Grade 10"
          }
        }
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Search query parameter 'q' is required"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Branch not found"

---

### `POST /api/sections/:sectionId/students`
Enrolls a single student into a designated section. Automatically increments section `strength`.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "admission_no": "ADM-2026-001",
    "name": "Aarav Sharma",
    "roll_no": "101",
    "contact_email": "parent.aarav@example.com",
    "contact_mobile": "9876543210",
    "password": "InitialStudentPassword123!"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "admission_no": "ADM-2026-001",
      "name": "Aarav Sharma",
      "roll_no": "101",
      "contact_email": "parent.aarav@example.com",
      "contact_mobile": "9876543210",
      "section_id": "701",
      "created_at": "2026-10-16T10:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Section not found"
  - `409 Conflict`: "A student with admission number ADM-2026-001 already exists" or "Roll number 101 is already assigned in this section"

---

### `POST /api/sections/:sectionId/students/bulk`
Bulk enrolls multiple students into a section within an atomic transaction.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `sectionId` (string, required)
- **Request Body:**
  ```json
  {
    "students": [
      {
        "admission_no": "ADM-2026-002",
        "name": "Diya Patel",
        "roll_no": "102",
        "contact_email": "diya@example.com",
        "contact_mobile": "9876543211"
      },
      {
        "admission_no": "ADM-2026-003",
        "name": "Kavya Reddy",
        "roll_no": "103",
        "contact_email": "kavya@example.com",
        "contact_mobile": "9876543212"
      }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "enrolled_count": 2,
      "students": [
        {
          "id": "1402",
          "admission_no": "ADM-2026-002",
          "name": "Diya Patel",
          "roll_no": "102",
          "contact_email": "diya@example.com",
          "contact_mobile": "9876543211",
          "section_id": "701"
        },
        {
          "id": "1403",
          "admission_no": "ADM-2026-003",
          "name": "Kavya Reddy",
          "roll_no": "103",
          "contact_email": "kavya@example.com",
          "contact_mobile": "9876543212",
          "section_id": "701"
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error (empty array or invalid format)
  - `409 Conflict`: Duplicate admission number or roll number conflict

---

### `GET /api/students/:studentId`
Retrieves full profile details for a student, including enrolled class and section info.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `STUDENT`
- **URL Params:** `studentId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "admission_no": "ADM-2026-001",
      "name": "Aarav Sharma",
      "roll_no": "101",
      "contact_email": "parent.aarav@example.com",
      "contact_mobile": "9876543210",
      "section_id": "701",
      "created_at": "2026-10-16T10:00:00.000Z",
      "section": {
        "id": "701",
        "name": "A",
        "class": {
          "id": "601",
          "name": "Grade 10",
          "branch_id": "101"
        }
      }
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Student not found"

---

### `PUT /api/students/:studentId`
Updates student demographic and parent contact information.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`
- **URL Params:** `studentId` (string, required)
- **Request Body:**
  ```json
  {
    "name": "Aarav S. Sharma",
    "roll_no": "101-A",
    "contact_email": "parent.new@example.com",
    "contact_mobile": "9998887776"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "admission_no": "ADM-2026-001",
      "name": "Aarav S. Sharma",
      "roll_no": "101-A",
      "contact_email": "parent.new@example.com",
      "contact_mobile": "9998887776",
      "section_id": "701"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `404 Not Found`: "Student not found"
  - `409 Conflict`: Roll number already in use within the section

---

### `DELETE /api/students/:studentId`
Deletes a student record and decrements the section `strength`. Deletion is strictly blocked if any assignment submissions exist for the student.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`
- **URL Params:** `studentId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Student deleted successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Cannot delete student because test submissions exist on record"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Student not found"

---

### `GET /api/students/:studentId/submissions`
Retrieves test submission history, scores, and evaluation summaries for a student.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `BRANCH_ADMIN`, `TEACHER`, `STUDENT`
- **URL Params:** `studentId` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1501",
        "assignment_id": "1301",
        "student_id": "1401",
        "status": "EVALUATED",
        "total_score": 45,
        "submitted_at": "2026-10-16T11:00:00.000Z",
        "evaluated_at": "2026-10-16T11:30:00.000Z",
        "assignment": {
          "id": "1301",
          "title": "Unit Test 1 - Physics",
          "total_marks": 50,
          "class_subject": {
            "subject": {
              "id": "901",
              "name": "Physics",
              "code": "PHY-10"
            }
          }
        }
      }
    ]
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Student not found"

---

## 11. Student Auth Portal

### `POST /api/auth/student/login`
Authenticates a student using their unique `admission_no` and password. On success, issues a JWT Access Token in the response body and sets an httpOnly `refreshToken` cookie.

- **Authentication Required:** No (Public)
- **Request Body:**
  ```json
  {
    "admission_no": "ADM-2026-001",
    "password": "SecureStudentPassword123!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "1401",
        "name": "Aarav Sharma",
        "admission_no": "ADM-2026-001",
        "role": "STUDENT",
        "section_id": "701"
      }
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `401 Unauthorized`: "Invalid admission number or password"

---

### `POST /api/auth/student/forgot-password`
Initiates a password reset by dispatching a 6-digit OTP to the student's or parent's registered contact email or mobile number.

- **Authentication Required:** No (Public)
- **Request Body:**
  ```json
  {
    "identifier": "ADM-2026-001"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "OTP sent successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Identifier is required"
  - `404 Not Found`: "Student not found"

---

### `POST /api/auth/student/reset-password`
Verifies the dispatched OTP and resets the student's password. Automatically sets the new password, revokes existing sessions, and issues a new access token and refresh cookie.

- **Authentication Required:** No (Public)
- **Request Body:**
  ```json
  {
    "identifier": "ADM-2026-001",
    "otp": "123456",
    "new_password": "NewSecurePassword456!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Password reset successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: "Invalid or expired OTP"
  - `404 Not Found`: "Student not found"

---

### `GET /api/student/profile`
Retrieves the logged-in student's full profile and section details.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "admission_no": "ADM-2026-001",
      "name": "Aarav Sharma",
      "roll_no": "101",
      "contact_email": "parent.aarav@example.com",
      "contact_mobile": "9876543210",
      "section_id": "701",
      "section": {
        "id": "701",
        "name": "A",
        "class": {
          "id": "601",
          "name": "Grade 10"
        }
      }
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Student not found"

---

## 10. Assignment Pipeline: Ingestion, OCR & Dynamic Routing

### `POST /api/assignments/upload-urls`
Generates AWS S3 pre-signed `PUT` URLs allowing teachers to upload the Question Paper PDF and optional Answer Key PDF directly to the S3 bucket.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "section_id": "701",
    "files": [
      {
        "file_name": "grade10_physics_midterm.pdf",
        "file_type": "application/pdf",
        "purpose": "question_paper"
      },
      {
        "file_name": "physics_midterm_answerkey.pdf",
        "file_type": "application/pdf",
        "purpose": "answer_key"
      }
    ]
  }
  ```
- **Validations:**
  - Allowed file types: `application/pdf`, `image/jpeg`, `image/png`, `image/jpg`, `image/webp`
  - Max file size: 50MB
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "uploads": [
        {
          "purpose": "question_paper",
          "upload_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/question_paper-9a1b-1792151000.pdf?X-Amz-Algorithm=...",
          "file_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/question_paper-9a1b-1792151000.pdf",
          "key": "temp/question_paper-9a1b-1792151000.pdf"
        },
        {
          "purpose": "answer_key",
          "upload_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/answer_key-9a1b-1792151000.pdf?X-Amz-Algorithm=...",
          "file_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/answer_key-9a1b-1792151000.pdf",
          "key": "temp/answer_key-9a1b-1792151000.pdf"
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error (invalid file type or missing fields)
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Section not found"

---

### `POST /api/assignments/process-async`
Enqueues an assignment processing job for async Multimodal Vision OCR extraction and dynamic LLM reasoning model selection.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "section_id": "701",
    "class_subject_id": "1101",
    "teacher_subject_id": "1201",
    "title": "Physics Midterm Exam",
    "difficulty": "Medium",
    "duration_minutes": 60,
    "question_paper_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/qpaper.pdf",
    "answer_key_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/anskey.pdf"
  }
  ```
- **Success Response (202 Accepted):**
  ```json
  {
    "status": "success",
    "message": "Assignment queued for OCR and dynamic model routing",
    "data": {
      "assignment_id": "1501",
      "status": "ocr_processing",
      "poll_url": "/api/assignments/1501/pipeline-status"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `404 Not Found`: "Section or class subject not found"

---

### `GET /api/assignments/:id/pipeline-status`
Frontend polling endpoint to check the status of async OCR extraction and model selection.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK - In Progress):**
  ```json
  {
    "status": "success",
    "data": {
      "assignment_id": "1501",
      "pipeline_status": "ocr_processing",
      "progress_percent": 45,
      "message": "Extracting questions from uploaded PDF..."
    }
  }
  ```
- **Success Response (200 OK - Ready):**
  ```json
  {
    "status": "success",
    "data": {
      "assignment_id": "1501",
      "pipeline_status": "ready",
      "reasoning_model_selected": "gemini-2.5-flash",
      "routing_reason": "Standard single-choice and short numerical format detected",
      "total_questions": 15,
      "questions_json": [
        {
          "question_number": 1,
          "question": "What is the SI unit of electric potential?",
          "type": "mcq",
          "marks": 1,
          "options": ["Ampere", "Volt", "Ohm", "Joule"]
        }
      ],
      "answer_key_text": "Q1: Option B (Volt) [1 Mark]"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: "Assignment not found"

---

### `POST /api/assignments/create-sync`
Synchronous fallback alternative. Immediately generates a draft assignment with inline OCR questions.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "section_id": "701",
    "class_subject_id": "1101",
    "teacher_subject_id": "1201",
    "title": "Physics Quiz 1",
    "duration_minutes": 45,
    "question_paper_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/qpaper.pdf"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Quiz 1",
      "status": "draft",
      "reasoning_model": "gemini-2.5-flash",
      "questions_json": [
        {
          "question_number": 1,
          "question": "What is the SI unit of electric potential?",
          "type": "mcq",
          "marks": 1,
          "options": ["Ampere", "Volt", "Ohm", "Joule"]
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `404 Not Found`: "Section or class subject not found"

---

### `POST /api/assignments`
Finalizes questions and publishes an assignment to the student roster in the section.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Request Body:**
  ```json
  {
    "assignment_id": "1501",
    "section_id": "701",
    "class_subject_id": "1101",
    "teacher_subject_id": "1201",
    "title": "Physics Midterm Exam",
    "difficulty": "Medium",
    "duration_minutes": 60,
    "due_date": "2026-10-25T18:00:00.000Z",
    "status": "published",
    "reasoning_model": "gemini-2.5-flash",
    "question_paper_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/qpaper.pdf",
    "answer_key_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/anskey.pdf",
    "answer_key_text": "Q1: Option B (Volt)",
    "questions_json": [
      {
        "question_number": 1,
        "question": "What is the SI unit of electric potential?",
        "type": "mcq",
        "marks": 1,
        "options": ["Ampere", "Volt", "Ohm", "Joule"]
      }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Midterm Exam",
      "status": "published",
      "created_at": "2026-10-15T09:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `404 Not Found`: "Section or class subject not found"

---

### `GET /api/assignments`
Lists assignments. Supports filtering by section and subject with cursor pagination.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **Query Params:**
  - `section_id` (string, optional)
  - `class_subject_id` (string, optional)
  - `cursor` (string, optional)
  - `limit` (number, optional, max 10)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1501",
        "title": "Physics Midterm Exam",
        "difficulty": "Medium",
        "duration_minutes": 60,
        "status": "published",
        "total_submissions": 32,
        "due_date": "2026-10-25T18:00:00.000Z"
      }
    ],
    "meta": {
      "nextCursor": null,
      "hasNextPage": false
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"

---

### `GET /api/assignments/:id`
Retrieves a single assignment with full question breakdown, answer key, and attached media URLs.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`, `STUDENT`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "section_id": "701",
      "class_subject_id": "1101",
      "teacher_subject_id": "1201",
      "title": "Physics Midterm Exam",
      "difficulty": "Medium",
      "duration_minutes": 60,
      "status": "published",
      "reasoning_model": "gemini-2.5-flash",
      "question_paper_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/qpaper.pdf",
      "answer_key_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/anskey.pdf",
      "answer_key_text": "Q1: Option B (Volt)",
      "questions_json": [ ... ],
      "due_date": "2026-10-25T18:00:00.000Z",
      "created_at": "2026-10-15T09:00:00.000Z",
      "section": {
        "id": "701",
        "name": "A"
      },
      "class_subject": {
        "id": "1101",
        "subject_name": "Physics",
        "subject_code": "PHY-10"
      }
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Assignment not found"

---

### `DELETE /api/assignments/:id`
Deletes an assignment and purges related submissions, notifications, and batch jobs.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `TEACHER`, `BRANCH_ADMIN`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Assignment and associated student submissions deleted successfully"
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Assignment not found"

---

## 11. Student Portal & Assignment Submissions

### `GET /api/student/dashboard`
The primary landing endpoint for the Student Home Page. Returns:
1. Enrolled class and section name.
2. Designated Class Teacher name and contact email.
3. List of active subjects in the class.
4. Summary counts of pending and completed assignments.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "class_name": "Grade 10",
      "section_name": "A",
      "class_teacher": {
        "id": "801",
        "name": "Suresh Raina",
        "email": "raina@school.edu"
      },
      "subjects": [
        { "id": "901", "name": "Physics", "code": "PHY-10" },
        { "id": "902", "name": "Mathematics", "code": "MTH-10" }
      ],
      "assignments_summary": {
        "pending_count": 2,
        "completed_count": 5
      }
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Unauthorized: Missing or invalid token"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"

---

### `GET /api/student/assignments`
Returns a list of assignments available for the student's section, with submission status indicators.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Query Params:**
  - `status` (string, optional): `pending` or `completed`
  - `cursor` (string, optional)
  - `limit` (number, optional, max 10)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1501",
        "title": "Physics Midterm Exam",
        "subject_name": "Physics",
        "duration_minutes": 60,
        "due_date": "2026-10-25T18:00:00.000Z",
        "is_submitted": false,
        "submission_id": null
      }
    ],
    "meta": {
      "nextCursor": null,
      "hasNextPage": false
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Unauthorized: Missing or invalid token"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"

---

### `GET /api/student/assignments/:id`
Retrieves test details, duration, and question paper for the student to take the exam.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1501",
      "title": "Physics Midterm Exam",
      "subject": "Physics",
      "duration_minutes": 60,
      "question_paper_url": "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/temp/qpaper.pdf",
      "due_date": "2026-10-25T18:00:00.000Z",
      "questions": [
        {
          "question_number": 1,
          "question": "What is the SI unit of electric potential?",
          "type": "mcq",
          "marks": 1,
          "options": ["Ampere", "Volt", "Ohm", "Joule"]
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Assignment not found"

---

### `POST /api/student/assignments/:id/submit`
Submits handwritten answer sheet images or scanned PDF documents for automated/teacher grading.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **URL Params:** `id` (string, required)
- **Request Body:**
  ```json
  {
    "sample_paper_urls": [
      "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/sheet1.jpg",
      "https://paatam-uploads-dev.s3.ap-south-2.amazonaws.com/submissions/sheet2.jpg"
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Answer sheets submitted successfully",
    "data": {
      "submission_id": "1401",
      "assignment_id": "1501",
      "student_id": "1301",
      "status": "submitted",
      "submitted_at": "2026-10-16T12:00:00.000Z",
      "files_uploaded_count": 2
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Insufficient permissions"
  - `404 Not Found`: "Assignment not found"

---

### `GET /api/student/submissions/:id`
Retrieves graded scorecard, rubric marks, teacher feedback, and Socratic learning hints.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT` (must own submission)
- **URL Params:** `id` (string, required)
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "1401",
      "assignment_title": "Physics Midterm Exam",
      "status": "approved",
      "score": 34,
      "max_score": 40,
      "feedback": "Strong understanding of kinematics with minor algebraic errors in projectile height calculation.",
      "socratic_hint": "Recall how vertical velocity behaves at the peak of a projectile trajectory.",
      "submitted_at": "2026-10-16T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden`: "Forbidden: Access denied to this submission"
  - `404 Not Found`: "Submission not found"

---

### `GET /api/student/notifications`
Retrieves the notification feed for the student.

- **Authentication Required:** Yes (Access Token)
- **Role Required:** `STUDENT`
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "1601",
        "title": "Assignment Submitted",
        "message": "Your answer sheets for \"Physics Midterm Exam\" have been submitted successfully.",
        "timestamp": "2026-10-16T12:00:00.000Z",
        "read": false
      }
    ]
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: "Unauthorized: Missing or invalid token"
  - `403 Forbidden`: "Forbidden: Insufficient permissions"






