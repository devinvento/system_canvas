# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import json
import frappe
from frappe import _

@frappe.whitelist()
def get_projects():
	"""Fetch list of system canvas projects with summary statistics."""
	projects = frappe.get_all(
		"System Canvas Project",
		fields=["name", "project_name", "module", "status", "description", "modified"]
	)
	
	for p in projects:
		doctypes = frappe.get_all(
			"System Canvas DocType",
			filters={"project": p.name},
			fields=["name", "doctype_name"]
		)
		p["doctype_count"] = len(doctypes)
		
		# Field count & Relation count
		dt_names = [dt.name for dt in doctypes]
		field_count = 0
		relation_count = 0
		if dt_names:
			fields = frappe.get_all(
				"System Canvas Field",
				filters={"parent": ["in", dt_names]},
				fields=["fieldtype", "options"]
			)
			field_count = len(fields)
			relation_count = sum(1 for f in fields if f.fieldtype in ["Link", "Table"] and f.options)
			
		p["field_count"] = field_count
		p["relation_count"] = relation_count
		
	return projects

@frappe.whitelist()
def create_project(project_name, description="", module="Custom"):
	"""Create a new System Canvas Project."""
	if not project_name:
		frappe.throw(_("Project Name is mandatory"))
		
	if frappe.db.exists("System Canvas Project", project_name):
		frappe.throw(_("Project with name '{0}' already exists").format(project_name))
		
	doc = frappe.get_doc({
		"doctype": "System Canvas Project",
		"project_name": project_name,
		"module": module or "Custom",
		"status": "Draft",
		"description": description
	})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return doc.as_dict()

@frappe.whitelist()
def get_project_details(project_name):
	"""Get complete project hierarchy: DocTypes, Fields, Workflows, and auto-computed relations."""
	if not frappe.db.exists("System Canvas Project", project_name):
		frappe.throw(_("Project '{0}' not found").format(project_name))
		
	project_doc = frappe.get_doc("System Canvas Project", project_name)
	
	# Fetch DocTypes & Fields
	doctype_docs = frappe.get_all(
		"System Canvas DocType",
		filters={"project": project_name},
		fields=["name", "doctype_name", "label", "module", "is_child_table", "is_submittable", "position_x", "position_y", "description"]
	)
	
	doctypes_list = []
	doctype_names_map = {dt.doctype_name: dt for dt in doctype_docs}
	
	for dt in doctype_docs:
		dt_obj = frappe.get_doc("System Canvas DocType", dt.name)
		doctypes_list.append(dt_obj.as_dict())
	
	# Compute Data Relations (from Link & Table fields)
	data_relations = []
	for dt in doctypes_list:
		src_name = dt.get("doctype_name")
		fields = dt.get("fields", [])
		for f in fields:
			ftype = f.get("fieldtype")
			target = f.get("options")
			fname = f.get("fieldname")
			if ftype in ["Link", "Table"] and target:
				data_relations.append({
					"source": src_name,
					"target": target,
					"fieldname": fname,
					"label": f.get("label") or fname,
					"relation_type": ftype,
					"is_internal": target in doctype_names_map
				})
				
	return {
		"project": project_doc.as_dict(),
		"doctypes": doctypes_list,
		"data_relations": data_relations
	}

@frappe.whitelist()
def save_doctype(project_name, doctype_name, label=None, module="Selling", is_child_table=0, is_submittable=0, description="", fields=None, position_x=100, position_y=100):
	"""Create or update a System Canvas DocType and its fields."""
	if not project_name or not doctype_name:
		frappe.throw(_("Project Name and DocType Name are required"))
		
	if isinstance(fields, str):
		fields = json.loads(fields)
		
	is_child_table = int(is_child_table or 0)
	is_submittable = int(is_submittable or 0)
	
	existing = frappe.db.get_value("System Canvas DocType", {"project": project_name, "doctype_name": doctype_name}, "name")
	
	if existing:
		doc = frappe.get_doc("System Canvas DocType", existing)
	else:
		doc = frappe.new_doc("System Canvas DocType")
		doc.project = project_name
		doc.doctype_name = doctype_name
		doc.position_x = float(position_x or 100)
		doc.position_y = float(position_y or 100)
		
	doc.label = label or doctype_name
	doc.module = module or "Selling"
	doc.is_child_table = is_child_table
	doc.is_submittable = is_submittable
	doc.description = description
	
	# Replace fields
	doc.fields = []
	if fields:
		for idx, f in enumerate(fields):
			ftype = f.get("fieldtype", "Data")
			target = f.get("options", "")
			fname = f.get("fieldname")
			
			doc.append("fields", {
				"fieldname": fname,
				"label": f.get("label") or fname,
				"fieldtype": ftype,
				"options": target,
				"reqd": int(f.get("reqd") or 0),
				"read_only": int(f.get("read_only") or 0),
				"in_list_view": int(f.get("in_list_view") or 0),
				"description": f.get("description", "")
			})
			
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return doc.as_dict()

@frappe.whitelist()
def delete_doctype(project_name, doctype_name):
	"""Delete a DocType from project."""
	name = frappe.db.get_value("System Canvas DocType", {"project": project_name, "doctype_name": doctype_name}, "name")
	if name:
		frappe.delete_doc("System Canvas DocType", name, ignore_permissions=True)
		frappe.db.commit()
	return {"status": "success"}

@frappe.whitelist()
def update_canvas_positions(project_name, positions):
	"""Bulk update node coordinates and expand status on canvas."""
	if isinstance(positions, str):
		positions = json.loads(positions)
		
	for dt_name, pos in positions.items():
		doc_name = frappe.db.get_value("System Canvas DocType", {"project": project_name, "doctype_name": dt_name}, "name")
		if doc_name:
			frappe.db.set_value("System Canvas DocType", doc_name, {
				"position_x": float(pos.get("x", 100)),
				"position_y": float(pos.get("y", 100))
			})
			
	frappe.db.commit()
	return {"status": "success"}

@frappe.whitelist()
def generate_frappe_doctypes(project_name):
	"""Generate standard Frappe DocType schemas for the specified project."""
	details = get_project_details(project_name)
	doctypes = details.get("doctypes", [])
	
	generated = []
	for dt in doctypes:
		schema = {
			"name": dt.get("doctype_name"),
			"label": dt.get("label") or dt.get("doctype_name"),
			"module": dt.get("module") or "Custom",
			"istable": dt.get("is_child_table", 0),
			"is_submittable": dt.get("is_submittable", 0),
			"fields": []
		}
		for f in dt.get("fields", []):
			schema["fields"].append({
				"fieldname": f.get("fieldname"),
				"label": f.get("label"),
				"fieldtype": f.get("fieldtype"),
				"options": f.get("options"),
				"reqd": f.get("reqd"),
				"read_only": f.get("read_only"),
				"in_list_view": f.get("in_list_view")
			})
		generated.append(schema)
		
	return {
		"project": project_name,
		"count": len(generated),
		"doctypes": generated
	}
