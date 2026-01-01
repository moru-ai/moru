from moru import ConnectionConfig


def test_api_url_defaults_correctly(monkeypatch):
    monkeypatch.delenv("MORU_DOMAIN", raising=False)

    config = ConnectionConfig()
    assert config.api_url == "https://api.moru.io"


def test_api_url_in_args():
    config = ConnectionConfig(api_url="http://localhost:8080")
    assert config.api_url == "http://localhost:8080"


def test_api_url_in_env_var(monkeypatch):
    monkeypatch.setenv("MORU_API_URL", "http://localhost:8080")

    config = ConnectionConfig()
    assert config.api_url == "http://localhost:8080"


def test_api_url_has_correct_priority(monkeypatch):
    monkeypatch.setenv("MORU_API_URL", "http://localhost:1111")

    config = ConnectionConfig(api_url="http://localhost:8080")
    assert config.api_url == "http://localhost:8080"
