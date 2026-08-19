# database.py
import os
import uuid
from sqlalchemy import create_engine, Column, Integer, String, JSON, ForeignKey, Float, Boolean, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/forge")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif not DATABASE_URL.startswith("postgresql://") and "@" in DATABASE_URL:
    DATABASE_URL = f"postgresql://{DATABASE_URL}"

def create_database_if_not_exists(url: str):
    from sqlalchemy import create_engine as _create_engine, text
    if not url.startswith("postgresql"):
        return
    try:
        base_url, db_name = url.rsplit("/", 1)
        if "?" in db_name:
            db_name, query_params = db_name.split("?", 1)
            temp_url = f"{base_url}/postgres?{query_params}"
        else:
            temp_url = f"{base_url}/postgres"
            
        temp_engine = _create_engine(temp_url, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'")).first()
            if not result:
                print(f"⏳ Database '{db_name}' does not exist. Creating it locally...")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"✅ Database '{db_name}' created successfully.")
        temp_engine.dispose()
    except Exception as e:
        print(f"⚠️ Notice: Local database existence check/creation skipped: {e}")
        print("Please verify your PostgreSQL service is running and credentials in DATABASE_URL are correct.")

create_database_if_not_exists(DATABASE_URL)

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True, nullable=False)

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    role = Column(String, default="member")
    full_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    vertical = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    organization = relationship("Organization")


# Existing schemas:
class PVModule(Base):
    __tablename__ = "pv_modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    module_id = Column(UUID(as_uuid=True), ForeignKey("pv_modules.id", ondelete="CASCADE"))
    
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

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, unique=True, nullable=False)

class Vertical(Base):
    __tablename__ = "verticals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    
    department = relationship("Department")

class MasterReportTemplate(Base):
    __tablename__ = "master_report_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_name = Column(String, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    vertical_id = Column(UUID(as_uuid=True), ForeignKey("verticals.id", ondelete="CASCADE"), nullable=False)
    
    department = relationship("Department")
    vertical = relationship("Vertical")

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=True)
    logo = Column(String, nullable=True)
    created_by = Column(String, nullable=True) # Reviewer User ID
    created_at = Column(String, nullable=True)
    modified_by = Column(String, nullable=True)
    modified_at = Column(String, nullable=True)
    
    # Restructured columns
    primary_contact = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    client_address = Column(String, nullable=True)
    
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, index=True, nullable=False)
    county = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    assigned_reviewer = Column(String, nullable=True)
    assigned_reviewer_id = Column(String, nullable=True)  # UUID of assigned reviewer (profile.id)
    assigned_creator = Column(String, nullable=True)
    assigned_creator_id = Column(String, nullable=True)  # UUID of assigned creator (profile.id)
    department = Column(String, nullable=True)
    vertical = Column(String, nullable=True)
    status = Column(String, default="active")
    description = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    
    # Restructured columns
    site_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    consultant_epc = Column(String, nullable=True)
    ac_capacity_mw = Column(Float, nullable=True)
    dc_capacity_mw = Column(Float, nullable=True)
    poi_voltage_kv = Column(Float, nullable=True)
    mv_collection_voltage_kv = Column(Float, nullable=True)
    lv_collection_voltage_v = Column(Float, nullable=True)
    dc_voltage_v = Column(Float, nullable=True)
    total_area_acres = Column(Float, nullable=True)
    
    client = relationship("Client", back_populates="projects")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    site_conditions = relationship("ProjectSiteConditions", back_populates="project", uselist=False, cascade="all, delete-orphan")

class ProjectSiteConditions(Base):
    __tablename__ = "project_site_conditions"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    altitude_ft = Column(Float, nullable=True)
    wind_speed_mph = Column(Float, nullable=True)
    snow_load_psf = Column(Float, nullable=True)
    snow_depth_in = Column(Float, nullable=True)
    risk_category = Column(String, nullable=True)
    temp_min_c = Column(Float, nullable=True)
    temp_max_c = Column(Float, nullable=True)
    design_temp_f = Column(Float, nullable=True)
    utility_name = Column(String, nullable=True)
    fence_area_acres = Column(Float, nullable=True)
    road_width_ft = Column(Float, nullable=True)
    fence_clearance_ft = Column(Float, nullable=True)
    
    project = relationship("Project", back_populates="site_conditions")


