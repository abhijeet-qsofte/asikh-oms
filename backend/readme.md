Project Root Directy : asikh-oms
Project Name : asikh-oms
Version: 1.0.5

1. High-Level Workflow Overview
   1.1 At Farm (Harvesting & Crating)
   Mangoes are harvested and placed into crates.
   Each crate has a pre-generated QR code.
   When a crate is weighed, the app captures:
   Crate ID (scanned QR code)
   GPS location (auto-captured)
   Weight
   Photo (at weighing station)
   Supervisor name
   Notes (optional)
   Timestamp (auto-generated)
   Variety (Alphonso, Langra, etc.)
   1.2 During Transport

   1.2.1 Crates are grouped into a dispatch batch.

   1.2.2 Transport metadata is recorded:
   Mode of transport
   Supervisor
   Origin (Farm)
   Destination (Packhouse)

   1.2.3 Review and Confirm Batch

   1.3 At Packhouse

   Crates are scanned on arrival using mobile.
   Each crate is reconciled against its dispatch batch.
   Mismatches and missing crates are flagged for action.

2. System Components
   Component Description
   Mobile App Used by farm and packhouse staff for scanning and entry
   Backend API Central data handling, authentication, reconciliation
   PostgreSQL DB Stores all crate, batch, and reconciliation data
   Web Dashboard View batches, reports, and reconciliation summaries
3. Mobile Screen Flows
   3.1 Harvest Entry
   [ Home ] -> [ Scan Crate QR ]
   ↓
   [ Fill Form: Weight, Supervisor, Variety ]
   ↓
   [ Capture Photo, GPS Auto ]
   ↓
   [ Submit Harvest ]
   3.2 Dispatch Scan
   [ Dispatch Start ] -> [ Scan QR ]
   ↓
   [ Auto-batch Assignment ]
   ↓
   [ Show Assigned Batch ]
   ↓
   [ Repeat Scan ]
   3.3 Reconciliation
   [ Reconciliation Start ] -> [ Select Batch ]
   ↓
   [ Scan Crates ]
   ↓
   [ Match -> Success | Mismatch -> Flag ]
   ↓
   [ View Summary ]
4. UML Class Diagram
   +----------------------+
   | User |
   +----------------------+
   | - id: UUID |
   | - username: string |
   | - password: string |
   | - role: string |
   +----------------------+

+----------------------+
| Crate |
+----------------------+
| - id: UUID |
| - qr_code: string |
| - harvest_date |
| - gps_location |
| - photo_url |
| - supervisor |
| - weight: float |
| - notes: string |
| - variety: string |
| - batch_id: UUID |
+----------------------+

+----------------------+
| Batch |
+----------------------+
| - id: UUID |
| - supervisor: string |
| - transport_mode |
| - from_location |
| - to_location |
| - eta: datetime |
| - status: string |
+----------------------+

+---------------------------+
| ReconciliationLog |
+---------------------------+
| - id: UUID |
| - batch_id: UUID |
| - scanned_qr: string |
| - status: string |
| - timestamp: datetime |
+---------------------------+

## 5. Backend API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`

- **Purpose**: OAuth2 compatible token login
- **Access**: Public
- **Request Body**:

```json
{
  "username": "harvester1",
  "password": "password123"
}
```

- **Response**: JWT access token, refresh token, and user information

#### `POST /api/auth/login/mobile`

- **Purpose**: Mobile-friendly login with JSON payload
- **Access**: Public
- **Request Body**:

```json
{
  "username": "harvester1",
  "password": "password123",
  "device_info": {
    "device_id": "unique-device-id",
    "model": "iPhone 12",
    "os_version": "iOS 15.0"
  }
}
```

- **Response**: JWT access token, refresh token, and user information

#### `POST /api/auth/login/pin`

- **Purpose**: PIN-based login for mobile app
- **Access**: Public
- **Request Body**:

```json
{
  "username": "harvester1",
  "pin": "123456"
}
```

- **Response**: JWT access token, refresh token, and user information

#### `POST /api/auth/set-pin`

- **Purpose**: Set or update a user's PIN after verifying password
- **Access**: Authenticated users
- **Request Body**:

```json
{
  "password": "current-password",
  "pin": "123456"
}
```

