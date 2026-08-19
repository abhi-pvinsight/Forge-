-- ============================================================
-- fix_schema.sql
-- Run this ONCE in PGAdmin / DBeaver / psql to permanently
-- repair the Forge database schema.
-- Safe to run: uses DROP SCHEMA CASCADE then recreates cleanly.
-- ============================================================

-- 1. Wipe everything and start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── MASTER LOOKUP TABLES ────────────────────────────────────

CREATE TABLE departments (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL
);

CREATE TABLE verticals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE master_report_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name   VARCHAR NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    vertical_id   UUID NOT NULL REFERENCES verticals(id)  ON DELETE CASCADE
);

-- ── CORE USER / ORG TABLES ──────────────────────────────────

CREATE TABLE organizations (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL
);

CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role            VARCHAR DEFAULT 'member',
    full_name       VARCHAR,
    department      VARCHAR,
    vertical        VARCHAR,
    email           VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL
);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_org   ON profiles(organization_id);

-- ── CLIENT / PROJECT TABLES ─────────────────────────────────

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR NOT NULL,
    address         VARCHAR,
    logo            VARCHAR,
    created_by      VARCHAR,
    created_at      VARCHAR,
    modified_by     VARCHAR,
    modified_at     VARCHAR,
    primary_contact VARCHAR,
    contact_email   VARCHAR,
    client_address  VARCHAR
);

CREATE TABLE projects (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    organization_id         UUID REFERENCES organizations(id)    ON DELETE CASCADE,
    name                    VARCHAR NOT NULL,
    county                  VARCHAR,
    state                   VARCHAR,
    country                 VARCHAR DEFAULT 'USA',
    assigned_reviewer       VARCHAR,
    assigned_reviewer_id    VARCHAR,   -- profile.id as string for easy lookup
    assigned_creator        VARCHAR,
    assigned_creator_id     VARCHAR,   -- profile.id as string for easy lookup
    department              VARCHAR,
    vertical                VARCHAR,
    status                  VARCHAR DEFAULT 'active',
    description             VARCHAR,
    created_at              VARCHAR,
    site_name               VARCHAR,
    latitude                DOUBLE PRECISION,
    longitude               DOUBLE PRECISION,
    consultant_epc          VARCHAR,
    ac_capacity_mw          DOUBLE PRECISION,
    dc_capacity_mw          DOUBLE PRECISION,
    poi_voltage_kv          DOUBLE PRECISION,
    mv_collection_voltage_kv DOUBLE PRECISION,
    lv_collection_voltage_v  DOUBLE PRECISION,
    dc_voltage_v            DOUBLE PRECISION,
    total_area_acres        DOUBLE PRECISION
);
CREATE INDEX idx_projects_name             ON projects(name);
CREATE INDEX idx_projects_assigned_creator ON projects(assigned_creator_id);

CREATE TABLE project_site_conditions (
    project_id          UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    altitude_ft         DOUBLE PRECISION,
    wind_speed_mph      DOUBLE PRECISION,
    snow_load_psf       DOUBLE PRECISION,
    snow_depth_in       DOUBLE PRECISION,
    risk_category       VARCHAR,
    temp_min_c          DOUBLE PRECISION,
    temp_max_c          DOUBLE PRECISION,
    design_temp_f       DOUBLE PRECISION,
    utility_name        VARCHAR,
    fence_area_acres    DOUBLE PRECISION,
    road_width_ft       DOUBLE PRECISION,
    fence_clearance_ft  DOUBLE PRECISION
);

-- ── REPORT TABLES ───────────────────────────────────────────