# ─── EQUIPMENT CATALOG TABLES ──────────────────────────────────────────────

class EquipmentPCS(Base):
    __tablename__ = "equipment_pcs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    rating_kva = Column(Float, nullable=True)
    ac_voltage_v = Column(Float, nullable=True)
    dc_voltage_range = Column(String, nullable=True)
    frequency_hz = Column(Float, nullable=True)
    efficiency_percent = Column(Float, nullable=True)
    thd_percent = Column(Float, nullable=True)
    protection_rating = Column(String, nullable=True)
    cooling_method = Column(String, nullable=True)
    communication_interfaces = Column(String, nullable=True)
    dimensions = Column(String, nullable=True)
    certifications = Column(String, nullable=True)

class EquipmentTransformer(Base):
    __tablename__ = "equipment_transformers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    rating_kva = Column(Float, nullable=True)
    voltage_ratio = Column(String, nullable=True)
    winding_config = Column(String, nullable=True)
    vector_group = Column(String, nullable=True)
    impedance_percent = Column(Float, nullable=True)
    efficiency_percent = Column(Float, nullable=True)
    winding_material = Column(String, nullable=True)
    cooling_class = Column(String, nullable=True)

class EquipmentCable(Base):
    __tablename__ = "equipment_cables"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cable_class = Column(String, nullable=True) # Check constraint value: dc_cable, trunk_cable, mv_cable, aux_cable
    conductor_material = Column(String, nullable=True)
    insulation_type = Column(String, nullable=True)
    voltage_rating_v = Column(Float, nullable=True)
    cable_size = Column(String, nullable=True)
    temp_rating_c = Column(Float, nullable=True)
    certifications = Column(String, nullable=True)


# ─── REPORT ENTITY ─────────────────────────────────────────────────────────

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    vertical_id = Column(UUID(as_uuid=True), ForeignKey("verticals.id", ondelete="SET NULL"), nullable=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("master_report_templates.id", ondelete="SET NULL"), nullable=True)
    
    report_type = Column(String, index=True, nullable=False)  # 'pv', 'battery', 'pcs', 'inverter', 'transformer', 'switchgear', 'cable', 'relay_protection', 'electrical_design', 'structural', 'grounding'
    document_no = Column(String, nullable=True)
    revision = Column(String, nullable=True)
    prepared_date = Column(String, nullable=True)
    report_title = Column(String, nullable=True)
    
    # Milestone Design Stage ID (sid): '10' (10%), '30' (30%), '60' (60%), '100' (100% IFC)
    stage_id = Column(String, default="10", index=True)
    
    status = Column(String, default="draft") # 'draft', 'in_review', 'changes_requested', 'approved', 'completed'
    metadata_json = Column(JSON, nullable=True)
    
    # Workflow, Version Copy & Provider/Creator management
    parent_report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=True)
    version_number = Column(Integer, default=1)
    is_current_version = Column(Boolean, default=True)
    created_by_role = Column(String, default="creator")
    created_by_name = Column(String, nullable=True)
    assigned_reviewer = Column(String, nullable=True)
    assigned_reviewer_id = Column(String, nullable=True)
    assigned_creator = Column(String, nullable=True)
    assigned_creator_id = Column(String, nullable=True)
    provider_company = Column(String, nullable=True)
    department = Column(String, nullable=True)
    vertical = Column(String, nullable=True)
    version_notes = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    
    project = relationship("Project", back_populates="reports")
    department_rel = relationship("Department")
    vertical_rel = relationship("Vertical")
    template_rel = relationship("MasterReportTemplate")
    
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
    
    cables = relationship("ReportCable", back_populates="report", cascade="all, delete-orphan")

class ReportComment(Base):
    __tablename__ = "report_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, default=1)
    author_id = Column(String, nullable=True)
    author_name = Column(String, nullable=True)
    author_role = Column(String, default="reviewer")
    section_key = Column(String, nullable=True)
    field_key = Column(String, nullable=True)
    comment_text = Column(String, nullable=False)
    status = Column(String, default="open") # 'open', 'resolved'
    created_at = Column(String, nullable=True)

