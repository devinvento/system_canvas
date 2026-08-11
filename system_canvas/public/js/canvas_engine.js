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
		this.workflows = [];
		this.systemDocTypes = [];

		
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
						<button class="sc-btn" id="sc-btn-fullscreen" style="display:none;" onclick="window.canvasEngine.toggleFullScreen()">📺 Full Screen</button>
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
		this.saveViewportState();
	}

	saveViewportState() {
		if (!this.projectName) return;
		localStorage.setItem(`sc_viewport_panX_${this.projectName}`, this.panX);
		localStorage.setItem(`sc_viewport_panY_${this.projectName}`, this.panY);
		localStorage.setItem(`sc_viewport_zoom_${this.projectName}`, this.zoom);
	}

	restoreViewportState() {
		if (!this.projectName) return;
		const panX = localStorage.getItem(`sc_viewport_panX_${this.projectName}`);
		const panY = localStorage.getItem(`sc_viewport_panY_${this.projectName}`);
		const zoom = localStorage.getItem(`sc_viewport_zoom_${this.projectName}`);
		
		if (panX !== null) this.panX = parseFloat(panX);
		else this.panX = 0;
		
		if (panY !== null) this.panY = parseFloat(panY);
		else this.panY = 0;
		
		if (zoom !== null) this.zoom = parseFloat(zoom);
		else this.zoom = 1;
		
		this.transformLayer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
		document.getElementById('sc-zoom-reset').innerText = `${Math.round(this.zoom * 100)}%`;
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
	
	loadSystemDocTypesList(callback) {
		frappe.call({
			method: "system_canvas.api.get_all_system_doctypes",
			args: { project_name: this.projectName },
			callback: (r) => {
				this.systemDocTypes = r.message || [];
				if (callback) callback(this.systemDocTypes);
			}
		});
	}
	
	loadProject(projectName, callback) {
		this.projectName = projectName;
		this.loadSystemDocTypesList();
		frappe.call({
			method: "system_canvas.api.get_project_details",
			args: { project_name: projectName },
			callback: (r) => {
				if (r.message) {
					this.projectData = r.message.project;
					this.doctypes = r.message.doctypes || [];
					this.dataRelations = r.message.data_relations || [];
					
					this.showProjectUI();
					this.restoreViewportState();
					this.renderTree();
					
					const hasCustomPos = this.doctypes.some(d => d.position_x && d.position_x !== 100);
					if (!hasCustomPos && this.doctypes.length > 0) {
						this.autoLayout();
					} else {
						this.renderNodes();
						this.renderEdges();
					}
					if (callback) callback(r);
					this.refreshFullModalIfOpen();
				}
			}
		});
	}


	refreshFullModalIfOpen() {
		const modal = document.getElementById('sc-modal-level3');
		if (modal && this.selectedDocType) {
			const activeTabEl = modal.querySelector('.sc-modal-tab.active');
			if (activeTabEl) {
				const isFields = activeTabEl.innerText.includes('Fields');
				const tabName = isFields ? 'fields' : 'relations';
				this.showDocTypeFullModal(this.selectedDocType);
				this.switchModalTab(tabName);
			}
		}
	}
	
	showProjectUI() {
		document.getElementById('sc-btn-fullscreen').style.display = 'inline-flex';
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
				<div class="sc-tree-item ${activeClass}" onclick="window.canvasEngine.selectDocType('${dt.doctype_name}')" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
					<div style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;">
						<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📄 ${dt.doctype_name}</span>
						<div style="display: flex; gap: 4px; flex-wrap: wrap;">${childTag} ${submitTag}</div>
					</div>
					<button class="sc-node-delete-btn" title="Delete DocType" onclick="event.stopPropagation(); window.canvasEngine.deleteDocType('${dt.doctype_name}')" style="background: none; border: none; color: var(--sc-text-muted); cursor: pointer; font-size: 11px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">✕</button>
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
				<div class="sc-node-header" style="display: flex; justify-content: space-between; align-items: center;">
					<div class="sc-node-title" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
						<span>${dt.is_child_table ? '📦' : '📄'}</span>
						<span>${dt.doctype_name}</span>
					</div>
					<button class="sc-node-delete-btn" title="Delete DocType" onclick="event.stopPropagation(); window.canvasEngine.deleteDocType('${dt.doctype_name}')" style="background: none; border: none; color: var(--sc-text-muted); cursor: pointer; font-size: 11px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px; z-index: 10;">✕</button>
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
				if (srcCard && tgtCard) {
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
		if (fieldElem) {
			const offsetTop = fieldElem.offsetTop;
			const offsetHeight = fieldElem.offsetHeight;
			if (offsetHeight > 0) {
				startY = srcRect.y + offsetTop + offsetHeight / 2;
			}
		}
		
		let startX, endX, endY, controlX1, controlY1, controlX2, controlY2, d;
		
		if (tgtCard) {
			const tgtRect = {
				x: parseFloat(tgtCard.style.left),
				y: parseFloat(tgtCard.style.top),
				w: tgtCard.offsetWidth || 240,
				h: tgtCard.offsetHeight || 120
			};
			
			const srcCenter = { x: srcRect.x + srcRect.w / 2, y: srcRect.y + srcRect.h / 2 };
			const tgtCenter = { x: tgtRect.x + tgtRect.w / 2, y: tgtRect.y + tgtRect.h / 2 };
			
			const dx = tgtCenter.x - srcCenter.x;
			const dy = tgtCenter.y - srcCenter.y;
			
			if (Math.abs(dx) > Math.abs(dy)) {
				// Horizontal dominant connection
				if (dx > 0) {
					// Target is to the right: connect Right of Source to Left of Target
					startX = srcRect.x + srcRect.w;
					endX = tgtRect.x - 6;
				} else {
					// Target is to the left: connect Left of Source to Right of Target
					startX = srcRect.x;
					endX = tgtRect.x + tgtRect.w + 6;
				}
				endY = tgtRect.y + tgtRect.h / 2;
				
				const ctrlX = Math.abs(endX - startX) * 0.5;
				controlX1 = startX + (endX > startX ? ctrlX : -ctrlX);
				controlY1 = startY;
				controlX2 = endX - (endX > startX ? ctrlX : -ctrlX);
				controlY2 = endY;
			} else {
				// Vertical dominant connection
				startX = srcRect.x + srcRect.w / 2;
				endX = tgtRect.x + tgtRect.w / 2;
				
				if (dy > 0) {
					// Target is below: connect Bottom of Source to Top of Target
					startY = srcRect.y + srcRect.h;
					endY = tgtRect.y - 6;
					
					const ctrlY = Math.abs(endY - startY) * 0.5;
					controlX1 = startX;
					controlY1 = startY + ctrlY;
					controlX2 = endX;
					controlY2 = endY - ctrlY;
				} else {
					// Target is above: connect Top of Source to Bottom of Target
					startY = srcRect.y;
					endY = tgtRect.y + tgtRect.h + 6;
					
					const ctrlY = Math.abs(endY - startY) * 0.5;
					controlX1 = startX;
					controlY1 = startY - ctrlY;
					controlX2 = endX;
					controlY2 = endY + ctrlY;
				}
			}
			d = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
		} else {
			// External Target Relation Stub Edge
			startX = srcRect.x + srcRect.w;
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
			? rel.fieldname 
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
	
	importExistingDocTypeAndConnect(doctypeName, posX = 100, posY = 100) {
		frappe.call({
			method: "system_canvas.api.add_existing_doctype",
			args: {
				project_name: this.projectName,
				doctype_name: doctypeName,
				position_x: posX,
				position_y: posY,
				auto_fetch_relations: 1
			},
			callback: (r) => {
				if (r.message) {
					const relCount = (r.message.imported_related || []).length;
					const msg = relCount > 0
						? `Added ${doctypeName} and ${relCount} related DocTypes (${r.message.imported_related.slice(0, 3).join(', ')}${relCount > 3 ? '...' : ''}) to Canvas`
						: `Added ${doctypeName} to Canvas`;

					frappe.show_alert({
						message: __(msg),
						indicator: 'green'
					}, 5);

					const modal = document.getElementById('sc-modal-doctype');
					if (modal) modal.remove();

					this.loadProject(this.projectName, () => {
						this.autoLayout();
					});
				}
			}
		});
	}


	renderLevel2Inspector(doctypeName) {
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (!dt) return;
		
		const fields = dt.fields || [];
		const rels = this.dataRelations.filter(r => r.source === doctypeName || r.target === doctypeName);
		
		let fieldsRows = fields.map((f, idx) => `
			<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--sc-border);">
				<div>
					<div style="font-weight:500;">${f.fieldname}</div>
					<div style="font-size:11px; color:var(--sc-text-muted);">${f.options ? f.fieldtype + ' → ' + f.options : f.fieldtype}</div>
				</div>
				<button class="sc-btn" style="padding:2px 6px; font-size:11px;" onclick="window.canvasEngine.removeField('${doctypeName}', ${idx})">✕</button>
			</div>
		`).join('');
		
		const relRows = rels.map(r => {
			const otherTarget = r.source === doctypeName ? r.target : r.source;
			const isOnCanvas = this.doctypes.some(d => d.doctype_name === otherTarget);
			const addBtn = !isOnCanvas ? `<button class="sc-btn sc-btn-primary" style="padding:1px 6px; font-size:10px; margin-left:4px;" onclick="window.canvasEngine.importExistingDocTypeAndConnect('${otherTarget}')">+ Add</button>` : '';
			return `
				<div style="font-size:12px; margin-top:6px; display:flex; align-items:center; justify-content:space-between; gap:4px;">
					<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🔗 ${r.source} → <b>${r.target}</b> (${r.fieldname})</div>
					${addBtn}
				</div>
			`;
		}).join('');

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
				${relRows || '<div style="color:var(--sc-text-muted); font-size:12px; margin-top:4px;">No relations</div>'}
			</div>
		`;
	}

	
	showDocTypeFullModal(doctypeName) {
		this.selectedDocType = doctypeName;
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
		let rows = fields.map((f, idx) => `
			<tr>
				<td><b>${f.fieldname}</b></td>
				<td>${f.fieldname.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
				<td><span class="sc-field-type-pill">${f.fieldtype}</span></td>
				<td>${f.options || '-'}</td>
				<td>${f.reqd ? '✅' : '❌'}</td>
				<td style="text-align: right;">
					<button class="sc-btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.canvasEngine.removeField('${dt.doctype_name}', ${idx})">✕</button>
				</td>
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
						<th style="text-align: right;">Action</th>
					</tr>
				</thead>
				<tbody>
					${rows || '<tr><td colspan="6">No fields defined</td></tr>'}
				</tbody>
			</table>
		`;
	}
	
	switchModalTab(tabName) {
		document.querySelectorAll('.sc-modal-tab').forEach(t => {
			const isTarget = tabName === 'fields' ? t.innerText.includes('Fields') : t.innerText.includes('Relations');
			if (isTarget) {
				t.classList.add('active');
			} else {
				t.classList.remove('active');
			}
		});
		
		const dt = this.doctypes.find(d => d.doctype_name === this.selectedDocType);
		const content = document.getElementById('sc-modal-tab-content');
		if (!dt || !content) return;
		
		if (tabName === 'fields') {
			content.innerHTML = this.getModalFieldsTabHtml(dt);
		} else if (tabName === 'relations') {
			const rels = this.dataRelations.filter(r => r.source === dt.doctype_name || r.target === dt.doctype_name);
			
			const projNames = new Set((this.doctypes || []).map(d => d.doctype_name));
			const otherDocTypes = (this.doctypes || []).filter(d => d.doctype_name !== dt.doctype_name);
			const projOpts = otherDocTypes.map(d => `<option value="${d.doctype_name}">📄 ${d.doctype_name}</option>`).join('');
			const sysOpts = (this.systemDocTypes || [])
				.filter(d => !projNames.has(d.doctype_name))
				.map(d => `<option value="${d.doctype_name}">🌐 ${d.doctype_name} (${d.module})</option>`)
				.join('');

			const dtOptionsHtml = `
				${projOpts ? `<optgroup label="Project DocTypes">${projOpts}</optgroup>` : ''}
				${sysOpts ? `<optgroup label="Existing Frappe DocTypes">${sysOpts}</optgroup>` : ''}
			`;


			content.innerHTML = `
				<table class="sc-table" style="margin-bottom: 24px;">
					<thead>
						<tr>
							<th>Direction</th>
							<th>Source</th>
							<th>Target</th>
							<th>Field</th>
							<th>Relation Type</th>
							<th style="text-align: right;">Action</th>
						</tr>
					</thead>
					<tbody>
						${rels.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: var(--sc-text-muted); padding: 16px;">No relationships found</td></tr>' : rels.map(r => `
							<tr>
								<td>${r.source === dt.doctype_name ? 'Outgoing ➔' : '➔ Incoming'}</td>
								<td>${r.source}</td>
								<td>${r.target}</td>
								<td><b>${r.fieldname}</b></td>
								<td><span class="sc-field-type-pill ${r.relation_type === 'Link' ? 'sc-field-type-link' : 'sc-field-type-table'}">${r.relation_type}</span></td>
								<td style="text-align: right;">
									<button class="sc-btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.canvasEngine.deleteRelation('${r.source}', '${r.fieldname}')">✕</button>
								</td>
							</tr>
						`).join('')}
					</tbody>
				</table>

				<div style="padding: 16px; border: 1px solid var(--sc-border); border-radius: 8px; background: rgba(30, 41, 59, 0.3);">
					<div style="font-weight: 600; font-size: 13px; color: var(--sc-accent-blue); margin-bottom: 12px;">+ Add New Relation (Outgoing)</div>
					<div style="display: flex; gap: 12px; align-items: flex-end;">
						<div style="flex: 1.5; display: flex; flex-direction: column; gap: 4px;">
							<div style="font-size: 11px; color: var(--sc-text-muted);">Target DocType</div>
							<select class="sc-input" id="sc-rel-target-dt" style="height: 32px; font-size: 12px; padding: 0 10px;">
								${dtOptionsHtml || '<option value="" disabled>No other DocTypes</option>'}
							</select>
						</div>
						<div style="flex: 1.5; display: flex; flex-direction: column; gap: 4px;">
							<div style="font-size: 11px; color: var(--sc-text-muted);">Fieldname</div>
							<input type="text" class="sc-input" id="sc-rel-fieldname" placeholder="e.g. customer_link" style="height: 32px; font-size: 12px; padding: 6px 10px;">
						</div>
						<div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
							<div style="font-size: 11px; color: var(--sc-text-muted);">Relation Type</div>
							<select class="sc-input" id="sc-rel-type" style="height: 32px; font-size: 12px; padding: 0 10px;">
								<option value="Link">Link</option>
								<option value="Table">Table (Child Table)</option>
							</select>
						</div>
						<button class="sc-btn sc-btn-primary" onclick="window.canvasEngine.saveNewRelation('${dt.doctype_name}')" style="height: 32px; padding: 0 16px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center;">Save Relation</button>
					</div>
				</div>
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

	onDocTypeFieldTypeChange() {
		const ftype = document.getElementById('sc-input-fld-type').value;
		this.updateDocTypeFieldOptionsInput(ftype);
	}

	updateDocTypeFieldOptionsInput(fieldType, defaultValue = '') {
		const container = document.getElementById('sc-fld-opts-container');
		if (!container) return;

		if (fieldType === 'Link' || fieldType === 'Table') {
			const projNames = new Set((this.doctypes || []).map(d => d.doctype_name));
			const projOpts = (this.doctypes || []).map(d => `<option value="${d.doctype_name}">📄 ${d.doctype_name}</option>`).join('');
			const sysOpts = (this.systemDocTypes || [])
				.filter(d => !projNames.has(d.doctype_name))
				.map(d => `<option value="${d.doctype_name}">🌐 ${d.doctype_name} (${d.module})</option>`)
				.join('');

			container.innerHTML = `
				<select class="sc-input" id="sc-input-fld-opts" style="font-size: 12px; padding: 6px 10px; height: 32px; width: 100%;">
					<option value="">-- Select Target DocType --</option>
					${projOpts ? `<optgroup label="Project DocTypes">${projOpts}</optgroup>` : ''}
					${sysOpts ? `<optgroup label="Existing Frappe System DocTypes">${sysOpts}</optgroup>` : ''}
				</select>
			`;
		} else {
			container.innerHTML = `
				<input type="text" class="sc-input" id="sc-input-fld-opts" placeholder="Options (Target DocType / Select Options)" style="font-size: 12px; padding: 6px 10px; width: 100%;" value="${defaultValue}">
			`;
		}

		if (defaultValue) {
			const input = document.getElementById('sc-input-fld-opts');
			if (input) input.value = defaultValue;
		}
	}

	
	showNewDocTypeModal() {
		this.newDocTypeFields = [];
		this.editingFieldIdx = null;
		const html = `
			<div class="sc-modal-backdrop" id="sc-modal-doctype">
				<div class="sc-modal-window" style="width: 840px; max-width: 95vw;">
					<div class="sc-modal-header">
						<div style="font-size:16px; font-weight:700;">+ Add DocType to Project</div>
						<button class="sc-btn" onclick="document.getElementById('sc-modal-doctype').remove()">✕</button>
					</div>

					<div class="sc-modal-tabs" style="padding: 0 20px; border-bottom: 1px solid var(--sc-border); display: flex; gap: 16px;">
						<div class="sc-modal-tab active" id="sc-tab-btn-custom" onclick="window.canvasEngine.switchNewDocTypeTab('custom')">✏️ Create Custom DocType</div>
						<div class="sc-modal-tab" id="sc-tab-btn-existing" onclick="window.canvasEngine.switchNewDocTypeTab('existing')">🌐 Add Existing Frappe DocType</div>
					</div>

					<!-- Tab 1: Custom DocType Builder -->
					<div class="sc-modal-body" id="sc-newdt-tab-custom" style="display: flex; gap: 24px; padding: 20px; overflow: hidden; height: 450px;">
						<!-- Left Column: DocType Config -->
						<div style="flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 250px; border-right: 1px solid var(--sc-border); padding-right: 24px; height: 100%; overflow-y: auto;">
							<div style="font-weight: 600; font-size: 13px; color: var(--sc-accent-blue); text-transform: uppercase; tracking: 0.05em; margin-bottom: 4px;">DocType Configuration</div>
							<div class="sc-prop-group">
								<div class="sc-prop-label">DocType Name</div>
								<input type="text" class="sc-input" id="sc-input-dt-name" placeholder="e.g. Customer">
							</div>
							<div class="sc-prop-group">
								<div class="sc-prop-label">Module</div>
								<input type="text" class="sc-input" id="sc-input-dt-module" value="Selling">
							</div>
							<div class="sc-prop-group" style="display:flex; flex-direction:column; gap:8px; margin-top: 8px;">
								<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
									<input type="checkbox" id="sc-input-dt-child">
									<span>Is Child Table</span>
								</label>
								<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
									<input type="checkbox" id="sc-input-dt-submittable">
									<span>Is Submittable</span>
								</label>
							</div>
						</div>

						<!-- Right Column: Fields Builder -->
						<div style="flex: 1.5; display: flex; flex-direction: column; gap: 12px; min-width: 380px; height: 100%; overflow: hidden;">
							<div style="font-weight: 600; font-size: 13px; color: var(--sc-accent-blue); text-transform: uppercase; tracking: 0.05em;">DocType Fields</div>
							
							<!-- Add Field Row -->
							<div style="background: rgba(30, 41, 59, 0.3); border: 1px solid var(--sc-border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
								<div style="display: flex; gap: 8px;">
									<div style="flex: 1;">
										<input type="text" class="sc-input" id="sc-input-fld-name" placeholder="Fieldname (e.g. customer_name)" style="font-size: 12px; padding: 6px 10px;">
									</div>
									<div style="flex: 1;">
										<select class="sc-input" id="sc-input-fld-type" onchange="window.canvasEngine.onDocTypeFieldTypeChange()" style="font-size: 12px; padding: 6px 10px; height: 32px;">
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
								</div>
								<div style="display: flex; gap: 8px; align-items: center; width: 100%;">
									<div style="flex: 1.5; width: 100%;" id="sc-fld-opts-container">
										<input type="text" class="sc-input" id="sc-input-fld-opts" placeholder="Options (Target DocType / Select Options)" style="font-size: 12px; padding: 6px 10px; width: 100%;">
									</div>
								</div>
								<label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; flex: 1; user-select: none;">
									<input type="checkbox" id="sc-input-fld-reqd">
									<span>Mandatory</span>
								</label>
								<span id="sc-btn-fld-actions-container" style="display: flex; gap: 6px;">
									<button class="sc-btn sc-btn-primary" id="sc-btn-add-fld" onclick="window.canvasEngine.addNewDocTypeField()" style="padding: 6px 12px; font-size: 12px;">+ Add Field</button>
								</span>
							</div>

							<!-- Added Fields List -->
							<div style="flex: 1; overflow-y: auto; border: 1px solid var(--sc-border); border-radius: 8px; background: rgba(15, 23, 42, 0.5);">
								<table class="sc-table" style="font-size: 12px; width: 100%;">
									<thead>
										<tr style="background: rgba(30, 41, 59, 0.4); position: sticky; top: 0; z-index: 10;">
											<th style="padding: 8px 10px;">Fieldname</th>
											<th style="padding: 8px 10px;">Type</th>
											<th style="padding: 8px 10px;">Options</th>
											<th style="padding: 8px 10px;">Mandatory</th>
											<th style="text-align: right; padding: 8px 10px;">Action</th>
										</tr>
									</thead>
									<tbody id="sc-doctype-fields-tbody">
										<!-- Dynamically populated rows -->
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<!-- Tab 2: Existing System DocTypes List -->
					<div class="sc-modal-body" id="sc-newdt-tab-existing" style="display: none; flex-direction: column; gap: 14px; padding: 20px; overflow: hidden; height: 450px;">
						<div style="display: flex; gap: 12px; align-items: center;">
							<input type="text" class="sc-input" id="sc-input-search-sys-dt" placeholder="🔍 Search existing Frappe DocType by name or module..." oninput="window.canvasEngine.renderExistingDocTypesList(this.value)" style="flex: 1; padding: 8px 12px; font-size: 13px;">
						</div>
						<div id="sc-existing-doctypes-list-container" style="flex: 1; overflow-y: auto; border: 1px solid var(--sc-border); border-radius: 8px; background: rgba(15, 23, 42, 0.5);">
							<!-- Populated dynamically -->
						</div>
					</div>

					<div class="sc-modal-footer" id="sc-modal-doctype-footer" style="padding: 12px 20px; border-top: 1px solid var(--sc-border); display: flex; justify-content: flex-end; gap: 10px; background: rgba(30, 41, 59, 0.2);">
						<button class="sc-btn" onclick="document.getElementById('sc-modal-doctype').remove()">Cancel</button>
						<button class="sc-btn sc-btn-primary" onclick="window.canvasEngine.submitNewDocType()">Create DocType</button>
					</div>
				</div>
			</div>
		`;
		document.getElementById('sc-modal-container').innerHTML = html;

		// Input listener on DocType name to auto-suggest naming field and module
		const dtNameInput = document.getElementById('sc-input-dt-name');
		dtNameInput.addEventListener('input', (e) => {
			const val = e.target.value.trim();
			if (val && this.newDocTypeFields.length === 0) {
				const fname = val.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_name';
				document.getElementById('sc-input-fld-name').placeholder = `e.g. ${fname}`;
			}
		});

		this.renderNewDocTypeFields();
	}

	switchNewDocTypeTab(tab) {
		const customTabBtn = document.getElementById('sc-tab-btn-custom');
		const existingTabBtn = document.getElementById('sc-tab-btn-existing');
		const customTabContent = document.getElementById('sc-newdt-tab-custom');
		const existingTabContent = document.getElementById('sc-newdt-tab-existing');
		const modalFooter = document.getElementById('sc-modal-doctype-footer');

		if (tab === 'custom') {
			if (customTabBtn) customTabBtn.classList.add('active');
			if (existingTabBtn) existingTabBtn.classList.remove('active');
			if (customTabContent) customTabContent.style.display = 'flex';
			if (existingTabContent) existingTabContent.style.display = 'none';
			if (modalFooter) modalFooter.style.display = 'flex';
		} else {
			if (customTabBtn) customTabBtn.classList.remove('active');
			if (existingTabBtn) existingTabBtn.classList.add('active');
			if (customTabContent) customTabContent.style.display = 'none';
			if (existingTabContent) existingTabContent.style.display = 'flex';
			if (modalFooter) modalFooter.style.display = 'none';
			this.renderExistingDocTypesList();
		}
	}

	renderExistingDocTypesList(filterText = '') {
		const container = document.getElementById('sc-existing-doctypes-list-container');
		if (!container) return;

		const q = (filterText || '').toLowerCase().trim();
		const projNames = new Set((this.doctypes || []).map(d => d.doctype_name));

		const filtered = (this.systemDocTypes || []).filter(dt => {
			if (q) {
				return dt.doctype_name.toLowerCase().includes(q) || (dt.module || '').toLowerCase().includes(q);
			}
			return true;
		});

		if (filtered.length === 0) {
			container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--sc-text-muted);">No matching system DocTypes found</div>`;
			return;
		}

		let html = `<table class="sc-table" style="width:100%; font-size:12px;">
			<thead>
				<tr style="background: rgba(30, 41, 59, 0.4); position: sticky; top: 0; z-index: 10;">
					<th style="padding: 8px 12px;">DocType Name</th>
					<th style="padding: 8px 12px;">Module</th>
					<th style="padding: 8px 12px;">Type</th>
					<th style="padding: 8px 12px; text-align: right;">Action</th>
				</tr>
			</thead>
			<tbody>`;

		filtered.forEach(dt => {
			const isInProject = projNames.has(dt.doctype_name);
			const childTag = dt.is_child_table ? '<span class="sc-tag sc-tag-child" style="margin-left:4px;">Child</span>' : '';
			const submitTag = dt.is_submittable ? '<span class="sc-tag sc-tag-submittable" style="margin-left:4px;">Submittable</span>' : '';
			const customTag = dt.custom ? '<span class="sc-tag" style="background: rgba(168, 85, 247, 0.2); color: #C084FC; margin-left:4px;">Custom</span>' : '';

			const actionBtn = isInProject
				? `<span style="font-size:11px; color:var(--sc-accent-green); font-weight:600;">✓ Added</span>`
				: `<button class="sc-btn sc-btn-primary" style="padding:4px 10px; font-size:11px;" onclick="window.canvasEngine.importExistingDocTypeAndConnect('${dt.doctype_name}')">+ Add to Canvas</button>`;

			html += `
				<tr>
					<td style="padding: 8px 12px; font-weight: 600;">📄 ${dt.doctype_name} ${childTag}${submitTag}${customTag}</td>
					<td style="padding: 8px 12px; color: var(--sc-text-muted);">${dt.module || 'Custom'}</td>
					<td style="padding: 8px 12px;">${dt.is_child_table ? 'Child Table' : 'Standard'}</td>
					<td style="padding: 8px 12px; text-align: right;">${actionBtn}</td>
				</tr>
			`;
		});

		html += `</tbody></table>`;
		container.innerHTML = html;
	}


	renderNewDocTypeFields() {
		const tbody = document.getElementById('sc-doctype-fields-tbody');
		if (!tbody) return;

		if (this.newDocTypeFields.length === 0) {
			tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--sc-text-muted); padding: 16px;">No fields added yet.</td></tr>`;
			return;
		}

		tbody.innerHTML = this.newDocTypeFields.map((f, idx) => {
			let pillClass = 'sc-field-type-pill';
			if (f.fieldtype === 'Link') pillClass += ' sc-field-type-link';
			if (f.fieldtype === 'Table') pillClass += ' sc-field-type-table';

			const isEditing = this.editingFieldIdx === idx;
			const rowStyle = isEditing ? 'style="background: rgba(56, 189, 248, 0.15);"' : '';
			const editIndicator = isEditing ? ' <span style="font-size: 9px; color: var(--sc-accent-blue);">(editing)</span>' : '';

			return `
				<tr ${rowStyle}>
					<td style="padding: 6px 10px; font-weight: 600;">${f.fieldname}${editIndicator}</td>
					<td style="padding: 6px 10px;"><span class="${pillClass}">${f.fieldtype}</span></td>
					<td style="padding: 6px 10px; color: var(--sc-text-muted);">${f.options || '-'}</td>
					<td style="padding: 6px 10px; text-align: center;">${f.reqd ? '✅' : '❌'}</td>
					<td style="padding: 6px 10px; text-align: right; white-space: nowrap;">
						<button class="sc-btn" style="padding: 2px 6px; font-size: 11px; margin-right: 4px;" onclick="window.canvasEngine.editNewDocTypeField(${idx})">✏️</button>
						<button class="sc-btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.canvasEngine.removeNewDocTypeField(${idx})">✕</button>
					</td>
				</tr>
			`;
		}).join('');
	}

	addNewDocTypeField() {
		const fnameInput = document.getElementById('sc-input-fld-name');
		const ftypeSelect = document.getElementById('sc-input-fld-type');
		const foptsInput = document.getElementById('sc-input-fld-opts');
		const freqdCheck = document.getElementById('sc-input-fld-reqd');

		let fname = fnameInput.value.trim().toLowerCase();
		// Convert spaces, hyphens, etc to underscores
		fname = fname.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
		const ftype = ftypeSelect.value;
		const foptions = foptsInput.value.trim();
		const freqd = freqdCheck.checked ? 1 : 0;

		if (!fname) {
			return frappe.msgprint("Fieldname is required");
		}

		if (this.editingFieldIdx !== null) {
			// Check duplicate (ignoring itself)
			if (this.newDocTypeFields.some((f, idx) => idx !== this.editingFieldIdx && f.fieldname === fname)) {
				return frappe.msgprint(`Fieldname "${fname}" already exists`);
			}

			this.newDocTypeFields[this.editingFieldIdx] = {
				fieldname: fname,
				fieldtype: ftype,
				options: foptions,
				reqd: freqd
			};

			this.editingFieldIdx = null;

			// Restore button
			const container = document.getElementById('sc-btn-fld-actions-container');
			if (container) {
				container.innerHTML = `
					<button class="sc-btn sc-btn-primary" id="sc-btn-add-fld" onclick="window.canvasEngine.addNewDocTypeField()" style="padding: 6px 12px; font-size: 12px;">+ Add Field</button>
				`;
			}
		} else {
			// Check duplicate
			if (this.newDocTypeFields.some(f => f.fieldname === fname)) {
				return frappe.msgprint(`Fieldname "${fname}" already exists`);
			}

			this.newDocTypeFields.push({
				fieldname: fname,
				fieldtype: ftype,
				options: foptions,
				reqd: freqd
			});
		}

		// Clear field inputs
		fnameInput.value = '';
		this.updateDocTypeFieldOptionsInput('Data');
		freqdCheck.checked = false;

		// Re-focus fname input
		fnameInput.focus();

		this.renderNewDocTypeFields();
	}

	removeNewDocTypeField(idx) {
		// If we're removing the field that is currently being edited, cancel the edit first
		if (this.editingFieldIdx === idx) {
			this.cancelEditField();
		} else if (this.editingFieldIdx > idx) {
			// Adjust editing index if we deleted a field before it
			this.editingFieldIdx--;
		}
		this.newDocTypeFields.splice(idx, 1);
		this.renderNewDocTypeFields();
	}

	editNewDocTypeField(idx) {
		const f = this.newDocTypeFields[idx];
		if (!f) return;

		this.editingFieldIdx = idx;

		// Populate inputs
		document.getElementById('sc-input-fld-name').value = f.fieldname;
		document.getElementById('sc-input-fld-type').value = f.fieldtype;
		this.updateDocTypeFieldOptionsInput(f.fieldtype, f.options || '');
		document.getElementById('sc-input-fld-reqd').checked = !!f.reqd;

		// Update button label and add Cancel button
		const container = document.getElementById('sc-btn-fld-actions-container');
		if (container) {
			container.innerHTML = `
				<button class="sc-btn sc-btn-success" id="sc-btn-add-fld" onclick="window.canvasEngine.addNewDocTypeField()" style="padding: 6px 12px; font-size: 12px;">Update Field</button>
				<button class="sc-btn" onclick="window.canvasEngine.cancelEditField()" style="padding: 6px 12px; font-size: 12px;">Cancel</button>
			`;
		}

		this.renderNewDocTypeFields();
	}

	cancelEditField() {
		this.editingFieldIdx = null;

		// Clear field inputs
		document.getElementById('sc-input-fld-name').value = '';
		this.updateDocTypeFieldOptionsInput('Data');
		document.getElementById('sc-input-fld-reqd').checked = false;

		// Restore button
		const container = document.getElementById('sc-btn-fld-actions-container');
		if (container) {
			container.innerHTML = `
				<button class="sc-btn sc-btn-primary" id="sc-btn-add-fld" onclick="window.canvasEngine.addNewDocTypeField()" style="padding: 6px 12px; font-size: 12px;">+ Add Field</button>
			`;
		}

		this.renderNewDocTypeFields();
	}
	
	submitNewDocType() {
		const dtName = document.getElementById('sc-input-dt-name').value.trim();
		const module = document.getElementById('sc-input-dt-module').value.trim();
		const isChild = document.getElementById('sc-input-dt-child').checked ? 1 : 0;
		const isSubmittable = document.getElementById('sc-input-dt-submittable').checked ? 1 : 0;
		
		if (!dtName) return frappe.msgprint("DocType name is required");
		
		// If there is any unsaved field value in the input boxes, automatically add/update it
		const fnameInput = document.getElementById('sc-input-fld-name');
		if (fnameInput) {
			let fname = fnameInput.value.trim().toLowerCase();
			if (fname) {
				fname = fname.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
				const ftypeSelect = document.getElementById('sc-input-fld-type');
				const foptsInput = document.getElementById('sc-input-fld-opts');
				const freqdCheck = document.getElementById('sc-input-fld-reqd');

				const ftype = ftypeSelect.value;
				const foptions = foptsInput.value.trim();
				const freqd = freqdCheck.checked ? 1 : 0;

				if (this.editingFieldIdx !== null) {
					this.newDocTypeFields[this.editingFieldIdx] = {
						fieldname: fname,
						fieldtype: ftype,
						options: foptions,
						reqd: freqd
					};
				} else {
					if (!this.newDocTypeFields.some(f => f.fieldname === fname)) {
						this.newDocTypeFields.push({
							fieldname: fname,
							fieldtype: ftype,
							options: foptions,
							reqd: freqd
						});
					}
				}
			}
		}

		let fields = [...this.newDocTypeFields];
		if (fields.length === 0) {
			const defaultFname = dtName.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_name';
			fields.push({
				fieldname: defaultFname,
				fieldtype: "Data",
				reqd: 1
			});
		}
		
		frappe.call({
			method: "system_canvas.api.save_doctype",
			args: {
				project_name: this.projectName,
				doctype_name: dtName,
				module: module,
				is_child_table: isChild,
				is_submittable: isSubmittable,
				fields: JSON.stringify(fields)
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
				<div class="sc-modal-window" style="width:480px;">
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
							<select class="sc-input" id="sc-input-ftype" onchange="window.canvasEngine.onAddFieldTypeChange()">
								<option value="Data">Data</option>
								<option value="Link">Link</option>
								<option value="Table">Table (Child Table)</option>
								<option value="Select">Select</option>
								<option value="Int">Int</option>
								<option value="Float">Float</option>
								<option value="Currency">Currency</option>
								<option value="Check">Check</option>
								<option value="Date">Date</option>
								<option value="Datetime">Datetime</option>
								<option value="Small Text">Small Text</option>
								<option value="Text">Text</option>
								<option value="Attach">Attach</option>
							</select>
						</div>
						<div class="sc-prop-group">
							<div class="sc-prop-label">Options (Target DocType if Link/Table)</div>
							<div id="sc-addfield-opts-container">
								<input type="text" class="sc-input" id="sc-input-foptions" placeholder="e.g. Customer Group">
							</div>
						</div>
						<div class="sc-prop-group">
							<label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" id="sc-input-freqd"> Mandatory</label>
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

	onAddFieldTypeChange() {
		const ftype = document.getElementById('sc-input-ftype').value;
		const container = document.getElementById('sc-addfield-opts-container');
		if (!container) return;

		if (ftype === 'Link' || ftype === 'Table') {
			const projNames = new Set((this.doctypes || []).map(d => d.doctype_name));
			const projOpts = (this.doctypes || []).map(d => `<option value="${d.doctype_name}">📄 ${d.doctype_name}</option>`).join('');
			const sysOpts = (this.systemDocTypes || [])
				.filter(d => !projNames.has(d.doctype_name))
				.map(d => `<option value="${d.doctype_name}">🌐 ${d.doctype_name} (${d.module})</option>`)
				.join('');

			container.innerHTML = `
				<select class="sc-input" id="sc-input-foptions" style="font-size: 12px; padding: 6px 10px; height: 32px; width: 100%;">
					<option value="">-- Select Target DocType --</option>
					${projOpts ? `<optgroup label="Project DocTypes">${projOpts}</optgroup>` : ''}
					${sysOpts ? `<optgroup label="Existing Frappe System DocTypes">${sysOpts}</optgroup>` : ''}
				</select>
			`;
		} else {
			container.innerHTML = `
				<input type="text" class="sc-input" id="sc-input-foptions" placeholder="e.g. Customer Group">
			`;
		}
	}
	
	submitAddField(doctypeName) {
		const fnameInput = document.getElementById('sc-input-fname');
		const ftypeSelect = document.getElementById('sc-input-ftype');
		const foptsElem = document.getElementById('sc-input-foptions');
		const freqdCheck = document.getElementById('sc-input-freqd');

		const fname = fnameInput ? fnameInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : '';
		const ftype = ftypeSelect ? ftypeSelect.value : 'Data';
		const foptions = foptsElem ? foptsElem.value.trim() : '';
		const freqd = freqdCheck && freqdCheck.checked ? 1 : 0;
		
		if (!fname) return frappe.msgprint("Fieldname is required");
		
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (dt) {
			const updatedFields = [...(dt.fields || []), {
				fieldname: fname,
				fieldtype: ftype,
				options: foptions,
				reqd: freqd
			}];
			
			const saveFieldCall = () => {
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
							const modal = document.getElementById('sc-modal-addfield');
							if (modal) modal.remove();
							this.loadProject(this.projectName);
						}
					}
				});
			};

			// If linked target DocType exists in system but not yet added to project canvas, auto-add target DocType to canvas as well
			const projNames = new Set((this.doctypes || []).map(d => d.doctype_name));
			if ((ftype === 'Link' || ftype === 'Table') && foptions && !projNames.has(foptions)) {
				const isSys = (this.systemDocTypes || []).some(s => s.doctype_name === foptions);
				if (isSys) {
					frappe.call({
						method: "system_canvas.api.add_existing_doctype",
						args: {
							project_name: this.projectName,
							doctype_name: foptions
						},
						callback: () => saveFieldCall()
					});
					return;
				}
			}

			saveFieldCall();
		}
	}
	
	removeField(doctypeName, fieldIdx) {
		const dt = this.doctypes.find(d => d.doctype_name === doctypeName);
		if (dt && dt.fields) {
			const field = dt.fields[fieldIdx];
			if (!field) return;
			frappe.confirm(`Are you sure you want to delete field "${field.fieldname}" from ${doctypeName}?`, () => {
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
			});
		}
	}

	saveNewRelation(sourceDocType) {
		const target = document.getElementById('sc-rel-target-dt').value;
		let fname = document.getElementById('sc-rel-fieldname').value.trim().toLowerCase();
		fname = fname.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
		const ftype = document.getElementById('sc-rel-type').value;

		if (!target) {
			return frappe.msgprint("Target DocType is required");
		}
		if (!fname) {
			return frappe.msgprint("Fieldname is required");
		}

		const dt = this.doctypes.find(d => d.doctype_name === sourceDocType);
		if (dt) {
			if (dt.fields && dt.fields.some(f => f.fieldname === fname)) {
				return frappe.msgprint(`Fieldname "${fname}" already exists on ${sourceDocType}`);
			}

			const newField = {
				fieldname: fname,
				fieldtype: ftype,
				options: target,
				reqd: 0
			};
			const updatedFields = [...(dt.fields || []), newField];

			const saveRelCall = () => {
				frappe.call({
					method: "system_canvas.api.save_doctype",
					args: {
						project_name: this.projectName,
						doctype_name: sourceDocType,
						module: dt.module,
						is_child_table: dt.is_child_table,
						is_submittable: dt.is_submittable,
						fields: JSON.stringify(updatedFields)
					},
					callback: (r) => {
						if (r.message) {
							this.loadProject(this.projectName);
						}
					}
				});
			};

			const projNames = new Set((this.doctypes || []).map(d => d.doctype_name));
			if (target && !projNames.has(target)) {
				const isSys = (this.systemDocTypes || []).some(s => s.doctype_name === target);
				if (isSys) {
					frappe.call({
						method: "system_canvas.api.add_existing_doctype",
						args: {
							project_name: this.projectName,
							doctype_name: target
						},
						callback: () => saveRelCall()
					});
					return;
				}
			}

			saveRelCall();
		}
	}


	deleteRelation(sourceDocType, fieldname) {
		frappe.confirm(`Are you sure you want to delete the relation via field "${fieldname}" on ${sourceDocType}?`, () => {
			const dt = this.doctypes.find(d => d.doctype_name === sourceDocType);
			if (dt && dt.fields) {
				const updatedFields = dt.fields.filter(f => f.fieldname !== fieldname);
				frappe.call({
					method: "system_canvas.api.save_doctype",
					args: {
						project_name: this.projectName,
						doctype_name: sourceDocType,
						module: dt.module,
						is_child_table: dt.is_child_table,
						is_submittable: dt.is_submittable,
						fields: JSON.stringify(updatedFields)
					},
					callback: (r) => {
						if (r.message) {
							this.loadProject(this.projectName);
						}
					}
				});
			}
		});
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

	toggleFullScreen() {
		const elem = document.querySelector('.sc-app-wrapper');
		if (!elem) return;
		if (!document.fullscreenElement) {
			elem.requestFullscreen().catch(err => {
				console.error(`Error attempting to enable full-screen mode: ${err.message}`);
			});
		} else {
			document.exitFullscreen();
		}
	}

	deleteDocType(doctypeName) {
		frappe.confirm(`Are you sure you want to permanently delete DocType "${doctypeName}"? This will also remove any field schema and relationship definitions.`, () => {
			frappe.call({
				method: "system_canvas.api.delete_doctype",
				args: {
					project_name: this.projectName,
					doctype_name: doctypeName
				},
				callback: (r) => {
					if (r.message && r.message.status === 'success') {
						if (this.selectedDocType === doctypeName) {
							this.selectedDocType = null;
							this.inspectorContent.innerHTML = `<div style="color:var(--sc-text-muted); text-align:center; padding-top:40px;">Select an item to view properties</div>`;
						}
						const modal = document.getElementById('sc-modal-level3');
						if (modal) {
							modal.remove();
						}
						this.loadProject(this.projectName);
					}
				}
			});
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
