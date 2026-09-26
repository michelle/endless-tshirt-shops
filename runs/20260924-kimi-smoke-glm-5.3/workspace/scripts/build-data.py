#!/usr/bin/env python3
"""Build compact embedded datasets for Skyborn from public open data.

Inputs (download to /tmp/skyborn-data):
  - hygdata_v41.csv      HYG star database (astronexus/HYG-Database)
  - constellations.lines.json  d3-celestial constellation lines (ofrohn/d3-celestial, BSD)
  - cities15000.txt      GeoNames cities15000 (CC BY 4.0)

Outputs (src/lib/data/):
  - stars.json           [ra, dec, mag, ci] rows, mag <= 5.0, plus a names index
  - constellations.json  line segments per constellation + display names
  - cities.json          [name, country, lat, lng, timezone] sorted by population

License notes: HYG is derived from Hipparcos/ESA data (astronexus publishes it
under CC BY-SA 4.0 / MIT for code); d3-celestial data is BSD-licensed;
GeoNames requires attribution — the storefront footer credits all three.
"""
import csv, json, os

DATA = "/tmp/skyborn-data"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "data")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- stars
stars, names = [], {}
with open(f"{DATA}/hygdata_v41.csv") as fh:
    for row in csv.DictReader(fh):
        try:
            ra, dec, mag, ci = float(row["ra"]), float(row["dec"]), float(row["mag"]), float(row["ci"] or 0)
        except ValueError:
            continue
        if not (-2.0 < mag <= 5.0):
            continue
        idx = len(stars)
        stars.append([round(ra, 4), round(dec, 4), round(mag, 2), round(ci, 2)])
        proper = (row.get("proper") or "").strip()
        if proper and proper != "Sol":
            names[idx] = proper
order = sorted(range(len(stars)), key=lambda i: stars[i][2])  # brightest first
rank = {old: new for new, old in enumerate(order)}
stars = [stars[old] for old in order]
names = {rank[old]: n for old, n in names.items() if old in rank}
json.dump({"stars": stars, "names": names}, open(f"{OUT}/stars.json", "w"), separators=(",", ":"))
print("stars.json:", len(stars), "stars,", len(names), "named")

# ------------------------------------------------------- constellations
src = json.load(open(f"{DATA}/constellations.lines.json"))
DISPLAY = {
    "And": "Andromeda", "Aql": "Aquila", "Aqr": "Aquarius", "Aur": "Auriga",
    "Boo": "Bootes", "CMa": "Canis Major", "CMi": "Canis Minor", "CVn": "Canes Venatici",
    "Cnc": "Cancer", "Cap": "Capricornus", "Car": "Carina", "Cas": "Cassiopeia",
    "Cen": "Centaurus", "Cep": "Cepheus", "Cet": "Cetus", "Cru": "Crux",
    "Crv": "Corvus", "Cyg": "Cygnus", "Dra": "Draco", "Gem": "Gemini",
    "Her": "Hercules", "Hyi": "Hydrus", "Leo": "Leo", "Lep": "Lepus",
    "Lib": "Libra", "Lyr": "Lyra", "Mon": "Monoceros", "Ori": "Orion",
    "Pav": "Pavo", "Peg": "Pegasus", "Per": "Perseus", "Psc": "Pisces",
    "Pup": "Puppis", "Sco": "Scorpius", "Scl": "Sculptor", "Ser": "Serpens",
    "Sge": "Sagitta", "Sgr": "Sagittarius", "Tau": "Taurus", "Tri": "Triangulum",
    "Tuc": "Tucana", "UMa": "Ursa Major", "UMi": "Ursa Minor", "Vel": "Vela",
    "Vir": "Virgo", "Vul": "Vulpecula",
}
cons = {}
for feat in src["features"]:
    cid = feat.get("id", "").strip()
    if not cid:
        continue
    lines = []
    for part in feat["geometry"]["coordinates"]:
        pts = [[round(float(lon), 4), round(float(lat), 4)] for lon, lat in part]
        if len(pts) >= 2:
            lines.append(pts)
    if lines:
        cons[cid] = lines
json.dump({"lines": cons, "names": DISPLAY}, open(f"{OUT}/constellations.json", "w"), separators=(",", ":"))
print("constellations.json:", len(cons), "constellations,", len(DISPLAY), "named")

# ------------------------------------------------------------- cities
COUNTRY = {
    "US": "United States", "GB": "United Kingdom", "CA": "Canada", "AU": "Australia",
    "NZ": "New Zealand", "IE": "Ireland", "DE": "Germany", "FR": "France", "ES": "Spain",
    "IT": "Italy", "PT": "Portugal", "NL": "Netherlands", "BE": "Belgium", "CH": "Switzerland",
    "AT": "Austria", "SE": "Sweden", "NO": "Norway", "DK": "Denmark", "FI": "Finland",
    "IS": "Iceland", "PL": "Poland", "CZ": "Czechia", "GR": "Greece", "TR": "Türkiye",
    "RU": "Russia", "UA": "Ukraine", "MX": "Mexico", "BR": "Brazil", "AR": "Argentina",
    "CL": "Chile", "CO": "Colombia", "PE": "Peru", "ZA": "South Africa", "NG": "Nigeria",
    "KE": "Kenya", "EG": "Egypt", "MA": "Morocco", "GH": "Ghana", "ET": "Ethiopia",
    "IN": "India", "PK": "Pakistan", "BD": "Bangladesh", "CN": "China", "JP": "Japan",
    "KR": "South Korea", "TW": "Taiwan", "HK": "Hong Kong", "SG": "Singapore",
    "MY": "Malaysia", "ID": "Indonesia", "TH": "Thailand", "VN": "Vietnam",
    "PH": "Philippines", "AE": "UAE", "SA": "Saudi Arabia", "IL": "Israel",
    "QA": "Qatar", "KW": "Kuwait", "IR": "Iran", "IQ": "Iraq", "LB": "Lebanon",
    "JO": "Jordan", "CU": "Cuba", "DO": "Dominican Republic",
    "JM": "Jamaica", "PA": "Panama", "CR": "Costa Rica", "GT": "Guatemala",
    "RS": "Serbia", "RO": "Romania", "BG": "Bulgaria", "HU": "Hungary", "HR": "Croatia",
    "SK": "Slovakia", "SI": "Slovenia", "LT": "Lithuania", "LV": "Latvia", "EE": "Estonia",
}
cities, seen = [], set()
with open(f"{DATA}/cities15000.txt") as fh:
    for line in fh:
        f = line.rstrip("\n").split("\t")
        if len(f) < 18:
            continue
        try:
            name, lat, lng = f[1], float(f[4]), float(f[5])
            cc, tz, pop = f[8], f[17], int(f[14] or 0)
        except ValueError:
            continue
        if pop < 120000 or not tz or "Etc/" in tz:
            continue
        key = (name, cc)
        if key in seen:
            continue
        seen.add(key)
        cities.append([name, COUNTRY.get(cc, cc), round(lat, 3), round(lng, 3), tz, pop])
cities.sort(key=lambda c: -c[5])
cities = [[c[0], c[1], c[2], c[3], c[4]] for c in cities]
json.dump(cities, open(f"{OUT}/cities.json", "w"), separators=(",", ":"), ensure_ascii=False)
print("cities.json:", len(cities), "cities")
