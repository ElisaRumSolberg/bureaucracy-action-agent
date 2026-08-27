import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.fake_firestore import FakeFirestoreClient


@pytest.fixture
def fake_db(monkeypatch):
    """A fresh in-memory Firestore stand-in per test, wired into both routers
    that call get_firestore_client() at request time."""
    db = FakeFirestoreClient()
    monkeypatch.setattr("app.routes.documents.get_firestore_client", lambda: db)
    monkeypatch.setattr("app.routes.cases.get_firestore_client", lambda: db)
    return db


@pytest.fixture
def client(fake_db):
    return TestClient(app)
