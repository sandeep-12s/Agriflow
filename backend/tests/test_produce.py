def _produce_payload(**overrides):
    payload = {
        "crop_name": "Tomato",
        "quantity": 10,
        "unit": "Quintal",
        "quality": "Grade A",
        "harvest_date": "2026-08-01",
        "location": "Bareilly, UP",
    }
    payload.update(overrides)
    return payload


def test_create_and_list_produce(client, auth_headers):
    create = client.post("/produce", json=_produce_payload(), headers=auth_headers)
    assert create.status_code == 201
    assert create.json()["status"] == "available"

    listing = client.get("/produce", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["id"] == create.json()["id"]


def test_create_produce_rejects_non_positive_quantity(client, auth_headers):
    response = client.post(
        "/produce", json=_produce_payload(quantity=0), headers=auth_headers
    )
    assert response.status_code == 422


def test_update_produce(client, auth_headers):
    create = client.post(
        "/produce", json=_produce_payload(crop_name="Wheat", quantity=5), headers=auth_headers
    )
    produce_id = create.json()["id"]

    update = client.put(f"/produce/{produce_id}", json={"quantity": 8}, headers=auth_headers)
    assert update.status_code == 200
    assert update.json()["quantity"] == 8
    # Fields not included in the PUT body should be untouched
    assert update.json()["crop_name"] == "Wheat"


def test_delete_produce(client, auth_headers):
    create = client.post(
        "/produce", json=_produce_payload(crop_name="Rice", quantity=3), headers=auth_headers
    )
    produce_id = create.json()["id"]

    delete = client.delete(f"/produce/{produce_id}", headers=auth_headers)
    assert delete.status_code == 204

    get_after = client.get(f"/produce/{produce_id}", headers=auth_headers)
    assert get_after.status_code == 404


def test_farmer_cannot_access_another_farmers_produce(client, register_farmer):
    farmer_a = register_farmer(email="farmer-a@example.com")
    headers_a = {"Authorization": f"Bearer {farmer_a.json()['access_token']}"}
    create = client.post(
        "/produce", json=_produce_payload(crop_name="Onion"), headers=headers_a
    )
    produce_id = create.json()["id"]

    farmer_b = register_farmer(email="farmer-b@example.com")
    headers_b = {"Authorization": f"Bearer {farmer_b.json()['access_token']}"}

    get_response = client.get(f"/produce/{produce_id}", headers=headers_b)
    assert get_response.status_code == 404

    delete_response = client.delete(f"/produce/{produce_id}", headers=headers_b)
    assert delete_response.status_code == 404
