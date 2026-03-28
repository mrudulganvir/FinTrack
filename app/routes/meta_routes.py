from fastapi import APIRouter
from pydantic import BaseModel
from app.core.enums import ExpenseCategory
from app.services.categorization_service import (
    predict_with_confidence,
    get_model_info,
    is_model_loaded,
)

router = APIRouter(prefix="/meta", tags=["Metadata"])


class CategorizeRequest(BaseModel):
    description: str


class CategorizeResponse(BaseModel):
    description: str
    category: str
    confidence: float
    auto_categorized: bool
    model_loaded: bool


@router.get("/categories")
def get_categories():
    return [category.value for category in ExpenseCategory]


@router.post("/categorize", response_model=CategorizeResponse)
def categorize_description(request: CategorizeRequest):
    category, confidence = predict_with_confidence(request.description)
    return CategorizeResponse(
        description=request.description,
        category=category,
        confidence=round(confidence, 3),
        auto_categorized=is_model_loaded(),
        model_loaded=is_model_loaded(),
    )


@router.get("/model-info")
def model_info():
    """
    Return metadata about the loaded categorization model.
    Useful for health checks and admin dashboards.
    """
    return get_model_info()