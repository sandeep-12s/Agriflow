def test_compare_crop_prices_returns_all_markets_with_trend(seeded_client, auth_headers):
    response = seeded_client.get("/markets/compare/Tomato", headers=auth_headers)
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 3  # 3 demo markets, all carry Tomato prices

    for row in rows:
        assert row["current_price"] > 0
        assert row["trend"] in {"up", "down", "flat", "unknown"}


def test_compare_crop_prices_for_unseeded_crop_is_empty(client, auth_headers):
    # No seed data loaded in this test — nothing should exist for any crop.
    response = client.get("/markets/compare/Tomato", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_crops_returns_seeded_crop_names(seeded_client, auth_headers):
    response = seeded_client.get("/markets/crops", headers=auth_headers)
    assert response.status_code == 200
    crops = response.json()
    assert "Tomato" in crops
    assert "Wheat" in crops
