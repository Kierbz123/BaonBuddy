from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Optional
from app.models.wallet import WalletType

class WalletBase(BaseModel):
    name: str
    type: WalletType
    balance: Decimal = Decimal("0.00")

class WalletCreate(WalletBase):
    pass

class WalletUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[Decimal] = None

class WalletResponse(WalletBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
