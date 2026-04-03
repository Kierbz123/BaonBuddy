from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import List, Optional

class DailySpending(BaseModel):
    date: date
    total: Decimal
    count: int

class WeeklySpending(BaseModel):
    week_start: date
    week_end: date
    total: Decimal
    count: int

class CategorySpending(BaseModel):
    category_id: int
    category_name: str
    category_icon: Optional[str]
    category_color: Optional[str]
    total: Decimal
    percentage: float
    count: int

class AnalyticsSummary(BaseModel):
    total_spent: Decimal
    total_transactions: int
    average_daily: Decimal
    top_category: Optional[CategorySpending] = None
    period_start: date
    period_end: date
