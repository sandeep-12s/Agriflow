def test_register_creates_account_and_returns_token(client):
    payload = {
        "name": "Ramesh Kumar", "phone": "9876500000", "email": "ramesh@example.com",
        "password": "farmer123", "location": "Bareilly, UP", "language": "en",
    }
    otp_response = client.post("/auth/request-otp", json={"phone": payload["phone"]})
    assert otp_response.status_code == 200
    payload["otp"] = otp_response.json()["dev_code"]
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_register_rejects_incorrect_otp(client):
    payload = {
        "name": "OTP Farmer", "phone": "9876500001", "email": "otp@example.com",
        "password": "farmer123", "location": "Bareilly, UP", "language": "en", "otp": "000000",
    }
    response = client.post("/auth/request-otp", json={"phone": payload["phone"]})
    assert response.status_code == 200
    registration = client.post("/auth/register", json=payload)
    assert registration.status_code == 400
    assert registration.json()["detail"] == "Incorrect verification code"


def test_register_rejects_duplicate_email(register_farmer):
    register_farmer(email="dup@example.com")
    response = register_farmer(email="dup@example.com")
    assert response.status_code == 400


def test_login_with_correct_credentials_returns_token(client, register_farmer):
    register_farmer(email="login@example.com")
    response = client.post(
        "/auth/login", json={"email": "login@example.com", "password": "testpass123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_with_wrong_password_is_rejected(client, register_farmer):
    register_farmer(email="wrongpass@example.com")
    response = client.post(
        "/auth/login", json={"email": "wrongpass@example.com", "password": "not-the-password"}
    )
    assert response.status_code == 401


def test_protected_route_rejects_missing_token(client):
    response = client.get("/farmers/me")
    assert response.status_code == 403  # HTTPBearer's default for no credentials at all


def test_protected_route_rejects_invalid_token(client):
    response = client.get("/farmers/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_protected_route_works_with_valid_token_and_hides_password(client, auth_headers):
    response = client.get("/farmers/me", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "password" not in body
    assert "password_hash" not in body


def test_phone_email_verification_and_registration(client, monkeypatch):
    """Test that Phone.Email user_json_url verifies phone and enables registration."""
    class MockResponse:
        status_code = 200
        def raise_for_status(self):
            pass
        def json(self):
            return {
                "user_country_code": "+91",
                "user_phone_number": "9876543210",
                "user_first_name": "Ramesh",
                "user_last_name": "Kumar",
            }

    import requests
    monkeypatch.setattr(requests, "get", lambda *args, **kwargs: MockResponse())

    # 1. Verify via phone.email
    res = client.post(
        "/auth/verify-phone-email",
        json={"user_json_url": "https://auth.phone.email/user_json_url?token=test1234"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert data["phone"] == "9876543210"
    token = data["verification_token"]
    assert token.startswith("PE_")

    # 2. Register using the Phone.Email verification token
    reg_res = client.post(
        "/auth/register",
        json={
            "name": "Ramesh Kumar",
            "phone": "9876543210",
            "email": "ramesh@example.com",
            "password": "secretpassword",
            "location": "Nashik, Maharashtra",
            "language": "mr",
            "role": "farmer",
            "otp": token,
        },
    )
    assert reg_res.status_code == 201
    assert "access_token" in reg_res.json()

