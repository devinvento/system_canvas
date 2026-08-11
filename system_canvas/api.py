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
		fields=["name", "doctype_name", "is_child_table", "is_submittable", "position_x", "position_y", "description"]
	)
	
	doctypes_list = []
	doctype_names_map = {dt.doctype_name: dt for dt in doctype_docs}
	
	project_module = project_doc.module or "Custom"
	for dt in doctype_docs:
		dt_obj = frappe.get_doc("System Canvas DocType", dt.name)
		dt_dict = dt_obj.as_dict()
		dt_dict["module"] = project_module
		doctypes_list.append(dt_dict)
	
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
					"relation_type": ftype,
					"is_internal": target in doctype_names_map
				})
				
	return {
		"project": project_doc.as_dict(),
		"doctypes": doctypes_list,
		"data_relations": data_relations
	}

@frappe.whitelist()
def save_doctype(project_name, doctype_name, module="Selling", is_child_table=0, is_submittable=0, description="", fields=None, position_x=100, position_y=100):
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
	"""Generate and save standard/custom Frappe DocType schemas for the specified project."""
	details = get_project_details(project_name)
	doctypes = details.get("doctypes", [])
	
	generated = []
	for dt in doctypes:
		dt_name = dt.get("doctype_name")
		is_child_table = int(dt.get("is_child_table", 0))
		is_submittable = int(dt.get("is_submittable", 0))
		module = dt.get("module") or "Custom"
		
		# Build fields
		fields_list = []
		for f in dt.get("fields", []):
			fields_list.append({
				"fieldname": f.get("fieldname"),
				"label": f.get("fieldname").replace("_", " ").title() if f.get("fieldname") else "",
				"fieldtype": f.get("fieldtype"),
				"options": f.get("options"),
				"reqd": int(f.get("reqd") or 0),
				"read_only": int(f.get("read_only") or 0),
				"in_list_view": int(f.get("in_list_view") or 0)
			})
		
		if frappe.db.exists("DocType", dt_name):
			is_custom = frappe.db.get_value("DocType", dt_name, "custom")
			if not is_custom:
				frappe.throw(_("DocType '{0}' is a standard Frappe DocType and cannot be generated or modified.").format(dt_name))
			
			# Load and update
			doc = frappe.get_doc("DocType", dt_name)
			doc.istable = is_child_table
			doc.is_submittable = is_submittable
			doc.module = module
			doc.custom = 1
			doc.fields = []
			for fld in fields_list:
				doc.append("fields", fld)
			doc.save(ignore_permissions=True)
		else:
			# Create new
			doc = frappe.get_doc({
				"doctype": "DocType",
				"name": dt_name,
				"module": module,
				"custom": 1,
				"autoname": "hash" if is_child_table else "Prompt",
				"istable": is_child_table,
				"is_submittable": is_submittable,
				"fields": fields_list,
				"permissions": [
					{
						"role": "System Manager",
						"read": 1,
						"write": 1,
						"create": 1,
						"delete": 1,
						"submit": is_submittable,
						"cancel": is_submittable,
						"amend": is_submittable
					}
				] if not is_child_table else []
			})
			doc.insert(ignore_permissions=True)
			
		schema = {
			"name": dt_name,
			"label": dt_name,
			"module": module,
			"istable": is_child_table,
			"is_submittable": is_submittable,
			"fields": fields_list
		}
		generated.append(schema)
		
	frappe.db.commit()
	
	return {
		"project": project_name,
		"count": len(generated),
		"doctypes": generated
	}

@frappe.whitelist()
def get_all_system_doctypes(project_name=None):
	"""Fetch list of all existing Frappe DocTypes in system with module and child table info."""
	doctypes = frappe.get_all(
		"DocType",
		filters={"issingle": 0},
		fields=["name", "module", "istable", "is_submittable", "custom"],
		order_by="name asc"
	)
	
	existing_in_project = set()
	if project_name:
		existing_in_project = set(
			frappe.get_all("System Canvas DocType", filters={"project": project_name}, pluck="doctype_name")
		)
		
	result = []
	for dt in doctypes:
		result.append({
			"doctype_name": dt.name,
			"module": dt.module or "Custom",
			"is_child_table": int(dt.istable or 0),
			"is_submittable": int(dt.is_submittable or 0),
			"custom": int(dt.custom or 0),
			"in_project": dt.name in existing_in_project
		})
		
	return result

