# database.py
import os
from sqlalchemy import create_engine, Column, Integer, String, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Update this line with your local PostgreSQL credentials:
# Format: postgresql://username:password@localhost:5432/database_name
DATABASE_URL = "postgresql://postgres:password@localhost:5432/forge"

# 1. Create the database engine (manages connection pool)
engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 3. Create a Base class for our database models mapping
class PVModule(Base):
    __tablename__ = "pv_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    manufacturer = Column(String, index=True, nullable=True)
    module_model = Column(String, index=True, unique=True, nullable=True)
    
    # Common engineering metadata fields (stored as JSON objects or text strings)
    bifacial_coefficient = Column(String, nullable=True)
    temperature_coefficients = Column(JSON, nullable=True) # {"isc_alpha": null, "voc_beta": null, "pm_gamma": null}
    noct = Column(String, nullable=True)
    series_fuse_rating = Column(String, nullable=True)
    operating_temperature_range = Column(String, nullable=True)
    dimensions_mm = Column(String, nullable=True)
    weight_kg = Column(String, nullable=True)
    cells_count = Column(String, nullable=True)
    cell_type = Column(String, nullable=True)
    front_glass = Column(String, nullable=True)
    back_glass = Column(String, nullable=True)
    output_cable = Column(String, nullable=True)
    connector = Column(String, nullable=True)
    junction_box = Column(String, nullable=True)
    load_rating = Column(JSON, nullable=True)  # {"wind": null, "snow": null}
    degradation = Column(JSON, nullable=True)  # {"first_year": null, "yearly": null, "year_30": null}
    warranty = Column(JSON, nullable=True)     # {"product": null, "performance": null}
    
    variants = relationship("PVVariant", back_populates="parent_module", cascade="all, delete-orphan")

class PVVariant(Base):
    __tablename__ = "pv_variants"
    
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("pv_modules.id", ondelete="CASCADE"))
    
    # Matrix columns fields (electrical power variations)
    pmax = Column(String, nullable=True)
    pstc = Column(String, nullable=True)
    voc = Column(String, nullable=True)
    vmp = Column(String, nullable=True)
    isc = Column(String, nullable=True)
    imp = Column(String, nullable=True)
    efficiency = Column(String, nullable=True)
    
    parent_module = relationship("PVModule", back_populates="variants")

def init_db():
    print("⏳ Synchronizing comprehensive system schema in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✅ Comprehensive schema initialized successfully.")