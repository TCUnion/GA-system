import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 環境變數")
    sys.exit(1)

def create_user(email, password):
    url = f"{supabase_url}/auth/v1/admin/users"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    data = {
        "email": email,
        "password": password,
        "email_confirm": True
    }
    
    try:
        print(f"發送請求至: {url}")
        res = requests.post(url, headers=headers, json=data)
        print(f"HTTP 狀態碼: {res.status_code}")
        print(f"回應內容: {res.text}")
    except Exception as e:
        print(f"❌ 請求失敗: {str(e)}")

if __name__ == "__main__":
    create_user("service@tsu.com.tw", "TestPassword123!")
