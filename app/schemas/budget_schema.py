from pydantic import BaseModel

class BudgetCreate(BaseModel):
    monthly_limit: float
    month: int
    year: int


class BudgetResponse(BaseModel):
    id: int
    monthly_limit: float
    month: int
    year: int

    class Config:
        from_attributes = True


class BudgetStatusResponse(BaseModel):
    monthly_limit: float
    total_spent: float
    remaining_budget: float
    overspending: bool