HotTree = function (rawData, style, layout) {
	logger("HotTree(): Initialising.");
	// Layout
	L = zt.getMaxLayout(800, 580, 50);
	$(window).on("orientationchange", function () {
		location.reload();
	});
	with (L) {
		L.sidebar = new zLayout({
			x:5, y:5,
			width:400, height:height - 10,
			padding:30, rounded:16
		});
		L.swarm = new zLayout({
			x:L.sidebar.right + padding + (innerWidth - L.sidebar.width) / 2,
			y:padding + innerHeight * 0.5,
			width:innerWidth - L.sidebar.width - padding,
			height:innerHeight,
			align:"centre"
		});
		L.breadcrumb = {
			x:L.sidebar.right + 12, y:top + 12,
			width:(innerWidth - L.sidebar.right)
		};
	};
	with (L.sidebar) {
		L.title = {
			x:left + padding, y:top + padding + 30,
			width:innerWidth, yAlign:"yCentre"
		};
		L.scale = new zLayout({
			x:left + padding, y:L.title.y + 60,
			width:innerWidth * 0.8, height:innerHeight * 0.016
		});
		L.description = {
			x:left + padding, y:L.scale.bottom + 42,
			width:innerWidth, height:((layout && layout.description) ? layout.description.height : null) || 460
		};
		L.lineChart = new zLayout({
			x:left + padding + 32, y:bottom - padding - 20,
			width:innerWidth - 32,
			height:zt.forceBetween(innerHeight - L.description.height, 50, innerHeight / 2),
			align:"leftBottom"
		});
	};
	with (L.swarm) {
		L.altHeight = height - 26;
		L.viewPort = clone({ // When zoomed in, need to leave a bit of extra space on the bottom for zoomOutTab
			anchor:{x:x, y:L.padding + L.altHeight / 2},
			height:L.altHeight, width:L.altHeight * width / height
		});
		L.zoomOutTab = {
			x:xCentre, y:L.bottom + 8,
			align:"centreBottom",
			padding:12, rounded:8
		};
	};
	L = zo.extend(L, layout); // Overwrite layout with user-defined layout
	L.description.height = null; // Don't actually pass height onto description - it's used to calculate bar chart size only

	// Extend
	Y = {
		// Base colours
		maxVal:0.5, // 0.5 will result in maximum saturations
		// Brown-Blue (lighter)
		neuFill:"#ddc", // Grey
		posFill:"#5ab4ac", // Blue
		negFill:"#d8b365", // Brown
		nullFill:"#cfbdda", // Purple
		// Animation parameters
		highlight:{t:400},
		merge:{t:800},
		zoom:{t:1000},
		// Text formating
		valFormat:zt.format({m:"abbreviate", dp:1}),
		altValFormat:zt.format({m:"abbreviate", dp:1, forceSign:true}),
		decFormat:zt.format({m:"%", dp:1}),
		altDecFormat:zt.format({m:"%", dp:1, forceSign:true}),
		// Objects
		swarm:{
			id:"main",
			layout:L.swarm
		},
		xAxis:{
			id:"xAxis",
			layout:L.lineChart,
			align:"bottom",
			ticks:6
		},
		yAxis:{
			id:"yAxis",
			layout:L.lineChart,
			align:"left",
			ticks:4,
			tickFormat:null,
			innerTickSize:-L.lineChart.innerWidth
		},
		sidebar:{
			id:"side",
			layout:L.sidebar,
			style:{
				scale:{
					ticks:3,
					tickFormat:"%"
				},
				scaleLabel:{branchLength:6},
				linePoints:{
					radius:3.5,
					largeRadius:6,
				},
				lineLabel:{
					branchLength:20
				},
				gladwrap:{snap:30}
			}
		}
	};
	Y = zo.extend(Y, style); // Overwrite style with user-defined style first, then parse
	Y.yAxis.tickFormat = Y.valFormat;

	// Data
	logger("HotTree(): Collating and crunching data.");
	var dc = new zDataCube(2, rawData);
	// Plot a treemap based on vals and store in .meta[d].layout
	dc.setTreemap = function (x, vals, layout) {
		var c = dc;
		layout = (layout instanceof zLayout) ? layout.getVitals() : zp.completeBox(layout); // Don't use original, as L will need to shrink as more of the treemap is plotted
		var i, j, n, batch, primary, secondary, currX, currY, out = [],
			nodes = c.getAllMeta(x), // Note that metaObjs are temporary
			sum = za.sum(za.getAll(vals, 0, ">")), // Ignore all negative values
			xAlign = (layout.xAlign == "right") ? "right" : "left",
			yAlign = (layout.yAlign == "bottom") ? "bottom" : "top",
			xMod = (xAlign == "right") ? -1 : 1,
			yMod = (yAlign == "bottom") ? -1 : 1;
		for (i = 0; i < nodes.length; i++) {
			nodes[i].area = (isNaN(vals[i]) || vals[i] <= 0) ? 0 : layout.width * layout.height * vals[i] / sum; // Calculate area for each node
		};
		nodes = za.sortObjects(nodes, "area", true); // Sort in descending size
		for (i = 0; i < nodes.length; null) { // Don't iterate here...
			batch = [nodes[i]]; // The batch must have at least one node
			primary = Math.min(layout.width, layout.height) - Math.sqrt(nodes[i].area); // Primary dimension is the shorter one
			// See how many nodes fit on that dimension at a 1:1 (i.e. Square, hence .sqrt()) ratio
			for (i++; i < nodes.length && primary >= 0; i++) { // ..this is the real iterator
				primary -= Math.sqrt(nodes[i].area);
				batch.push(nodes[i]);
			};
			secondary = za.calcObjects(batch, "area", "sum") / Math.min(layout.width, layout.height); // Total area for batch / primary dimension = secondary dimension
			// For each object, calculate its primary dimension by dividing its area by the secondary dimension
			if (secondary <= 0) { // No actual area left - just placeholders
				for (j = 0; j < batch.length; j++) {
					n = batch[j];
					c.setMeta("layout", {d:x.d, p:n.p}, {
						x:layout[xAlign], y:layout[yAlign],
						width:0, height:0,
						xAlign:xAlign, yAlign:yAlign
					});
				};
			} else if (layout.width < layout.height) { // Plot whole row (i.e. Width is primary)
				currX = layout[xAlign];
				for (j = 0; j < batch.length; j++) {
					n = batch[j];
					c.setMeta("layout", {d:x.d, p:n.p}, {
						x:currX, y:layout[yAlign],
						width:n.area / secondary, height:secondary,
						xAlign:xAlign, yAlign:yAlign
					});
					currX += xMod * n.area / secondary;
				};
				layout[yAlign] += yMod * secondary;
				layout.height -= secondary;
			} else { // Plot whole column (i.e. Height is primary)
				currY = layout[yAlign];
				for (j = 0; j < batch.length; j++) {
					n = batch[j];
					c.setMeta("layout", {d:x.d, p:n.p}, {
						x:layout[xAlign], y:currY,
						width:secondary, height:n.area / secondary,
						xAlign:xAlign, yAlign:yAlign
					});
					currY += yMod * n.area / secondary;
				};
				layout[xAlign] += xMod * secondary;
				layout.width -= secondary;
			};
		};
	};

	with (dc) {
		CURR_TIME = getSize(1) - 1; // Last period
		BASE_TIME = getSize(1) - 2; // Second to last period
		if (getSize(1) > 2) { // Only allow time change if there're more than two periods
			$("<a id='first'></a>")
				.html(getName({d:1, p:0}) + "-" + getName({d:1, p:CURR_TIME}))
				.attr("href", "javascript:SWARM.changeBaseTime('" + getName({d:1, p:0}) + "')")
				.appendTo("<li></li>")
				.parent().insertBefore("#chewylogo");
			$("<a id='prev'></a>")
				.html(getName({d:1, p:BASE_TIME}) + "-" + getName({d:1, p:CURR_TIME}))
				.attr("href", "javascript:SWARM.changeBaseTime('" + getName({d:1, p:BASE_TIME}) + "')")
				.appendTo("<li></li>")
				.parent().insertBefore("#chewylogo");
			$("#prev").addClass("active"); // Change menubar highlight
		};
	};

	dc.prepareData = function () { // Store preparation phase in function so changeMode can call it later
		var dc = this, i, index = [];
		with (dc) {
			meta[0].description = meta[0].description || []; // Placeholder for description
			// There should always be a true root node which encompasses everything and is never shown
			if (meta[0].tree[0].length > 1) {
				addRootNode(0, Y.customRootName || "Total"); // Create root node
			};
			ROOT = meta[0].tree[0][0];
			// Set initial generation
			calcTreeData("sum", "val", 0); // Checks that low-level nodes add up to high level nodes if they exist, or creates them if they don't
			setDomain(0, meta[0].tree[1]);
			// Add names to searchBox
			for (i = 0; i < getSize(0); i++) {
				index.push({key:i, label:meta[0].name[i]}); // Log name (searchBox will need this)
			};
			$("#searchBox").autocomplete({source:index, select:function (event, ui) {swarm.zoomTo(ui.item.key)}}); // Give list to searchBox
		};
		return dc;
	};
	dc.prepareData();

	logger("HotTree(): Drawing accessories.");
	CANVAS = new zCanvas(L);
	var tooltipBox = new zHTMLTooltipBox({});
	tooltipBox.hover(function () {tooltipBox.hide()});

	logger("HotTree(): Drawing main swarm.");
	var swarm = new zSwarm({
		extend:Y.swarm,
		tooltipBox:tooltipBox,
		dc:dc, s:[dc.meta[0].tree[1], CURR_TIME],
		onInit:function () {
			var S = this;
			S.selected = {d:0, p:ROOT};
			S.parentPos = dc.findParent(S.selected);
			S.childrenPos = dc.findChildren(S.selected);
		},
		changeBaseTime:function (time) {
			if (this.locked) return;
			BASE_TIME = dc.findMeta("name", {d:1}, time);
			if (BASE_TIME == null) BASE_TIME = CURR_TIME - 1; // Default BASE_TIME
			// Change menubar highlight
			$("#first, #prev").removeClass("active");
			if (BASE_TIME == 0) {
				$("#first").addClass("active");
			} else if (BASE_TIME == CURR_TIME - 1) {
				$("#prev").addClass("active");
			};
			// Redraw
			sidebar.refresh("all", Y.merge)
			this.refresh("treemap", Y.merge);
			this.setURL();
			logger("HotTree(): Comparing " + dc.getName({d:1, p:BASE_TIME}) + " with " + dc.getName({d:1, p:CURR_TIME}));
		},
		setURL:function () {
			document.location.hash = dc.getName({d:1, p:BASE_TIME}) + "." + this.selected.p;
		},
		getVal:function (A) {
			return dc.getData("val", {s:A});
		},
		getBaseVal:function (p) {
			return this.getVal([p, BASE_TIME]);
		},
		getCurrVal:function (p) {
			return this.getVal([p, CURR_TIME]);
		},
		getColour:function (dec) {
			var S = this;
			if (isNaN(dec) || dec == Infinity) return Y.nullFill;
			return zt.getColour(dec / Y.maxVal, Y.neuFill, Y.posFill, Y.negFill);
		},
		select:function (p, b) {
			var S = this, t = Y.highlight;
			S.selected = {d:0, p:p};
			S.parentPos = dc.findParent(S.selected);
			S.childrenPos = dc.findChildren(S.selected);
// 			S.refresh({role:"breadcrumb", mode:{noUpdateData:true}});
			S.refresh("breadcrumb");
			S.highlight(p, true);
			S.addClass({role:"treemap", d:0, p:"all"}, "fade", t);
			S.removeClass({d:0, p:S.childrenPos.concat(S.selected.p)}, "fade", t);
			S.G.delay(t, b);
			S.setURL();
		},
		highlight:function (p, force) {
			if (this.locked && !force) return;
			var S = this, t = Y.highlight,
				layout, x = {d:0, p:p};
			if (p != S.selected.p && !dc.findChildren(S.selected).length) return; // Childless node selected - disallow change highlight
			if (p == S.targ) return; // Don't act on duplicate action
			S.targ = p;
			S.G.delay((force) ? null : 100, function () {
				if (p != S.targ) return; // Quit if targHighlighted has changed
				if (p == null) {
					S._highlight(null, t);
					sidebar.setSpace(S.selected, t);
					sidebar.refresh("all", t);
					tooltipBox.hide(t);
				} else {
					layout = zp.completeBox(dc.getMeta("layout", x));
// 					if (!zt.isBetween(zDebug.checkIE(), 0, 9)) S.toFront(x); // In IE9 and below, toFront() strips events
					S._highlight(x, t);
					sidebar.setSpace(x, t);
					sidebar.refresh("all", t);
					tooltipBox.attr({text:dc.getName(x)});
					tooltipBox.showAt(null, {
						x:layout.xCentre, y:layout.top - 3,
						align:"centreBottom"
					}, t);
				};
				S.targ = -1;
			});
		},
		zoomTo:function (p, b, force) {
			if (this.locked && !force) return;
			if (p == null) p = this.parentPos; // p is null (i.e. Trying to zoom out)
			if (p == null) return; // Parent is also null (i.e. Trying to zoom out, but at top level already)
			var S = this, t = Y.highlight, layout,
				iterate = function () {S.zoomTo(p, b, true)}, // This carries the original p all the way through
				path = dc.findRelationship(0, S.selected.p, (p == null) ? S.parentPos : p),
				generation = dc.getMeta("generation", {d:0, p:path});
			S.lock();
			// Check zoomOutTab status
			if (p == ROOT) S.hide("zoomOutTab", t); // Fade out
			else S.show("zoomOutTab", t); // Fade in
			// Decide whether to zoom in, out, or whether already arrived
			if (path[1] == null) { // Arrived at target
				if (b) b();
				S.unlock();
			} else if (!S.childrenPos.length) { // Starting from childless node, so just deselect
				S.select(path[1], iterate);
			} else if (!dc.findChildren({d:0, p:path[1]}).length) { // Target is childless node, so just select (i.e. Don't zoom into it)
				S.select(path[1], iterate);
			} else if (generation[0] < generation[1]) { // Going deeper
				S.select(path[1], function () {
					layout = dc.getMeta("layout", {d:0, p:path[1]});
					S.zoom(layout, L.viewPort, Y.zoom, function () { // Zoom
						dc.domain[0] = dc.domain[0].concat(S.childrenPos);
						S.updateData(); // .updateData will provide layouts for new rectangles - this is why treemaps need their own aggregation/disaggregation functions
						S.add({d:0, p:S.childrenPos}, Y.merge, function () { // Add children
							S.addClass(S.selected, "_hide"); // Hide parent (but don't remove from DOM)
							iterate();
						});
					});
				});
				tooltipBox.hide(Y.highlight); // Don't show tooltips while zooming in
			} else if (generation[0] > generation[1]) { // Coming back out
				dc.domain[0] = za.subtract(dc.domain[0], S.childrenPos);
				S.updateData(); // .updateData will provide layouts for new rectangles - this is why treemaps need their own aggregation/disaggregation functions
				S.removeClass(S.selected, "_hide"); // Show parent
				S.remove({d:0, p:S.childrenPos}, Y.merge, function () { // Remove children
					layout = dc.getMeta("layout", {d:0, p:path[1]});
					S.zoom(layout, L.swarm, Y.zoom, function () { // Zoom out
						S.select(S.parentPos, iterate); // Deselect
					});
				});
				tooltipBox.hide(Y.highlight); // Don't show tooltips while zooming in
			} else logger("HotTree.ZoomTo(): YEAH NAH - attempting to go to a different element in the same generation - something must have gone wrong with the pathfinding." );
		},
		updateData:function () {
			var S = this, i, children, parent, layout, vals,
				generation = dc.getMeta("generation", S.selected);
			dc.setMeta("layout", {d:0, p:ROOT}, S.L.clone()); // Update root layout
			for (i = 1; i <= dc.getMeta("generation", S.selected) + 1; i++) { // For each generation (start from one after root, end at one after selected)
				children = dc.findAllMeta("generation", {d:0, p:dc.domain[0]}, i); // Get all the shown members of the current generation
				if (children.length) {
					parent = dc.findParent({d:0, p:children[0]}); // Assume that all the children must share the same parent
					vals = S.getCurrVal(children); // Value of the children
					layout = dc.getMeta("layout", {d:0, p:parent}); // Layout of the parent (all children must fit inside this layout)
					dc.setTreemap({d:0, p:children}, vals, layout);
				};
			};
		},
		plan:{
			background:{
				type:"zRectangle", layer:0,
				init:{layout:L},
				onAdd:function (S, D, mode) {
					if (!CANVAS.isiPad) {
						D.hover(function () {S.highlight()});
						D.click(function () {S.zoomTo()});
					} else {
						D.click(function () {
							if (sidebar.s[0] == S.selected.p) S.zoomTo();
							else S.highlight();
						});
					};
				}
			},
			breadcrumb:{
				type:"zHTML", layer:1,
				init:{layout:L.breadcrumb},
				curr:function (S, D, mode) {
					var i, out = "",
						p = dc.findFamily("ancestors", S.selected).reverse().concat(S.selected.p), // List every from root to self (i.e. Ancestors)
						name = dc.getName({d:0, p:p});
					for (i = 0; i < p.length - 1; i++) {
						out += "<a href=javascript:SWARM.zoomTo(" + p[i] + ")>" + name[i] + "</a> > ";
					};
					out += "<b>" + name[i] + "</b>";
					return {content:out};
				}
			},
			treemap:{
				type:"zRectangle", mask:"mask", layer:2,
				curr:function (S, D, mode) {
					var baseVal = S.getBaseVal(D.s[0]),
						currVal = S.getCurrVal(D.s[0]),
						decChange = currVal / baseVal - 1;
					return {
						fill:S.getColour(decChange),
						layout:dc.getMeta("layout", {d:0, s:D.s})
					};
				},
				onAdd:function (S, D, mode) {
					if (!CANVAS.isiPad) {
						D.hover(function () {
							var p = (za.contains(S.childrenPos, D.s[0])) ? D.s[0] : null;
							S.highlight(p);
						});
						D.click(function () {
							var p = (za.contains(S.childrenPos, D.s[0])) ? D.s[0] : null;
							S.zoomTo(p);
						});
					} else {
						D.click(function () {
							if (za.contains(S.childrenPos, D.s[0])) { // Active block
								if (D.s[0] === S.highlighted) S.zoomTo(D.s[0]);
								else S.highlight(D.s[0]);
							} else { // Inactive block
								if (sidebar.s[0] == S.selected.p) S.zoomTo();
								else S.highlight();
							};
						});
					};
				}
 			},
 			zoomOutTab:{
				type:"zTextBox", layer:3,
				init:{text:"Zoom out", background:{}, layout:L.zoomOutTab},
				onAdd:function (S, D, mode) {
					if (!CANVAS.isiPad) D.hoverHighlight(); // Hoverhiglight if not on an iPad
					D.click(function () {S.zoomTo(ROOT)}); // Zoom out
					D.hide();
				}
 			}
		}
	});

	logger("HotTree(): Drawing side bar.");
	var sidebar = new zSwarm({
		extend:Y.sidebar,
		dc:dc, s:[ROOT, "all"],
		axes:{
			x:new zAxis({extend:Y.xAxis, dc:dc, d:1}),
			y:new zAxis({extend:Y.yAxis, domain:[0, 10]})
		},
		swarm:swarm,
		highlighted:null,
		highlight:function (p) {
			var S = this,
				t = Y.highlight;
			if (p != null) {
				S.highlighted = p;
				S.show("lineLabel", 0);
				S.refresh({mode:{noUpdateData:true}, role:"lineLabel"});
			} else {
				S.highlighted = null;
				S.hide("lineLabel", 0);
			};
			S.refresh({mode:{noUpdateData:true}, role:"linePoints"});
		},
		getPoint:function (s) {
			var S = this;
			return {x:S.axes.x.scale(s[1]), y:S.axes.y.scale(S.vals[s[1]])};
		},
		updateData:function (t, b) {
			var S = this, i;
			S.vals = [];
			for (i = 0; i < dc.getSize(1); i++) {
				S.vals[i] = swarm.getVal([S.s[0], i]);
			};
			S.aStart = za.find(S.vals, 0, ">"); // The first valid year for this line item
			S.aEnd = za.findLast(S.vals, 0, ">"); // The first valid year for this line item
			S.axes.y.setDomain([
				zt.getFactorOfTen(Math.min(0, za.min(S.vals))),
				zt.getFactorOfTen(za.max(S.vals))
			]);
			// Plot points
			S.points = [];
			for (i = 0; i <= S.aStart; i++) S.points.push(S.getPoint([null, S.aStart])); // Draw placeholder points for empty/null values prior to first value *AT* the first value
			for (null; i <= S.aEnd; i++) S.points.push(S.getPoint([null, i])); // Draw actual values
			for (null; i < S.vals.length; i++) S.points.push(S.getPoint([null, S.aEnd])); // Draw placeholder points for empty/null values after to last value *AT* the last value
			// Remove highlight if the new line does not contain a valid value at this point
			if (S.highlighted != null && !S.vals[S.highlighted]) {
				S.hide("label");
				S.highlighted = null;
			};
		},
		plan:{
			background:{
				type:"zRectangle", layer:0,
				init:{layout:L.sidebar}
			},
			title:{
				type:"zHTML", layer:1,
				init:{layout:L.title},
				curr:function (S, D, mode) {return {text:dc.getName({d:0, s:S.s})}}
			},
			scaleBackground:{
				type:"zComplex", layer:1,
				init:function (S, D, mode) {
					var fill = CANVAS.d3.append("svg:defs").append("svg:linearGradient")
						.attr({id:"gradient"});
					// Define the gradient colors
					fill.append("svg:stop")
						.attr({offset:0, "stop-color":Y.negFill});
					fill.append("svg:stop")
						.attr({offset:0.5, "stop-color":Y.neuFill});
					fill.append("svg:stop")
						.attr({offset:1, "stop-color":Y.posFill});
					return {
						mainBar:{
							type:"rect", fill:"url(#gradient)",
							layout:L.scale
						},
						nullBox:{
							type:"rect", fill:Y.nullFill,
							layout:{
								x:L.sidebar.right - L.sidebar.padding, y:L.scale.top,
								width:L.scale.width * 0.16, height:L.scale.height,
								xAlign:"right"
							}
						}
					};
				}
			},
			scale:{
				type:"zAxis",
				init:{
					layout:L.scale, align:"top",
					domain:[-Y.maxVal, Y.maxVal]
				}
			},
			scaleLabel:{
				type:"zHTML", layer:2,
				curr:function (S, D, mode) {
					var baseVal = swarm.getBaseVal(S.s[0]),
						currVal = swarm.getCurrVal(S.s[0]),
						baseTime = dc.getMeta("name", {d:1, p:BASE_TIME}),
						currTime = dc.getMeta("name", {d:1, p:CURR_TIME}),
						decChange = currVal / baseVal - 1,
						dec = zt.calcDec(decChange, -Y.maxVal, Y.maxVal),
						text = Y.valFormat(currVal) +
							" in " + currTime + (
							(!currVal) ? "" : "<br>(" +(
								(!baseVal) ? "new" :
								(decChange == 0) ? "no change" :
								((decChange > 0) ? "up " : "down ")
								+ Y.decFormat(Math.abs(decChange)) + " " +
								baseTime + "-" + currTime) +
								")"),
						anchor =
							(!baseVal || !currVal) ? {
								x:L.sidebar.right - L.sidebar.padding - 0.5 * L.scale.width * 0.16,
								y:L.scale.bottom
							} : L.scale.getPoint(zt.forceBetween(dec, 0, 1), 1);
					return {
						text:text,
						branch:{type:"branch"},
						layout:{
							anchor:anchor, width:200,
							radial:90, radialEnd:D.Y.branchLength
						}
					};
				}
			},
			description:{
				type:"zHTML",
				init:{layout:L.description},
				curr:Y.customDescription || function (S, D, mode) {
					var i, name, baseVal, currVal, content, vals = [],
						description = dc.getMeta("description", {d:0, s:S.s}),
						children = dc.findChildren({d:0, s:S.s}),
						addList = function (vals, mode) {
							var i, text = "",
								mod = (mode == "max") ? 1 : -1,
								vals = za.sortObjects(vals, "change", mode == "max");
							for (i = 0; i < Math.min(vals.length, 3); i++) { // Each list should have 3 items, unless there aren't enough vals
								if (mod * vals[i].change <= 0) break; // If out of increasing/decreasing values, quit
								if (i == 0) text = "<h4>Biggest <b>" + ((mode == "max") ? "increases" :"decreases") + "</b>:</h4>";
								text +=
									"<li>" + vals[i].name +
									" (" + Y.altValFormat(vals[i].change) + ")";
							};
							return text;
						};
					if (description) content = "<p>" + description + "</p>";
					else if (children.length) {
						for (i = 0; i < children.length; i++) {
							baseVal = swarm.getBaseVal(children[i]);
							currVal = swarm.getCurrVal(children[i]);
							vals.push({
								name:dc.getName({d:0, p:children[i]}),
								change:currVal - baseVal,
								decChange:currVal / baseVal - 1
							});
						};
						content = addList(vals, "min") + "<br>" + addList(vals, "max"); // Find the biggest cuts/increase among children
					} else content = "No description.";
					return {content:content};
				}
			},
			chartTitle:{
				type:"zTextBox", layer:1,
				ignore:!Y.sidebar.chartTitle, // Ignore if chartTitle not set
				init:function (S, D, mode) {
					return {
						layout:{
							x:S.axes.x.L.centre.x, y:yAxis.L.top,
							align:"centreBottom"
						}
					};
				},
				curr:function (S, D, mode) {
					var title = dc.getName({d:0, s:S.s}),
						startDate = dc.getName({d:1, p:0}),
						endDate = dc.getName({d:1, p:dc.getSize(1) - 1});
					return {text:title};
				}
			},
			line:{
				type:"zLine", layer:1,
				curr:function (S, D, mode) {return {points:S.points}}
			},
			linePoints:{
				type:"zCircle", mask:{d:0, p:"na"}, layer:2,
				curr:function (S, D, mode) {
					return {
						centre:S.points[D.s[1]],
						radius:(S.highlighted == D.s[1]) ? D.Y.largeRadius : D.Y.radius
					};
				},
				onAdd:function (S, D, mode) {
					if (!CANVAS.isiPad) {
						D.hover(function () {S.highlight(D.s[1])}, function () {S.highlight()});
					} else {
						D.click(function () {S.highlight(D.s[1])});
					};
				},
				preRedraw:function (S, D, mode) {
					var t = Y.highlight;
					if (D.s[1] < S.aStart || D.s[1] > S.aEnd) { // Point is invalid in new line
						D.newOrders = D.oldOrders; // Ignore new position
						D.hide(t);
					} else {
						if (D.hidden) D.oldOrders = D.newOrders; // Instant redraw
						D.show(t);
					};
				}
			},
			lineLabel:{
				type:"zHTML", layer:1,
				onAdd:function (S, D) {
					D.hide();
				},
				curr:function (S, D, mode) {
					var p = S.highlighted,
						prevVal = swarm.getVal([S.s[0], p - 1]),
						currVal = swarm.getVal([S.s[0], p]),
						decChange = currVal / prevVal - 1,
						text = Y.valFormat(currVal) +
							" in " + dc.getMeta("name", {d:1, p:p}) + (
							(!currVal || !p) ? "" :
							"<br>(" + (
								(!prevVal) ? "new" :
								(decChange == 0) ? "no change" :
								Y.altDecFormat(decChange)
							) + ")");
					return {
						text:text,
						branch:{type:"branch"},
						layout:{
							anchor:S.points[p], xAlign:"xCentre",
							width:200,
							radial:(decChange < 0) ? 90 : 270,
							radialStart:S.Y.linePoints.largeRadius,
							radialEnd:D.Y.branchLength
						}
					};
				}
			},
			gladwrap:{
				type:"zGladwrap", layer:5,
				init:{layout:L.lineChart},
				onAdd:function (S, D, mode) {
					D.mousemove(function (e) {
						var s = D.getClosestPoint(e, {s:S.s}, S.axes.x);
						if (s) S.highlight(s[1]);
						else S.highlight();
					});
				}
			}
		}
	});
	SWARM = swarm;
	SIDEBAR = sidebar;
	logger("HotTree(): Done.");
	return {Y:Y, L:L, swarm:swarm, sidebar:sidebar};
};
