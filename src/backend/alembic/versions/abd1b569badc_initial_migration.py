"""Initial migration

Revision ID: abd1b569badc
Revises: 
Create Date: 2026-08-10 19:19:37.011281

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'abd1b569badc'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    
    # 1. Departments
    op.create_table('departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 2. Verticals
    op.create_table('verticals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 3. Master Report Templates
    op.create_table('master_report_templates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('report_name', sa.String(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=False),
        sa.Column('vertical_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vertical_id'], ['verticals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Organizations
    op.create_table('organizations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. Profiles
    op.create_table('profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('vertical', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_profiles_email', 'profiles', ['email'], unique=True)
    
    # 6. Clients
    op.create_table('clients',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('logo', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.Column('modified_by', sa.String(), nullable=True),
        sa.Column('modified_at', sa.String(), nullable=True),
        sa.Column('primary_contact', sa.String(), nullable=True),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('client_address', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. Projects
    op.create_table('projects',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('client_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('county', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('country', sa.String(), nullable=True),
        sa.Column('assigned_reviewer', sa.String(), nullable=True),
        sa.Column('assigned_creator', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('vertical', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.Column('site_name', sa.String(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('consultant_epc', sa.String(), nullable=True),
        sa.Column('ac_capacity_mw', sa.Float(), nullable=True),
        sa.Column('dc_capacity_mw', sa.Float(), nullable=True),
        sa.Column('poi_voltage_kv', sa.Float(), nullable=True),
        sa.Column('mv_collection_voltage_kv', sa.Float(), nullable=True),
        sa.Column('lv_collection_voltage_v', sa.Float(), nullable=True),
        sa.Column('dc_voltage_v', sa.Float(), nullable=True),
        sa.Column('total_area_acres', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. Project Site Conditions
    op.create_table('project_site_conditions',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('altitude_ft', sa.Float(), nullable=True),
        sa.Column('wind_speed_mph', sa.Float(), nullable=True),
        sa.Column('snow_load_psf', sa.Float(), nullable=True),
        sa.Column('snow_depth_in', sa.Float(), nullable=True),
        sa.Column('risk_category', sa.String(), nullable=True),
        sa.Column('temp_min_c', sa.Float(), nullable=True),
        sa.Column('temp_max_c', sa.Float(), nullable=True),
        sa.Column('design_temp_f', sa.Float(), nullable=True),
        sa.Column('utility_name', sa.String(), nullable=True),
        sa.Column('fence_area_acres', sa.Float(), nullable=True),
        sa.Column('road_width_ft', sa.Float(), nullable=True),
        sa.Column('fence_clearance_ft', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('project_id')
    )

    # 9. Reports
    op.create_table('reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('department_id', sa.UUID(), nullable=True),
        sa.Column('vertical_id', sa.UUID(), nullable=True),
        sa.Column('template_id', sa.UUID(), nullable=True),
        sa.Column('report_type', sa.String(), nullable=False),
        sa.Column('document_no', sa.String(), nullable=True),
        sa.Column('revision', sa.String(), nullable=True),
        sa.Column('prepared_date', sa.String(), nullable=True),
        sa.Column('report_title', sa.String(), nullable=True),
        sa.Column('stage_id', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('parent_report_id', sa.UUID(), nullable=True),
        sa.Column('version_number', sa.Integer(), nullable=True),
        sa.Column('is_current_version', sa.Boolean(), nullable=True),
        sa.Column('created_by_role', sa.String(), nullable=True),
        sa.Column('created_by_name', sa.String(), nullable=True),
        sa.Column('assigned_reviewer', sa.String(), nullable=True),
        sa.Column('assigned_reviewer_id', sa.String(), nullable=True),
        sa.Column('assigned_creator', sa.String(), nullable=True),
        sa.Column('assigned_creator_id', sa.String(), nullable=True),
        sa.Column('provider_company', sa.String(), nullable=True),
        sa.Column('department', sa.String(), nullable=True),
        sa.Column('vertical', sa.String(), nullable=True),
        sa.Column('version_notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['vertical_id'], ['verticals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['template_id'], ['master_report_templates.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. Report Comments
    op.create_table('report_comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('report_id', sa.UUID(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.String(), nullable=False),
        sa.Column('author_name', sa.String(), nullable=False),
        sa.Column('author_role', sa.String(), nullable=False),
        sa.Column('section_key', sa.String(), nullable=False),
        sa.Column('field_key', sa.String(), nullable=True),
        sa.Column('comment_text', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 11. Child Reports
    child_report_definitions = [
        ('pv_reports', [
            sa.Column('module_manufacturer', sa.String(), nullable=True),
            sa.Column('module_model', sa.String(), nullable=True),
            sa.Column('module_type', sa.String(), nullable=True),
            sa.Column('module_pmax', sa.Float(), nullable=True),
            sa.Column('module_voc', sa.Float(), nullable=True),
            sa.Column('module_vmp', sa.Float(), nullable=True),
            sa.Column('module_isc', sa.Float(), nullable=True),
            sa.Column('module_imp', sa.Float(), nullable=True),
            sa.Column('module_length_mm', sa.Float(), nullable=True),
            sa.Column('module_width_mm', sa.Float(), nullable=True),
            sa.Column('module_height_mm', sa.Float(), nullable=True),
            sa.Column('temp_coeff_voc_percent', sa.Float(), nullable=True),
            sa.Column('temp_coeff_pm_percent', sa.Float(), nullable=True),
            sa.Column('temp_coeff_isc_percent', sa.Float(), nullable=True),
            sa.Column('dc_ac_ratio_poi', sa.Float(), nullable=True),
            sa.Column('dc_ac_ratio_inv', sa.Float(), nullable=True),
            sa.Column('electrical_characteristics', sa.JSON(), nullable=True),
            sa.Column('mechanical_characteristics', sa.JSON(), nullable=True),
            sa.Column('temperature_coefficients', sa.JSON(), nullable=True),
            sa.Column('string_sizing', sa.JSON(), nullable=True),
            sa.Column('pvsyst_results', sa.JSON(), nullable=True),
            sa.Column('irradiation_data', sa.JSON(), nullable=True),
            sa.Column('energy_yield', sa.JSON(), nullable=True),
            sa.Column('loss_analysis', sa.JSON(), nullable=True),
            sa.Column('voc_calculations', sa.JSON(), nullable=True),
            sa.Column('isc_calculations', sa.JSON(), nullable=True),
            sa.Column('degradation_tables', sa.JSON(), nullable=True),
            sa.Column('site_conditions', sa.JSON(), nullable=True),
        ]),
        ('battery_reports', [
            sa.Column('battery_manufacturer', sa.String(), nullable=True),
            sa.Column('battery_model', sa.String(), nullable=True),
            sa.Column('cell_chemistry', sa.String(), nullable=True),
            sa.Column('battery_min_voltage', sa.Float(), nullable=True),
            sa.Column('battery_max_voltage', sa.Float(), nullable=True),
            sa.Column('battery_rated_voltage', sa.Float(), nullable=True),
            sa.Column('battery_rated_current', sa.Float(), nullable=True),
            sa.Column('bess_dimension', sa.String(), nullable=True),
            sa.Column('bess_energy_per_enclosure_kwh', sa.Float(), nullable=True),
            sa.Column('no_of_enclosures', sa.Integer(), nullable=True),
            sa.Column('cooling_method', sa.String(), nullable=True),
            sa.Column('bess_design_life_years', sa.Integer(), nullable=True),
            sa.Column('battery_charge_rate', sa.Float(), nullable=True),
            sa.Column('battery_discharge_rate', sa.Float(), nullable=True),
            sa.Column('battery_max_power_mw', sa.Float(), nullable=True),
            sa.Column('charge_characteristics', sa.JSON(), nullable=True),
            sa.Column('discharge_characteristics', sa.JSON(), nullable=True),
            sa.Column('thermal_limits', sa.JSON(), nullable=True),
            sa.Column('protection_settings', sa.JSON(), nullable=True),
            sa.Column('cycle_life', sa.JSON(), nullable=True),
            sa.Column('operating_conditions', sa.JSON(), nullable=True),
        ]),
        ('pcs_reports', [
            sa.Column('pcs_manufacturer', sa.String(), nullable=True),
            sa.Column('pcs_model', sa.String(), nullable=True),
            sa.Column('voltage_limits', sa.JSON(), nullable=True),
            sa.Column('current_limits', sa.JSON(), nullable=True),
            sa.Column('mppt_details', sa.JSON(), nullable=True),
            sa.Column('ac_specifications', sa.JSON(), nullable=True),
            sa.Column('dc_specifications', sa.JSON(), nullable=True),
            sa.Column('efficiency_curves', sa.JSON(), nullable=True),
            sa.Column('communication_interfaces', sa.JSON(), nullable=True),
            sa.Column('protection_features', sa.JSON(), nullable=True),
        ]),
        ('inverter_reports', [
            sa.Column('inverter_manufacturer', sa.String(), nullable=True),
            sa.Column('inverter_model', sa.String(), nullable=True),
            sa.Column('voltage_limits', sa.JSON(), nullable=True),
            sa.Column('current_limits', sa.JSON(), nullable=True),
            sa.Column('mppt_details', sa.JSON(), nullable=True),
            sa.Column('ac_specifications', sa.JSON(), nullable=True),
            sa.Column('dc_specifications', sa.JSON(), nullable=True),
            sa.Column('efficiency_curves', sa.JSON(), nullable=True),
        ]),
        ('transformer_reports', [
            sa.Column('transformer_manufacturer', sa.String(), nullable=True),
            sa.Column('transformer_model', sa.String(), nullable=True),
            sa.Column('capacity_kva', sa.Float(), nullable=True),
            sa.Column('voltage_ratio', sa.String(), nullable=True),
            sa.Column('impedance_percent', sa.Float(), nullable=True),
            sa.Column('cooling_class', sa.String(), nullable=True),
            sa.Column('losses_no_load_w', sa.Float(), nullable=True),
            sa.Column('losses_load_w', sa.Float(), nullable=True),
        ]),
        ('switchgear_reports', [
            sa.Column('switchgear_manufacturer', sa.String(), nullable=True),
            sa.Column('switchgear_model', sa.String(), nullable=True),
            sa.Column('rated_voltage_kv', sa.Float(), nullable=True),
            sa.Column('rated_current_a', sa.Float(), nullable=True),
            sa.Column('short_circuit_withstand_ka', sa.Float(), nullable=True),
            sa.Column('busbar_material', sa.String(), nullable=True),
            sa.Column('ip_rating', sa.String(), nullable=True),
        ]),
        ('cable_reports', [
            sa.Column('conductor_material', sa.String(), nullable=True),
            sa.Column('insulation_type', sa.String(), nullable=True),
            sa.Column('voltage_rating', sa.String(), nullable=True),
            sa.Column('cable_size', sa.String(), nullable=True),
            sa.Column('no_of_runs', sa.Integer(), nullable=True),
            sa.Column('installation_method', sa.String(), nullable=True),
            sa.Column('soil_thermal_resistivity', sa.Float(), nullable=True),
            sa.Column('soil_temperature', sa.Float(), nullable=True),
            sa.Column('load_factor', sa.Float(), nullable=True),
            sa.Column('derated_ampacity', sa.Float(), nullable=True),
        ]),
        ('relay_protection_reports', [
            sa.Column('relay_manufacturer', sa.String(), nullable=True),
            sa.Column('relay_model', sa.String(), nullable=True),
            sa.Column('ansi_codes', sa.String(), nullable=True),
            sa.Column('ct_ratio', sa.String(), nullable=True),
            sa.Column('pt_ratio', sa.String(), nullable=True),
            sa.Column('pickup_settings', sa.JSON(), nullable=True),
            sa.Column('delay_settings', sa.JSON(), nullable=True),
        ]),
        ('electrical_design_reports', [
            sa.Column('system_frequency_hz', sa.Float(), nullable=True),
            sa.Column('short_circuit_level_ka', sa.Float(), nullable=True),
            sa.Column('max_voltage_drop_percent', sa.Float(), nullable=True),
            sa.Column('grounding_system_type', sa.String(), nullable=True),
            sa.Column('design_standards', sa.JSON(), nullable=True),
            sa.Column('key_design_parameters', sa.JSON(), nullable=True),
        ]),
        ('structural_reports', [
            sa.Column('wind_load_mph', sa.Float(), nullable=True),
            sa.Column('snow_load_psf', sa.Float(), nullable=True),
            sa.Column('seismic_design_category', sa.String(), nullable=True),
            sa.Column('foundation_type', sa.String(), nullable=True),
            sa.Column('soil_bearing_capacity', sa.String(), nullable=True),
            sa.Column('structural_steel_grade', sa.String(), nullable=True),
            sa.Column('concrete_strength_psi', sa.Float(), nullable=True),
        ]),
        ('grounding_reports', [
            sa.Column('grounding_software', sa.String(), nullable=True),
            sa.Column('ground_conductor_bess', sa.String(), nullable=True),
            sa.Column('ground_conductor_pcs', sa.String(), nullable=True),
            sa.Column('ground_conductor_aux', sa.String(), nullable=True),
            sa.Column('ground_conductor_misc', sa.String(), nullable=True),
            sa.Column('grounding_layout_drawing_no', sa.String(), nullable=True),
            sa.Column('grounding_analysis_report_no', sa.String(), nullable=True),
            sa.Column('safety_body_weight_kg', sa.Float(), nullable=True),
            sa.Column('safety_shock_duration_sec', sa.Float(), nullable=True),
            sa.Column('soil_resistivity_model', sa.JSON(), nullable=True),
        ])
    ]

    for table_name, cols in child_report_definitions:
        op.create_table(table_name,
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('report_id', sa.UUID(), nullable=False),
            *cols,
            sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('report_id')
        )

def downgrade() -> None:
    pass
