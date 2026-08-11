# database.py
import os
from sqlalchemy import create_engine, Column, Integer, String, JSON, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:root@localhost:5433/forge")

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(String, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    role = Column(String, default="member")
    full_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    organization = relationship("Organization")


# Existing schemas:
class PVModule(Base):
    __tablename__ = "pv_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    manufacturer = Column(String, index=True, nullable=True)
    module_model = Column(String, index=True, unique=True, nullable=True)
    
    # Common engineering metadata fields
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
    
    # Matrix columns fields
    pmax = Column(String, nullable=True)
    pstc = Column(String, nullable=True)
    voc = Column(String, nullable=True)
    vmp = Column(String, nullable=True)
    isc = Column(String, nullable=True)
    imp = Column(String, nullable=True)
    efficiency = Column(String, nullable=True)
    
    parent_module = relationship("PVModule", back_populates="variants")


# ─── MASTER METADATA ENTITIES ──────────────────────────────────────────────

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, nullable=False)
    county = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    
    client = relationship("Client", back_populates="projects")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String, index=True, nullable=False)  # 'pv', 'battery', 'pcs', 'inverter', 'transformer', 'switchgear', 'cable', 'relay_protection', 'electrical_design', 'structural', 'grounding'
    document_no = Column(String, nullable=True)
    revision = Column(String, nullable=True)
    prepared_date = Column(String, nullable=True)
    report_title = Column(String, nullable=True)
    status = Column(String, default="draft")
    metadata_json = Column(JSON, nullable=True)
    
    project = relationship("Project", back_populates="reports")
    
    # One-to-one child configurations
    pv_details = relationship("PVReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    battery_details = relationship("BatteryReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    pcs_details = relationship("PCSReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    inverter_details = relationship("InverterReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    transformer_details = relationship("TransformerReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    switchgear_details = relationship("SwitchgearReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    cable_details = relationship("CableReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    relay_protection_details = relationship("RelayProtectionReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    electrical_design_details = relationship("ElectricalDesignReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    structural_details = relationship("StructuralReport", back_populates="report", uselist=False, cascade="all, delete-orphan")
    grounding_details = relationship("GroundingReport", back_populates="report", uselist=False, cascade="all, delete-orphan")


# ─── REPORT-SPECIFIC CHILD SCHEMAS ─────────────────────────────────────────

class PVReport(Base):
    __tablename__ = "pv_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    module_manufacturer = Column(String, nullable=True)
    module_model = Column(String, nullable=True)
    electrical_characteristics = Column(JSON, nullable=True)
    mechanical_characteristics = Column(JSON, nullable=True)
    temperature_coefficients = Column(JSON, nullable=True)
    string_sizing = Column(JSON, nullable=True)
    pvsyst_results = Column(JSON, nullable=True)
    irradiation_data = Column(JSON, nullable=True)
    energy_yield = Column(JSON, nullable=True)
    loss_analysis = Column(JSON, nullable=True)
    voc_calculations = Column(JSON, nullable=True)
    isc_calculations = Column(JSON, nullable=True)
    degradation_tables = Column(JSON, nullable=True)
    site_conditions = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="pv_details")

class BatteryReport(Base):
    __tablename__ = "battery_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    battery_manufacturer = Column(String, nullable=True)
    battery_model = Column(String, nullable=True)
    cell_chemistry = Column(String, nullable=True)
    charge_characteristics = Column(JSON, nullable=True)
    discharge_characteristics = Column(JSON, nullable=True)
    thermal_limits = Column(JSON, nullable=True)
    protection_settings = Column(JSON, nullable=True)
    cycle_life = Column(Integer, nullable=True)
    operating_conditions = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="battery_details")

class PCSReport(Base):
    __tablename__ = "pcs_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    pcs_manufacturer = Column(String, nullable=True)
    pcs_model = Column(String, nullable=True)
    voltage_limits = Column(JSON, nullable=True)
    current_limits = Column(JSON, nullable=True)
    mppt_details = Column(JSON, nullable=True)
    ac_specifications = Column(JSON, nullable=True)
    dc_specifications = Column(JSON, nullable=True)
    efficiency_curves = Column(JSON, nullable=True)
    communication_interfaces = Column(JSON, nullable=True)
    protection_features = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="pcs_details")

class InverterReport(Base):
    __tablename__ = "inverter_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    inverter_manufacturer = Column(String, nullable=True)
    inverter_model = Column(String, nullable=True)
    voltage_limits = Column(JSON, nullable=True)
    current_limits = Column(JSON, nullable=True)
    mppt_details = Column(JSON, nullable=True)
    ac_specifications = Column(JSON, nullable=True)
    dc_specifications = Column(JSON, nullable=True)
    efficiency_curves = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="inverter_details")

class TransformerReport(Base):
    __tablename__ = "transformer_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    transformer_manufacturer = Column(String, nullable=True)
    transformer_model = Column(String, nullable=True)
    capacity_kva = Column(Float, nullable=True)
    voltage_ratio = Column(String, nullable=True)
    impedance_percent = Column(Float, nullable=True)
    cooling_class = Column(String, nullable=True)
    losses_no_load_w = Column(Float, nullable=True)
    losses_load_w = Column(Float, nullable=True)
    
    report = relationship("Report", back_populates="transformer_details")

class SwitchgearReport(Base):
    __tablename__ = "switchgear_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    switchgear_manufacturer = Column(String, nullable=True)
    switchgear_model = Column(String, nullable=True)
    rated_voltage_kv = Column(Float, nullable=True)
    rated_current_a = Column(Float, nullable=True)
    short_circuit_withstand_ka = Column(Float, nullable=True)
    busbar_material = Column(String, nullable=True)
    ip_rating = Column(String, nullable=True)
    
    report = relationship("Report", back_populates="switchgear_details")

class CableReport(Base):
    __tablename__ = "cable_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    conductor_material = Column(String, nullable=True)
    insulation_type = Column(String, nullable=True)
    voltage_rating = Column(String, nullable=True)
    cable_size = Column(String, nullable=True)
    no_of_runs = Column(Integer, nullable=True)
    installation_method = Column(String, nullable=True)
    soil_thermal_resistivity = Column(Float, nullable=True)
    soil_temperature = Column(Float, nullable=True)
    load_factor = Column(Float, nullable=True)
    derated_ampacity = Column(Float, nullable=True)
    
    report = relationship("Report", back_populates="cable_details")

class RelayProtectionReport(Base):
    __tablename__ = "relay_protection_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    relay_manufacturer = Column(String, nullable=True)
    relay_model = Column(String, nullable=True)
    ansi_codes = Column(String, nullable=True)
    ct_ratio = Column(String, nullable=True)
    pt_ratio = Column(String, nullable=True)
    pickup_settings = Column(JSON, nullable=True)
    delay_settings = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="relay_protection_details")

