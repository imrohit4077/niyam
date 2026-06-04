"""Rate limit helper tests (Redis mocked)."""

from unittest.mock import MagicMock, patch

import pytest

from app.helpers.rate_limit import RateLimitResult, clear_rate_limit, rate_limit


@pytest.fixture(autouse=True)
def _clear_script_cache():
    from app.helpers import rate_limit as rl

    rl._sliding_window_script.cache_clear()
    yield
    rl._sliding_window_script.cache_clear()


def test_rate_limit_allows_when_under_limit():
    mock_script = MagicMock(return_value=[1, 42, 9_999_999])
    with patch("app.helpers.rate_limit._sliding_window_script", return_value=mock_script):
        result = rate_limit("user:1", 100, window_seconds=60)
    assert result.allowed is True
    assert result.remaining == 42
    assert result.limit == 100
    mock_script.assert_called_once()


def test_rate_limit_denies_when_over_limit():
    mock_script = MagicMock(return_value=[0, 0, 1_700_000_100])
    with patch("app.helpers.rate_limit._sliding_window_script", return_value=mock_script):
        result = rate_limit("user:1", 100, window_seconds=60)
    assert result.allowed is False
    assert result.remaining == 0
    assert result.retry_after_seconds >= 0


def test_rate_limit_fail_open_on_redis_error():
    with patch("app.helpers.rate_limit._sliding_window_script", side_effect=ConnectionError("down")):
        with patch("app.helpers.rate_limit.get_settings") as gs:
            gs.return_value.RATE_LIMIT_FAIL_OPEN = True
            gs.return_value.RATE_LIMIT_WINDOW_SECONDS = 60
            result = rate_limit("user:9", 100)
    assert result.allowed is True


def test_rate_limit_fail_closed_on_redis_error():
    with patch("app.helpers.rate_limit._sliding_window_script", side_effect=ConnectionError("down")):
        with patch("app.helpers.rate_limit.get_settings") as gs:
            gs.return_value.RATE_LIMIT_FAIL_OPEN = False
            gs.return_value.RATE_LIMIT_WINDOW_SECONDS = 60
            result = rate_limit("user:9", 100)
    assert result.allowed is False


def test_clear_rate_limit_deletes_key():
    mock_client = MagicMock()
    with patch("app.helpers.rate_limit._redis_client", return_value=mock_client):
        clear_rate_limit("user:5")
    mock_client.delete.assert_called_once_with("niyam:ratelimit:v1:user:5")
