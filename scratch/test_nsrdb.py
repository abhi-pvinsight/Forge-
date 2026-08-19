import requests, json

api_key = "zwhvFDqL8cXSfuxUXanznrUgFAplBrwvI06qVvjJ"
email = "abhaysinghpvinsight@gmail.com"
lat = -33.8688
lon = 151.2093

url = f"https://developer.nlr.gov/api/nsrdb/v2/solar/nsrdb-data-query.json?api_key={api_key}&wkt=POINT({lon} {lat})"
print(f"Querying: {url}")
try:
    resp = requests.get(url, timeout=30)
    print("Status Code:", resp.status_code)
    print("Response:")
    print(json.dumps(resp.json(), indent=2)[:2000])
except Exception as e:
    print("Error:", e)
