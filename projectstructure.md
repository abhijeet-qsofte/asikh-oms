asikh_oms_api/
│
├── main.py # Application entry point
├── Dockerfile # Containerization
├── docker-compose.yml # Local development
├── requirements.txt # Dependencies
├── alembic/ # Database migrations
│ ├── versions/
│ └── alembic.ini
│
├── app/
│ ├── **init**.py
│ ├── core/ # Core modules
│ │ ├── **init**.py
│ │ ├── config.py # Environment & app settings
│ │ ├── security.py # Authentication & authorization
│ │ └── database.py # Database connections
│ │
│ ├── api/ # API endpoints
│ │ ├── **init**.py
│ │ ├── dependencies.py # Shared dependencies
│ │ ├── errors.py # Error handling
│ │ └── routes/ # Route modules
│ │ ├── **init**.py
│ │ ├── auth.py
│ │ ├── users.py
│ │ ├── crates.py
│ │ ├── batches.py
│ │ └── reconciliation.py
│ │
│ ├── models/ # SQLAlchemy models
│ │ ├── **init**.py
│ │ ├── user.py
│ │ ├── qr_code.py
│ │ ├── farm.py
│ │ ├── packhouse.py
│ │ ├── batch.py
│ │ ├── crate.py
│ │ └── reconciliation.py
│ │
│ ├── schemas/ # Pydantic schemas
│ │ ├── **init**.py
│ │ ├── auth.py
│ │ ├── user.py
│ │ ├── qr_code.py
│ │ ├── farm.py
│ │ ├── batch.py
│ │ ├── crate.py
│ │ └── reconciliation.py
│ │
│ ├── crud/ # Database operations
│ │ ├── **init**.py
│ │ ├── base.py
│ │ ├── user.py
│ │ ├── qr_code.py
│ │ ├── batch.py
│ │ ├── crate.py
│ │ └── reconciliation.py
│ │
│ ├── services/ # Business logic
│ │ ├── **init**.py
│ │ ├── auth_service.py
│ │ ├── crate_service.py
│ │ ├── batch_service.py
│ │ ├── reconciliation_service.py
│ │ └── storage_service.py
│ │
│ └── utils/ # Utility functions
│ ├── **init**.py
│ ├── logging.py
│ ├── qr_generator.py
│ ├── image_processing.py
│ └── reporting.py
│
└── tests/ # Unit and integration tests
├── **init**.py
├── conftest.py
├── api/
│ ├── **init**.py
│ ├── test_auth.py
│ ├── test_crates.py
│ ├── test_batches.py
│ └── test_reconciliation.py
│
└── services/
├── **init**.py
├── test_auth_service.py
├── test_crate_service.py
└── test_reconciliation_service.py
