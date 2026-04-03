from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, DECIMAL
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=True)
    threshold = Column(Integer, nullable=False)
    message = Column(String(255), nullable=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="alerts")
