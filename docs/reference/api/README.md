---
created_date: 2025-06-05
last_modified_date: 2025-06-05
last_modified_summary: Added documentation standards including creation and modification dates
---

# �� API Documentation

## REST API Reference for OrangeCat

---

## 📋 Overview

OrangeCat provides a comprehensive REST API for managing Bitcoin fundraising projects, user profiles, and authentication. All API endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `/api/`  
**Authentication**: JWT tokens via Supabase Auth  
**Rate Limiting**: Applied per endpoint

---

## 🔐 Authentication

All protected endpoints require authentication via JWT tokens:

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 📚 API Sections

### **🔐 Authentication Endpoints**

- [Authentication API](authentication.md) - Login, register, password reset

### **👤 Profile Management**

- [Profile API](profiles.md) - User profile CRUD operations

### **💰 Campaign Management**

- [Campaign API](projects.md) - Fundraising project operations

### **📁 File Upload**

- [Upload API](uploads.md) - Avatar and banner image uploads

### **🤖 AI Chat**

- [Chat API](./chat.md) - AI assistant integration using Google Gemini

---

## 🎯 Quick Start

### **1. Authentication**

```javascript
// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### **2. Get Profile**

```javascript
// Get current user profile
GET /api/profile
Authorization: Bearer {token}
```

### **3. Create Campaign**

```javascript
// Create new project
POST /api/projects
Authorization: Bearer {token}
{
  "title": "My Campaign",
  "description": "Campaign description",
  "goal_amount": 1000000
}
```

---

## 📊 Response Format

### **Success Response**

```javascript
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### **Error Response**

```javascript
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 🔒 Security

- **Input Validation** - All inputs validated and sanitized
- **Rate Limiting** - Protection against abuse
- **CORS** - Configured for secure cross-origin requests
- **HTTPS Only** - All API calls must use HTTPS in production

---

## 📈 Rate Limits

| Endpoint Type   | Limit        | Window   |
| --------------- | ------------ | -------- |
| Authentication  | 5 requests   | 1 minute |
| Profile Updates | 10 requests  | 1 minute |
| File Uploads    | 3 requests   | 1 minute |
| General API     | 100 requests | 1 minute |

---

## 🐛 Error Codes

| Code                  | Description              |
| --------------------- | ------------------------ |
| `AUTH_REQUIRED`       | Authentication required  |
| `INVALID_TOKEN`       | Invalid or expired token |
| `VALIDATION_ERROR`    | Input validation failed  |
| `RATE_LIMIT_EXCEEDED` | Too many requests        |
| `RESOURCE_NOT_FOUND`  | Resource not found       |
| `PERMISSION_DENIED`   | Insufficient permissions |

---

## 📚 Related Documentation

- [Authentication System](../auth_system.md) - Complete auth flow
- [Security Guidelines](../SECURITY.md) - Security best practices
- [Development Setup](../SETUP.md) - Local API development
