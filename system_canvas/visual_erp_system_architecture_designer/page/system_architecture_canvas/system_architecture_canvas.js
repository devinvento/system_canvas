frappe.pages['system-architecture-canvas'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'System Architecture Canvas',
		single_column: true
	});

	frappe.require([
		'/assets/system_canvas/css/system_canvas.css',
		'/assets/system_canvas/js/canvas_engine.js'
	], function() {
		window.canvasEngine = new window.SystemCanvasEngine({
			wrapper: $(page.body).get(0)
		});
	});
};
