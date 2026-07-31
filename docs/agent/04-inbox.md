# 04 · Inbox & Inquiry Submission Architecture

Base Path: `/api/public`  
Authentication: API Key required (see [01-authentication.md](./01-authentication.md))  
Rate Limiting: `PUBLIC_SUBMISSION_LIMITER` (2 requests / 60 seconds) enforced to mitigate spam.

---

## 1. Overview & Architectural Purpose

The **Inbox API** is the public entry point for processing all visitor inquiries and booking requests from client websites or applications.

Incoming messages are safely ingested into the Admin Inbox queue. Administrators review these submissions in the Admin Dashboard and convert them into verified **Customer CRM Profiles** and **Pending Bookings** via atomic database transactions.

---

## 2. Inquiry Types & Business Logic Matrix

AuraDash supports **3 distinct inquiry types** via the `inquiry_type` property. Each type follows specific validation rules and administrative conversion flows:

| Inquiry Type (`inquiry_type`) | Target Form / Use Case | `service_id` Constraint | Backend Validation & Storage Behavior | Admin Dashboard Conversion Outcome |
| :--- | :--- | :---: | :--- | :--- |
| **`general`** | "Contact Us" forms, general questions, feedback. | ❌ Must be omitted | Stores message as general inquiry. | Creates **Customer Profile only** in CRM. |
| **`service`** | "Book This Service" forms, service detail CTA buttons. | ✅ **Mandatory (UUID)** | Validates `service_id` exists & is active. | Creates **Customer Profile** + **Pending Booking** record linked to selected service. |
| **`offer`** | Promotional banner forms, package discount inquiries. | 🔶 Optional | Validates `service_id` if provided, accepts null/omitted if package inquiry. | Creates **Pending Booking** if `service_id` provided; otherwise creates **Customer Profile**. |

---

## 3. Inquiry Payloads (JSON Formats per Use Case)

### 🔹 Type 1: General Contact Form (`inquiry_type: "general"`)

Used on standard "Contact Us" pages and footer contact forms.

```json
{
  "full_name": "Sarah Ahmed",
  "phone": "+15550000000",
  "email": "sarah@example.com",
  "inquiry_type": "general",
  "message": "Hello, what are your business opening hours during weekends?"
}
```

> ⚠️ **Constraint**: Do NOT send `service_id` when `inquiry_type` is `"general"`.

---

### 🔹 Type 2: Direct Service Booking (`inquiry_type: "service"`)

Used on Service Detail pages or "Book Appointment" modals where a specific service has been selected.

```json
{
  "full_name": "Ahmed Mansour",
  "phone": "+966500000000",
  "email": "ahmed@example.com",
  "inquiry_type": "service",
  "service_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "message": "I would like to schedule a session for next Monday."
}
```

> ⚠️ **Constraint**: `service_id` MUST be a valid, active Service UUID obtained from `GET /api/public/booking/services` or `GET /api/public/services`. If `service_id` is missing or invalid, returns `400 SERVICE_NOT_FOUND`.

---

### 🔹 Type 3: Special Offer / Promotional Package (`inquiry_type: "offer"`)

Used on landing pages, seasonal promotional banners, or custom package deals.

```json
{
  "full_name": "Lina Hassan",
  "phone": "+971500000000",
  "email": "lina@example.com",
  "inquiry_type": "offer",
  "service_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "message": "Inquiring about the 20% discount offer for wedding packages."
}
```

> 💡 **Note**: `service_id` is optional for `"offer"`. If a specific service package is attached, pass its UUID; if it is a general discount inquiry, omit `service_id`.

---

## 4. Endpoint Reference: `POST /inbox`

Submits a new contact message or booking request.

**Rate Limiting:** Enforced (`PUBLIC_SUBMISSION_LIMITER` - 2 req/60s)  
**Tarpit Protection:** Includes a random 500ms – 1.5s delay to deter automated bot spam.

### Request Headers

```http
POST /api/public/inbox HTTP/1.1
Content-Type: application/json
x-api-key: <YOUR_API_KEY>
Origin: https://yourdomain.com
```

### Complete Field Reference

| Field | Type | Mandatory | Validation Rules |
|-------|------|:---------:|------------------|
| `full_name` | `string` | ✅ | Min 2 chars · Max 255 chars · HTML sanitized |
| `phone` | `string` | ✅ | Min 8 chars · Max 255 chars · HTML sanitized |
| `email` | `string` | ✅ | Valid email format · Lowercased · Max 255 chars |
| `inquiry_type` | `enum` | ✅ | Options: `"general"`, `"service"`, `"offer"` |
| `message` | `string` | ✅ | Min 3 chars · Max 10,000 chars · HTML sanitized |
| `service_id` | `string (UUID)` | Conditional | **Required** when `inquiry_type = "service"`. Optional when `inquiry_type = "offer"`. Forbidden/Omitted when `inquiry_type = "general"`. |

---

### Success Response — `200 INBOX_MESSAGE_CREATED`

```json
{
  "success": true,
  "code": "INBOX_MESSAGE_CREATED",
  "message": "Message sent successfully",
  "data": {
    "id": "uuid-of-created-inbox-record"
  }
}
```

---

## 5. Module Error Reference (Inbox API)

| Status | Code Slug | Cause / Root Reason | Client Handling Guidance |
|--------|-----------|--------------------|--------------------------|
| `400` | `VALIDATION_ERROR` | Missing required fields, invalid email format, or text length violation | Display field-specific error messages under form inputs |
| `400` | `SERVICE_NOT_FOUND` | `service_id` is invalid, non-existent, or belongs to an inactive service | Prompt visitor to select an active service from the dropdown |
| `401` | `API_KEY_MISSING` | Missing `x-api-key` header | Attach valid API key to client HTTP client |
| `401` | `INVALID_API_KEY` | HMAC signature invalid or key expired | Re-issue API key from Admin Dashboard |
| `429` | `TOO_MANY_REQUESTS` | IP address exceeded submission rate limit (2 req/60s) | Disable submit button for 60 seconds and notify user |
| `500` | `INTERNAL_SERVER_ERROR` | Server execution exception | Display generic "Please try again later" error |
