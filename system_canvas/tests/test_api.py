# Copyright (c) 2026, Invento Software Limited and Contributors
# See license.txt

import unittest
import frappe
from system_canvas import api

class TestSystemCanvasAPI(unittest.TestCase):
	def setUp(self):
		self.project_name = "Test Jewellery ERP"
		if frappe.db.exists("DocType", "Test Customer"):
			frappe.delete_doc("DocType", "Test Customer", ignore_permissions=True, force=True)
		if frappe.db.exists("System Canvas Project", self.project_name):
			# Cleanup existing test data
			dts = frappe.get_all("System Canvas DocType", filters={"project": self.project_name}, pluck="name")
			for dt in dts:
				frappe.delete_doc("System Canvas DocType", dt, ignore_permissions=True)
			frappe.delete_doc("System Canvas Project", self.project_name, ignore_permissions=True)
			frappe.db.commit()

	def test_project_lifecycle_and_relation_inference(self):
		# 1. Create Project
		project = api.create_project(
			project_name=self.project_name,
			description="Jewellery business management system",
			module="Selling"
		)
		self.assertEqual(project["project_name"], self.project_name)

		# 2. Create DocType: Customer
		cust_dt = api.save_doctype(
			project_name=self.project_name,
			doctype_name="Customer",
			module="Selling",
			fields=[
				{"fieldname": "customer_name", "fieldtype": "Data", "reqd": 1},
				{"fieldname": "mobile", "fieldtype": "Data"},
				{"fieldname": "customer_group", "fieldtype": "Link", "options": "Customer Group"}
			]
		)
		self.assertEqual(cust_dt["doctype_name"], "Customer")

		# 3. Create DocType: Sales Order with Link field to Customer and Table field to Sales Order Item
		so_dt = api.save_doctype(
			project_name=self.project_name,
			doctype_name="Sales Order",
			module="Selling",
			is_submittable=1,
			fields=[
				{"fieldname": "customer", "fieldtype": "Link", "options": "Customer", "reqd": 1},
				{"fieldname": "transaction_date", "fieldtype": "Date"},
				{"fieldname": "items", "fieldtype": "Table", "options": "Sales Order Item"},
				{"fieldname": "grand_total", "fieldtype": "Currency"}
			]
		)
		self.assertEqual(so_dt["doctype_name"], "Sales Order")

		# 4. Get Project Details & Verify Inferred Relations
		details = api.get_project_details(self.project_name)
		self.assertEqual(len(details["doctypes"]), 2)
		
		# Check that Link field automatically inferred relation edge
		relations = details["data_relations"]
		link_rel = next((r for r in relations if r["source"] == "Sales Order" and r["target"] == "Customer"), None)
		self.assertIsNotNone(link_rel)
		self.assertEqual(link_rel["relation_type"], "Link")

		table_rel = next((r for r in relations if r["source"] == "Sales Order" and r["target"] == "Sales Order Item"), None)
		self.assertIsNotNone(table_rel)
		self.assertEqual(table_rel["relation_type"], "Table")

	def test_frappe_generator(self):
		api.create_project(project_name=self.project_name)
		api.save_doctype(
			project_name=self.project_name,
			doctype_name="Test Customer",
			fields=[{"fieldname": "customer_name", "fieldtype": "Data"}]
		)

		# Test Generator
		generated = api.generate_frappe_doctypes(self.project_name)
		self.assertEqual(generated["count"], 1)
		self.assertEqual(generated["doctypes"][0]["name"], "Test Customer")

	def test_system_doctype_import_and_listing(self):
		api.create_project(project_name=self.project_name)

		# 1. Fetch system doctypes list
		system_dts = api.get_all_system_doctypes(project_name=self.project_name)
		self.assertTrue(len(system_dts) > 0)
		has_user = any(d["doctype_name"] == "User" for d in system_dts)
		self.assertTrue(has_user)

		# 2. Get system doctype details for User
		user_details = api.get_system_doctype_details("User")
		self.assertEqual(user_details["doctype_name"], "User")
		self.assertTrue(len(user_details["fields"]) > 0)

		# 3. Add existing system DocType "Customer" to project with auto_fetch_relations=1
		imported = api.add_existing_doctype(project_name=self.project_name, doctype_name="Customer", auto_fetch_relations=1)
		self.assertEqual(imported["doctype_name"], "Customer")
		self.assertTrue("imported_related" in imported)

		# 4. Check project details contain Customer DocType and auto-imported related DocTypes
		details = api.get_project_details(self.project_name)
		doctype_names = [dt["doctype_name"] for dt in details["doctypes"]]
		self.assertIn("Customer", doctype_names)
		self.assertTrue(len(details["doctypes"]) > 1)
		self.assertTrue(len(details["data_relations"]) > 0)