VALID_FIELD_TYPES = {
	"Data", "Link", "Table", "Select", "Int", "Float", "Currency", "Check", "Date",
	"Datetime", "Small Text", "Text", "Code", "Dynamic Link", "Attach", "Attach Image",
	"Signature", "Color", "Rating", "Read Only", "Button", "Password", "Long Text",
	"Heading", "Fold", "Percent", "Time", "Duration", "JSON", "Geolocation",
	"Autocomplete", "Icon"
}

@frappe.whitelist()
def get_system_doctype_details(doctype_name):
	"""Get details of an existing Frappe DocType schema including fields and relations."""
	if not frappe.db.exists("DocType", doctype_name):
		frappe.throw(_("DocType '{0}' not found in system").format(doctype_name))
		
	doc = frappe.get_doc("DocType", doctype_name)
	
	fields = []
	layout_types = ["Section Break", "Column Break", "Tab Break", "HTML", "HTML Field"]
	for f in doc.fields:
		if f.fieldtype not in layout_types and f.fieldname:
			ftype = f.fieldtype if f.fieldtype in VALID_FIELD_TYPES else "Data"
			fields.append({
				"fieldname": f.fieldname,
				"fieldtype": ftype,
				"options": f.options or "",
				"reqd": int(f.reqd or 0),
				"read_only": int(f.read_only or 0),
				"in_list_view": int(f.in_list_view or 0),
				"description": frappe.utils.strip_html(f.description or "")[:140]


			})
			
	return {
		"doctype_name": doc.name,
		"module": doc.module,
		"is_child_table": int(doc.istable or 0),
		"is_submittable": int(doc.is_submittable or 0),
		"description": doc.description or "",
		"fields": fields
	}


@frappe.whitelist()
def add_existing_doctype(project_name, doctype_name, position_x=100, position_y=100, auto_fetch_relations=1):
	"""Import and add an existing Frappe system DocType schema to System Canvas project, auto-fetching related Link & Table DocTypes."""
	auto_fetch_relations = int(auto_fetch_relations or 0)
	dt_details = get_system_doctype_details(doctype_name)
	
	saved = save_doctype(
		project_name=project_name,
		doctype_name=dt_details["doctype_name"],
		module=dt_details["module"],
		is_child_table=dt_details["is_child_table"],
		is_submittable=dt_details["is_submittable"],
		description=dt_details["description"],
		fields=dt_details["fields"],
		position_x=position_x,
		position_y=position_y
	)
	
	imported_related = []
	if auto_fetch_relations:
		fields = dt_details.get("fields", [])
		for f in fields:
			ftype = f.get("fieldtype")
			target = f.get("options")
			if ftype in ["Link", "Table"] and target and target != doctype_name:
				# Check if target exists in Frappe DB and not yet in System Canvas Project
				if frappe.db.exists("DocType", target):
					exists_in_proj = frappe.db.exists("System Canvas DocType", {"project": project_name, "doctype_name": target})
					if not exists_in_proj:
						try:
							rel_dt = get_system_doctype_details(target)
							save_doctype(
								project_name=project_name,
								doctype_name=rel_dt["doctype_name"],
								module=rel_dt["module"],
								is_child_table=rel_dt["is_child_table"],
								is_submittable=rel_dt["is_submittable"],
								description=rel_dt["description"],
								fields=rel_dt["fields"],
								position_x=float(position_x or 100) + 260,
								position_y=float(position_y or 100) + 120
							)
							imported_related.append(target)
						except Exception as e:
							frappe.log_error(f"Error auto-importing relation DocType {target}: {str(e)}")
							
	saved["imported_related"] = imported_related
	return saved


