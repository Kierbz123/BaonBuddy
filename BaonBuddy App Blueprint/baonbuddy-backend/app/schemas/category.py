from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = "#6C5CE7"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    user_id: Optional[int] = None
    is_default: int
    created_at: datetime
    
    class Config:
        from_attributes = True
