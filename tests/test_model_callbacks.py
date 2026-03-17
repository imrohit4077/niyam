"""
Tests for model callbacks: before_save, after_save, after_create, before_destroy, after_destroy.
"""

import pytest
from sqlalchemy.orm import Mapped, mapped_column

from config.database import Base
from app.models.base_model import BaseModel, before_save, after_save, after_create, before_destroy, after_destroy


# Track callback order for assertions
_callback_log: list[str] = []


def _clear_log() -> None:
    _callback_log.clear()


def _log(name: str) -> None:
    _callback_log.append(name)


@pytest.fixture
def db_with_callback_model(db):
    """Create a model with callbacks and table; yield db and model class."""
    class CallbackModel(BaseModel):
        __tablename__ = "callback_test_models"
        __table_args__ = {"extend_existing": True}
        id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
        name: Mapped[str] = mapped_column(nullable=False)

        @before_save
        def _before_save(self, db) -> None:
            _log("before_save")

        @after_save
        def _after_save(self, db) -> None:
            _log("after_save")

        @after_create
        def _after_create(self, db) -> None:
            _log("after_create")

        @before_destroy
        def _before_destroy(self, db) -> None:
            _log("before_destroy")

        @after_destroy
        def _after_destroy(self, db) -> None:
            _log("after_destroy")

    # Create table on same bind as db (important for SQLite in-memory)
    Base.metadata.create_all(bind=db.get_bind())
    yield db, CallbackModel
    Base.metadata.drop_all(bind=db.get_bind())


def test_callbacks_on_create(db_with_callback_model):
    """Create runs: before_save -> after_save -> after_create (no before/after_destroy)."""
    db, Model = db_with_callback_model
    _clear_log()
    Model.create(db, name="test")
    assert _callback_log == ["before_save", "after_save", "after_create"]


def test_callbacks_on_update(db_with_callback_model):
    """Update (save on existing) runs: before_save -> after_save only (no after_create)."""
    db, Model = db_with_callback_model
    obj = Model.create(db, name="first")
    _clear_log()
    obj.update(db, name="second")
    assert _callback_log == ["before_save", "after_save"]


def test_callbacks_on_destroy(db_with_callback_model):
    """Destroy runs: before_destroy -> after_destroy."""
    db, Model = db_with_callback_model
    obj = Model.create(db, name="x")
    _clear_log()
    obj.destroy(db)
    assert _callback_log == ["before_destroy", "after_destroy"]


def test_callbacks_order_full_lifecycle(db_with_callback_model):
    """Create -> update -> destroy runs callbacks in correct order each time."""
    db, Model = db_with_callback_model
    _clear_log()
    obj = Model.create(db, name="a")
    assert _callback_log == ["before_save", "after_save", "after_create"]
    _clear_log()
    obj.update(db, name="b")
    assert _callback_log == ["before_save", "after_save"]
    _clear_log()
    obj.destroy(db)
    assert _callback_log == ["before_destroy", "after_destroy"]
