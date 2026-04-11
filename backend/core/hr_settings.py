"""Konggest — Gabonese HR Regularions (2026)"""

# ─── Social Security (CNSS) ───
CNSS_EMPLOYEE_RATE = 0.05  # 5%
CNSS_EMPLOYER_RATE = 0.18  # 18%
CNSS_CEILING = 1500000.0  # 1.5M FCFA ceiling

# ─── Health Insurance (CNAMGS) ───
CNAMGS_EMPLOYEE_RATE = 0.01  # 1%
CNAMGS_EMPLOYER_RATE = 0.02  # 2%

# ─── Taxes ───
TCS_RATE = 0.05  # 5%
TCS_EXEMPT_BASE = 150000.0  # First 150k exempt

# ─── IRPP (Progressive Scale - Annual Bases) ───
# Note: Simplified for monthly calculation.
PROFESSIONAL_EXPENSES_RATE = 0.20  # 20% deduction

def calculate_irpp_monthly(taxable_income, parts):
    """
    Simplified Gabonese IRPP monthly calculation.
    taxable_income: Income after CNSS, CNAMGS, TCS and 20% deduction.
    parts: Quotient familial (e.g., 1.0, 1.5, 2.0).
    """
    # Annualize
    annual_taxable = taxable_income * 12
    # Divide by parts
    vnt = annual_taxable / float(parts)
    
    # Scale (Approximate 2026 Gabonese Scale)
    if vnt <= 1500000:
        tax = 0
    elif vnt <= 2500000:
        tax = (vnt - 1500000) * 0.05
    elif vnt <= 3500000:
        tax = 50000 + (vnt - 2500000) * 0.10
    elif vnt <= 6500000:
        tax = 150000 + (vnt - 3500000) * 0.15
    elif vnt <= 11000000:
        tax = 600000 + (vnt - 6500000) * 0.20
    else:
        tax = 1500000 + (vnt - 11000000) * 0.30

    # Total annual tax
    total_annual_tax = tax * float(parts)
    # Monthly
    return round(total_annual_tax / 12, 2)

# ─── Leaves ───
BASE_LEAVE_DAYS_PER_MONTH = 2.0  # 24 days/year

def calculate_seniority_leave_bonus(seniority_years):
    """Gabonese Labor Code seniority leave bonus."""
    if seniority_years >= 25: return 6
    if seniority_years >= 20: return 5
    if seniority_years >= 15: return 3
    if seniority_years >= 10: return 2
    if seniority_years >= 5: return 1
    return 0


# ─── Time Tracking / Attendance (AT14) ───

# Heure de début de travail standard (HH:MM — détection retard)
WORK_START_HOUR = '09:00'

# Durée journée standard en heures (base calcul heures supplémentaires)
STANDARD_DAILY_HOURS = 8

# Délai de tolérance retard en minutes avant génération d'alerte anomalie
LATE_THRESHOLD_MINUTES = 15

# AT15 : Rétention logs time_entries avant archivage/suppression (en jours)
# 14 mois = conformité Code du Travail gabonais (conservation 1 an minimum)
TIME_ENTRY_RETENTION_DAYS = 14 * 30  # ~420 jours

# AT3 : Rétention des sessions QR quotidiennes avant nettoyage
QR_SESSION_RETENTION_DAYS = 14
