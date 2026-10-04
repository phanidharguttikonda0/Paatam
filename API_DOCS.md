# Paatam Backend - API Documentation

This document maintains a comprehensive list of all available API endpoints, their expected request formats, responses, and potential error codes.

---

## 1. Corporate Entities

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

## 2. Authentication & OTP

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