class ReportCable(Base):
    __tablename__ = "report_cables"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    cable_purpose = Column(String, nullable=False)
    cable_spec_id = Column(UUID(as_uuid=True), ForeignKey("equipment_cables.id", ondelete="RESTRICT"), nullable=False)
    no_of_runs = Column(Integer, default=1)
    burial_depth_ft = Column(Float, nullable=True)
    installation_method = Column(String, nullable=True)
    
    report = relationship("Report", back_populates="cables")
    cable_spec = relationship("EquipmentCable")


# ─── REPORT-SPECIFIC CHILD SCHEMAS ─────────────────────────────────────────

class PVReport(Base):
    __tablename__ = "pv_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    # Restructured columns
    module_type = Column(String, nullable=True)
    module_pmax = Column(Float, nullable=True)
    module_voc = Column(Float, nullable=True)
    module_vmp = Column(Float, nullable=True)
    module_isc = Column(Float, nullable=True)
    module_imp = Column(Float, nullable=True)
    module_length_mm = Column(Float, nullable=True)
    module_width_mm = Column(Float, nullable=True)
    module_height_mm = Column(Float, nullable=True)
    temp_coeff_voc_percent = Column(Float, nullable=True)
    temp_coeff_pm_percent = Column(Float, nullable=True)
    temp_coeff_isc_percent = Column(Float, nullable=True)
    dc_ac_ratio_poi = Column(Float, nullable=True)
    dc_ac_ratio_inv = Column(Float, nullable=True)
    pcs_id = Column(UUID(as_uuid=True), ForeignKey("equipment_pcs.id", ondelete="RESTRICT"), nullable=True)
    transformer_id = Column(UUID(as_uuid=True), ForeignKey("equipment_transformers.id", ondelete="RESTRICT"), nullable=True)
    
    report = relationship("Report", back_populates="pv_details")
    string_sizing_rows = relationship("PVStringSizingRow", back_populates="pv_report", cascade="all, delete-orphan")

class PVStringSizingRow(Base):
    __tablename__ = "pv_string_sizing_rows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    pv_report_id = Column(UUID(as_uuid=True), ForeignKey("pv_reports.id", ondelete="CASCADE"), nullable=False)
    inverter_channel_id = Column(String, nullable=False)
    strings_per_mppt = Column(Integer, nullable=False)
    modules_per_string = Column(Integer, nullable=False)
    voc_min_temp = Column(Float, nullable=True)
    vmp_max_temp = Column(Float, nullable=True)
    
    pv_report = relationship("PVReport", back_populates="string_sizing_rows")

class BatteryReport(Base):
    __tablename__ = "battery_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    battery_manufacturer = Column(String, nullable=True)
    battery_model = Column(String, nullable=True)
    cell_chemistry = Column(String, nullable=True)
    charge_characteristics = Column(JSON, nullable=True)
    discharge_characteristics = Column(JSON, nullable=True)
    thermal_limits = Column(JSON, nullable=True)
    protection_settings = Column(JSON, nullable=True)
    cycle_life = Column(Integer, nullable=True)
    operating_conditions = Column(JSON, nullable=True)
    
    # Restructured columns
    battery_min_voltage = Column(Float, nullable=True)
    battery_max_voltage = Column(Float, nullable=True)
    battery_rated_voltage = Column(Float, nullable=True)
    battery_rated_current = Column(Float, nullable=True)
    bess_dimension = Column(String, nullable=True)
    bess_energy_per_enclosure_kwh = Column(Float, nullable=True)
    no_of_enclosures = Column(Integer, nullable=True)
    cooling_method = Column(String, nullable=True)
    bess_design_life_years = Column(Integer, nullable=True)
    battery_charge_rate = Column(String, nullable=True)
    battery_discharge_rate = Column(String, nullable=True)
    battery_max_power_mw = Column(Float, nullable=True)
    pcs_id = Column(UUID(as_uuid=True), ForeignKey("equipment_pcs.id", ondelete="RESTRICT"), nullable=True)
    transformer_id = Column(UUID(as_uuid=True), ForeignKey("equipment_transformers.id", ondelete="RESTRICT"), nullable=True)
    
    report = relationship("Report", back_populates="battery_details")
    egc_rows = relationship("BesseGCRow", back_populates="battery_report", cascade="all, delete-orphan")

