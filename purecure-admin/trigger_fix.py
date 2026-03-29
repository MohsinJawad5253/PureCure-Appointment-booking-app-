import time
import requests

while True:
    try:
        res = requests.get("https://purecure-appointment-booking-app-g5ua.onrender.com/api/clinic-admin/fix-dates/")
        if res.status_code == 200:
            print("Successfully triggered fix-dates!")
            print(res.json())
            break
        print(f"Got {res.status_code}, waiting...")
    except Exception as e:
        print("Waiting...", e)
    time.sleep(15)
