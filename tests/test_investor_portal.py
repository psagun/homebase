"""Tests for the investor portal — admin CRUD, non-admin gating, investor scoping."""

import uuid

PROPERTY_PAYLOAD = {
    "name": "Test House",
    "address_line_1": "123 Test St",
    "city": "Testville",
    "state": "TS",
    "postal_code": "12345",
    "property_type": "Single Family",
    "status": "Vacant",
}


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

class TestAdminInvestorCRUD:
    """Admin can manage investors via /api/v1/admin/investors."""

    def test_admin_create_investor(self, auth_client):
        """Admin creates an investor, returns 201 with temp_password."""
        resp = auth_client.post("/api/v1/admin/investors", json={
            "name": "Alice Investor",
            "email": "alice@test.com",
            "property_ids": [],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Alice Investor"
        assert data["email"] == "alice@test.com"
        assert data["role"] == "investor"
        assert data["temp_password"] is not None
        assert len(data["temp_password"]) > 0

    def test_admin_create_investor_with_properties(self, auth_client):
        """Admin creates an investor with property assignments."""
        prop = auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD).json()
        prop_id = prop["id"]

        resp = auth_client.post("/api/v1/admin/investors", json={
            "name": "Bob Investor",
            "email": "bob@test.com",
            "property_ids": [prop_id],
        })
        assert resp.status_code == 201
        assert prop_id in resp.json()["property_ids"]

    def test_admin_list_investors(self, auth_client):
        """Admin lists investors, returns 200."""
        auth_client.post("/api/v1/admin/investors", json={
            "name": "One", "email": "one@test.com", "property_ids": [],
        })
        auth_client.post("/api/v1/admin/investors", json={
            "name": "Two", "email": "two@test.com", "property_ids": [],
        })
        resp = auth_client.get("/api/v1/admin/investors")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        emails = {d["email"] for d in data}
        assert "one@test.com" in emails
        assert "two@test.com" in emails

    def test_duplicate_email_returns_409(self, auth_client):
        """Creating an investor with an existing email returns 409."""
        auth_client.post("/api/v1/admin/investors", json={
            "name": "Original", "email": "dup@test.com", "property_ids": [],
        })
        resp = auth_client.post("/api/v1/admin/investors", json={
            "name": "Duplicate", "email": "dup@test.com", "property_ids": [],
        })
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"].lower()

    def test_admin_update_investor(self, auth_client):
        """Admin updates investor name and property assignments."""
        # Create an investor with no properties
        inv = auth_client.post("/api/v1/admin/investors", json={
            "name": "Old Name", "email": "update@test.com", "property_ids": [],
        }).json()
        inv_id = inv["id"]

        # Update name only
        resp = auth_client.patch(f"/api/v1/admin/investors/{inv_id}", json={
            "name": "New Name",
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"
        assert resp.json()["email"] == "update@test.com"

        # Create a property and assign it
        prop = auth_client.post("/api/v1/properties/", json=PROPERTY_PAYLOAD).json()
        prop_id = prop["id"]
        resp = auth_client.patch(f"/api/v1/admin/investors/{inv_id}", json={
            "property_ids": [prop_id],
        })
        assert resp.status_code == 200
        assert prop_id in resp.json()["property_ids"]

    def test_admin_reset_investor_password(self, auth_client):
        """Admin resets investor password, returns 200 with new_password."""
        inv = auth_client.post("/api/v1/admin/investors", json={
            "name": "Reset Me", "email": "reset@test.com", "property_ids": [],
        }).json()
        inv_id = inv["id"]

        resp = auth_client.post(f"/api/v1/admin/investors/{inv_id}/reset-password")
        assert resp.status_code == 200
        data = resp.json()
        assert "temp_password" in data
        assert len(data["temp_password"]) > 0

    def test_admin_delete_investor(self, auth_client):
        """Admin deletes an investor, returns 204."""
        inv = auth_client.post("/api/v1/admin/investors", json={
            "name": "Delete Me", "email": "delete@test.com", "property_ids": [],
        }).json()
        inv_id = inv["id"]

        resp = auth_client.delete(f"/api/v1/admin/investors/{inv_id}")
        assert resp.status_code == 204

        # Verify they are gone
        resp = auth_client.get("/api/v1/admin/investors")
        assert len(resp.json()) == 0


# ---------------------------------------------------------------------------
# Non-admin gating
# ---------------------------------------------------------------------------

class TestNonAdminGating:
    """Non-admin users get 403 for admin endpoints."""

    @staticmethod
    def _create_investor(auth_client, client, email: str = "investor@test.com"):
        """Create an investor via admin API and return their auth token."""
        inv = auth_client.post("/api/v1/admin/investors", json={
            "name": "Non Admin", "email": email, "property_ids": [],
        }).json()
        temp_password = inv["temp_password"]

        login = client.post("/api/v1/auth/login", json={
            "email": email, "password": temp_password,
        })
        return login.json()["access_token"]

    def test_non_admin_cannot_list_investors(self, auth_client, client):
        token = self._create_investor(auth_client, client)
        resp = client.get("/api/v1/admin/investors",
                          headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_non_admin_cannot_create_investor(self, auth_client, client):
        token = self._create_investor(auth_client, client, "create@test.com")
        resp = client.post("/api/v1/admin/investors", json={
            "name": "Should Fail", "email": "fail@test.com", "property_ids": [],
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_non_admin_cannot_update_investor(self, auth_client, client):
        token = self._create_investor(auth_client, client, "update@test.com")
        resp = client.patch(f"/api/v1/admin/investors/{uuid.uuid4()}", json={
            "name": "Should Fail",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_non_admin_cannot_reset_password(self, auth_client, client):
        token = self._create_investor(auth_client, client, "reset@test.com")
        resp = client.post(f"/api/v1/admin/investors/{uuid.uuid4()}/reset-password",
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_non_admin_cannot_delete_investor(self, auth_client, client):
        token = self._create_investor(auth_client, client, "delete@test.com")
        resp = client.delete(f"/api/v1/admin/investors/{uuid.uuid4()}",
                             headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Investor scoping
# ---------------------------------------------------------------------------

class TestInvestorScoping:
    """Investor dashboard shows only assigned properties."""

    def _create_investor_as_admin(self, auth_client, email: str, property_ids: list[str]):
        """Create an investor via admin API."""
        inv = auth_client.post("/api/v1/admin/investors", json={
            "name": "Scoped Investor", "email": email,
            "property_ids": property_ids,
        }).json()
        return inv["id"], inv["temp_password"]

    def test_investor_dashboard_shows_only_assigned_properties(
        self, auth_client, client
    ):
        """Investor dashboard summary and list are scoped to assigned properties."""
        # Create two properties as admin
        prop_a = auth_client.post(
            "/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "Property A"}
        ).json()
        auth_client.post(
            "/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "Property B"}
        ).json()

        # Create investor assigned only to property A
        _, temp_password = self._create_investor_as_admin(
            auth_client, "scoped@test.com", [prop_a["id"]]
        )

        # Login as the investor
        login = client.post("/api/v1/auth/login", json={
            "email": "scoped@test.com", "password": temp_password,
        })
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Dashboard summary should show 1 property
        summary = client.get("/api/v1/dashboard/summary", headers=headers)
        assert summary.status_code == 200
        assert summary.json()["total_properties"] == 1

        # Dashboard properties list should only include property A
        props = client.get("/api/v1/dashboard/properties", headers=headers)
        assert props.status_code == 200
        prop_names = [p["name"] for p in props.json()]
        assert "Property A" in prop_names
        assert "Property B" not in prop_names

    def test_investor_can_access_assigned_property_endpoint(
        self, auth_client, client
    ):
        """Investor can read an assigned property via the property endpoint."""
        prop = auth_client.post(
            "/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "My Property"}
        ).json()
        prop_id = prop["id"]

        _, temp_password = self._create_investor_as_admin(
            auth_client, "access@test.com", [prop_id]
        )

        login = client.post("/api/v1/auth/login", json={
            "email": "access@test.com", "password": temp_password,
        })
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.get(f"/api/v1/properties/{prop_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "My Property"

    def test_investor_gets_404_for_unassigned_property(
        self, auth_client, client
    ):
        """Investor gets 404 when accessing an unassigned property."""
        prop_a = auth_client.post(
            "/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "Assigned"}
        ).json()
        prop_b = auth_client.post(
            "/api/v1/properties/", json={**PROPERTY_PAYLOAD, "name": "Unassigned"}
        ).json()

        # Investor gets only property A
        _, temp_password = self._create_investor_as_admin(
            auth_client, "scoped404@test.com", [prop_a["id"]]
        )

        login = client.post("/api/v1/auth/login", json={
            "email": "scoped404@test.com", "password": temp_password,
        })
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Should see assigned property
        resp = client.get(f"/api/v1/properties/{prop_a['id']}", headers=headers)
        assert resp.status_code == 200

        # Should get 404 for unassigned property
        resp = client.get(f"/api/v1/properties/{prop_b['id']}", headers=headers)
        assert resp.status_code == 404
