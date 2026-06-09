import tomllib
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "Nextract"}


def test_openapi_version_matches_pyproject() -> None:
    pyproject_path = Path(__file__).resolve().parents[1] / "pyproject.toml"
    pyproject = tomllib.loads(pyproject_path.read_text(encoding="utf-8"))

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["version"] == pyproject["project"]["version"]
