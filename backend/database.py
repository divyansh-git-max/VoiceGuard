import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Read database URL (Neon PostgreSQL in production / .env, SQLite fallback for local offline testing)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./voiceguard.db"

# SQLAlchemy compatibility fix for PostgreSQL URL prefixes
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect args & engine configuration
connect_args = {}
engine_kwargs = {"pool_pre_ping": True}  # Crucial for Neon serverless pooler

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for database session lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initializes database tables and seeds the single system administrator
    if no admin account exists yet.
    """
    from backend.models import User, UserRole
    from backend.auth import hash_password

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN.value).first()
        if not admin_user:
            admin_username = os.getenv("ADMIN_USERNAME", "admin")
            admin_email = os.getenv("ADMIN_EMAIL", "admin@voiceguard.com")
            admin_password = os.getenv("ADMIN_PASSWORD", "AdminSecret123!")

            existing = db.query(User).filter((User.username == admin_username) | (User.email == admin_email)).first()
            if not existing:
                new_admin = User(
                    email=admin_email,
                    username=admin_username,
                    hashed_password=hash_password(admin_password),
                    role=UserRole.ADMIN.value,
                    is_active=True,
                )
                db.add(new_admin)
                db.commit()
                print(f"[DB Init] Seeded single default admin account: {admin_username}")
            else:
                existing.role = UserRole.ADMIN.value
                db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DB Init] Note: {e}")
    finally:
        db.close()