CREATE TABLE reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id)             ON DELETE CASCADE,
    organization_id     UUID           REFERENCES organizations(id)       ON DELETE CASCADE,
    department_id       UUID           REFERENCES departments(id)         ON DELETE SET NULL,
    vertical_id         UUID           REFERENCES verticals(id)           ON DELETE SET NULL,
    template_id         UUID           REFERENCES master_report_templates(id) ON DELETE SET NULL,
    report_type         VARCHAR NOT NULL,
    document_no         VARCHAR,
    revision            VARCHAR,
    prepared_date       VARCHAR,
    report_title        VARCHAR,
    stage_id            VARCHAR DEFAULT '10',
    status              VARCHAR DEFAULT 'draft',
    metadata_json       JSONB,
    parent_report_id    UUID REFERENCES reports(id) ON DELETE CASCADE,
    version_number      INTEGER DEFAULT 1,
    is_current_version  BOOLEAN DEFAULT TRUE,
    created_by_role     VARCHAR DEFAULT 'creator',
    created_by_name     VARCHAR,
    assigned_reviewer   VARCHAR,
    assigned_reviewer_id VARCHAR,
    assigned_creator    VARCHAR,
    assigned_creator_id VARCHAR,
    provider_company    VARCHAR,
    department          VARCHAR,
    vertical            VARCHAR,
    version_notes       VARCHAR,
    created_at          VARCHAR
);
CREATE INDEX idx_reports_project     ON reports(project_id);
CREATE INDEX idx_reports_type        ON reports(report_type);
CREATE INDEX idx_reports_current     ON reports(is_current_version);

CREATE TABLE report_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    author_id       VARCHAR NOT NULL,
    author_name     VARCHAR NOT NULL,
    author_role     VARCHAR NOT NULL,
    section_key     VARCHAR NOT NULL,
    field_key       VARCHAR,
    comment_text    VARCHAR NOT NULL,
    status          VARCHAR NOT NULL DEFAULT 'open',
    created_at      VARCHAR
);

-- ── CHILD REPORT TABLES ─────────────────────────────────────

CREATE TABLE pv_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id               UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    module_manufacturer     VARCHAR,
    module_model            VARCHAR,
    module_type             VARCHAR,
    module_pmax             DOUBLE PRECISION,
    module_voc              DOUBLE PRECISION,
    module_vmp              DOUBLE PRECISION,
    module_isc              DOUBLE PRECISION,
    module_imp              DOUBLE PRECISION,
    module_length_mm        DOUBLE PRECISION,
    module_width_mm         DOUBLE PRECISION,
    module_height_mm        DOUBLE PRECISION,
    temp_coeff_voc_percent  DOUBLE PRECISION,
    temp_coeff_pm_percent   DOUBLE PRECISION,
    temp_coeff_isc_percent  DOUBLE PRECISION,
    dc_ac_ratio_poi         DOUBLE PRECISION,
    dc_ac_ratio_inv         DOUBLE PRECISION,
    electrical_characteristics  JSONB,
    mechanical_characteristics  JSONB,
    temperature_coefficients    JSONB,
    string_sizing               JSONB,
    pvsyst_results              JSONB,
    irradiation_data            JSONB,
    energy_yield                JSONB,
    loss_analysis               JSONB,
    voc_calculations            JSONB,
    isc_calculations            JSONB,
    degradation_tables          JSONB,
    site_conditions             JSONB
);

CREATE TABLE battery_reports (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id                   UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    battery_manufacturer        VARCHAR,
    battery_model               VARCHAR,
    cell_chemistry              VARCHAR,
    battery_min_voltage         DOUBLE PRECISION,
    battery_max_voltage         DOUBLE PRECISION,
    battery_rated_voltage       DOUBLE PRECISION,
    battery_rated_current       DOUBLE PRECISION,
    bess_dimension              VARCHAR,
    bess_energy_per_enclosure_kwh DOUBLE PRECISION,
    no_of_enclosures            INTEGER,
    cooling_method              VARCHAR,
    bess_design_life_years      INTEGER,
    battery_charge_rate         DOUBLE PRECISION,
    battery_discharge_rate      DOUBLE PRECISION,
    battery_max_power_mw        DOUBLE PRECISION,
    charge_characteristics      JSONB,
    discharge_characteristics   JSONB,
    thermal_limits              JSONB,
    protection_settings         JSONB,
    cycle_life                  JSONB,
    operating_conditions        JSONB
);

