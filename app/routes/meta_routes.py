from fastapi import APIRouter
from app.core.enums import ExpenseCategory

router = APIRouter(prefix="/meta", tags=["Metadata"])

@router.get("/categories")
def get_categories():
    return [category.value for category in ExpenseCategory]