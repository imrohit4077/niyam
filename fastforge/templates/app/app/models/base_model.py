"""
Base model: callbacks, save/destroy, find/create. Rails equivalent: ApplicationRecord
"""

from typing import Any, Callable, TypeVar, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from config.database import Base as DeclarativeBaseConfig

T = TypeVar("T", bound="BaseModel")
_CALLBACKS: dict[type, dict[str, list[Callable[..., None]]]] = {}


def _get_callbacks(cls: type) -> dict[str, list[Callable[..., None]]]:
    if cls not in _CALLBACKS:
        _CALLBACKS[cls] = {
            "before_save": [], "after_save": [], "after_create": [],
            "before_destroy": [], "after_destroy": [],
        }
    return _CALLBACKS[cls]


def before_save(fn: Callable[..., None]) -> Callable[..., None]:
    fn._callback_type = "before_save"  # type: ignore
    return fn


def after_save(fn: Callable[..., None]) -> Callable[..., None]:
    fn._callback_type = "after_save"  # type: ignore
    return fn


def after_create(fn: Callable[..., None]) -> Callable[..., None]:
    fn._callback_type = "after_create"  # type: ignore
    return fn


def before_destroy(fn: Callable[..., None]) -> Callable[..., None]:
    fn._callback_type = "before_destroy"  # type: ignore
    return fn


def after_destroy(fn: Callable[..., None]) -> Callable[..., None]:
    fn._callback_type = "after_destroy"  # type: ignore
    return fn


class BaseModel(DeclarativeBaseConfig):
    __abstract__ = True

    @classmethod
    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        for name in dir(cls):
            attr = getattr(cls, name)
            if callable(attr) and getattr(attr, "_callback_type", None):
                kind = attr._callback_type  # type: ignore
                _get_callbacks(cls)[kind].append(attr)

    def to_dict(self) -> dict[str, Any]:
        return {c.key: getattr(self, c.key) for c in self.__table__.columns}

    def _run_callbacks(self, kind: str, db: Session) -> None:
        for c in reversed(type(self).__mro__):
            if c in _CALLBACKS and _CALLBACKS[c][kind]:
                for fn in _CALLBACKS[c][kind]:
                    fn(self, db)

    def save(self, db: Session) -> "BaseModel":
        is_new = getattr(self, "id", None) is None
        self._run_callbacks("before_save", db)
        db.add(self)
        db.flush()
        db.commit()
        db.refresh(self)
        self._run_callbacks("after_save", db)
        if is_new:
            self._run_callbacks("after_create", db)
        return self

    def destroy(self, db: Session) -> None:
        self._run_callbacks("before_destroy", db)
        db.delete(self)
        db.commit()
        self._run_callbacks("after_destroy", db)

    def update(self, db: Session, **kwargs: Any) -> "BaseModel":
        for k, v in kwargs.items():
            if hasattr(self, k):
                setattr(self, k, v)
        return self.save(db)

    def reload(self, db: Session) -> "BaseModel":
        db.refresh(self)
        return self

    @classmethod
    def find(cls: type[T], db: Session, id: int) -> T:
        obj = db.get(cls, id)
        if obj is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        return obj

    @classmethod
    def find_by(cls: type[T], db: Session, **kwargs: Any) -> Optional[T]:
        stmt = select(cls).filter_by(**kwargs).limit(1)
        return db.execute(stmt).scalars().first()

    @classmethod
    def where(cls: type[T], db: Session, **kwargs: Any) -> list[T]:
        stmt = select(cls).filter_by(**kwargs)
        return list(db.execute(stmt).scalars().all())

    @classmethod
    def all(cls: type[T], db: Session) -> list[T]:
        stmt = select(cls)
        return list(db.execute(stmt).scalars().all())

    @classmethod
    def create(cls: type[T], db: Session, **kwargs: Any) -> T:
        obj = cls(**kwargs)
        obj.save(db)
        return obj