class BesseGCRow(Base):
    __tablename__ = "bess_egc_rows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    battery_report_id = Column(UUID(as_uuid=True), ForeignKey("battery_reports.id", ondelete="CASCADE"), nullable=False)
    row_index = Column(Integer, nullable=False)
    circuit_name = Column(String, nullable=False)
    ocpd = Column(String, nullable=False)
    power_cable = Column(String, nullable=False)
    egc = Column(String, nullable=False)
    
    battery_report = relationship("BatteryReport", back_populates="egc_rows")

class PCSReport(Base):
    __tablename__ = "pcs_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    system_frequency_hz = Column(Float, nullable=True)
    short_circuit_level_ka = Column(Float, nullable=True)
    max_voltage_drop_percent = Column(Float, nullable=True)
    grounding_system_type = Column(String, nullable=True)
    design_standards = Column(JSON, nullable=True)
    key_design_parameters = Column(JSON, nullable=True)
    
    report = relationship("Report", back_populates="electrical_design_details")

class StructuralReport(Base):
    __tablename__ = "structural_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    
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


def _schema_is_corrupt(conn) -> bool:
    """
    Checks whether any column in the live database has a type that doesn't
    match what the ORM expects.  Returns True if ANY mismatch is found,
    which triggers a full DROP + recreate of the public schema.

    Expected types:
      profiles.id              → uuid
      profiles.email           → character varying / varchar / text
      profiles.hashed_password → character varying / varchar / text
      organizations.id         → uuid
    """
    from sqlalchemy import text

    VARCHAR_TYPES = {'character varying', 'varchar', 'text'}
    UUID_TYPES    = {'uuid'}

    # (table, column, expected_kind)  where kind is 'uuid' or 'varchar'
    checks = [
        ('profiles',      'id',              'uuid'),
        ('profiles',      'email',           'varchar'),
        ('profiles',      'hashed_password', 'varchar'),
        ('organizations', 'id',              'uuid'),
    ]

    try:
        for table, column, expected_kind in checks:
            row = conn.execute(text("""
                SELECT data_type
                FROM   information_schema.columns
                WHERE  table_schema = 'public'
                  AND  table_name   = :t
                  AND  column_name  = :c
            """), {"t": table, "c": column}).fetchone()

            if row is None:
                continue  # Column/table doesn't exist yet — create_all will handle it

            actual = row[0].lower()
            if expected_kind == 'uuid' and actual not in UUID_TYPES:
                print(f"⚠️  Schema corruption: {table}.{column} is '{actual}', expected uuid.")
                return True
            if expected_kind == 'varchar' and actual not in VARCHAR_TYPES:
                print(f"⚠️  Schema corruption: {table}.{column} is '{actual}', expected varchar.")
                return True

        return False
    except Exception as e:
        print(f"⚠️  Schema check skipped ({e}). Assuming schema is clean.")
        return False


def _rebuild_schema(conn):
    """
    Atomically drop and recreate the public schema.
    Called only when corruption is detected.
    """
    from sqlalchemy import text
    print("🔧 Rebuilding database schema from scratch (all existing data will be cleared)...")
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
    print("✅ Clean schema scaffolded — tables will be created now.")




