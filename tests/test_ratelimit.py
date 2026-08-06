"""Tests for the dependency-free rate limiter (disabled in dev by default)."""

from backend.ratelimit import _buckets, _check


def test_fixed_window_limit():
    """The window admits `limit` hits and blocks the next."""
    _buckets.clear()
    assert all(_check("k", 3, 60) for _ in range(3))
    assert not _check("k", 3, 60)


def test_window_resets():
    """Hits older than the window stop counting."""
    import time as time_mod

    _buckets.clear()
    assert _check("k", 1, 60)
    assert not _check("k", 1, 60)
    # Simulate expiry by aging the recorded hit
    _buckets["k"] = [time_mod.monotonic() - 61]
    assert _check("k", 1, 60)


def test_login_rate_limited_in_production(client, monkeypatch):
    """With the limiter enabled, the 21st rapid login gets 429."""
    monkeypatch.setattr("backend.ratelimit._ENABLED", True)
    _buckets.clear()

    for _ in range(20):
        resp = client.post("/api/v1/auth/login", json={
            "email": "nobody@example.com", "password": "wrongpass",
        })
        assert resp.status_code == 401

    resp = client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com", "password": "wrongpass",
    })
    assert resp.status_code == 429
