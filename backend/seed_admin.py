from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import get_password_hash

def main():
    # 1) Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 2) Open a session and insert admin if missing
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@example.com",
                password=get_password_hash("adminpass"),
                role="admin",
                full_name="Admin User",
                active=True,
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created.")
        else:
            print("ℹ️  Admin already exists.")
    finally:
        db.close()

if __name__ == '__main__':
    main()