def _seed_master_data(db):
    """Seed departments, verticals, templates, and default org from NAV tree — idempotent."""
    org = db.query(Organization).first()
    if not org:
        org = Organization(name="PV-Insight")
        db.add(org)
        db.commit()
        db.refresh(org)
        print("🌱 Seeded default organization: PV-Insight")

    from sqlalchemy import func

    nav_tree = [
        {
            "name": "Electrical",
            "subs": [
                {
                    "name": "PV",
                    "reports": [
                        {"reportTitle": "PV Design Basis Report"},
                        {"reportTitle": "String Size Design Basis Report"},
                        {"reportTitle": "Energy Yield Design Basis Report"},
                        {"reportTitle": "GCR Optimization Design Basis Report"},
                        {"reportTitle": "DC Cable Sizing Design Basis Report"},
                        {"reportTitle": "Lightning Protection Design Basis Report"}
                    ]
                },
                {
                    "name": "BESS",
                    "reports": [
                        {"reportTitle": "BESS Sizing Design Basis Report"},
                        {"reportTitle": "BESS Cable Ampacity Report"},
                        {"reportTitle": "BESS Grounding Design Basis Report"},
                        {"reportTitle": "PCS Sizing Design Basis Report"}
                    ]
                },
                {
                    "name": "HV & Substation",
                    "reports": [
                        {"reportTitle": "HV Design Basis Report"},
                        {"reportTitle": "Aluminium Bus Bar Sizing & Ampacity Report"},
                        {"reportTitle": "Transformer Sizing Design Basis Report"},
                        {"reportTitle": "SLD Basis Report"}
                    ]
                },
                {
                    "name": "TL Lines",
                    "reports": [
                        {"reportTitle": "Sag & Tension Design Basis Report"}
                    ]
                },
                {"name": "PSS", "reports": []}
            ]
        },
        {
            "name": "Civil",
            "subs": [
                {
                    "name": "PV",
                    "reports": [
                        {"reportTitle": "Grading & Drainage Design Basis Report"},
                        {"reportTitle": "Access Road Design Basis Report"}
                    ]
                },
                {"name": "BESS", "reports": []},
                {"name": "HV & Substation", "reports": []},
                {"name": "PSS", "reports": []},
                {"name": "TL Lines", "reports": []}
            ]
        },
        {
            "name": "Structure",
            "subs": [
                {
                    "name": "PV",
                    "reports": [
                        {"reportTitle": "Pile Foundation Design Basis Report"},
                        {"reportTitle": "Tracker Structure Design Basis Report"}
                    ]
                },
                {"name": "BESS", "reports": []},
                {"name": "HV & Substation", "reports": []},
                {"name": "PSS", "reports": []},
                {"name": "TL Lines", "reports": []}
            ]
        }
    ]

    for dept_data in nav_tree:
        dept = db.query(Department).filter(
            func.lower(Department.name) == dept_data["name"].lower()
        ).first()
        if not dept:
            dept = Department(name=dept_data["name"])
            db.add(dept)
            db.commit()
            db.refresh(dept)

        for sub_data in dept_data["subs"]:
            vert = db.query(Vertical).filter(
                (func.lower(Vertical.name) == sub_data["name"].lower()) &
                (Vertical.department_id == dept.id)
            ).first()
            if not vert:
                vert = Vertical(name=sub_data["name"], department_id=dept.id)
                db.add(vert)
                db.commit()
                db.refresh(vert)

            for rep_data in sub_data.get("reports", []):
                template = db.query(MasterReportTemplate).filter(
                    (func.lower(MasterReportTemplate.report_name) == rep_data["reportTitle"].lower()) &
                    (MasterReportTemplate.department_id == dept.id) &
                    (MasterReportTemplate.vertical_id == vert.id)
                ).first()
                if not template:
                    db.add(MasterReportTemplate(
                        report_name=rep_data["reportTitle"],
                        department_id=dept.id,
                        vertical_id=vert.id
                    ))
                    db.commit()

    # Backfill existing reports table columns if NULL
    try:
        reports = db.query(Report).all()
        for r in reports:
            changed = False
            if not r.organization_id:
                r.organization_id = org.id
                changed = True

            dept_name = r.department or "Electrical"
            dept = db.query(Department).filter(func.lower(Department.name) == dept_name.lower()).first()
            if not dept:
                dept = db.query(Department).first()

            if dept and r.department_id != dept.id:
                r.department_id = dept.id
                r.department = dept.name
                changed = True

            vert_name = r.vertical or ("BESS" if r.report_type in ["battery", "cable", "grounding", "pcs"] else ("HV & Substation" if r.report_type in ["hv-dbr", "busbar-sizing", "transformer", "busbar"] else "PV"))
            vert = db.query(Vertical).filter(
                (func.lower(Vertical.name) == vert_name.lower()) &
                (Vertical.department_id == (dept.id if dept else None))
            ).first()
            if not vert and dept:
                vert = db.query(Vertical).filter(Vertical.department_id == dept.id).first()

            if vert and r.vertical_id != vert.id:
                r.vertical_id = vert.id
                r.vertical = vert.name
                changed = True

            template = db.query(MasterReportTemplate).filter(
                (MasterReportTemplate.department_id == (dept.id if dept else None)) &
                (MasterReportTemplate.vertical_id == (vert.id if vert else None))
            ).first()

            if template and r.template_id != template.id:
                r.template_id = template.id
                changed = True

        db.commit()
    except Exception as ex:
        db.rollback()
        print("⚠️ Report backfill notice:", ex)


