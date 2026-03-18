from enum import Enum

class ExpenseCategory(str, Enum):
    medical = "Medical"
    taxes = "Taxes"
    shopping = "Shopping"
    entertainment = "Entertainment"
    food = "Food"
    transport = "Transport"
    salary = "Salary"
    others = "Others"