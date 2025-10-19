from fastapi import APIRouter, HTTPException
from app.services.database import supabase

router = APIRouter()

# Root route
@router.get("/")
def root():
    return {"message": "Backend connected successfully!"}

# Test GET
@router.get("/test")
def get_test_records():
    try:
        data = supabase.table("test_records").select("*").execute()
        return {"success": True, "data": data.data, "count": len(data.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Test POST
@router.post("/test")
def add_test_record(record: dict):
    try:
        response = supabase.table("test_records").insert(record).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