CREATE TABLE pcs_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id               UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    pcs_manufacturer        VARCHAR,
    pcs_model               VARCHAR,
    voltage_limits          JSONB,
    current_limits          JSONB,
    mppt_details            JSONB,
    ac_specifications       JSONB,
    dc_specifications       JSONB,
    efficiency_curves       JSONB,
    communication_interfaces JSONB,
    protection_features     JSONB
);

CREATE TABLE inverter_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id           UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    inverter_manufacturer VARCHAR,
    inverter_model      VARCHAR,
    voltage_limits      JSONB,
    current_limits      JSONB,
    mppt_details        JSONB,
    ac_specifications   JSONB,
    dc_specifications   JSONB,
    efficiency_curves   JSONB
);

CREATE TABLE transformer_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id               UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    transformer_manufacturer VARCHAR,
    transformer_model       VARCHAR,
    capacity_kva            DOUBLE PRECISION,
    voltage_ratio           VARCHAR,
    impedance_percent       DOUBLE PRECISION,
    cooling_class           VARCHAR,
    losses_no_load_w        DOUBLE PRECISION,
    losses_load_w           DOUBLE PRECISION
);

CREATE TABLE switchgear_reports (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id                   UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    switchgear_manufacturer     VARCHAR,
    switchgear_model            VARCHAR,
    rated_voltage_kv            DOUBLE PRECISION,
    rated_current_a             DOUBLE PRECISION,
    short_circuit_withstand_ka  DOUBLE PRECISION,
    busbar_material             VARCHAR,
    ip_rating                   VARCHAR
);

CREATE TABLE cable_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id               UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    conductor_material      VARCHAR,
    insulation_type         VARCHAR,
    voltage_rating          VARCHAR,
    cable_size              VARCHAR,
    no_of_runs              INTEGER,
    installation_method     VARCHAR,
    soil_thermal_resistivity DOUBLE PRECISION,
    soil_temperature        DOUBLE PRECISION,
    load_factor             DOUBLE PRECISION,
    derated_ampacity        DOUBLE PRECISION
);

CREATE TABLE relay_protection_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id           UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    relay_manufacturer  VARCHAR,
    relay_model         VARCHAR,
    ansi_codes          VARCHAR,
    ct_ratio            VARCHAR,
    pt_ratio            VARCHAR,
    pickup_settings     JSONB,
    delay_settings      JSONB
);

CREATE TABLE electrical_design_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id               UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    system_frequency_hz     DOUBLE PRECISION,
    short_circuit_level_ka  DOUBLE PRECISION,
    max_voltage_drop_percent DOUBLE PRECISION,
    grounding_system_type   VARCHAR,
    design_standards        JSONB,
    key_design_parameters   JSONB
);

CREATE TABLE structural_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id               UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    wind_load_mph           DOUBLE PRECISION,
    snow_load_psf           DOUBLE PRECISION,
    seismic_design_category VARCHAR,
    foundation_type         VARCHAR,
    soil_bearing_capacity   VARCHAR,
    structural_steel_grade  VARCHAR,
    concrete_strength_psi   DOUBLE PRECISION
);

CREATE TABLE grounding_reports (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id                       UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    grounding_software              VARCHAR,
    ground_conductor_bess           VARCHAR,
    ground_conductor_pcs            VARCHAR,
    ground_conductor_aux            VARCHAR,
    ground_conductor_misc           VARCHAR,
    grounding_layout_drawing_no     VARCHAR,
    grounding_analysis_report_no    VARCHAR,
    safety_body_weight_kg           DOUBLE PRECISION,
    safety_shock_duration_sec       DOUBLE PRECISION,
    soil_resistivity_model          JSONB
);

-- ── EQUIPMENT CATALOG TABLES ────────────────────────────────

