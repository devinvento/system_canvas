/* System Canvas - Core Interactive Canvas Engine */

window.SystemCanvasEngine = class SystemCanvasEngine {
	constructor(options) {
		this.wrapper = options.wrapper;
		this.projectName = options.projectName || null;
		
		// Canvas state
		this.panX = 0;
		this.panY = 0;
		this.zoom = 1;
		this.isPanning = false;
		this.startPanX = 0;
		this.startPanY = 0;
		
		// Data state
		this.projectData = null;
		this.doctypes = [];
		this.dataRelations = [];
		
		// Interaction state
		this.selectedDocType = null;
		this.focusedDocType = null;
		this.filterDataRelations = true;
		this.filterChildTables = true;
		this.searchQuery = "";
		
		this.initDOM();
		this.bindEvents();
	}
	
	initDOM() {
		this.wrapper.innerHTML = `
			<div class="sc-container sc-app-wrapper">
				<!-- Header -->
				<header class="sc-header">
					<div class="sc-header-left">
						<div class="sc-brand">
							<div class="sc-brand-icon">SC</div>
							<span>System Canvas</span>
						</div>
						<select class="sc-project-selector" id="sc-project-select">
							<option value="">-- Select Project --</option>
						</select>
						<button class="sc-btn sc-btn-primary" id="sc-btn-new-project">+ New Project</button>
					</div>
					<div class="sc-header-actions">
						<button class="sc-btn" id="sc-btn-new-doctype" style="display:none;">+ New DocType</button>
						<button class="sc-btn" id="sc-btn-auto-layout" style="display:none;">📐 Auto Layout</button>
						<button class="sc-btn" id="sc-btn-full-canvas" style="display:none;">Fit Canvas</button>
						<button class="sc-btn sc-btn-success" id="sc-btn-generate" style="display:none;">⚡ Generate Frappe</button>
					</div>
				</header>
				
				<!-- 3-Pane Body -->
				<div class="sc-body">
					<!-- Left Explorer -->
					<aside class="sc-sidebar-left">
						<div class="sc-sidebar-header">
							<span>Project Explorer</span>
							<span id="sc-explorer-count">0 DocTypes</span>
						</div>
						<div class="sc-tree-container" id="sc-tree-container">
							<div style="padding:16px; color:var(--sc-text-muted); text-align:center;">Select or create a project to start</div>
						</div>
					</aside>
					
					<!-- Center Canvas -->
					<main class="sc-canvas-viewport" id="sc-canvas-viewport">
						<!-- Filters & Search -->
						<div class="sc-canvas-filters" id="sc-canvas-filters" style="display:none;">
							<label class="sc-filter-label">
								<input type="checkbox" id="sc-filter-data" checked>
								<span>Data Relations</span>
							</label>
							<label class="sc-filter-label">
								<input type="checkbox" id="sc-filter-child" checked>
								<span>Child Tables</span>
							</label>
						</div>
						
						<div class="sc-search-box" id="sc-search-box" style="display:none;">
							<input type="text" class="sc-search-input" id="sc-search-input" placeholder="🔍 Search DocType / Field...">
						</div>
						
						<!-- Transform Container -->
						<div class="sc-canvas-transform" id="sc-canvas-transform">
							<svg class="sc-svg-layer" id="sc-svg-layer">
								<defs>
									<marker id="arrow-data" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
										<path d="M0,0 L0,6 L9,3 z" fill="#38BDF8" />
									</marker>
									<marker id="arrow-table" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
										<path d="M0,0 L0,6 L9,3 z" fill="#F59E0B" />
									</marker>
								</defs>
								<g id="sc-svg-edges-group"></g>
							</svg>
							<div id="sc-nodes-layer"></div>
						</div>
						
						<!-- Canvas Zoom Controls -->
						<div class="sc-canvas-controls" id="sc-canvas-controls" style="display:none;">
							<button class="sc-btn" id="sc-zoom-in">+</button>
							<button class="sc-btn" id="sc-zoom-reset">100%</button>
							<button class="sc-btn" id="sc-zoom-out">-</button>
							<button class="sc-btn" id="sc-focus-reset">Reset Focus</button>
						</div>
					</main>
					
					<!-- Right Inspector Panel -->
					<aside class="sc-sidebar-right" id="sc-sidebar-right">
						<div class="sc-inspector-header">
							<span class="sc-inspector-title">Properties</span>
						</div>
						<div class="sc-inspector-content" id="sc-inspector-content">
							<div style="color:var(--sc-text-muted); text-align:center; padding-top:40px;">Select an item to view properties</div>
						</div>
					</aside>
				</div>
			</div>
			
			<!-- Modal Container (Level 3 Detail View) -->
			<div id="sc-modal-container"></div>
		`;
		
		this.viewport = document.getElementById('sc-canvas-viewport');
		this.transformLayer = document.getElementById('sc-canvas-transform');
		this.nodesLayer = document.getElementById('sc-nodes-layer');
		this.svgEdgesGroup = document.getElementById('sc-svg-edges-group');
		this.inspectorContent = document.getElementById('sc-inspector-content');
		this.treeContainer = document.getElementById('sc-tree-container');
		this.projectSelect = document.getElementById('sc-project-select');
		
		this.loadProjectsList();
	}
	
	bindEvents() {
		// Zoom & Pan
		this.viewport.addEventListener('wheel', (e) => {
			e.preventDefault();
			const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
			this.setZoom(this.zoom * zoomFactor, e.clientX, e.clientY);
		});
		
		this.viewport.addEventListener('mousedown', (e) => {
			if (e.target === this.viewport || e.target.tagName === 'svg' || e.target.id === 'sc-canvas-transform') {
				this.isPanning = true;
				this.startPanX = e.clientX - this.panX;
				this.startPanY = e.clientY - this.panY;
			}
		});
		
		window.addEventListener('mousemove', (e) => {
			if (this.isPanning) {
				this.panX = e.clientX - this.startPanX;
				this.panY = e.clientY - this.startPanY;
				this.applyTransform();
			}
		});
		
		window.addEventListener('mouseup', () => {
			this.isPanning = false;
		});
		
		// Controls
		document.getElementById('sc-zoom-in').addEventListener('click', () => this.setZoom(this.zoom * 1.2));
		document.getElementById('sc-zoom-out').addEventListener('click', () => this.setZoom(this.zoom * 0.8));
		document.getElementById('sc-zoom-reset').addEventListener('click', () => {
			this.zoom = 1;
			this.panX = 0;
			this.panY = 0;
			this.applyTransform();
		});
		document.getElementById('sc-btn-full-canvas').addEventListener('click', () => this.fitToScreen());
		document.getElementById('sc-focus-reset').addEventListener('click', () => this.setFocus(null));
		
		// Project Selector & Buttons
		this.projectSelect.addEventListener('change', (e) => {
			if (e.target.value) {
				this.loadProject(e.target.value);
			}
		});
		
		document.getElementById('sc-btn-new-project').addEventListener('click', () => this.showNewProjectModal());
		document.getElementById('sc-btn-new-doctype').addEventListener('click', () => this.showNewDocTypeModal());
		document.getElementById('sc-btn-auto-layout').addEventListener('click', () => this.autoLayout());
		document.getElementById('sc-btn-generate').addEventListener('click', () => this.triggerGenerateFrappe());
		
		// Filters & Search
		document.getElementById('sc-filter-data').addEventListener('change', (e) => {
			this.filterDataRelations = e.target.checked;
			this.renderEdges();
		});
		document.getElementById('sc-filter-child').addEventListener('change', (e) => {
			this.filterChildTables = e.target.checked;
			this.renderNodes();
			this.renderEdges();
		});
		
		document.getElementById('sc-search-input').addEventListener('input', (e) => {
			this.searchQuery = e.target.value.toLowerCase().trim();
			this.filterNodesBySearch();
		});
	}
	
	setZoom(newZoom, originX, originY) {
		this.zoom = Math.min(Math.max(newZoom, 0.2), 2.5);
		this.applyTransform();
		document.getElementById('sc-zoom-reset').innerText = `${Math.round(this.zoom * 100)}%`;
	}
	
	applyTransform() {
		this.transformLayer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
	}
	
	loadProjectsList() {
		frappe.call({
			method: "system_canvas.api.get_projects",
			callback: (r) => {
				const projects = r.message || [];
				this.projectSelect.innerHTML = '<option value="">-- Select Project --</option>';
				projects.forEach(p => {
					const opt = document.createElement('option');
					opt.value = p.name;
					opt.textContent = `${p.project_name} (${p.doctype_count} DocTypes)`;
					this.projectSelect.appendChild(opt);
				});
				
				if (projects.length > 0 && !this.projectName) {
					this.projectSelect.value = projects[0].name;
					this.loadProject(projects[0].name);
				}
			}
		});
	}
	
	loadProject(projectName) {
		this.projectName = projectName;
		frappe.call({
			method: "system_canvas.api.get_project_details",
			args: { project_name: projectName },
			callback: (r) => {
				if (r.message) {
					this.projectData = r.message.project;
					this.doctypes = r.message.doctypes || [];
					this.dataRelations = r.message.data_relations || [];
					
					this.showProjectUI();
					this.renderTree();
					
					const hasCustomPos = this.doctypes.some(d => d.position_x && d.position_x !== 100);
					if (!hasCustomPos && this.doctypes.length > 0) {
						this.autoLayout();
					} else {
						this.renderNodes();
						this.renderEdges();
					}
				}
			}
		});
	}
	
	showProjectUI() {
		document.getElementById('sc-btn-new-doctype').style.display = 'inline-flex';
		document.getElementById('sc-btn-auto-layout').style.display = 'inline-flex';
		document.getElementById('sc-btn-full-canvas').style.display = 'inline-flex';
		document.getElementById('sc-btn-generate').style.display = 'inline-flex';
		document.getElementById('sc-canvas-controls').style.display = 'flex';
		document.getElementById('sc-canvas-filters').style.display = 'flex';
		document.getElementById('sc-search-box').style.display = 'block';
	}
	
	renderTree() {
		let html = `<div class="sc-tree-section">
			<div class="sc-tree-title">
				<span>DocTypes (${this.doctypes.length})</span>
				<span style="cursor:pointer; color:var(--sc-accent-blue);" onclick="window.canvasEngine.showNewDocTypeModal()">+ Add</span>
			</div>`;
			
		this.doctypes.forEach(dt => {
			const isChild = dt.is_child_table;
			const childTag = isChild ? '<span class="sc-tag sc-tag-child">Child</span>' : '';
			const submitTag = dt.is_submittable ? '<span class="sc-tag sc-tag-submittable">Submittable</span>' : '';
			const activeClass = this.selectedDocType === dt.doctype_name ? 'active' : '';
			
			html += `
				<div class="sc-tree-item ${activeClass}" onclick="window.canvasEngine.selectDocType('${dt.doctype_name}')">
					<span>📄 ${dt.doctype_name}</span>
					<div>${childTag} ${submitTag}</div>
				</div>
			`;
		});
		html += `</div>`;
		
		this.treeContainer.innerHTML = html;
		document.getElementById('sc-explorer-count').innerText = `${this.doctypes.length} DocTypes`;
	}
	
	renderNodes() {
		this.nodesLayer.innerHTML = '';
		
		this.doctypes.forEach((dt, idx) => {
			if (dt.is_child_table && !this.filterChildTables) return;
			
			const card = document.createElement('div');
			card.className = `sc-node-card ${this.selectedDocType === dt.doctype_name ? 'selected' : ''}`;
			card.id = `sc-node-${dt.doctype_name}`;
			card.style.left = `${dt.position_x || (100 + (idx % 4) * 280)}px`;
			card.style.top = `${dt.position_y || (100 + Math.floor(idx / 4) * 240)}px`;
			
			const fields = dt.fields || [];
			const linkFields = fields.filter(f => f.fieldtype === 'Link' || f.fieldtype === 'Table');
			
			let fieldsHtml = `<div class="sc-node-fields-list">`;
			if (fields.length > 0) {
				fields.slice(0, 5).forEach(f => {
					let pillClass = 'sc-field-type-pill';
					if (f.fieldtype === 'Link') pillClass += ' sc-field-type-link';
					if (f.fieldtype === 'Table') pillClass += ' sc-field-type-table';
					
					const targetStr = f.options ? ` → ${f.options}` : '';
					fieldsHtml += `
						<div class="sc-node-field-row" id="sc-field-${dt.doctype_name}-${f.fieldname}">
							<span>${f.fieldname}${targetStr}</span>
							<span class="${pillClass}">${f.fieldtype}</span>
						</div>
					`;
				});
				if (fields.length > 5) {
					fieldsHtml += `<div style="font-size:10px; color:var(--sc-text-muted); text-align:center; margin-top:2px;">+ ${fields.length - 5} more fields</div>`;
				}
			} else {
				fieldsHtml += `<div style="font-size:11px; color:var(--sc-text-muted); padding:4px;">No fields</div>`;
			}
			fieldsHtml += `</div>`;
			
			card.innerHTML = `
				<div class="sc-node-header">
					<div class="sc-node-title">
						<span>${dt.is_child_table ? '📦' : '📄'}</span>
						<span>${dt.doctype_name}</span>
					</div>
				</div>
				<div class="sc-node-body">
					${fieldsHtml}
				</div>
			`;
			
			// Single click -> Level 2 Inspector
			card.addEventListener('click', (e) => {
				e.stopPropagation();
				this.selectDocType(dt.doctype_name);
			});
			
			// Double click -> Level 3 Modal
			card.addEventListener('dblclick', (e) => {
				e.stopPropagation();
				this.showDocTypeFullModal(dt.doctype_name);
			});
			
			// Dragging
			this.makeNodeDraggable(card, dt);
			
			this.nodesLayer.appendChild(card);
		});
		
		this.applyFocusState();
	}
	
	makeNodeDraggable(card, dt) {
		let isDragging = false;
		let startX, startY, initialX, initialY;
		
		card.addEventListener('mousedown', (e) => {
			if (e.target.tagName === 'BUTTON' || e.target.closest('.sc-node-toggle')) return;
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			initialX = parseFloat(card.style.left);
			initialY = parseFloat(card.style.top);
			card.style.zIndex = 50;
		});
		
		window.addEventListener('mousemove', (e) => {
			if (isDragging) {
				const dx = (e.clientX - startX) / this.zoom;
				const dy = (e.clientY - startY) / this.zoom;
				dt.position_x = initialX + dx;
				dt.position_y = initialY + dy;
				card.style.left = `${dt.position_x}px`;
				card.style.top = `${dt.position_y}px`;
				this.renderEdges();
			}
		});
		
		window.addEventListener('mouseup', () => {
			if (isDragging) {
				isDragging = false;
				card.style.zIndex = 10;
				this.savePositionsDebounced();
			}
		});
	}
	
	savePositionsDebounced() {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => {
			const positions = {};
			this.doctypes.forEach(dt => {
				positions[dt.doctype_name] = {
					x: dt.position_x,
					y: dt.position_y
				};
			});
			frappe.call({
				method: "system_canvas.api.update_canvas_positions",
				args: {
					project_name: this.projectName,
					positions: JSON.stringify(positions)
				}
			});
		}, 600);
	}
	
	renderEdges() {
		this.svgEdgesGroup.innerHTML = '';
		
		// Data Relations Flowchart
		if (this.filterDataRelations) {
			this.dataRelations.forEach(rel => {
				const srcCard = document.getElementById(`sc-node-${rel.source}`);
				const tgtCard = document.getElementById(`sc-node-${rel.target}`);
				if (srcCard) {
					const isTable = rel.relation_type === 'Table';
					const markerId = isTable ? 'arrow-table' : 'arrow-data';
					const edgeClass = isTable ? 'sc-edge-table' : 'sc-edge-data';
					this.drawBezierEdge(srcCard, tgtCard, markerId, edgeClass, rel);
				}
			});
		}
	}
	
	drawBezierEdge(srcCard, tgtCard, markerId, edgeClass, rel) {
		const srcRect = {
			x: parseFloat(srcCard.style.left),
			y: parseFloat(srcCard.style.top),
			w: srcCard.offsetWidth || 240,
			h: srcCard.offsetHeight || 120
		};
		
		let startY = srcRect.y + srcRect.h / 2;
		const fieldElem = document.getElementById(`sc-field-${rel.source}-${rel.fieldname}`);
		if (fieldElem && fieldElem.offsetHeight > 0) {
			const cardBox = srcCard.getBoundingClientRect();
			const fieldBox = fieldElem.getBoundingClientRect();
			if (cardBox.height > 0 && fieldBox.height > 0) {
				const relativeFieldY = (fieldBox.top + fieldBox.height / 2 - cardBox.top) / this.zoom;
				startY = srcRect.y + relativeFieldY;
			}
		}
		
		const startX = srcRect.x + srcRect.w;
		let endX, endY, controlX1, controlY1, controlX2, controlY2, d;
		
		if (tgtCard) {
			const tgtRect = {
				x: parseFloat(tgtCard.style.left),
				y: parseFloat(tgtCard.style.top),
				w: tgtCard.offsetWidth || 240,
				h: tgtCard.offsetHeight || 120
			};
			endX = tgtRect.x;
			endY = tgtRect.y + tgtRect.h / 2;
			
			const dx = Math.max(Math.abs(endX - startX) * 0.5, 40);
			controlX1 = startX + dx;
			controlY1 = startY;
			controlX2 = endX - dx;
			controlY2 = endY;
			d = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
		} else {
			// External Target Relation Stub Edge
			endX = startX + 130;
			endY = startY;
			d = `M ${startX} ${startY} L ${endX} ${endY}`;
		}
		
		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		group.setAttribute('class', 'sc-edge-group');
		
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', d);
		path.setAttribute('class', `sc-edge-path ${edgeClass}`);
		path.setAttribute('marker-end', `url(#${markerId})`);
		group.appendChild(path);
		
		// Flowchart Edge Badge Label
		const midX = (startX + endX) / 2;
		const midY = (startY + endY) / 2;
		const labelText = tgtCard 
			? (rel.label || rel.fieldname) 
			: `${rel.fieldname} ➔ ${rel.target}`;
		const textLen = Math.max(labelText.length * 7 + 24, 75);
		
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', midX - textLen / 2);
		rect.setAttribute('y', midY - 10);
		rect.setAttribute('width', textLen);
		rect.setAttribute('height', 20);
		rect.setAttribute('rx', 5);
		rect.setAttribute('fill', '#1E293B');
		rect.setAttribute('stroke', rel.relation_type === 'Table' ? '#F59E0B' : '#38BDF8');
		rect.setAttribute('stroke-width', '1');
		group.appendChild(rect);
		
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', midX);
		text.setAttribute('y', midY + 4);
		text.setAttribute('fill', rel.relation_type === 'Table' ? '#FBBF24' : '#38BDF8');
		text.setAttribute('font-size', '10');
		text.setAttribute('font-weight', '600');
		text.setAttribute('text-anchor', 'middle');
		text.textContent = `${rel.relation_type === 'Table' ? '📦' : '🔗'} ${labelText}`;
		group.appendChild(text);
		
		this.svgEdgesGroup.appendChild(group);
	}
	
	selectDocType(doctypeName) {
		this.selectedDocType = doctypeName;
		this.renderTree();
		
		document.querySelectorAll('.sc-node-card').forEach(c => c.classList.remove('selected'));
		const card = document.getElementById(`sc-node-${doctypeName}`);
		if (card) card.classList.add('selected');
		
		this.setFocus(doctypeName);
		this.renderLevel2Inspector(doctypeName);
	}
	
	setFocus(doctypeName) {
		this.focusedDocType = doctypeName;
		this.applyFocusState();
	}
	
	applyFocusState() {
		if (!this.focusedDocType) {
			document.querySelectorAll('.sc-node-card').forEach(c => c.classList.remove('dimmed'));
			return;
		}
		
		// Find connected nodes
		const connected = new Set([this.focusedDocType]);
		this.dataRelations.forEach(r => {
			if (r.source === this.focusedDocType) connected.add(r.target);
			if (r.target === this.focusedDocType) connected.add(r.source);
		});
		
		this.doctypes.forEach(dt => {
			const card = document.getElementById(`sc-node-${dt.doctype_name}`);
			if (card) {
				if (connected.has(dt.doctype_name)) {
					card.classList.remove('dimmed');
				} else {
					card.classList.add('dimmed');
				}
			}
		});
	}
	
	renderLevel2Inspector(doctypeName) {
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (!dt) return;
		
		const fields = dt.fields || [];
		const rels = this.dataRelations.filter(r => r.source === doctypeName || r.target === doctypeName);
		const wf = this.workflows.find(w => w.document_type === doctypeName);
		
		let fieldsRows = fields.map((f, idx) => `
			<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--sc-border);">
				<div>
					<div style="font-weight:500;">${f.fieldname}</div>
					<div style="font-size:11px; color:var(--sc-text-muted);">${f.options ? f.fieldtype + ' → ' + f.options : f.fieldtype}</div>
				</div>
				<button class="sc-btn" style="padding:2px 6px; font-size:11px;" onclick="window.canvasEngine.removeField('${doctypeName}', ${idx})">✕</button>
			</div>
		`).join('');
		
		this.inspectorContent.innerHTML = `
			<div class="sc-prop-group">
				<div class="sc-prop-label">DocType Details</div>
				<div style="font-size:18px; font-weight:700; color:var(--sc-accent-blue);">${dt.doctype_name}</div>
				<div class="sc-prop-value" style="color:var(--sc-text-muted); margin-top:2px;">Module: ${dt.module || 'Selling'}</div>
			</div>
			
			<div class="sc-prop-group" style="display:flex; gap:8px;">
				<button class="sc-btn sc-btn-primary" style="flex:1;" onclick="window.canvasEngine.showDocTypeFullModal('${doctypeName}')">🔍 Full Details</button>
			</div>
			
			<div class="sc-prop-group">
				<div class="sc-prop-label">Properties</div>
				<div class="sc-node-stat"><span>Is Child Table:</span> <b>${dt.is_child_table ? 'Yes' : 'No'}</b></div>
				<div class="sc-node-stat"><span>Is Submittable:</span> <b>${dt.is_submittable ? 'Yes' : 'No'}</b></div>
				<div class="sc-node-stat"><span>Total Fields:</span> <b>${fields.length}</b></div>
			</div>
			
			<div class="sc-prop-group">
				<div class="sc-prop-label" style="display:flex; justify-content:space-between; align-items:center;">
					<span>Fields (${fields.length})</span>
					<span style="cursor:pointer; color:var(--sc-accent-blue);" onclick="window.canvasEngine.showAddFieldModal('${doctypeName}')">+ Add</span>
				</div>
				<div style="max-height:220px; overflow-y:auto; margin-top:8px;">
					${fieldsRows || '<div style="color:var(--sc-text-muted); font-size:12px;">No fields configured</div>'}
				</div>
			</div>
			
			<div class="sc-prop-group">
				<div class="sc-prop-label">Connected Relations (${rels.length})</div>
				${rels.map(r => `<div style="font-size:12px; margin-top:4px;">🔗 ${r.source} → <b>${r.target}</b> (${r.fieldname})</div>`).join('')}
			</div>
		`;
	}
	
	showDocTypeFullModal(doctypeName) {
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (!dt) return;
		
		const fields = dt.fields || [];
		const rels = this.dataRelations.filter(r => r.source === doctypeName || r.target === doctypeName);
		
		const modalHtml = `
			<div class="sc-modal-backdrop" id="sc-modal-level3">
				<div class="sc-modal-window">
					<div class="sc-modal-header">
						<div style="font-size:18px; font-weight:700;">📄 ${dt.doctype_name} Architecture Details</div>
						<button class="sc-btn" onclick="document.getElementById('sc-modal-level3').remove()">✕</button>
					</div>
					
					<div class="sc-modal-tabs">
						<div class="sc-modal-tab active" onclick="window.canvasEngine.switchModalTab('fields')">Fields Schema (${fields.length})</div>
						<div class="sc-modal-tab" onclick="window.canvasEngine.switchModalTab('relations')">Relations Matrix (${rels.length})</div>
					</div>
					
					<div class="sc-modal-body" id="sc-modal-tab-content">
						${this.getModalFieldsTabHtml(dt)}
					</div>
				</div>
			</div>
		`;
		
		document.getElementById('sc-modal-container').innerHTML = modalHtml;
	}
	
	getModalFieldsTabHtml(dt) {
		const fields = dt.fields || [];
		let rows = fields.map(f => `
			<tr>
				<td><b>${f.fieldname}</b></td>
				<td>${f.label || f.fieldname}</td>
				<td><span class="sc-field-type-pill">${f.fieldtype}</span></td>
				<td>${f.options || '-'}</td>
				<td>${f.reqd ? '✅' : '❌'}</td>
			</tr>
		`).join('');
		
		return `
			<table class="sc-table">
				<thead>
					<tr>
						<th>Fieldname</th>
						<th>Label</th>
						<th>Type</th>
						<th>Options</th>
						<th>Mandatory</th>
					</tr>
				</thead>
				<tbody>
					${rows || '<tr><td colspan="5">No fields defined</td></tr>'}
				</tbody>
			</table>
		`;
	}
	
	switchModalTab(tabName) {
		document.querySelectorAll('.sc-modal-tab').forEach(t => t.classList.remove('active'));
		event.target.classList.add('active');
		
		const dt = this.doctypes.find(d => d.doctype_name === this.selectedDocType);
		const content = document.getElementById('sc-modal-tab-content');
		
		if (tabName === 'fields') {
			content.innerHTML = this.getModalFieldsTabHtml(dt);
		} else if (tabName === 'relations') {
			const rels = this.dataRelations.filter(r => r.source === dt.doctype_name || r.target === dt.doctype_name);
			content.innerHTML = `
				<table class="sc-table">
					<thead>
						<tr><th>Direction</th><th>Source</th><th>Target</th><th>Field</th><th>Relation Type</th></tr>
					</thead>
					<tbody>
						${rels.map(r => `
							<tr>
								<td>${r.source === dt.doctype_name ? 'Outgoing ➔' : '➔ Incoming'}</td>
								<td>${r.source}</td>
								<td>${r.target}</td>
								<td>${r.fieldname}</td>
								<td><span class="sc-field-type-pill">${r.relation_type}</span></td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			`;
		}
	}
	
	showNewProjectModal() {
		const html = `
			<div class="sc-modal-backdrop" id="sc-modal-project">
				<div class="sc-modal-window" style="width:480px;">
					<div class="sc-modal-header">
						<div style="font-size:16px; font-weight:700;">Create New Architecture Project</div>
						<button class="sc-btn" onclick="document.getElementById('sc-modal-project').remove()">✕</button>
					</div>
					<div class="sc-modal-body">
						<div class="sc-prop-group">
							<div class="sc-prop-label">Project Name</div>
							<input type="text" class="sc-input" id="sc-input-project-name" placeholder="e.g. Jewellery ERP">
						</div>
						<div class="sc-prop-group">
							<div class="sc-prop-label">Description</div>
							<input type="text" class="sc-input" id="sc-input-project-desc" placeholder="System description...">
						</div>
						<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
							<button class="sc-btn" onclick="document.getElementById('sc-modal-project').remove()">Cancel</button>
							<button class="sc-btn sc-btn-primary" onclick="window.canvasEngine.submitNewProject()">Create Project</button>
						</div>
					</div>
				</div>
			</div>
		`;
		document.getElementById('sc-modal-container').innerHTML = html;
	}
	
	submitNewProject() {
		const name = document.getElementById('sc-input-project-name').value.trim();
		const desc = document.getElementById('sc-input-project-desc').value.trim();
		if (!name) return frappe.msgprint("Project name is required");
		
		frappe.call({
			method: "system_canvas.api.create_project",
			args: { project_name: name, description: desc },
			callback: (r) => {
				if (r.message) {
					document.getElementById('sc-modal-project').remove();
					this.loadProjectsList();
					this.loadProject(name);
				}
			}
		});
	}
	
	showNewDocTypeModal() {
		const html = `
			<div class="sc-modal-backdrop" id="sc-modal-doctype">
				<div class="sc-modal-window" style="width:500px;">
					<div class="sc-modal-header">
						<div style="font-size:16px; font-weight:700;">+ Create New DocType</div>
						<button class="sc-btn" onclick="document.getElementById('sc-modal-doctype').remove()">✕</button>
					</div>
					<div class="sc-modal-body">
						<div class="sc-prop-group">
							<div class="sc-prop-label">DocType Name</div>
							<input type="text" class="sc-input" id="sc-input-dt-name" placeholder="e.g. Customer">
						</div>
						<div class="sc-prop-group">
							<div class="sc-prop-label">Module</div>
							<input type="text" class="sc-input" id="sc-input-dt-module" value="Selling">
						</div>
						<div class="sc-prop-group" style="display:flex; gap:20px;">
							<label><input type="checkbox" id="sc-input-dt-child"> Is Child Table</label>
							<label><input type="checkbox" id="sc-input-dt-submittable"> Is Submittable</label>
						</div>
						<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
							<button class="sc-btn" onclick="document.getElementById('sc-modal-doctype').remove()">Cancel</button>
							<button class="sc-btn sc-btn-primary" onclick="window.canvasEngine.submitNewDocType()">Create DocType</button>
						</div>
					</div>
				</div>
			</div>
		`;
		document.getElementById('sc-modal-container').innerHTML = html;
	}
	
	submitNewDocType() {
		const dtName = document.getElementById('sc-input-dt-name').value.trim();
		const module = document.getElementById('sc-input-dt-module').value.trim();
		const isChild = document.getElementById('sc-input-dt-child').checked ? 1 : 0;
		const isSubmittable = document.getElementById('sc-input-dt-submittable').checked ? 1 : 0;
		
		if (!dtName) return frappe.msgprint("DocType name is required");
		
		frappe.call({
			method: "system_canvas.api.save_doctype",
			args: {
				project_name: this.projectName,
				doctype_name: dtName,
				module: module,
				is_child_table: isChild,
				is_submittable: isSubmittable,
				fields: JSON.stringify([
					{ fieldname: dtName.toLowerCase() + "_name", label: dtName + " Name", fieldtype: "Data", reqd: 1 }
				])
			},
			callback: (r) => {
				if (r.message) {
					document.getElementById('sc-modal-doctype').remove();
					this.loadProject(this.projectName);
				}
			}
		});
	}
	
	showAddFieldModal(doctypeName) {
		const html = `
			<div class="sc-modal-backdrop" id="sc-modal-addfield">
				<div class="sc-modal-window" style="width:460px;">
					<div class="sc-modal-header">
						<div style="font-size:16px; font-weight:700;">Add Field to ${doctypeName}</div>
						<button class="sc-btn" onclick="document.getElementById('sc-modal-addfield').remove()">✕</button>
					</div>
					<div class="sc-modal-body">
						<div class="sc-prop-group">
							<div class="sc-prop-label">Fieldname</div>
							<input type="text" class="sc-input" id="sc-input-fname" placeholder="e.g. customer_group">
						</div>
						<div class="sc-prop-group">
							<div class="sc-prop-label">Field Type</div>
							<select class="sc-input" id="sc-input-ftype">
								<option value="Data">Data</option>
								<option value="Link">Link</option>
								<option value="Table">Table (Child Table)</option>
								<option value="Select">Select</option>
								<option value="Int">Int</option>
								<option value="Float">Float</option>
								<option value="Currency">Currency</option>
								<option value="Check">Check</option>
								<option value="Date">Date</option>
							</select>
						</div>
						<div class="sc-prop-group">
							<div class="sc-prop-label">Options (Target DocType if Link/Table)</div>
							<input type="text" class="sc-input" id="sc-input-foptions" placeholder="e.g. Customer Group">
						</div>
						<div class="sc-prop-group">
							<label><input type="checkbox" id="sc-input-freqd"> Mandatory</label>
						</div>
						<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
							<button class="sc-btn" onclick="document.getElementById('sc-modal-addfield').remove()">Cancel</button>
							<button class="sc-btn sc-btn-primary" onclick="window.canvasEngine.submitAddField('${doctypeName}')">Add Field</button>
						</div>
					</div>
				</div>
			</div>
		`;
		document.getElementById('sc-modal-container').innerHTML = html;
	}
	
	submitAddField(doctypeName) {
		const fname = document.getElementById('sc-input-fname').value.trim();
		const ftype = document.getElementById('sc-input-ftype').value;
		const foptions = document.getElementById('sc-input-foptions').value.trim();
		const freqd = document.getElementById('sc-input-freqd').checked ? 1 : 0;
		
		if (!fname) return frappe.msgprint("Fieldname is required");
		
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (dt) {
			const updatedFields = [...(dt.fields || []), {
				fieldname: fname,
				label: fname.replace(/_/g, ' ').toUpperCase(),
				fieldtype: ftype,
				options: foptions,
				reqd: freqd
			}];
			
			frappe.call({
				method: "system_canvas.api.save_doctype",
				args: {
					project_name: this.projectName,
					doctype_name: doctypeName,
					module: dt.module,
					is_child_table: dt.is_child_table,
					is_submittable: dt.is_submittable,
					fields: JSON.stringify(updatedFields)
				},
				callback: (r) => {
					if (r.message) {
						document.getElementById('sc-modal-addfield').remove();
						this.loadProject(this.projectName);
					}
				}
			});
		}
	}
	
	removeField(doctypeName, fieldIdx) {
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (dt && dt.fields) {
			dt.fields.splice(fieldIdx, 1);
			frappe.call({
				method: "system_canvas.api.save_doctype",
				args: {
					project_name: this.projectName,
					doctype_name: doctypeName,
					module: dt.module,
					is_child_table: dt.is_child_table,
					is_submittable: dt.is_submittable,
					fields: JSON.stringify(dt.fields)
				},
				callback: () => this.loadProject(this.projectName)
			});
		}
	}
	

	
	triggerGenerateFrappe() {
		frappe.call({
			method: "system_canvas.api.generate_frappe_doctypes",
			args: { project_name: this.projectName },
			callback: (r) => {
				if (r.message) {
					frappe.msgprint({
						title: __('Frappe DocTypes Generated'),
						indicator: 'green',
						message: __('Successfully compiled {0} DocTypes for project {1}', [r.message.count, this.projectName])
					});
				}
			}
		});
	}
	
	filterNodesBySearch() {
		if (!this.searchQuery) {
			document.querySelectorAll('.sc-node-card').forEach(c => c.style.display = 'block');
			return;
		}
		
		this.doctypes.forEach(dt => {
			const card = document.getElementById(`sc-node-${dt.doctype_name}`);
			if (card) {
				const matchName = dt.doctype_name.toLowerCase().includes(this.searchQuery);
				const matchField = (dt.fields || []).some(f => f.fieldname.toLowerCase().includes(this.searchQuery));
				card.style.display = (matchName || matchField) ? 'block' : 'none';
			}
		});
	}
	
	fitToScreen() {
		if (this.doctypes.length === 0) return;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		this.doctypes.forEach(dt => {
			minX = Math.min(minX, dt.position_x || 100);
			minY = Math.min(minY, dt.position_y || 100);
			maxX = Math.max(maxX, (dt.position_x || 100) + 240);
			maxY = Math.max(maxY, (dt.position_y || 100) + 150);
		});
		
		const width = maxX - minX;
		const height = maxY - minY;
		const vpWidth = this.viewport.clientWidth;
		const vpHeight = this.viewport.clientHeight;
		
		const zoomX = (vpWidth - 100) / width;
		const zoomY = (vpHeight - 100) / height;
		this.zoom = Math.min(Math.min(zoomX, zoomY), 1.2);
		
		this.panX = (vpWidth - width * this.zoom) / 2 - minX * this.zoom;
		this.panY = (vpHeight - height * this.zoom) / 2 - minY * this.zoom;
		this.applyTransform();
	}

	autoLayout() {
		if (!this.doctypes || this.doctypes.length === 0) return;
		
		const inDegree = {};
		const outDegree = {};
		const docTypeNames = new Set(this.doctypes.map(d => d.doctype_name));
		
		this.doctypes.forEach(d => {
			inDegree[d.doctype_name] = 0;
			outDegree[d.doctype_name] = 0;
		});
		
		this.dataRelations.forEach(r => {
			if (docTypeNames.has(r.source) && docTypeNames.has(r.target)) {
				outDegree[r.source] = (outDegree[r.source] || 0) + 1;
				inDegree[r.target] = (inDegree[r.target] || 0) + 1;
			}
		});
		
		// Categorize into architectural layers (0: Masters, 1: Core, 2: Transactions, 3: Child Tables)
		const layers = [[], [], [], []];
		
		this.doctypes.forEach(d => {
			const name = d.doctype_name;
			if (d.is_child_table) {
				layers[3].push(d);
			} else if (inDegree[name] === 0 && outDegree[name] > 0) {
				layers[0].push(d);
			} else if (inDegree[name] > 0 && outDegree[name] > 0) {
				layers[1].push(d);
			} else {
				layers[2].push(d);
			}
		});
		
		const startX = 80;
		const startY = 80;
		const colWidth = 300;
		const rowHeight = 220;
		
		let colIndex = 0;
		layers.forEach(layerNodes => {
			if (layerNodes.length > 0) {
				layerNodes.forEach((node, rowIndex) => {
					node.position_x = startX + colIndex * colWidth;
					node.position_y = startY + rowIndex * rowHeight;
				});
				colIndex++;
			}
		});
		
		this.renderNodes();
		this.renderEdges();
		this.savePositionsDebounced();
		this.fitToScreen();
	}
};
