import requests, json

api_key = "zwhvFDqL8cXSfuxUXanznrUgFAplBrwvI06qVvjJ"
email = "abhaysinghpvinsight@gmail.com"
lat = -33.8688
lon = 151.2093

# 1. Check nsrdb-data-query
url_query = f"https://developer.nlr.gov/api/nsrdb/v2/solar/nsrdb-data-query.json?api_key={api_key}&wkt=POINT({lon} {lat})"
resp = requests.get(url_query)
print("=== NSRDB DATA QUERY RESPONSE ===")
print("Status:", resp.status_code)
if resp.ok:
    data = resp.json()
    print("Available outputs:")
    for out in data.get("outputs", []):
        print("Dataset Name:", out.get("name"))
        years = [link.get("year") for link in out.get("links", [])]
        print("Available Years:", sorted(list(set(years))))

# 2. Test direct himawari-download.csv for year 2001 vs 2018
for yr in [2001, 2018]:
    url_dl = f"https://developer.nlr.gov/api/nsrdb/v2/solar/himawari-download.csv?api_key={api_key}&email={email}&wkt=POINT({lon} {lat})&names={yr}&attributes=ghi,dhi,dni,air_temperature,wind_speed&interval=60&utc=false&leap_day=false"
    resp_dl = requests.get(url_dl)
    print(f"\n=== HIMAWARI DOWNLOAD TEST FOR {yr} ===")
    print("Status:", resp_dl.status_code)
    print("Body snippet:", resp_dl.text[:300])