class ElectricalDesignReport(Base):
    __tablename__ = "electrical_design_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    system_frequency_hz = Column(Float, nullable=True)
    short_circuit_level_ka = Column(Float, nullable=True)
    max_voltage_drop_percent = Column(Float, nullable=True)
    grounding_system_type = Column(String, nullable=True)
    design_standards = Column(JSON, nullable=True)
    key_design_parameters = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="electrical_design_details")

class StructuralReport(Base):
    __tablename__ = "structural_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    wind_load_mph = Column(Float, nullable=True)
    snow_load_psf = Column(Float, nullable=True)
    seismic_design_category = Column(String, nullable=True)
    foundation_type = Column(String, nullable=True)
    soil_bearing_capacity = Column(String, nullable=True)
    structural_steel_grade = Column(String, nullable=True)
    concrete_strength_psi = Column(Float, nullable=True)
    
    report = relationship("Report", back_populates="structural_details")

class GroundingReport(Base):
    __tablename__ = "grounding_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    grounding_software = Column(String, nullable=True)
    ground_conductor_bess = Column(String, nullable=True)
    ground_conductor_pcs = Column(String, nullable=True)
    ground_conductor_aux = Column(String, nullable=True)
    ground_conductor_misc = Column(String, nullable=True)
    grounding_layout_drawing_no = Column(String, nullable=True)
    grounding_analysis_report_no = Column(String, nullable=True)
    safety_body_weight_kg = Column(Float, nullable=True)
    safety_shock_duration_sec = Column(Float, nullable=True)
    soil_resistivity_model = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="grounding_details")


def init_db():
    print("⏳ Synchronizing comprehensive system schema in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✅ Comprehensive schema initialized successfully.")