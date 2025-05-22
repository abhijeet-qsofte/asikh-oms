Project Root Directy : asikh-oms
Project Name : asikh-oms
Version: 1.0.1

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
+---------------------------+ 5. Backend API Specifications
5.1 POST /api/auth/login
{
"username": "harvester1",
"password": "password123"
}
5.2 POST /api/crates
{
"qr_code": "QR123456",
"variety": "Alphonso",
"weight": 16.5,
"supervisor": "Supervisor A",
"gps": { "lat": -37.123, "lng": 174.765 },
"photo_base64": "<base64_string>",
"notes": "Top quality"
}
5.3 POST /api/dispatch/scan
{
"qr_code": "QR123456",
"transport_mode": "Truck",
"supervisor": "Supervisor A",
"from_location": "Farm A",
"to_location": "Packhouse 1"
}
5.4 POST /api/reconciliation/scan
{
"qr_code": "QR123456",
"batch_id": "BATCH001"
} 6. Entity Relationship Diagram (ERD)
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
