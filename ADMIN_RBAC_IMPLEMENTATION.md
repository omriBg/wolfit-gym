# Admin RBAC Implementation - Role-Based Access Control

## Overview
This document outlines the implementation of Role-Based Access Control (RBAC) for admin APIs in the Wolfit Gym backend system.

## Security Problem Solved
**Issue**: Admin APIs were accessible to any authenticated user, allowing regular users to perform administrative actions like adding/subtracting hours and accessing all user data.

**Solution**: Implemented comprehensive RBAC system that restricts admin APIs to users with explicit admin privileges.

## Implementation Details

### 1. Database Schema Changes

#### Added isAdmin Field to User Table
```sql
ALTER TABLE "User" ADD COLUMN isadmin BOOLEAN DEFAULT FALSE;
```

**Location**: `backend/server.js` (Lines 467-475)
- Automatically adds the field during server startup if missing
- Default value: `FALSE` (non-admin)
- All existing users remain non-admin by default

### 2. Admin Authorization Middleware

#### Created `authorizeAdmin` Middleware
**Location**: `backend/server.js` (Lines 185-227)

```javascript
const authorizeAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Check if user exists and has admin privileges
    const userCheck = await pool.query(
      'SELECT isadmin FROM "User" WHERE iduser = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא במערכת'
      });
    }
    
    const isAdmin = userCheck.rows[0].isadmin;
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - הרשאות מנהל נדרשות לגשת למשאב זה'
      });
    }
    
    next();
  } catch (error) {
    // Error handling...
  }
};
```

### 3. Protected Admin Endpoints

All admin endpoints now require both authentication and admin authorization:

#### Hour Management APIs
- **POST** `/api/admin/add-hours/:userId` - Add hours to user
- **POST** `/api/admin/subtract-hours/:userId` - Subtract hours from user

#### User Management APIs  
- **GET** `/api/admin/all-users-hours` - Get all users with their hours
- **GET** `/api/admin/search-user` - Search users by email
- **POST** `/api/admin/set-admin/:userId` - Set admin privileges for user

#### Security Implementation
```javascript
// Before: Only authentication required
app.post('/api/admin/add-hours/:userId', authenticateToken, async (req, res) => {

// After: Both authentication AND admin authorization required
app.post('/api/admin/add-hours/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
```

### 4. Admin Management Features

#### New Admin Management API
**POST** `/api/admin/set-admin/:userId`

**Purpose**: Allows existing admins to grant/revoke admin privileges

**Request Body**:
```json
{
  "isAdmin": true,
  "reason": "Promoting user to admin"
}
```

**Response**:
```json
{
  "success": true,
  "message": "הרשאות מנהל עודכנו עבור John Doe",
  "user": {
    "id": 123,
    "name": "John Doe", 
    "email": "john@example.com",
    "isAdmin": true
  }
}
```

#### Enhanced User Data
All admin APIs now return the `isAdmin` field in user data:

```json
{
  "users": [
    {
      "iduser": 123,
      "username": "John Doe",
      "email": "john@example.com", 
      "isadmin": true,
      "availableHours": 10
    }
  ]
}
```

### 5. Security Benefits

#### Before RBAC Implementation
- ❌ Any authenticated user could access admin APIs
- ❌ Regular users could add/subtract hours for any user
- ❌ Regular users could view all user data
- ❌ No role-based access control

#### After RBAC Implementation  
- ✅ Only users with `isAdmin = true` can access admin APIs
- ✅ Comprehensive authorization checks on every admin request
- ✅ Detailed logging of admin access attempts
- ✅ Secure admin privilege management
- ✅ Protection against privilege escalation

### 6. Error Handling

#### Access Denied (403 Forbidden)
```json
{
  "success": false,
  "message": "Forbidden - הרשאות מנהל נדרשות לגשת למשאב זה"
}
```

#### User Not Found (404)
```json
{
  "success": false,
  "message": "משתמש לא נמצא במערכת"
}
```

#### Server Error (500)
```json
{
  "success": false,
  "message": "שגיאה בבדיקת הרשאות מנהל",
  "error": "Database connection failed"
}
```

### 7. Logging and Monitoring

#### Admin Access Logging
All admin access attempts are logged with:
- User ID attempting access
- Timestamp
- Success/failure status
- Admin privilege verification

#### Example Logs
```
🔍 בודק הרשאות מנהל עבור משתמש: 123
✅ הרשאות מנהל אושרו: משתמש 123 הוא מנהל

❌ ניסיון גישה לא מורש: משתמש 456 אינו מנהל
```

### 8. Testing the Implementation

#### Test Cases

1. **Valid Admin Access**
   - Use admin user token to access admin APIs
   - Should succeed with 200 status

2. **Non-Admin Access** 
   - Use regular user token to access admin APIs
   - Should return 403 Forbidden

3. **Invalid Token**
   - Use invalid/expired token
   - Should return 401 Unauthorized

4. **Admin Privilege Management**
   - Use admin token to set another user as admin
   - Should succeed and update database

### 9. Migration and Deployment

#### Automatic Migration
The system automatically:
- Adds `isAdmin` column to existing User table
- Sets all existing users as non-admin (`isAdmin = FALSE`)
- No manual database migration required

#### Initial Admin Setup
To create the first admin user:
1. Access database directly
2. Update a user record: `UPDATE "User" SET isadmin = TRUE WHERE iduser = 1;`
3. Use that user to promote other admins via API

### 10. Security Considerations

#### Principle of Least Privilege
- Users start with no admin privileges
- Admin privileges must be explicitly granted
- Admin privileges can be revoked

#### Audit Trail
- All admin actions are logged in UserHoursHistory
- Admin privilege changes are tracked
- Failed access attempts are logged

#### Defense in Depth
- JWT token validation (authentication)
- Admin privilege verification (authorization)  
- Database-level constraints
- Comprehensive error handling

## Conclusion

The RBAC implementation provides comprehensive security for admin APIs through:

✅ **Role-based access control** - Only admins can access admin APIs
✅ **Automatic privilege management** - Secure admin promotion/demotion
✅ **Comprehensive logging** - Full audit trail of admin actions
✅ **Defense in depth** - Multiple security layers
✅ **Zero-downtime deployment** - Automatic database migration

**Status**: ✅ **ADMIN RBAC SECURITY IMPLEMENTED**
