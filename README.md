# Finance Management System (MERN)

A modular Finance Management System with:

- JWT authentication
- Role-based access control (EMPLOYEE, ADMIN)
- Expense reports with secure file upload (local or S3)
- Salary advance requests
- Admin approval/rejection workflows
- Local MongoDB support

## Architecture

- Backend: `backend/` (Express + MongoDB + Mongoose)
- Frontend: `frontend/` (React + Vite)

## Quick Start (Workspace Root)

1. Install all dependencies:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

2. Create environment files as described below.

3. Start both backend and frontend together:

```bash
npm run dev
```

Additional scripts:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`

## Backend Setup

1. Go to backend:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` in `backend/`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/finance_mgmt
JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=1d
FILE_STORAGE=local  

# For local storage
LOCAL_UPLOAD_DIR=uploads/private

# For S3 storage
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional MongoDB tuning (leave unset for defaults)
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=10
MONGO_MAX_IDLE_TIME_MS=300000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_CONNECT_TIMEOUT_MS=10000
MONGO_SOCKET_TIMEOUT_MS=30000
```

4. Start backend:

```bash
npm run dev
```

## Frontend Setup

1. Go to frontend:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

4. Start frontend:

```bash
npm run dev
```

## Local MongoDB Requirement

The backend expects MongoDB on `127.0.0.1:27017` by default.

If you see `ECONNREFUSED 127.0.0.1:27017`, start MongoDB locally first.

Windows (MongoDB installed as service):

```powershell
net start MongoDB
```

Or run `mongod` manually in another terminal.

## Default Flow

- Register first user with role `ADMIN` via API body `role: "ADMIN"`.
- All other users should register as `EMPLOYEE`.
- Employees create expense reports and salary advances.
- Admin reviews and approves/rejects.

## REST API Overview

- Auth
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- Employee
  - `POST /api/v1/expenses`
  - `GET /api/v1/expenses/my`
  - `POST /api/v1/advances`
  - `GET /api/v1/advances/my`
- Admin
  - `GET /api/v1/admin/expenses`
  - `PATCH /api/v1/admin/expenses/:id/status`
  - `GET /api/v1/admin/advances`
  - `PATCH /api/v1/admin/advances/:id/status`
