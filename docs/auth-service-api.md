# Nexus AI Workspace — Authentication Service API

## Base URL

```text
http://localhost:3001
```

---

## Health Check

### Request

```http
GET /health
```

### Response

```json
{
  "success": true,
  "service": "auth-service",
  "status": "UP",
  "timestamp": "2026-06-29T10:00:00Z"
}
```

---

## Register User

### Request

```http
POST /auth/register
```

```json
{
  "email": "admin@nexus.ai",
  "password": "Password@123",
  "firstName": "Nexus",
  "lastName": "Admin"
}
```

### Response

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@nexus.ai",
    "firstName": "Nexus",
    "lastName": "Admin",
    "emailVerified": false,
    "isActive": true
  },
  "tokens": {
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

---

## Login

### Request

```http
POST /auth/login
```

```json
{
  "email": "admin@nexus.ai",
  "password": "Password@123"
}
```

### Response

```json
{
  "user": {},
  "tokens": {}
}
```

---

## Refresh Token

### Request

```http
POST /auth/refresh
```

```json
{
  "refreshToken": "<jwt>"
}
```

### Response

```json
{
  "user": {},
  "tokens": {}
}
```

---

## Logout

### Request

```http
POST /auth/logout
```

```json
{
  "userId": "uuid"
}
```

### Response

```http
204 No Content
```

---

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect."
  },
  "requestId": "uuid",
  "timestamp": "ISO_DATE"
}
```
