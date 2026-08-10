# Copyright (c) 2026, Invento Software Limited and Contributors
# See license.txt

import unittest
import frappe
from system_canvas import api

class TestSystemCanvasAPI(unittest.TestCase):
	def setUp(self):
		self.project_name = "Test Jewellery ERP"
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
				{"fieldname": "customer_name", "label": "Customer Name", "fieldtype": "Data", "reqd": 1},
				{"fieldname": "mobile", "label": "Mobile", "fieldtype": "Data"},
				{"fieldname": "customer_group", "label": "Customer Group", "fieldtype": "Link", "options": "Customer Group"}
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
				{"fieldname": "customer", "label": "Customer", "fieldtype": "Link", "options": "Customer", "reqd": 1},
				{"fieldname": "transaction_date", "label": "Transaction Date", "fieldtype": "Date"},
				{"fieldname": "items", "label": "Items", "fieldtype": "Table", "options": "Sales Order Item"},
				{"fieldname": "grand_total", "label": "Grand Total", "fieldtype": "Currency"}
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
			doctype_name="Customer",
			fields=[{"fieldname": "customer_name", "fieldtype": "Data"}]
		)

		# Test Generator
		generated = api.generate_frappe_doctypes(self.project_name)
		self.assertEqual(generated["count"], 1)
		self.assertEqual(generated["doctypes"][0]["name"], "Customer")
