from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.models.transaction import Transaction
from app.models.category import Category
from datetime import date, timedelta
from typing import List, Optional
from decimal import Decimal

class AnalyticsService:
    @staticmethod
    def get_daily_spending(db: Session, user_id: int, start_date: date, end_date: date):
        results = db.query(
            Transaction.date,
            func.sum(Transaction.amount).label('total'),
            func.count(Transaction.id).label('count')
        ).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).group_by(Transaction.date).order_by(Transaction.date).all()
        
        return results
    
    @staticmethod
    def get_weekly_spending(db: Session, user_id: int, weeks: int = 4):
        end_date = date.today()
        start_date = end_date - timedelta(weeks=weeks)
        
        results = db.query(
            func.yearweek(Transaction.date).label('week'),
            func.min(Transaction.date).label('week_start'),
            func.max(Transaction.date).label('week_end'),
            func.sum(Transaction.amount).label('total'),
            func.count(Transaction.id).label('count')
        ).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date
        ).group_by(func.yearweek(Transaction.date)).all()
        
        return results
    
    @staticmethod
    def get_category_spending(db: Session, user_id: int, start_date: date, end_date: date):
        results = db.query(
            Category.id.label('category_id'),
            Category.name.label('category_name'),
            Category.icon.label('category_icon'),
            Category.color.label('category_color'),
            func.sum(Transaction.amount).label('total'),
            func.count(Transaction.id).label('count')
        ).join(
            Transaction, Transaction.category_id == Category.id
        ).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).group_by(Category.id).all()
        
        total_spent = sum(r.total for r in results) if results else Decimal('0')
        
        category_spending = []
        for r in results:
            percentage = (float(r.total) / float(total_spent) * 100) if total_spent > 0 else 0
            category_spending.append({
                'category_id': r.category_id,
                'category_name': r.category_name,
                'category_icon': r.category_icon,
                'category_color': r.category_color,
                'total': r.total,
                'percentage': round(percentage, 2),
                'count': r.count
            })
        
        return category_spending
    
    @staticmethod
    def get_summary(db: Session, user_id: int, start_date: date, end_date: date):
        total_spent = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).scalar() or Decimal('0')
        
        total_transactions = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).scalar() or 0
        
        days_diff = (end_date - start_date).days + 1
        average_daily = total_spent / days_diff if days_diff > 0 else Decimal('0')
        
        return {
            'total_spent': total_spent,
            'total_transactions': total_transactions,
            'average_daily': average_daily,
            'period_start': start_date,
            'period_end': end_date
        }
