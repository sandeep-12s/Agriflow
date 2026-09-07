def _add_produce(client, headers, **overrides):
    payload = {
        "crop_name": "Tomato",
        "quantity": 10,
        "unit": "Quintal",
        "quality": "Grade A",
        "harvest_date": "2026-08-01",
        "location": "Bareilly, UP",
    }
    payload.update(overrides)
    response = client.post("/produce", json=payload, headers=headers)
    return response.json()["id"]


def test_recommendation_includes_all_four_options_for_tomato(seeded_client, auth_headers):
    produce_id = _add_produce(seeded_client, auth_headers, crop_name="Tomato", quantity=10)

    response = seeded_client.get(f"/recommendations/{produce_id}", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()

    options = {opt["option"] for opt in body["options"]}
    assert options == {"SELL_NOW", "STORE", "PROCESS", "ALT_BUYER"}
    assert body["recommended_option"] in options


def test_recommendation_excludes_unavailable_options_for_wheat(seeded_client, auth_headers):
    # Wheat has a storage facility in the demo data but no processing unit
    # and no matching buyer — PROCESS and ALT_BUYER should be absent.
    produce_id = _add_produce(seeded_client, auth_headers, crop_name="Wheat", quantity=5)

    response = seeded_client.get(f"/recommendations/{produce_id}", headers=auth_headers)
    options = {opt["option"] for opt in response.json()["options"]}
    assert options == {"SELL_NOW", "STORE"}


def test_recommendation_excludes_alt_buyer_when_quantity_exceeds_buyer_capacity(
    seeded_client, auth_headers
):
    # FreshFoods only takes up to 20 quintals of Tomato in the demo data.
    produce_id = _add_produce(seeded_client, auth_headers, crop_name="Tomato", quantity=999)

    response = seeded_client.get(f"/recommendations/{produce_id}", headers=auth_headers)
    options = {opt["option"] for opt in response.json()["options"]}
    assert "ALT_BUYER" not in options


def test_recommendation_scores_and_risk_are_bounded_0_to_100(seeded_client, auth_headers):
    produce_id = _add_produce(seeded_client, auth_headers, crop_name="Mango", quantity=5)

    response = seeded_client.get(f"/recommendations/{produce_id}", headers=auth_headers)
    for opt in response.json()["options"]:
        assert 0 <= opt["recommendation_score"] <= 100
        assert 0 <= opt["risk_score"] <= 100
        assert opt["risk_label"] in {"Low", "Medium", "High"}


def test_recommendation_for_unowned_produce_is_404(seeded_client, client, register_farmer):
    farmer_a = register_farmer(email="rec-farmer-a@example.com")
    headers_a = {"Authorization": f"Bearer {farmer_a.json()['access_token']}"}
    produce_id = _add_produce(seeded_client, headers_a, crop_name="Potato")

    farmer_b = register_farmer(email="rec-farmer-b@example.com")
    headers_b = {"Authorization": f"Bearer {farmer_b.json()['access_token']}"}

    response = seeded_client.get(f"/recommendations/{produce_id}", headers=headers_b)
    assert response.status_code == 404
