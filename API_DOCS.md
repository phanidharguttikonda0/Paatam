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

