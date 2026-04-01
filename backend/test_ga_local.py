import sys
import traceback
import json

try:
    from services.ga_service import ga_service
    print("GA Service loaded successfully.")
    data = ga_service.get_overview_report("2024-03-01", "2024-03-05")
    print(json.dumps(data, indent=2))
except Exception as e:
    traceback.print_exc()
    sys.exit(1)
