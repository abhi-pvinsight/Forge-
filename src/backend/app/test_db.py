# test_db.py
from database import init_db, SessionLocal, PVModule, PVVariant, engine, Base

def verify_comprehensive_schema():
    print("🧹 Dropping old outdated tables...")
    Base.metadata.drop_all(bind=engine) # This clears out the old table structures
    
    # Now create the fresh ones with all columns
    init_db()
    
    db = SessionLocal()
    
    try:
        test_model = "JKM550-72HL4-BDV-MAX"
        existing = db.query(PVModule).filter(PVModule.module_model == test_model).first()
        if existing:
            db.delete(existing)
            db.commit()

        # 1. Store everything inside the Master Parent Model row
        parent = PVModule(
            manufacturer="JINKO SOLAR",
            module_model=test_model,
            bifacial_coefficient="70±5%",
            noct="45±2℃",
            series_fuse_rating="30A",
            operating_temperature_range="-40℃~+85℃",
            dimensions_mm="2278×1134×30mm",
            weight_kg="32.0kg",
            cells_count="144 (6×24)",
            cell_type="N-type Mono-crystalline",
            front_glass="2.0mm High Transmission, Anti-Reflection",
            back_glass="2.0mm Heat Strengthened Glass",
            output_cable="4.0mm2, Custom Lengths",
            connector="MC4-EVO2 Compatible",
            junction_box="IP68 rated",
            
            # Complex JSON blocks matching your exact structural requirements
            temperature_coefficients={
                "isc_alpha": "+0.045%/℃",
                "voc_beta": "-0.25%/℃",
                "pm_gamma": "-0.29%/℃"
            },
            load_rating={
                "wind": "2400Pa",
                "snow": "5400Pa"
            },
            degradation={
                "first_year": "1.0%",
                "yearly": "0.4%",
                "year_30": "87.4%"
            },
            warranty={
                "product": "12 Years",
                "performance": "30 Years Linear Warranty"
            }
        )
        db.add(parent)
        db.commit()
        db.refresh(parent)

        # 2. Assign the structural electrical matrix items
        variant_550 = PVVariant(
            module_id=parent.id, pmax="550", pstc="550", voc="49.86", vmp="41.51", isc="14.01", imp="13.25", efficiency="21.29"
        )
        variant_555 = PVVariant(
            module_id=parent.id, pmax="555", pstc="555", voc="50.01", vmp="41.64", isc="14.07", imp="13.33", efficiency="21.48"
        )
        db.add(variant_550)
        db.add(variant_555)
        db.commit()

        print("\n🎉 PostgreSQL Verification Check Completed Successfully!")
        print("-" * 75)
        
        # 3. Quick confirmation readback printout
        record = db.query(PVModule).filter(PVModule.module_model == test_model).first()
        print(f"MODULE MAKE:  {record.manufacturer}")
        print(f"MODULE MODEL: {record.module_model}")
        print(f"DIMENSIONS:   {record.dimensions_mm} | CELL COUNT: {record.cells_count}")
        print(f"TEMP COEFFS:  {record.temperature_coefficients}")
        print(f"DEGRADATION:  {record.degradation}")
        print("-" * 75)
        for idx, variant in enumerate(record.variants, start=1):
            print(f"  Variant Column {idx} -> Pmax: {variant.pmax}W | Efficiency: {variant.efficiency}% | Voc: {variant.voc}V")
        print("-" * 75)

    except Exception as e:
        db.rollback()
        print(f"❌ Structural database layout mismatch failure: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_comprehensive_schema()