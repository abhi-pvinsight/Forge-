import requests

api_key = "zwhvFDqL8cXSfuxUXanznrUgFAplBrwvI06qVvjJ"
email = "abhaysinghpvinsight@gmail.com"
lat = 33.44      # Phoenix, Arizona, USA
lon = -112.07

url = "https://developer.nlr.gov/api/nsrdb/v2/solar/nsrdb-GOES-aggregated-v4-0-0-download.csv"
params = {
    "api_key": api_key,
    "email": email,
    "wkt": f"POINT({lon} {lat})",
    "names": "2020",
    "attributes": "ghi,dhi,dni,air_temperature,wind_speed",
    "interval": "60",
    "utc": "false",
    "leap_day": "false",
}

print(f"Testing USA GOES NSRDB download for lat={lat}, lon={lon}, year=2020...")
resp = requests.get(url, params=params, timeout=30)
print("Status Code:", resp.status_code)
if resp.ok:
    print("Downloaded successfully! Size:", len(resp.content), "bytes")
    print("CSV Header snippet:")
    print("\n".join(resp.text.splitlines()[:5]))
else:
    print("HTTP Error:", resp.status_code, resp.text[:300])