def init_db():
    print("⏳ Initialising Forge database schema...")

    # ── Step 1: Detect and fix schema corruption ─────────────────────────────
    with engine.begin() as conn:
        if _schema_is_corrupt(conn):
            _rebuild_schema(conn)
        else:
            conn.execute(__import__('sqlalchemy').text(
                'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
            ))

    # ── Step 2: Create all tables (idempotent — skips existing ones) ─────────
    Base.metadata.create_all(bind=engine)

    # ── Step 3: Add any missing columns to pre-existing tables ───────────────
    column_patches = [
        # profiles
        ("profiles",  "vertical",                  "VARCHAR"),
        # reports
        ("reports",   "stage_id",                  "VARCHAR DEFAULT '10'"),
        ("reports",   "organization_id",           "UUID"),
        ("reports",   "department_id",             "UUID"),
        ("reports",   "vertical_id",               "UUID"),
        ("reports",   "template_id",               "UUID"),
        ("reports",   "parent_report_id",          "UUID"),
        ("reports",   "version_number",            "INTEGER DEFAULT 1"),
        ("reports",   "is_current_version",        "BOOLEAN DEFAULT TRUE"),
        ("reports",   "created_by_role",           "VARCHAR DEFAULT 'creator'"),
        ("reports",   "created_by_name",           "VARCHAR"),
        ("reports",   "assigned_reviewer",         "VARCHAR"),
        ("reports",   "assigned_reviewer_id",      "VARCHAR"),
        ("reports",   "assigned_creator",          "VARCHAR"),
        ("reports",   "assigned_creator_id",       "VARCHAR"),
        ("reports",   "provider_company",          "VARCHAR"),
        ("reports",   "department",                "VARCHAR"),
        ("reports",   "vertical",                  "VARCHAR"),
        ("reports",   "version_notes",             "VARCHAR"),
        ("reports",   "created_at",                "VARCHAR"),
        # clients
        ("clients",   "address",                   "VARCHAR"),
        ("clients",   "logo",                      "VARCHAR"),
        ("clients",   "created_by",                "VARCHAR"),
        ("clients",   "created_at",                "VARCHAR"),
        ("clients",   "modified_by",               "VARCHAR"),
        ("clients",   "modified_at",               "VARCHAR"),
        ("clients",   "primary_contact",           "VARCHAR"),
        ("clients",   "contact_email",             "VARCHAR"),
        ("clients",   "client_address",            "VARCHAR"),
        # projects
        ("projects",  "assigned_reviewer",         "VARCHAR"),
        ("projects",  "assigned_reviewer_id",      "VARCHAR"),
        ("projects",  "assigned_creator",          "VARCHAR"),
        ("projects",  "assigned_creator_id",       "VARCHAR"),
        ("projects",  "department",                "VARCHAR"),
        ("projects",  "vertical",                  "VARCHAR"),
        ("projects",  "status",                    "VARCHAR DEFAULT 'active'"),
        ("projects",  "description",               "VARCHAR"),
        ("projects",  "created_at",                "VARCHAR"),
        ("projects",  "site_name",                 "VARCHAR"),
        ("projects",  "latitude",                  "DOUBLE PRECISION"),
        ("projects",  "longitude",                 "DOUBLE PRECISION"),
        ("projects",  "consultant_epc",            "VARCHAR"),
        ("projects",  "ac_capacity_mw",            "DOUBLE PRECISION"),
        ("projects",  "dc_capacity_mw",            "DOUBLE PRECISION"),
        ("projects",  "poi_voltage_kv",            "DOUBLE PRECISION"),
        ("projects",  "mv_collection_voltage_kv",  "DOUBLE PRECISION"),
        ("projects",  "lv_collection_voltage_v",   "DOUBLE PRECISION"),
        ("projects",  "dc_voltage_v",              "DOUBLE PRECISION"),
        ("projects",  "total_area_acres",          "DOUBLE PRECISION"),
    ]

    from sqlalchemy import text as _text
    with engine.begin() as conn:
        for table, col, col_type in column_patches:
            try:
                conn.execute(_text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type};"
                ))
            except Exception:
                pass  # column already exists with correct type — safe to skip

    # ── Step 4: Seed master reference data ───────────────────────────────────
    db = SessionLocal()
    try:
        _seed_master_data(db)
    except Exception as e:
        db.rollback()
        print(f"⚠️  Seeding notice: {e}")
    finally:
        db.close()

    print("✅ Forge database ready.")