#### `POST /api/auth/refresh-token`

- **Purpose**: Refresh access token using a valid refresh token
- **Access**: Authenticated users
- **Request Body**:

```json
{
  "refresh_token": "valid-refresh-token"
}
```

#### `POST /api/auth/request-password-reset`

- **Purpose**: Request a password reset for a user
- **Access**: Public
- **Request Body**:

```json
{
  "email": "user@example.com"
}
```

#### `POST /api/auth/verify-password-reset`

- **Purpose**: Verify a password reset token and set a new password
- **Access**: Public
- **Request Body**:

```json
{
  "token": "reset-token",
  "new_password": "new-password"
}
```

#### `POST /api/auth/logout`

- **Purpose**: Logout endpoint (client-side cleanup)
- **Access**: Authenticated users

### User Management Endpoints

#### `GET /api/users/me`

- **Purpose**: Get current user information
- **Access**: Authenticated users
- **Response**: Current user details

#### `GET /api/users`

- **Purpose**: Get all users with pagination and filtering
- **Access**: Admin only
- **Query Parameters**: page, page_size, role, active, search
- **Response**: Paginated list of users

#### `GET /api/users/{user_id}`

- **Purpose**: Get a user by ID
- **Access**: Admin or self
- **Response**: User details

#### `POST /api/users`

- **Purpose**: Create a new user
- **Access**: Admin only
- **Request Body**:

```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "secure_password",
  "role": "harvester",
  "full_name": "New User",
  "phone_number": "+1234567890"
}
```

- **Response**: Created user details

#### `PUT /api/users/{user_id}`

- **Purpose**: Update a user's information
- **Access**: Admin or self
- **Request Body**: Fields to update (username, email, full_name, etc.)
- **Response**: Updated user details

#### `POST /api/users/{user_id}/activate`

- **Purpose**: Activate a user
- **Access**: Admin only
- **Response**: Activated user details

#### `POST /api/users/{user_id}/deactivate`

- **Purpose**: Deactivate a user
- **Access**: Admin only
- **Response**: Deactivated user details

#### `POST /api/users/change-password`

- **Purpose**: Change the current user's password
- **Access**: Authenticated users
- **Request Body**:

