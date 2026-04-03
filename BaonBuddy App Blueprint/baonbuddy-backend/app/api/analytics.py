from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from app.database import get_db
from app.schemas.analytics import DailySpending, WeeklySpending, CategorySpending, AnalyticsSummary
from app.services.analytics_service import AnalyticsService
from app.api.auth import get_current_user_id

router = APIRouter()

@router.get("/daily", response_model=List[DailySpending])
def get_daily_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    results = AnalyticsService.get_daily_spending(db, current_user_id, start_date, end_date)
    
    return [
        {
            "date": r.date,
            "total": r.total,
            "count": r.count
        }
        for r in results
    ]

@router.get("/weekly", response_model=List[WeeklySpending])
def get_weekly_analytics(
    weeks: int = 4,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    results = AnalyticsService.get_weekly_spending(db, current_user_id, weeks)
    
    return [
        {
            "week_start": r.week_start,
            "week_end": r.week_end,
            "total": r.total,
            "count": r.count
        }
        for r in results
    ]

@router.get("/categories", response_model=List[CategorySpending])
def get_category_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    results = AnalyticsService.get_category_spending(db, current_user_id, start_date, end_date)
    return results

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    summary = AnalyticsService.get_summary(db, current_user_id, start_date, end_date)
    category_spending = AnalyticsService.get_category_spending(db, current_user_id, start_date, end_date)
    
    top_category = None
    if category_spending:
        top = max(category_spending, key=lambda x: x['total'])
        top_category = CategorySpending(**top)
    
    return {
        **summary,
        "top_category": top_category
    }
