import asyncio
from services.supabase_service import get_supabase_client

async def main():
    supabase = get_supabase_client()
    try:
        response = supabase.table('ga4_cache').select('*').eq('report_type', 'overview').execute()
        import json
        for row in response.data:
            print("Fetched at:", row['fetched_at'])
            print("Data:", json.dumps(row['data'], indent=2)[:500])
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
