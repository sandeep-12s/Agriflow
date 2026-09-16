"""
Tests for buyer requirement posting, next-crop prediction, and weather advisories.
"""
from datetime import date
from app.db.models import User, Produce, Transaction, TransactionStatus, Buyer
from app.services.crop_prediction import predict_next_crop


def test_predict_next_crop_logic():
    # Tomato rotation -> Moong or Pulses
    prediction = predict_next_crop("Tomato", "Agra, Uttar Pradesh")
    assert prediction["crop_name"] in ["Moong (Green Gram)", "Gram (Chana)", "Mustard", "Wheat"]
    assert prediction["estimated_modal_price"] > 0
    assert "revenue" in prediction["reason"] or "ideal" in prediction["reason"]
    assert len(prediction["ai_advisory"]) > 0


def test_weather_advisories(client, auth_headers):
    response = client.get("/weather?latitude=28.36&longitude=79.41", headers=auth_headers)
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        data = response.json()
        assert "advisory_alerts" in data
        assert isinstance(data["advisory_alerts"], list)
        assert len(data["advisory_alerts"]) > 0
        assert "condition_text" in data


def test_buyer_requirement_crud(client, auth_headers):
    # 1. Post a new requirement
    payload = {
        "name": "Agro Exports Hub",
        "product": "Wheat",
        "required_quantity": 100.0,
        "offered_price": 2550.0,
        "location": "Aligarh, UP",
        "quality_requirement": "Grade A",
        "contact": "+919876543210",
        "latitude": 27.89,
        "longitude": 78.08,
    }
    create_res = client.post("/buyers", json=payload, headers=auth_headers)
    assert create_res.status_code == 201
    buyer_data = create_res.json()
    buyer_id = buyer_data["id"]
    assert buyer_data["product"] == "Wheat"
    assert buyer_data["offered_price"] == 2550.0
    assert buyer_data["latitude"] == 27.89

    # 2. View my requirements
    my_res = client.get("/buyers/my-requirements", headers=auth_headers)
    assert my_res.status_code == 200
    assert any(b["id"] == buyer_id for b in my_res.json())

    # 3. Update requirement
    upd_res = client.put(f"/buyers/{buyer_id}", json={"offered_price": 2600.0}, headers=auth_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["offered_price"] == 2600.0

    # 4. Delete requirement
    del_res = client.delete(f"/buyers/{buyer_id}", headers=auth_headers)
    assert del_res.status_code == 204


def test_next_crop_prediction_endpoint(client, auth_headers, db_session):
    # Setup farmer, produce, buyer, transaction
    farmer = db_session.query(User).first()
    produce = Produce(
        farmer_id=farmer.id,
        crop_name="Tomato",
        quantity=50.0,
        unit="Quintal",
        quality="Grade A",
        harvest_date=date.today(),
        location="Bareilly, UP",
    )
    db_session.add(produce)
    db_session.flush()

    buyer = Buyer(
        name="Direct Food Chain",
        product="Tomato",
        required_quantity=50.0,
        offered_price=2400.0,
        location="Bareilly, UP",
        contact="buyer@test.com",
    )
    db_session.add(buyer)
    db_session.flush()

    txn = Transaction(
        farmer_id=farmer.id,
        buyer_id=buyer.id,
        produce_id=produce.id,
        quantity=50.0,
        price=2400.0,
        status=TransactionStatus.completed,
    )
    db_session.add(txn)
    db_session.commit()

    # Call next crop prediction endpoint
    res = client.get(f"/transactions/{txn.id}/next-crop-prediction", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "crop_name" in data
    assert "rotation_benefit" in data
    assert "estimated_profit_per_acre" in data
    assert "ai_advisory" in data


def test_regional_mandi_feed_endpoint(client, auth_headers):
    # Test for Bareilly, UP region
    res = client.get("/markets/regional-mandi-feed?latitude=28.36&longitude=79.41", headers=auth_headers)
    assert res.status_code == 200
    feed = res.json()
    assert "region_title" in feed
    assert "Uttar Pradesh" in feed["state"]
    assert feed["crops_count"] > 0
    assert len(feed["prices"]) > 0
    # Check that prices have is_live = True and arrival details
    first_crop = feed["prices"][0]
    assert first_crop["is_live"] is True
    assert first_crop["modal_price"] > 0
    assert "arrival_date" in first_crop


def test_processing_units_include_company_details(seeded_client, auth_headers):
    res = seeded_client.get("/processing", headers=auth_headers)
    assert res.status_code == 200
    units = res.json()
    assert len(units) > 0
    first = units[0]
    assert "name" in first
    assert "input_product" in first
    assert "output_product" in first
    assert "processing_cost" in first
    assert "distance_km" in first
    assert "contact_phone" in first
    assert "description" in first


def test_ai_assistant_agricultural_expert(client, auth_headers):
    # Test pest advice
    res = client.post("/assistant/chat", json={"message": "how to cure late blight in tomato", "language": "en"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "Blight" in data["reply"] or "Mancozeb" in data["reply"]
    assert data["source"] == "ai"

    # Test Hindi advice
    res_hi = client.post("/assistant/chat", json={"message": "टमाटर में झुलसा की दवा", "language": "hi"}, headers=auth_headers)
    assert res_hi.status_code == 200
    data_hi = res_hi.json()
    assert "झुलसा" in data_hi["reply"] or "मैनकोजेब" in data_hi["reply"]
    assert data_hi["source"] == "ai"

    # Test greeting
    res_greet = client.post("/assistant/chat", json={"message": "hello", "language": "en"}, headers=auth_headers)
    assert res_greet.status_code == 200
    assert "Hello" in res_greet.json()["reply"] or "Welcome" in res_greet.json()["reply"]

    # Test off-topic non-agricultural queries are strictly refused
    res_java = client.post("/assistant/chat", json={"message": "what is java", "language": "en"}, headers=auth_headers)
    assert res_java.status_code == 200
    reply = res_java.json()["reply"]
    assert "Topic Limitation" in reply or "agriculture" in reply.lower()
    assert "is a well-known computer programming language" not in reply

    # Test Hindi non-agricultural query is also refused
    res_random_hi = client.post("/assistant/chat", json={"message": "जावा क्या है", "language": "hi"}, headers=auth_headers)
    assert res_random_hi.status_code == 200
    assert "केवल कृषि" in res_random_hi.json()["reply"]



def test_crop_image_analysis_endpoint(client, auth_headers):
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP///w==",
        "crop_hint": "Tomato",
        "language": "en",
    }
    res = client.post("/assistant/analyze-crop-image", json=payload, headers=auth_headers)
    assert res.status_code == 200
    diag = res.json()
    assert "crop_name" in diag
    assert "condition" in diag
    assert "chemical_treatment" in diag
    assert "organic_remedy" in diag
    assert diag["confidence_pct"] > 50


def test_crop_image_analysis_rejects_non_crop(client, auth_headers):
    payload = {
        "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP///w==",
        "crop_hint": "Marble Wall with Air Conditioner",
        "language": "en",
    }
    res = client.post("/assistant/analyze-crop-image", json=payload, headers=auth_headers)
    assert res.status_code == 200
    diag = res.json()
    assert diag["is_crop"] is False
    assert "Not an Agricultural Crop" in diag["condition"]


def test_buyer_dashboard_summary(client, auth_headers):
    res = client.get("/dashboard/buyer-summary", headers=auth_headers)
    assert res.status_code == 200
    summary = res.json()
    assert "active_requirements_count" in summary
    assert "total_farmer_produce_lots" in summary
    assert "total_supply_quantity_qtl" in summary
    assert "unique_crops_available" in summary
    assert "avg_market_price_qtl" in summary
    assert "active_mandis_count" in summary
    assert "next_action" in summary


def test_detect_farmer_region_endpoint(client):
    # Test coordinates detection (e.g. Nashik, Maharashtra)
    res_coords = client.get("/farmers/detect-region?latitude=19.99&longitude=73.78")
    assert res_coords.status_code == 200
    data_coords = res_coords.json()
    assert data_coords["state"] == "Maharashtra"
    assert data_coords["language"] == "mr"

    # Test location text detection (e.g. Punjab city Ludhiana)
    res_text = client.get("/farmers/detect-region?location=Ludhiana")
    assert res_text.status_code == 200
    data_text = res_text.json()
    assert data_text["state"] == "Punjab"
    assert data_text["language"] == "pa"

    # Test Kerala (Kochi / Malayalam)
    res_kerala = client.get("/farmers/detect-region?location=Kochi, Kerala")
    assert res_kerala.status_code == 200
    assert res_kerala.json()["language"] == "ml"
    assert res_kerala.json()["state"] == "Kerala"

    # Test Odisha (Odia)
    res_odisha = client.get("/farmers/detect-region?location=Bhubaneswar")
    assert res_odisha.status_code == 200
    assert res_odisha.json()["language"] == "or"
    assert res_odisha.json()["state"] == "Odisha"

    # Test Assam (Assamese)
    res_assam = client.get("/farmers/detect-region?location=Guwahati")
    assert res_assam.status_code == 200
    assert res_assam.json()["language"] == "as"
    assert res_assam.json()["state"] == "Assam"

    # Test Kashmir (Kashmiri)
    res_kashmir = client.get("/farmers/detect-region?location=Srinagar")
    assert res_kashmir.status_code == 200
    assert res_kashmir.json()["language"] == "ks"

    # Test Goa (Konkani)
    res_goa = client.get("/farmers/detect-region?location=Panaji, Goa")
    assert res_goa.status_code == 200
    assert res_goa.json()["language"] == "kok"


def test_assistant_crop_symptom_awareness(client, auth_headers):
    # Test potato with typo 'patato'
    potato_res = client.post(
        "/assistant/chat",
        json={"message": "patato blight and leaf curl", "language": "en"},
        headers=auth_headers,
    )
    assert potato_res.status_code == 200
    potato_reply = potato_res.json()["reply"]
    assert "Potato" in potato_reply or "Late Blight" in potato_reply
    assert "Ridomil" in potato_reply or "Curzate" in potato_reply or "PLRV" in potato_reply

    # Test wheat blight and leaf curl -> must NOT give potato blight
    wheat_res = client.post(
        "/assistant/chat",
        json={"message": "wheat blight and leaf curl", "language": "en"},
        headers=auth_headers,
    )
    assert wheat_res.status_code == 200
    wheat_reply = wheat_res.json()["reply"]
    assert "Wheat" in wheat_reply
    assert "Fusarium" in wheat_reply or "Head Blight" in wheat_reply or "Folicur" in wheat_reply or "Tilt" in wheat_reply


def test_crop_vision_with_question(client, auth_headers):
    import base64
    fake_img = base64.b64encode(b"fake_image_bytes").decode("utf-8")

    res = client.post(
        "/assistant/analyze-crop-image",
        json={
            "image_base64": fake_img,
            "crop_hint": "Rose / Floral Horticulture",
            "question": "how to cure white powder on rose?",
            "language": "en",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    diag = res.json()
    assert diag["is_crop"] is True
    assert "Rose" in diag["crop_name"]
    assert "how to cure white powder on rose?" in diag["summary"]


def test_crop_vision_non_crop_and_vague_question_rejection(client, auth_headers):
    import base64
    fake_img = base64.b64encode(b"fake_image_bytes").decode("utf-8")

    # When user uploads an image and asks "What is this" without crop hint
    res = client.post(
        "/assistant/analyze-crop-image",
        json={
            "image_base64": fake_img,
            "question": "What is this",
            "language": "hi",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    diag = res.json()
    assert diag["is_crop"] is False
    assert "टमाटर" not in diag["crop_name"]

    # When non-crop object like switchboard/wall is indicated
    res2 = client.post(
        "/assistant/analyze-crop-image",
        json={
            "image_base64": fake_img,
            "question": "switch board on wall",
            "language": "en",
        },
        headers=auth_headers,
    )
    assert res2.status_code == 200
    assert res2.json()["is_crop"] is False


def test_corn_smut_auto_detection_and_multi_crop(client, auth_headers):
    import base64
    from PIL import Image
    import io

    # Generate synthetic corn plant with ear and smut fungal gall
    img = Image.new("RGB", (40, 40), (20, 140, 30))
    for x in range(10, 25):
        for y in range(10, 30):
            img.putpixel((x, y), (210, 170, 30))
    for x in range(12, 18):
        for y in range(15, 22):
            img.putpixel((x, y), (140, 140, 140))
    for x in range(14, 17):
        for y in range(17, 20):
            img.putpixel((x, y), (20, 20, 20))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    corn_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    # 1. Corn image with vague question "why is this?" and NO crop hint -> Must identify Maize Corn Smut
    res1 = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": corn_b64, "question": "why is this?", "language": "en"},
        headers=auth_headers,
    )
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["is_crop"] is True
    assert "Maize" in d1["crop_name"]
    assert "Smut" in d1["condition"]
    assert "why is this?" in d1["summary"]

    # 2. Corn image with single question mark "?"
    res2 = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": corn_b64, "question": "?", "language": "en"},
        headers=auth_headers,
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["is_crop"] is True
    assert "Maize" in d2["crop_name"]

    # 3. Other crops via hint or selection must never hallucinate Tomato
    crops = ["Wheat", "Potato", "Paddy / Rice", "Cotton", "Sugarcane", "Soybean"]
    for c in crops:
        res_c = client.post(
            "/assistant/analyze-crop-image",
            json={"image_base64": corn_b64, "crop_hint": c, "language": "en"},
            headers=auth_headers,
        )
        assert res_c.status_code == 200
        d_c = res_c.json()
        assert d_c["is_crop"] is True
        assert "Tomato" not in d_c["crop_name"], f"Defaulted to Tomato for {c}!"


def test_distinct_crop_problem_answers(client, auth_headers):
    # 1. Tomato fruit borer -> Coragen / Emamectin, NOT general blight/mandi text
    res1 = client.post(
        "/assistant/chat",
        json={"message": "टमाटर में फल में छेद करने वाली इल्ली लगी है", "language": "hi"},
        headers=auth_headers,
    )
    assert res1.status_code == 200
    reply1 = res1.json()["reply"]
    assert "इल्ली" in reply1 or "छेदक" in reply1 or "कोराजन" in reply1

    # 2. Mustard aphids -> Rogor / Dimethoate
    res2 = client.post(
        "/assistant/chat",
        json={"message": "सरसों में माहू चेपा लगा है", "language": "hi"},
        headers=auth_headers,
    )
    assert res2.status_code == 200
    reply2 = res2.json()["reply"]
    assert "माहू" in reply2 or "रोगोर" in reply2

    # 3. Wheat termites -> Chlorpyrifos / Fipronil
    res3 = client.post(
        "/assistant/chat",
        json={"message": "गेहूं की जड़ में दीमक लग गई है", "language": "hi"},
        headers=auth_headers,
    )
    assert res3.status_code == 200
    reply3 = res3.json()["reply"]
    assert "दीमक" in reply3 or "क्लोरोपायरीफॉस" in reply3 or "फिप्रोनिल" in reply3


def test_crop_vision_accurate_crop_diagnosis(client, auth_headers):
    # Dummy green agricultural pixel base64 (10x10 green png)
    import base64
    import io
    from PIL import Image

    img = Image.new("RGB", (20, 20), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    dummy_b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    # 1. User specifies or asks about Maize / Corn -> Must diagnose Maize / Corn, NOT Tomato!
    res_corn = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": dummy_b64, "crop_hint": "Maize / Corn", "language": "en", "question": "caterpillar in whorl"},
        headers=auth_headers,
    )
    assert res_corn.status_code == 200
    data_corn = res_corn.json()
    assert data_corn["is_crop"] is True
    assert "Maize" in data_corn["crop_name"] or "Corn" in data_corn["crop_name"]
    assert "Fall Armyworm" in data_corn["condition"] or "Smut" in data_corn["condition"]

    # 2. User specifies Wheat -> Must diagnose Wheat, NOT Tomato!
    res_wheat = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": dummy_b64, "crop_hint": "Wheat", "language": "en", "question": "yellow rust on leaves"},
        headers=auth_headers,
    )
    assert res_wheat.status_code == 200
    data_wheat = res_wheat.json()
    assert "Wheat" in data_wheat["crop_name"]
    assert "Rust" in data_wheat["condition"]

    # 3. User specifies Sugarcane -> Must diagnose Sugarcane
    res_cane = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": dummy_b64, "crop_hint": "Sugarcane", "language": "hi", "question": "गन्ने में लाल सड़न है"},
        headers=auth_headers,
    )
    assert res_cane.status_code == 200
    data_cane = res_cane.json()
    assert "गन्ना" in data_cane["crop_name"] or "Sugarcane" in data_cane["crop_name"]
    assert "लाल सड़न" in data_cane["condition"] or "Red Rot" in data_cane["condition"]

    # 4. User specifies Potato -> Must diagnose Potato
    res_potato = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": dummy_b64, "crop_hint": "Potato", "language": "en", "question": "black rot on potato"},
        headers=auth_headers,
    )
    assert res_potato.status_code == 200
    data_potato = res_potato.json()
    assert "Potato" in data_potato["crop_name"]

    # 5. Non-crop appliance query must still be rejected
    res_reject = client.post(
        "/assistant/analyze-crop-image",
        json={"image_base64": dummy_b64, "crop_hint": "", "language": "en", "question": "switchboard on wall"},
        headers=auth_headers,
    )
    assert res_reject.status_code == 200
    assert res_reject.json()["is_crop"] is False