CREATE TABLE equipment_pcs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer            VARCHAR NOT NULL,
    model                   VARCHAR NOT NULL,
    rating_kva              DOUBLE PRECISION,
    ac_voltage_v            DOUBLE PRECISION,
    dc_voltage_range        VARCHAR,
    frequency_hz            DOUBLE PRECISION,
    efficiency_percent      DOUBLE PRECISION,
    thd_percent             DOUBLE PRECISION,
    protection_rating       VARCHAR,
    cooling_method          VARCHAR,
    communication_interfaces VARCHAR,
    dimensions              VARCHAR,
    certifications          VARCHAR
);

CREATE TABLE equipment_transformers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer        VARCHAR NOT NULL,
    model               VARCHAR NOT NULL,
    rating_kva          DOUBLE PRECISION,
    voltage_ratio       VARCHAR,
    winding_config      VARCHAR,
    vector_group        VARCHAR,
    impedance_percent   DOUBLE PRECISION,
    efficiency_percent  DOUBLE PRECISION,
    winding_material    VARCHAR,
    cooling_class       VARCHAR
);

CREATE TABLE equipment_cables (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cable_class         VARCHAR,
    conductor_material  VARCHAR,
    insulation_type     VARCHAR,
    voltage_rating_v    DOUBLE PRECISION,
    cable_size          VARCHAR,
    temp_rating_c       DOUBLE PRECISION,
    certifications      VARCHAR
);

CREATE TABLE pv_modules (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer                VARCHAR,
    module_model                VARCHAR UNIQUE,
    bifacial_coefficient        VARCHAR,
    temperature_coefficients    JSONB,
    noct                        VARCHAR,
    series_fuse_rating          VARCHAR,
    operating_temperature_range VARCHAR,
    dimensions_mm               VARCHAR,
    weight_kg                   VARCHAR,
    cells_count                 VARCHAR,
    cell_type                   VARCHAR,
    front_glass                 VARCHAR,
    back_glass                  VARCHAR,
    output_cable                VARCHAR,
    connector                   VARCHAR,
    junction_box                VARCHAR,
    load_rating                 JSONB,
    degradation                 JSONB,
    warranty                    JSONB
);

CREATE TABLE pv_variants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID REFERENCES pv_modules(id) ON DELETE CASCADE,
    pmax        VARCHAR,
    pstc        VARCHAR,
    voc         VARCHAR,
    vmp         VARCHAR,
    isc         VARCHAR,
    imp         VARCHAR,
    efficiency  VARCHAR
);

-- ── SEED INITIAL MASTER DATA ────────────────────────────────

INSERT INTO departments (id, name) VALUES
    (gen_random_uuid(), 'Electrical Engineering'),
    (gen_random_uuid(), 'Civil Engineering'),
    (gen_random_uuid(), 'Structural Engineering'),
    (gen_random_uuid(), 'Mechanical Engineering');

INSERT INTO verticals (id, name, department_id)
SELECT gen_random_uuid(), v.name, d.id
FROM (VALUES ('PV'), ('BESS'), ('Grounding')) AS v(name)
CROSS JOIN departments d
WHERE d.name = 'Electrical Engineering';

INSERT INTO master_report_templates (id, report_name, department_id, vertical_id)
SELECT gen_random_uuid(), t.name, d.id, v.id
FROM (VALUES
    ('PV String Sizing',                          'PV'),
    ('Battery Energy Storage System (BESS) Design','BESS'),
    ('Grounding Grid Design',                      'Grounding')
) AS t(name, vert_name)
JOIN verticals  v ON v.name = t.vert_name
JOIN departments d ON d.id   = v.department_id;

-- Default organization
INSERT INTO organizations (id, name) VALUES (gen_random_uuid(), 'PV-Insight');

-- ── DONE ────────────────────────────────────────────────────
-- After running this script:
-- 1. Restart the FastAPI backend (run.bat)
-- 2. Sign up as admin first (e.g. Abhay), then sign up as member (Yash)
-- 3. Abhay can assign projects; Yash sees only his projects
