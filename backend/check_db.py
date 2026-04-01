import sys
from services.supabase_service import supabase_service
import json

def main():
    try:
        data = supabase_service.get_cache("overview")
        if data:
            print(json.dumps(data, indent=2)[:500])
        else:
            print("No data found for overview")
    except Exception as e:
        print("Error:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
