import json

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:3001"


def wait_for_stable(page):
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1100})

    login_response = page.request.post(
        "http://127.0.0.1:18081/api/auth/login",
        data=json.dumps({"username": "admin-demo", "password": "admin123"}),
        headers={"Content-Type": "application/json"},
    )
    assert login_response.ok
    payload = login_response.json()
    sources_response = page.request.get(
        "http://127.0.0.1:18081/api/data-sources",
        headers={"Authorization": f"Bearer {payload['token']}"},
    )
    assert sources_response.ok
    sources_payload = sources_response.json()
    source_id = sources_payload["data"][0]["id"]

    page.goto(f"{BASE_URL}/login")
    page.evaluate(
        """session => {
            localStorage.setItem("role", session.role);
            localStorage.setItem("auth_token", session.token);
            localStorage.setItem("auth_user", session.username);
            localStorage.setItem("auth_display_name", session.displayName);
            if (session.email) localStorage.setItem("auth_email", session.email);
            if (session.department) localStorage.setItem("auth_department", session.department);
            if (session.expiresAt) localStorage.setItem("auth_expires_at", session.expiresAt);
        }""",
        payload,
    )

    page.goto(f"{BASE_URL}/data-hub")
    wait_for_stable(page)
    assert page.get_by_text("已分析的数据接入与直达 AI 路由").first.is_visible() or page.get_by_text("Profiled data intake with direct AI routing").first.is_visible()

    page.goto(f"{BASE_URL}/ai-assistant?sourceId={source_id}&preset=quality-ops-briefing&template=quality-variance")
    wait_for_stable(page)
    assert "sourceId=" in page.url
    assert page.get_by_text("后端编排预设").first.is_visible() or page.get_by_text("Backend orchestration preset").first.is_visible()

    page.goto(f"{BASE_URL}/reports?sourceId={source_id}&preset=report-author&template=defect-trend")
    wait_for_stable(page)
    assert "sourceId=" in page.url
    assert page.get_by_text("创建正式分析").first.is_visible() or page.get_by_text("Create a formal diagnosis").first.is_visible()

    page.goto(f"{BASE_URL}/training?sourceId={source_id}&preset=cpu-safe-demo&baseModel=yolov10n.pt&device=auto")
    wait_for_stable(page)
    assert page.get_by_text("真实 YOLO 训练发起中心").first.is_visible() or page.get_by_text("Real YOLO training launcher").first.is_visible()

    print("ui-param-smoke-ok")
    browser.close()
