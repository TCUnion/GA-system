import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from supabase import create_client, Client
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# NOTE: 使用 SERVICE_ROLE_KEY 的客戶端才能操作 auth.admin
admin_client: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)


# =============================================
# 身份驗證輔助：驗證 JWT 並確認 admin 角色
# =============================================

async def _require_admin(authorization: Optional[str]) -> str:
    """
    驗證 Bearer Token 並確認呼叫者具有 admin 角色。

    NOTE: 前端登入後從 supabase.auth.getSession() 取得 access_token，
    透過 Authorization: Bearer <token> 傳入，後端用 anon_client 驗證後
    查詢 profiles 表確認角色。

    Returns:
        驗證通過的 user_id

    Raises:
        HTTPException 401/403
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少有效的 Authorization Token")

    token = authorization.split(" ", 1)[1]
    try:
        user_res = admin_client.auth.get_user(token)
        user_id = user_res.user.id
    except Exception as e:
        logger.warning(f"JWT 驗證失敗: {e}")
        raise HTTPException(status_code=401, detail="Token 無效或已過期")

    # 查詢 profiles 確認 admin 角色
    profile = admin_client.table("profiles").select("role").eq("id", user_id).single().execute()
    if not profile.data or profile.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="權限不足：需要 admin 角色")

    return user_id


# =============================================
# Pydantic Schemas
# =============================================

class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str = "viewer"

class UpdateUserRoleRequest(BaseModel):
    role: str  # 'admin' | 'viewer'

class UpdateUserPasswordRequest(BaseModel):
    password: str

class CreateProjectRequest(BaseModel):
    name: str
    ga_property_id: str
    description: Optional[str] = None
    color: str = "#3b82f6"

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    ga_property_id: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class SetPermissionsRequest(BaseModel):
    project_ids: list[str]  # 使用者有權存取的專案 ID 清單


# =============================================
# 使用者管理 API
# =============================================

@router.get("/admin/users")
async def list_users(authorization: Optional[str] = Header(None)):
    """
    取得所有使用者清單（含角色）。
    僅限 admin 呼叫。
    """
    await _require_admin(authorization)
    try:
        # 從 auth.admin 取得使用者清單
        users_res = admin_client.auth.admin.list_users()
        users = users_res if isinstance(users_res, list) else []

        # 取得所有 profiles
        profiles_res = admin_client.table("profiles").select("id, role").execute()
        profile_map = {p["id"]: p["role"] for p in (profiles_res.data or [])}

        result = []
        for user in users:
            result.append({
                "id": user.id,
                "email": user.email,
                "role": profile_map.get(user.id, "viewer"),
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_sign_in_at": user.last_sign_in_at.isoformat() if user.last_sign_in_at else None,
            })

        return {"users": result}
    except Exception as e:
        logger.error(f"取得使用者清單失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/users", status_code=201)
async def create_user(body: CreateUserRequest, authorization: Optional[str] = Header(None)):
    """
    建立新使用者並設定角色（admin / viewer）。
    僅限 admin 呼叫。
    """
    await _require_admin(authorization)
    try:
        user_res = admin_client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
        user_id = user_res.user.id

        # 建立/更新 profile 角色
        admin_client.table("profiles").upsert({
            "id": user_id,
            "email": body.email,
            "role": body.role,
        }, on_conflict="id").execute()

        return {
            "id": user_id,
            "email": body.email,
            "role": body.role,
            "message": "使用者建立成功",
        }
    except Exception as e:
        logger.error(f"建立使用者失敗: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/admin/users/{user_id}")
async def update_user_role(
    user_id: str,
    body: UpdateUserRoleRequest,
    authorization: Optional[str] = Header(None),
):
    """
    更新使用者角色（admin / viewer）。
    僅限 admin 呼叫。
    """
    await _require_admin(authorization)
    if body.role not in ("admin", "viewer"):
        raise HTTPException(status_code=400, detail="角色只能是 'admin' 或 'viewer'")
    try:
        admin_client.table("profiles").upsert({
            "id": user_id,
            "role": body.role,
        }, on_conflict="id").execute()
        return {"message": "角色更新成功", "role": body.role}
    except Exception as e:
        logger.error(f"更新使用者角色失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/admin/users/{user_id}/password")
async def update_user_password(
    user_id: str,
    body: UpdateUserPasswordRequest,
    authorization: Optional[str] = Header(None),
):
    """
    更新使用者密碼。
    僅限 admin 呼叫。
    """
    await _require_admin(authorization)
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="密碼長度至少需 6 個字元")
    try:
        admin_client.auth.admin.update_user_by_id(
            user_id,
            {"password": body.password}
        )
        return {"message": "密碼更新成功"}
    except Exception as e:
        logger.error(f"更新使用者密碼失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, authorization: Optional[str] = Header(None)):
    """
    刪除使用者（從 auth.users 移除，profiles 與授權記錄 CASCADE 刪除）。
    僅限 admin 呼叫。
    """
    await _require_admin(authorization)
    try:
        admin_client.auth.admin.delete_user(user_id)
        return {"message": "使用者已刪除"}
    except Exception as e:
        logger.error(f"刪除使用者失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# 專案管理 API
# =============================================

@router.get("/admin/projects")
async def list_projects(authorization: Optional[str] = Header(None)):
    """取得所有 GA4 專案清單。"""
    await _require_admin(authorization)
    try:
        res = admin_client.table("projects").select(
            "id, name, ga_property_id, description, color, is_active, created_at"
        ).order("created_at").execute()
        return {"projects": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/projects", status_code=201)
async def create_project(body: CreateProjectRequest, authorization: Optional[str] = Header(None)):
    """新增 GA4 專案。"""
    await _require_admin(authorization)
    try:
        res = admin_client.table("projects").insert({
            "name": body.name,
            "ga_property_id": body.ga_property_id,
            "description": body.description,
            "color": body.color,
        }).execute()
        return {"project": res.data[0], "message": "專案建立成功"}
    except Exception as e:
        logger.error(f"建立專案失敗: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/projects/{project_id}")
async def update_project(
    project_id: str,
    body: UpdateProjectRequest,
    authorization: Optional[str] = Header(None),
):
    """更新 GA4 專案資訊。"""
    await _require_admin(authorization)
    try:
        update_data = body.model_dump(exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="沒有提供要更新的欄位")
        res = admin_client.table("projects").update(update_data).eq("id", project_id).execute()
        return {"project": res.data[0] if res.data else None, "message": "專案更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新專案失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/projects/{project_id}")
async def delete_project(project_id: str, authorization: Optional[str] = Header(None)):
    """刪除 GA4 專案（同步刪除關聯快取與授權記錄）。"""
    await _require_admin(authorization)
    try:
        admin_client.table("projects").delete().eq("id", project_id).execute()
        return {"message": "專案已刪除"}
    except Exception as e:
        logger.error(f"刪除專案失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# 使用者↔專案 授權管理 API
# =============================================

@router.get("/admin/users/{user_id}/permissions")
async def get_user_permissions(user_id: str, authorization: Optional[str] = Header(None)):
    """取得指定使用者的專案授權清單。"""
    await _require_admin(authorization)
    try:
        res = admin_client.table("user_project_permissions").select(
            "project_id, projects(id, name, color, ga_property_id)"
        ).eq("user_id", user_id).execute()
        return {"permissions": res.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/admin/users/{user_id}/permissions")
async def set_user_permissions(
    user_id: str,
    body: SetPermissionsRequest,
    authorization: Optional[str] = Header(None),
):
    """
    設定使用者的專案授權清單（覆蓋模式）。
    先刪除現有授權，再批量插入新授權。
    """
    await _require_admin(authorization)
    try:
        # 刪除現有授權
        admin_client.table("user_project_permissions").delete().eq("user_id", user_id).execute()

        # 批量插入新授權
        if body.project_ids:
            rows = [{"user_id": user_id, "project_id": pid} for pid in body.project_ids]
            admin_client.table("user_project_permissions").insert(rows).execute()

        return {
            "message": f"已更新授權：{len(body.project_ids)} 個專案",
            "project_ids": body.project_ids,
        }
    except Exception as e:
        logger.error(f"設定使用者授權失敗: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================
# 使用者自身可呼叫的 API（取得自己的專案清單）
# =============================================

@router.get("/admin/me/projects")
async def get_my_projects(authorization: Optional[str] = Header(None)):
    """
    取得目前登入使用者有權存取的專案清單。
    所有已登入使用者均可呼叫（不限 admin）。
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少 Authorization Token")

    token = authorization.split(" ", 1)[1]
    try:
        user_res = admin_client.auth.get_user(token)
        user_id = user_res.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Token 無效")

    # 確認角色
    profile = admin_client.table("profiles").select("role").eq("id", user_id).single().execute()
    role = profile.data.get("role", "viewer") if profile.data else "viewer"

    if role == "admin":
        # 管理員看全部專案
        res = admin_client.table("projects").select(
            "id, name, ga_property_id, description, color, is_active"
        ).eq("is_active", True).order("created_at").execute()
    else:
        # 一般使用者只看授權的專案
        res = admin_client.table("user_project_permissions").select(
            "projects(id, name, ga_property_id, description, color, is_active)"
        ).eq("user_id", user_id).execute()
        projects_raw = [row["projects"] for row in (res.data or []) if row.get("projects")]
        return {"projects": projects_raw, "role": role}

    return {"projects": res.data or [], "role": role}