```json
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

#### `POST /api/users/{user_id}/reset-password`

- **Purpose**: Reset a user's password to a temporary password
- **Access**: Admin only
- **Response**: Temporary password

#### `GET /api/users/roles`

- **Purpose**: Get all available roles in the system
- **Access**: Authenticated users
- **Response**: List of roles

#### `POST /api/users/roles`

- **Purpose**: Add a new role to the system
- **Access**: Admin only
- **Request Body**:

```json
{
  "role": "new_role"
}
```

#### `DELETE /api/users/roles/{role_name}`

- **Purpose**: Delete a role from the system
- **Access**: Admin only

### Farm Management Endpoints

#### `POST /api/farms`

- **Purpose**: Create a new farm
- **Access**: Admin only
- **Request Body**:

```json
{
  "name": "Farm A",
  "location": "Location A",
  "gps_coordinates": {
    "latitude": -37.123,
    "longitude": 174.765
  },
  "owner": "Owner Name",
  "contact_info": {
    "phone": "+1234567890",
    "email": "farm@example.com"
  }
}
```

- **Response**: Created farm details

#### `GET /api/farms/{farm_id}`

- **Purpose**: Get a farm by ID
- **Access**: Authenticated users
- **Response**: Farm details

#### `GET /api/farms`

- **Purpose**: List all farms with pagination and optional search
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, search
- **Response**: Paginated list of farms

#### `PUT /api/farms/{farm_id}`

- **Purpose**: Update a farm
- **Access**: Admin only
- **Request Body**: Fields to update
- **Response**: Updated farm details

#### `DELETE /api/farms/{farm_id}`

- **Purpose**: Delete a farm
- **Access**: Admin only

#### `GET /api/farms/{farm_id}/stats`

- **Purpose**: Get statistics for a specific farm
- **Access**: Authenticated users
- **Query Parameters**: start_date, end_date
- **Response**: Farm statistics

### Packhouse Management Endpoints

#### `POST /api/packhouses`

- **Purpose**: Create a new packhouse
- **Access**: Admin only
- **Request Body**:

```json
{
  "name": "Packhouse A",
  "location": "Location A",
  "gps_coordinates": {
    "latitude": -37.123,
    "longitude": 174.765
  },
  "manager": "Manager Name",
  "contact_info": {
    "phone": "+1234567890",
    "email": "packhouse@example.com"
  }
}
```

- **Response**: Created packhouse details

#### `GET /api/packhouses/{packhouse_id}`

- **Purpose**: Get a packhouse by ID
- **Access**: Authenticated users
- **Response**: Packhouse details

#### `GET /api/packhouses`

- **Purpose**: List all packhouses with pagination and optional search
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, search
- **Response**: Paginated list of packhouses

#### `PUT /api/packhouses/{packhouse_id}`

- **Purpose**: Update a packhouse
- **Access**: Admin only
- **Request Body**: Fields to update
- **Response**: Updated packhouse details

#### `DELETE /api/packhouses/{packhouse_id}`

- **Purpose**: Delete a packhouse
- **Access**: Admin only

#### `GET /api/packhouses/{packhouse_id}/stats`

- **Purpose**: Get statistics for a specific packhouse
- **Access**: Authenticated users
- **Query Parameters**: start_date, end_date
- **Response**: Packhouse statistics

### Variety Management Endpoints

#### `POST /api/varieties`

- **Purpose**: Create a new mango variety
- **Access**: Admin only
- **Request Body**:

```json
{
  "name": "Alphonso",
  "description": "Sweet and aromatic mango variety"
}
```

- **Response**: Created variety details

#### `GET /api/varieties/{variety_id}`

- **Purpose**: Get a mango variety by ID
- **Access**: Authenticated users
- **Response**: Variety details

#### `GET /api/varieties`

- **Purpose**: List all mango varieties with pagination and optional search
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, search
- **Response**: Paginated list of varieties

#### `PUT /api/varieties/{variety_id}`

- **Purpose**: Update a mango variety
- **Access**: Admin only
- **Request Body**: Fields to update
- **Response**: Updated variety details

#### `DELETE /api/varieties/{variety_id}`

- **Purpose**: Delete a mango variety
- **Access**: Admin only

#### `GET /api/varieties/{variety_id}/stats`

- **Purpose**: Get statistics for a specific mango variety
- **Access**: Authenticated users
- **Query Parameters**: start_date, end_date
- **Response**: Variety statistics

### QR Code Management Endpoints

#### `POST /api/qr_code`

- **Purpose**: Create a new QR code
- **Access**: Admin, Supervisor, Manager
- **Request Body**:

```json
{
  "code_value": "ASIKH-CR-12345",
  "status": "active",
  "entity_type": "crate"
}
```

- **Response**: Created QR code with image

#### `GET /api/qr_code/{qr_id}`

- **Purpose**: Get a QR code by ID
- **Access**: Authenticated users
- **Response**: QR code details with image

#### `GET /api/qr_code/value/{code_value}`

- **Purpose**: Get a QR code by value
- **Access**: Authenticated users
- **Response**: QR code details with image

#### `GET /api/qr_code`

- **Purpose**: List all QR codes with pagination and filtering
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, status, entity_type, search
- **Response**: Paginated list of QR codes

#### `PUT /api/qr_code/{qr_id}`

- **Purpose**: Update a QR code's status or entity type
- **Access**: Admin, Supervisor, Manager
- **Request Body**: Fields to update
- **Response**: Updated QR code details

#### `POST /api/qr_code/batch`

- **Purpose**: Generate a batch of QR codes
- **Access**: Admin, Supervisor, Manager
- **Request Body**:

```json
{
  "count": 10,
  "prefix": "CR",
  "status": "active",
  "entity_type": "crate"
}
```

- **Response**: List of generated QR codes

#### `GET /api/qr_code/image/{code_value}`

- **Purpose**: Get a QR code image by code value
- **Access**: Authenticated users
- **Response**: QR code image as PNG

#### `POST /api/qr_code/download`

- **Purpose**: Generate a ZIP file containing QR code images
- **Access**: Admin, Supervisor, Manager
- **Request Body**:

```json
{
  "qr_ids": ["uuid1", "uuid2"]
}
```

- **Response**: Download token

#### `GET /api/qr_code/download/{download_token}`

- **Purpose**: Download a ZIP file of QR codes using a download token
- **Access**: Authenticated users
- **Response**: ZIP file

#### `GET /api/qr_code/validate/{code_value}`

- **Purpose**: Validate a QR code's format and check if it exists
- **Access**: Authenticated users
- **Response**: Validation result

### Crate Management Endpoints

#### `POST /api/crates`

- **Purpose**: Create a new crate record with harvesting data
- **Access**: Admin, Harvester, Supervisor, Manager
- **Request Body**:

```json
{
  "qr_code": "ASIKH-CR-12345",
  "harvest_date": "2023-05-28T10:00:00Z",
  "gps_location": {
    "latitude": -37.123,
    "longitude": 174.765
  },
  "photo_base64": "base64_encoded_image",
  "supervisor_id": "supervisor_uuid",
  "weight": 16.5,
  "notes": "Top quality",
  "variety_id": "variety_uuid",
  "quality_grade": "A"
}
```

- **Response**: Created crate details

#### `GET /api/crates/{crate_id}`

- **Purpose**: Get a crate by ID
- **Access**: Authenticated users
- **Response**: Crate details

#### `GET /api/crates/qr/{qr_code}`

- **Purpose**: Get a crate by QR code
- **Access**: Authenticated users
- **Response**: Crate details

#### `PUT /api/crates/{crate_id}`

- **Purpose**: Update a crate's details
- **Access**: Admin, Harvester, Supervisor, Manager
- **Request Body**: Fields to update
- **Response**: Updated crate details

#### `POST /api/crates/assign-batch`

- **Purpose**: Assign a crate to a batch
- **Access**: Admin, Supervisor, Manager
- **Request Body**:

```json
{
  "crate_id": "crate_uuid",
  "batch_id": "batch_uuid"
}
```

- **Response**: Updated crate details

#### `GET /api/crates`

- **Purpose**: List crates with filtering and pagination
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, sort_by, sort_desc, variety_id, supervisor_id, batch_id, from_date, to_date, quality_grade
- **Response**: Paginated list of crates

#### `POST /api/crates/search`

- **Purpose**: Advanced search for crates
- **Access**: Authenticated users
- **Request Body**: Search parameters
- **Response**: Paginated search results

### Batch Management Endpoints

#### `POST /api/batches`

- **Purpose**: Create a new batch
- **Access**: Admin, Supervisor, Manager
- **Request Body**:

```json
{
  "batch_code": "BATCH-20230528-001",
  "supervisor_id": "supervisor_uuid",
  "transport_mode": "Truck",
  "from_location": "farm_uuid",
  "to_location": "packhouse_uuid",
  "eta": "2023-05-28T15:00:00Z",
  "notes": "Urgent delivery"
}
```

- **Response**: Created batch details

#### `GET /api/batches/{batch_id}`

- **Purpose**: Get a batch by ID
- **Access**: Authenticated users
- **Response**: Batch details

#### `GET /api/batches/code/{batch_code}`

- **Purpose**: Get a batch by batch code
- **Access**: Authenticated users
- **Response**: Batch details

#### `GET /api/batches`

- **Purpose**: List all batches with pagination and filtering
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, status, from_date, to_date, from_location, to_location, supervisor_id
- **Response**: Paginated list of batches

#### `PUT /api/batches/{batch_id}`

- **Purpose**: Update a batch
- **Access**: Admin, Supervisor, Manager
- **Request Body**: Fields to update
- **Response**: Updated batch details

#### `POST /api/batches/{batch_id}/depart`

- **Purpose**: Mark a batch as departed (in_transit)
- **Access**: Admin, Supervisor, Manager
- **Response**: Updated batch status

#### `POST /api/batches/{batch_id}/arrive`

- **Purpose**: Mark a batch as arrived at the packhouse
- **Access**: Admin, Supervisor, Manager, Packhouse
- **Response**: Updated batch status

#### `GET /api/batches/{batch_id}/crates`

- **Purpose**: Get all crates in a batch
- **Access**: Authenticated users
- **Query Parameters**: page, page_size
- **Response**: Paginated list of crates in the batch

#### `GET /api/batches/{batch_id}/stats`

- **Purpose**: Get statistics for a batch
- **Access**: Authenticated users
- **Response**: Batch statistics

#### `POST /api/batches/{batch_id}/add-crate`

- **Purpose**: Add a crate to a batch
- **Access**: Admin, Supervisor, Manager
- **Request Body**:

```json
{
  "qr_code": "ASIKH-CR-12345"
}
```

- **Response**: Updated batch details

#### `POST /api/batches/{batch_id}/reconcile-crate`

- **Purpose**: Reconcile a crate with a batch
- **Access**: Admin, Supervisor, Manager, Packhouse
- **Request Body**:

```json
{
  "qr_code": "ASIKH-CR-12345",
  "weight": 15.8,
  "photo_base64": "base64_encoded_image"
}
```

- **Response**: Reconciliation result

#### `GET /api/batches/{batch_id}/reconciliation-stats`

- **Purpose**: Get reconciliation statistics for a batch
- **Access**: Authenticated users
- **Response**: Reconciliation statistics

#### `GET /api/batches/{batch_id}/weight-details`

- **Purpose**: Get detailed weight information for a batch
- **Access**: Authenticated users
- **Response**: Weight details including differentials

#### `POST /api/batches/{batch_id}/deliver`

- **Purpose**: Mark a batch as delivered after reconciliation is complete
- **Access**: Admin, Supervisor, Manager, Packhouse
- **Response**: Updated batch status

#### `POST /api/batches/{batch_id}/close`

- **Purpose**: Close a batch after it has been delivered and reconciled
- **Access**: Admin, Supervisor, Manager, Packhouse
- **Response**: Updated batch status

#### `GET /api/batches/{batch_id}/reconciliation-status`

- **Purpose**: Get reconciliation status for a batch
- **Access**: Authenticated users
- **Response**: Reconciliation status details

### Reconciliation Endpoints

#### `POST /api/reconciliation/scan`

- **Purpose**: Scan a crate for reconciliation at the packhouse
- **Access**: Admin, Packhouse, Supervisor, Manager
- **Request Body**:

```json
{
  "batch_id": "batch_uuid",
  "qr_code": "ASIKH-CR-12345",
  "location": {
    "latitude": -37.123,
    "longitude": 174.765
  },
  "device_info": {
    "device_id": "device-id",
    "model": "iPhone 12"
  },
  "notes": "Crate appears damaged"
}
```

- **Response**: Reconciliation scan result

#### `GET /api/reconciliation/batch/{batch_id}/summary`

- **Purpose**: Get reconciliation summary for a specific batch
- **Access**: Authenticated users
- **Response**: Batch reconciliation summary

#### `GET /api/reconciliation/batch/{batch_id}/logs`

- **Purpose**: Get all reconciliation logs for a specific batch with pagination
- **Access**: Authenticated users
- **Query Parameters**: page, page_size, status
- **Response**: Paginated reconciliation logs

#### `POST /api/reconciliation/search`

- **Purpose**: Search reconciliation logs with filters
- **Access**: Authenticated users
- **Request Body**: Search parameters
- **Response**: Paginated search results

#### `GET /api/reconciliation/stats`

- **Purpose**: Get overall reconciliation statistics
- **Access**: Admin, Supervisor, Manager
- **Query Parameters**: days
- **Response**: Reconciliation statistics

#### `POST /api/reconciliation/batch/{batch_id}/complete`

- **Purpose**: Manually mark a batch as reconciled
- **Access**: Admin, Packhouse, Supervisor, Manager
- **Response**: Updated batch status

6.  Entity Relationship Diagram (ERD)
    +-------------------+ +-------------------+
    | users | | qr_codes |
    +-------------------+ +-------------------+
    | id (PK) | | id (PK) |
    | username | | code_value |
    | password | | status |
    | role | | entity_type |
    +-------------------+ +-------------------+

             | 1
             |
             | N

+-------------------+
| crates |
+-------------------+
| id (PK) |
| qr_code (FK) |
| harvest_date |
| gps_location |
| photo_url |
| supervisor |
| weight |
| notes |
| variety |
| batch_id (FK) |
+-------------------+

         | N
         |
         | 1

+-------------------+
| batches |
+-------------------+
| id (PK) |
| supervisor |
| transport_mode |
| from_location |
| to_location |
| eta |
| status |
+-------------------+

         | N
         |
         | 1

+----------------------------+
| reconciliation_logs |
+----------------------------+
| id (PK) |
| batch_id (FK) |
| scanned_qr (FK) |
| status |
| timestamp |
+----------------------------+

Mango Harvesting System - Feature-wise API Documentation with Logic
Feature: Authentication
POST /api/auth/login
Purpose: Authenticate a user and return a JWT token.

Payload

{
"username": "harvester1",
"password": "password123"
}
Logic - Verify user exists. - Compare password hash. - If valid, generate JWT with role-based claims. - Return token and status.

Response

{
"token": "<JWT_TOKEN>",
"role": "harvester"
}
Feature: Harvest Entry
POST /api/crates
Purpose: Record crate data captured at the farm.

Payload

{
"qr_code": "QR123456",
"variety": "Alphonso",
"weight": 16.5,
"supervisor": "Supervisor A",
"gps": { "lat": -37.123, "lng": 174.765 },
"photo_base64": "<base64_string>",
"notes": "Top quality"
}
Logic - Ensure QR hasn't been used already. - Store the crate entry: - Save metadata: variety, weight, GPS - Decode and store photo (e.g., as URL or blob) - Set current timestamp as harvest_date - Return success message and crate ID.

Response

{
"message": "Crate recorded",
"crate_id": "QR123456"
}
Feature: Dispatch & Auto-Batching
POST /api/dispatch/scan
Purpose: Scan crates for dispatch and auto-assign to a batch.

Payload

{
"qr_code": "QR123456",
"transport_mode": "Truck",
"supervisor": "Supervisor A",
"from_location": "Farm A",
"to_location": "Packhouse 1"
}
Logic - Validate crate exists and is not already batched. - Check for existing open batch matching: - same supervisor - same transport mode - same destination - If no open batch exists, create a new one with generated batch ID. - Assign crate to that batch (crates.batch_id = batch.id). - Return batch assignment result.

Response

{
"message": "Crate assigned to batch",
"batch_id": "BATCH_20250416_001"
}
Feature: Reconciliation
POST /api/reconciliation/scan
Purpose: Scan crates at packhouse and reconcile against batch.

Payload

{
"qr_code": "QR123456",
"batch_id": "BATCH_20250416_001"
}
Logic - Retrieve crate by qr_code. - Validate crate exists and belongs to the specified batch_id. - If matched: - Log entry in reconciliation_logs as "matched" - If not matched: - Check if crate is from a different batch - If yes, log as "wrong_batch" - If not found at all, log as "not_found"

Prevent duplicate scan of same crate for same batch.
Response

{
"qr_code": "QR123456",
"status": "matched",
"crate": {
"variety": "Alphonso",
"weight": 16.5,
"supervisor": "Supervisor A"
}
}
Feature: Reports
GET /api/batch/:id/report
Purpose: Return crate-level and reconciliation summary for a batch.

Logic - Retrieve batch and linked crates. - Retrieve reconciliation_logs for batch. - Compare expected crates vs scanned. - Calculate: - % of crates matched - Total weight - Missing crate IDs - Return full report object.

Response

{
"batch_id": "BATCH_20250416_001",
"total_crates": 50,
"scanned_crates": 48,
"matched": 46,
"mismatched": 2,
"missing": ["QR123459", "QR123460"],
"total_weight": 790.2
}

#Database Docker start
docker run --hostname=5d6855276332 --env=POSTGRES_USER=postgres --env=POSTGRES_PASSWORD=postgres --env=POSTGRES_DB=asikh_oms --env=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/lib/postgresql/17/bin --env=GOSU_VERSION=1.17 --env=LANG=en_US.utf8 --env=PG_MAJOR=17 --env=PG_VERSION=17.4-1.pgdg120+2 --env=PGDATA=/var/lib/postgresql/data --volume=/var/lib/postgresql/data --network=bridge -p 5432:5432 --restart=no --runtime=runc -d postgres:latest
