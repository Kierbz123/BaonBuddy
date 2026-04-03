from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryResponse
from app.models.category import Category
from app.api.auth import get_current_user_id

router = APIRouter()

DEFAULT_CATEGORIES = [
    {"name": "Food", "icon": "utensils", "color": "#FF7675", "is_default": 1},
    {"name": "Transport", "icon": "bus", "color": "#74B9FF", "is_default": 1},
    {"name": "Entertainment", "icon": "film", "color": "#A29BFE", "is_default": 1},
    {"name": "Shopping", "icon": "shopping-bag", "color": "#FD79A8", "is_default": 1},
    {"name": "Education", "icon": "book", "color": "#00B894", "is_default": 1},
    {"name": "Health", "icon": "heart", "color": "#E17055", "is_default": 1},
    {"name": "Bills", "icon": "file-invoice", "color": "#FDCB6E", "is_default": 1},
    {"name": "Other", "icon": "ellipsis-h", "color": "#636E72", "is_default": 1},
]

@router.get("/", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    categories = db.query(Category).filter(
        (Category.user_id == current_user_id) | (Category.is_default == 1)
    ).all()
    return categories

@router.post("/", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    db_category = Category(
        user_id=current_user_id,
        name=category.name,
        icon=category.icon,
        color=category.color,
        is_default=0
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    category = db.query(Category).filter(
        (Category.id == category_id),
        ((Category.user_id == current_user_id) | (Category.is_default == 1))
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or cannot delete default")
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}

def seed_default_categories(db: Session):
    for cat in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == cat["name"], Category.is_default == 1).first()
        if not existing:
            db_category = Category(**cat)
            db.add(db_category)
    db.commit()
