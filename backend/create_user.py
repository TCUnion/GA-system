import os
import sys
from dotenv import load_dotenv

# 加載 .env
load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 環境變數")
    sys.exit(1)

from supabase import create_client, Client

supabase: Client = create_client(supabase_url, supabase_key)

def create_admin_user(email, password):
    try:
        print(f"嘗試建立使用者: {email}")
        user = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        print(f"✅ 成功建立使用者！ User ID: {user.user.id}")
    except Exception as e:
        print(f"❌ 建立失敗: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("用法: python create_user.py <email> <password>")
        sys.exit(1)
        
    email = sys.argv[1]
    password = sys.argv[2]
    create_admin_user(email, password)
