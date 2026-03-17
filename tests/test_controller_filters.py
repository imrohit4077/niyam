"""
Tests for controller filters: before_action (only/except), filter order, halt on raise.
"""

import pytest
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.controllers.base_controller import BaseController, before_action
from config.routes import _wrap
from main import app


# Track which before_actions ran (action name -> list of filter names)
_filter_log: dict[str, list[str]] = {}


def _clear_filter_log() -> None:
    _filter_log.clear()


def _log_filter(action: str, filter_name: str) -> None:
    _filter_log.setdefault(action, []).append(filter_name)


class FiltersController(BaseController):
    """Controller with before_actions to verify filter behavior."""

    @before_action(only=["index"])
    def only_index(self) -> None:
        _log_filter("index", "only_index")

    @before_action(only=["show"])
    def only_show(self) -> None:
        _log_filter("show", "only_show")

    @before_action(except_list=["show"])
    def except_show(self) -> None:
        action = "show" if "/test-filters-show" in str(self.request.url) else "index"
        _log_filter(action, "except_show")

    def index(self) -> JSONResponse:
        return self.render_json({"action": "index"})

    def show(self) -> JSONResponse:
        return self.render_json({"action": "show"})


class HaltController(BaseController):
    """Controller whose before_action raises to halt the request."""

    @before_action
    def halt(self) -> None:
        raise ValueError("halted")

    def index(self) -> JSONResponse:
        return self.render_json({"action": "index"})


@pytest.fixture
def client_with_test_routes(client: TestClient) -> TestClient:
    """Register test routes that use FiltersController and HaltController."""
    app.add_api_route(
        "/test-filters-index",
        _wrap(FiltersController, "index", lambda c: c.index()),
        methods=["GET"],
    )
    app.add_api_route(
        "/test-filters-show",
        _wrap(FiltersController, "show", lambda c: c.show()),
        methods=["GET"],
    )
    app.add_api_route(
        "/test-halt",
        _wrap(HaltController, "index", lambda c: c.index()),
        methods=["GET"],
    )
    yield client


def test_before_action_only_index(client_with_test_routes: TestClient) -> None:
    """before_action(only=['index']) runs for index, not for show."""
    _clear_filter_log()
    r = client_with_test_routes.get("/test-filters-index")
    assert r.status_code == 200
    assert r.json()["data"]["action"] == "index"
    assert "only_index" in _filter_log.get("index", [])
    _clear_filter_log()
    r2 = client_with_test_routes.get("/test-filters-show")
    assert r2.status_code == 200
    assert r2.json()["data"]["action"] == "show"
    assert "only_show" in _filter_log.get("show", [])
    assert "only_index" not in _filter_log.get("show", [])


def test_before_action_except_show(client_with_test_routes: TestClient) -> None:
    """before_action(except_list=['show']) runs for index but not for show."""
    _clear_filter_log()
    client_with_test_routes.get("/test-filters-index")
    assert "except_show" in _filter_log.get("index", [])
    _clear_filter_log()
    client_with_test_routes.get("/test-filters-show")
    assert "except_show" not in _filter_log.get("show", [])


def test_before_action_halt_raises(client_with_test_routes: TestClient) -> None:
    """When a before_action raises, the action is not run and the error propagates."""
    r = client_with_test_routes.get("/test-halt")
    assert r.status_code == 500
    body = r.json()
    assert body.get("data", {}).get("action") != "index"
