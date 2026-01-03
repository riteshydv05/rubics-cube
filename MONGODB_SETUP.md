# MongoDB Atlas Setup Guide

## Current Issue: Authentication Failed

The error "bad auth : authentication failed" means the credentials aren't working. Follow these steps:

## Fix Steps

### 1. Verify Database User

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click on **Database Access** in the left sidebar
3. Find user `riteshyvns2005_db_user`
4. Click **Edit** and either:
   - **Reset the password** (recommended) - Copy the new password
   - Or verify the current password is: `oHojg4IW6VkcBRV2`
5. Make sure the user has **Atlas Admin** or **Read and write to any database** privileges

### 2. Configure Network Access

1. Click on **Network Access** in the left sidebar
2. Click **Add IP Address**
3. Either:
   - Click **Add Current IP Address** (recommended for security)
   - Or click **Allow Access from Anywhere** (`0.0.0.0/0`) for testing
4. Click **Confirm**

### 3. Get Fresh Connection String

1. Go to **Database** (Deployments)
2. Click **Connect** on your cluster (Cluster0)
3. Choose **Connect your application**
4. Select **Driver: Node.js** and **Version: 5.5 or later**
5. Copy the connection string
6. It should look like:
   ```
   mongodb+srv://riteshyvns2005_db_user:<password>@cluster0.wm9ibhm.mongodb.net/?retryWrites=true&w=majority
   ```

### 4. Update .env File

Replace the connection string in `server/.env`:

```env
MONGODB_URI=mongodb+srv://riteshyvns2005_db_user:YOUR_NEW_PASSWORD@cluster0.wm9ibhm.mongodb.net/?retryWrites=true&w=majority
```

**Important:** Replace `YOUR_NEW_PASSWORD` with your actual password (no angle brackets!)

### 5. Restart Server

```bash
cd server
npm run dev
```

You should see:
```
✅ Connected to MongoDB
✅ Server running on port 5000
```

## Common Issues

### Special Characters in Password

If your password contains special characters like `@`, `#`, `$`, `/`, etc., they need to be URL-encoded:

| Character | URL Encoded |
|-----------|-------------|
| @         | %40         |
| #         | %23         |
| $         | %24         |
| /         | %2F         |
| :         | %3A         |
| ?         | %3F         |

Example: Password `myP@ss$123` becomes `myP%40ss%24123`

### Network Timeout

If you get a timeout error instead of auth failed, check Network Access settings.

### Database Name

You can optionally specify a database name in the connection string:
```
mongodb+srv://user:password@cluster0.wm9ibhm.mongodb.net/rubiksight?retryWrites=true&w=majority
```

This creates/uses a database called `rubiksight`.

## Testing Connection

Once configured, test the API:

```bash
# Health check
curl http://localhost:5000/api/health

# Should return:
# {
#   "success": true,
#   "message": "RubikSight API is running",
#   "mongodb": "connected"
# }
```

## Alternative: Use Local MongoDB

If you prefer not to use MongoDB Atlas, install MongoDB locally:

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Then update server/.env:
MONGODB_URI=mongodb://localhost:27017/rubiksight
```
