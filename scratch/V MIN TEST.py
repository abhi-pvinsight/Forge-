def voc_cold(voc_stc: float, temp_coefficient: float, t_cold: float) -> float:
    """
    Calculate the cold-temperature adjusted open-circuit voltage (Voc)
    for PV string sizing (max modules/string check).

    Formula:
        Voc_cold = Voc_stc * (1 + (temp_coefficient / 100) * (T_cold - 25))

    Args:
        voc_stc: Module Voc at Standard Test Conditions (25°C), in volts.
                 From datasheet.
        temp_coefficient: Temperature coefficient of Voc, in %/°C.
                 Should be a negative number (e.g. -0.27 for -0.27%/°C),
                 since Voc rises as temperature drops below 25°C.
        t_cold: Minimum expected site temperature, in °C
                 (e.g. record low ambient or ASHRAE extreme min).

    Returns:
        Voc adjusted for cold temperature, in volts.

    Example:
        >>> voc_cold(48.93, -0.27, -10)
        52.5308...
    """
    return voc_stc * (1 + (temp_coefficient / 100) * (t_cold - 25))


if __name__ == "__main__":
    print("Voc Cold Temperature Calculator")
    print("-" * 35)

    voc_stc = float(input("Enter Voc at STC (V), from datasheet: "))
    temp_coefficient = float(
        input("Enter Voc temperature coefficient (%/°C, negative value, e.g. -0.27): ")
    )
    t_cold = float(input("Enter minimum site design temperature (°C): "))

    result = voc_cold(voc_stc, temp_coefficient, t_cold)
    print(f"\nVoc_cold = {result:.3f} V")

    inverter_max_v = input(
        "\nOptional: enter inverter max DC input voltage (V) to get max modules/string, "
        "or press Enter to skip: "
    ).strip()
    if inverter_max_v:
        max_modules = int(float(inverter_max_v) // result)
        print(f"Max modules per string = {max_modules}")