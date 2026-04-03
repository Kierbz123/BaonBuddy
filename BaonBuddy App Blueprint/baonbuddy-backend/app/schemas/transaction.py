from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

class TransactionBase(BaseModel):
    wallet_id: int
    category_id: Optional[int] = None
    amount: Decimal
    note: Optional[str] = None
    date: date
    image_url: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    wallet_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: Optional[Decimal] = None
    note: Optional[str] = None
    date: Optional[date] = None
    image_url: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    wallet_name: Optional[str] = None
    wallet_type: Optional[str] = None
    
    class Config:
        from_attributes = True
