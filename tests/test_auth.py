def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["app"] == "local chud"


def test_login_required(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_login_flow(auth_client):
    r = auth_client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["username"] == "admin"


def test_logout(auth_client):
    r = auth_client.post("/api/auth/logout")
    assert r.status_code == 200
    r2 = auth_client.get("/api/auth/me")
    assert r2.status_code == 401
