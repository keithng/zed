HotTree = function (rawData, style, layout) {
	logger("HotTree(): Initialising.");
	// Layout
	L = zt.getMaxLayout(800, 600, 50);
	with (L) {
		L.tooltipBox = {
			width:240
		};
		L.sideBar = new zLayout({
			x:5, y:5,
			width:400, height:height - 10,
			margin:30
		});
		L.swarm = new zLayout({
			x:L.sideBar.right + margin + (innerWidth - L.sideBar.width) / 2,
			y:margin + innerHeight * 0.5,
			width:innerWidth - L.sideBar.width - margin,
			height:innerHeight,
			xAlign:"xCentre", yAlign:"yCentre"
		});
		L.breadcrumb = {
			x:L.sideBar.right + 12, y:top + 12,
			width:(innerWidth - L.sideBar.right)
		};
	};
	with (L.sideBar) {
		L.title = {
			x:left + margin, y:top + margin + 30,
			width:innerWidth, yAlign:"yCentre"
		};
		L.scale = new zLayout({
			x:left + margin, y:L.title.y + 44,
			width:innerWidth * 0.8, height:innerHeight * 0.012
		});
		L.description = {
			x:left + margin, y:L.scale.bottom + 36,
			width:innerWidth, height:((layout && layout.description) ? layout.description.height : null) || 460
		};
		L.lineChart = new zLayout({
			x:left + margin + 32, y:bottom - margin - 20,
			width:innerWidth - 32,
			height:zt.forceBetween(innerHeight - L.description.height, 50, innerHeight / 2)
		});
	};
	with (L.lineChart) {
		L.tAxis = {anchor:anchor, width:width};
		L.dAxis = {anchor:anchor, width:height, yAlign:"bottom", rotation:270};
	};
	with (L.swarm) {
		L.altHeight = height - 26;
		L.viewPort = clone({ // When zoomed in, need to leave a bit of extra space on the bottom for zoomOutTab
			anchor:{x:x, y:L.margin + L.altHeight / 2},
			height:L.altHeight, width:L.altHeight * width / height
		});
		L.zoomOutTab = {
			x:xCentre, y:L.bottom + 8,
			xAlign:"xCentre", yAlign:"bottom"
		};
	};
	L.narrator = {width:400, xAlign:"xCentre", yAlign:"yCentre"};
	L = zo.extend(L, layout); // Overwrite layout with user-defined layout
	L.description.height = null; // Don't actually pass height onto description - it's used to calculate bar chart size only

	// Style
	Y = {
		// Base colours
		maxVal:0.5, // 0.5 will result in maximum saturations
		// Brown-Blue (lighter)
		neuFill:"#ddc", // Grey
		posFill:"#5ab4ac", // Blue
		negFill:"#d8b365", // Brown
		nullFill:"#cfbdda", // Purple
		// Animation parameters
		highlight:{t:400, e:"<>"},
		merge:{t:800, e:"<>"},
		zoom:{t:1000, e:"<>"},
		// Text formating
		valFormat:{mode:"abbreviate", dp:1},
		decFormat:{mode:"%", dp:1},
		// Reference styles
		axis:{
			maxNotches:6,
			label:{
				fill:"#999",
				"font-weight":"bold",
				branch:{stroke:"#ccc"}
			},
			axisTitle:{
				margin:24,
				fill:"#999"
			}
		},
		scaleLabel:{
			base:"axis.label",
			format:{base:"decFormat", forceSign:true},
			branch:{}
		},
		// Objects
		background:{
			fill:"#f0f4f5",
			"stroke-width":0
		},
		tooltipBox:{
			"text-align":"center"
		},
		swarm:{
			breadcrumb:{},
			treemap:{
				opacity:1,
				stroke:"#666",
				"stroke-width":0.5,
				highlight:{"stroke-width":2},
				faded:{opacity:0.15}
			},
			zoomOutTab:{
				margin:12,
				rounded:8,
				opacity:0.2,
				"font-size":40,
				"font-weight":"bold",
				background:{fill:"#999"},
				highlight:{opacity:0.5}
			}
		},
		tAxis:{base:"axis"},
		dAxis:{
			base:"axis",
			label:{
				radialStart:-L.lineChart.innerWidth, radialEnd:2,
				format:{base:"valFormat"}
			}
		},
		sideBar:{
			background:{
				rounded:16,
				fill:"#e8e8ef",
				opacity:0.5,
				"stroke-opacity":0.1
			},
			title:{
				format:{wrap:36},
				fill:"#333",
				"font-size":"18",
				"font-weight":"bold"
			},
			scale:{
				branchLength:6,
				"stroke-width":0.4,
				posLabel:{base:"scaleLabel"},
				neuLabel:{base:"scaleLabel"},
				negLabel:{base:"scaleLabel"},
				label:{
					base:"sideBar.label",
					fill:"#333",
					branch:{"stroke-width":1}
				}
			},
			description:{},
			line:{
				stroke:"#667",
				"stroke-width":2
			},
			points:{
				radius:3.5,
				largeRadius:6,
				opacity:0.8,
				fill:"white"
			},
			label:{
				fill:"#333",
				"font-weight":"bold",
				branchLength:20,
				branch:{opacity:0.8}
			}
		}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("HotTree(): Collating and crunching data.");
	var dc = new zDataCube(2, rawData);
	with (dc) {
		CURR_TIME = getSize(1) - 1; // Last period
		BASE_TIME = getSize(1) - 2; // Second to last period
		if (getSize(1) <= 2) { // Only two periods, disable time change
			$("#prev").parent().remove();
			$("#first").parent().remove();
		} else {
			$("#prev").addClass("active"); // Change menubar highlight
			$("#first").html(getName({d:1, a:0}) + "-" + getName({d:1, a:CURR_TIME}));
			$("#first").attr("href", "javascript:SWARM.changeBaseTime('" + getName({d:1, a:0}) + "')");
			$("#prev").html(getName({d:1, a:BASE_TIME}) + "-" + getName({d:1, a:CURR_TIME}));
			$("#prev").attr("href", "javascript:SWARM.changeBaseTime('" + getName({d:1, a:BASE_TIME}) + "')");
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
			setShown(0, meta[0].tree[1]);
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
	PAPER = zt.makePaper(L);
	var background = new zRectangle({L:L, base:Y.background}),
		tooltipBox = new zHTMLTooltipBox({L:L.tooltipBox, base:Y.tooltipBox});
	if (!PAPER.isiPad) {
		background.hover(function () {swarm.highlight()});
		background.click(function () {swarm.zoomTo()});
	} else {
		background.click(function () {
			if (sideBar.A[0] == swarm.selected.a) swarm.zoomTo();
			else swarm.highlight();
		});
	};
	tooltipBox.hover(function () {tooltipBox.hide()});

	logger("HotTree(): Drawing main swarm.");
	var swarm = new zSwarm({
		layout:L.swarm, style:Y.swarm, tooltipBox:tooltipBox,
		dc:dc, A:[dc.meta[0].tree[1], CURR_TIME],
		onInit:function () {
			var S = this;
			S.selected = {d:0, a:ROOT};
			S.parent = dc.findParent(S.selected);
			S.children = dc.findChildren(S.selected);
		},
		changeBaseTime:function (time) {
			if (this.locked) return;
			BASE_TIME = dc.findMeta("name", {d:1}, time);
			if (BASE_TIME == null) BASE_TIME = CURR_TIME - 1; // Default BASE_TIME
			// Change menubar highlight
			$("#first").removeClass("active");
			$("#prev").removeClass("active");
			if (BASE_TIME == 0) $("#first").addClass("active");
			else if (BASE_TIME == CURR_TIME - 1) $("#prev").addClass("active");
			// Redraw
			sideBar.refresh("all", Y.merge.t, Y.merge.e)
			this.refresh("treemap", Y.merge.t, Y.merge.e);
			this.setURL();
			logger("HotTree(): Comparing " + dc.getName({d:1, a:BASE_TIME}) + " with " + dc.getName({d:1, a:CURR_TIME}));
		},
		setURL:function () {
			document.location.hash = dc.getName({d:1, a:BASE_TIME}) + "." + this.selected.a;
		},
		getVal:function (A) {
			return dc.getData("val", {as:A});
		},
		getBaseVal:function (aPos) {
			return this.getVal([aPos, BASE_TIME]);
		},
		getCurrVal:function (aPos) {
			return this.getVal([aPos, CURR_TIME]);
		},
		getColour:function (dec) {
			var S = this;
			if (isNaN(dec) || dec == Infinity) return Y.nullFill;
			return zt.getColour(dec / Y.maxVal, Y.neuFill, Y.posFill, Y.negFill);
		},
		select:function (aPos, b) {
			var S = this, t = Y.highlight.t, e = Y.highlight.e;
			S.selected = {d:0, a:aPos};
			S.parent = dc.findParent(S.selected);
			S.children = dc.findChildren(S.selected);
			S.refresh("breadcrumb");
			S.highlight(aPos, true);
			S.setMode({d:0, a:"all"}, "faded", t, e, null, S.K);
			S.unsetMode({d:0, a:S.children.concat(S.selected.a)}, t, e, b);
			S.setURL();
		},
		highlight:function (aPos, force) {
			if (this.locked && !force) return;
			var S = this, t = Y.highlight.t, e = Y.highlight.e,
				layout, x = {d:0, a:aPos};
			if (aPos != S.selected.a && !dc.findChildren(S.selected).length) return; // Childless node selected - disallow change highlight
			if (aPos == S.targ) return; // Don't act on duplicate action
			S.targ = aPos;
			S.G.delay((force) ? null : 20, function () {
				if (aPos != S.targ) return; // Quit if targHighlighted has changed
				if (aPos == null) {
					S.reset("all", t, e, null, S.K);
					sideBar.setSpace(S.selected, t, e, null, S.K);
					sideBar.refresh("all", t, e, null, S.K);
					tooltipBox.hide(t, e, null, S.K);
				} else {
					layout = zp.completeBox(dc.getMeta("layout", x));
					if (!zt.isBetween(zDebug.checkIE(), 0, 9)) S.toFront(x); // In IE9 and below, toFront() strips events
					S.baseHighlight(x, t, e, null, S.K);
					sideBar.setSpace(x, t, e, null, S.K);
					sideBar.refresh("all", t, e, null, S.K);
					tooltipBox.showAt({
						text:dc.getName(x),
						layout:{x:layout.xCentre, y:layout.top - 3, xAlign:"xCentre", yAlign:"bottom"}
					}, t, e, null, S.K);
				};
				sideBar.customLayer();
				S.targ = -1;
			});
		},
		zoomTo:function (aPos, b, force) {
			if (this.locked && !force) return;
			if (aPos == null) aPos = this.parent; // aPos is null (i.e. Trying to zoom out)
			if (aPos == null) return; // Parent is also null (i.e. Trying to zoom out, but at top level already)
			var S = this, t = Y.highlight.t, e = Y.highlight.e, layout,
				iterate = function () {S.zoomTo(aPos, b, true)}, // This carries the original aPos all the way through
				path = dc.findRelationship(0, S.selected.a, (aPos == null) ? S.parent : aPos),
				generation = dc.getMeta("generation", {d:0, a:path});
			S.lock();
			// Check zoomOutTab status
			if (aPos == ROOT) { // If it exists but it shouldn't
				S.remove("zoomOutTab", t, e); // Fade out
			} else if (S.plan.zoomOutTab.ignore) { // If it doesn't already exist but it should
				S.add("zoomOutTab", t, e); // Fade in
			} else {
				S.remove("zoomOutTab"); // Add and remove rather than toFront(), because toFront breaks mouseevents in IE
				S.add("zoomOutTab");
			};
			// Decide whether to zoom in, out, or whether already arrived
			if (path[1] == null) { // Arrived at target
				if (b) b();
				S.unlock();
			} else if (!S.children.length) { // Starting from childless node, so just deselect
				S.select(path[1], iterate);
			} else if (!dc.findChildren({d:0, a:path[1]}).length) { // Target is childless node, so just select (i.e. Don't zoom into it)
				S.select(path[1], iterate);
			} else if (generation[0] < generation[1]) { // Going deeper
				S.select(path[1], function () {
					layout = dc.getMeta("layout", {d:0, a:path[1]});
					S.zoom(layout, L.viewPort, Y.zoom.t, Y.zoom.e, function () { // Zoom
						dc.shown[0] = dc.shown[0].concat(S.children);
						S.updateData(); // .updateData will provide layouts for new rectangles - this is why treemaps need their own aggregation/disaggregation functions
						S.add({d:0, a:S.children}, Y.merge.t, Y.merge.e, function () { // Add children
							sideBar.customLayer(); // Need to raise sideBar against blocks which have been highlighted and brought toFront()
							S.hide(S.selected); // Hide parent
							iterate();
						});
					});
				});
				tooltipBox.hide(Y.highlight.t, Y.highlight.e); // Don't show tooltips while zooming in
			} else if (generation[0] > generation[1]) { // Coming back out
				dc.shown[0] = za.subtract(dc.shown[0], S.children);
				S.updateData(); // .updateData will provide layouts for new rectangles - this is why treemaps need their own aggregation/disaggregation functions
				S.show(S.selected); // Show parent
				S.toFront({d:0, a:S.children}); // Bring children to front so parent doesn't hide them
				S.remove({d:0, a:S.children}, Y.merge.t, Y.merge.e, function () { // Remove children
					layout = dc.getMeta("layout", {d:0, a:path[1]});
					S.zoom(layout, L.swarm, Y.zoom.t, Y.zoom.e, function () { // Zoom out
						S.select(S.parent, iterate); // Deselect
					});
				});
				tooltipBox.hide(Y.highlight.t, Y.highlight.e); // Don't show tooltips while zooming in
			} else logger("HotTree.ZoomTo(): YEAH NAH - attempting to go to a different element in the same generation - something must have gone wrong with the pathfinding." );
		},
		updateData:function () {
			var S = this, i, children, parent, layout, vals,
				generation = dc.getMeta("generation", S.selected);
			dc.setMeta("layout", {d:0, a:ROOT}, S.L.clone()); // Update root layout
			for (i = 1; i <= dc.getMeta("generation", S.selected) + 1; i++) { // For each generation (start from one after root, end at one after selected)
				children = dc.findAllMeta("generation", {d:0, a:dc.shown[0]}, i); // Get all the shown members of the current generation
				parent = dc.findParent({d:0, a:children[0]}); // Assume that all the children must share the same parent
				vals = S.getCurrVal(children); // Value of the children
				layout = dc.getMeta("layout", {d:0, a:parent}); // Layout of the parent (all children must fit inside this layout)
				dc.setTreemap({d:0, a:children}, vals, layout);
			};
		},
		plan:{
			breadcrumb:{
				type:"zHTML", mask:"fixed",
				init:function (S, D, mode) {
					return {objID:"breadcrumb", layout:L.breadcrumb};
				},
				curr:function (S, D, mode) {
					var i, out = "",
						aPos = dc.findFamily("ancestors", S.selected).reverse().concat(S.selected.a),
						name = dc.getName({d:0, a:aPos});
					for (i = 0; i < aPos.length - 1; i++) {
						out += "<a href=javascript:SWARM.zoomTo(" + aPos[i] + ")>" + name[i] + "</a> > ";
					};
					out += "<b>" + name[i] + "</b>";
					return {content:out};
				}
			},
			treemap:{
				type:"zRectangle", mask:"mask",
				init:function (S, D, mode) {
					return {
						mouseEvents:function (D) { // Active
							if (!PAPER.isiPad) {
								var aPos = (za.contains(S.children, D.A[0])) ? D.A[0] : null;
								D.hover(function () {S.highlight(aPos)});
								D.click(function () {S.zoomTo(aPos)});
							} else {
								D.click(function () {
									if (za.contains(S.children, D.A[0])) { // Active block
										if (D.A[0] === S.highlighted) S.zoomTo(D.A[0]);
										else S.highlight(D.A[0]);
									} else { // Inactive block
										if (sideBar.A[0] == S.selected.a) S.zoomTo();
										else S.highlight();
									};
								});
							};
						}
					};
				},
				curr:function (S, D, mode) {
					var baseVal = S.getBaseVal(D.A[0]),
						currVal = S.getCurrVal(D.A[0]),
						decChange = currVal / baseVal - 1;
					return {
						fill:S.getColour(decChange),
						layout:dc.getMeta("layout", {d:0, as:D.A})
					};
				}
 			},
 			zoomOutTab:{
				type:"zTextBox", mask:"fixed", ignore:true,
				init:function (S, D, mode) {
					return {
						text:"Zoom out", layout:L.zoomOutTab,
						mouseEvents:function (D) {
							D.click(function () {S.zoomTo(ROOT)}); // Zoom out
							D.hoverHighlight(200);
						}
					};
				}
 			}
		}
	});

	logger("HotTree(): Drawing side bar.");
	var tAxis = new zSmartAxis({
			layout:L.tAxis, style:Y.tAxis,
			dc:dc, d:1,
			plan:{axisLine:null}
		}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			range:[0, 10],
			plan:{axisLine:null}
		}),
		sideBar = new zSwarm({
			layout:L.sideBar, style:Y.sideBar,
			dc:dc, A:[ROOT, "all"],
			axes:{t:tAxis, d:dAxis},
			swarm:swarm,
			highlighted:null,
			customLayer:function () {
				var S = this;
				S.layer();
				tAxis.toFront();
				dAxis.toFront();
				S.toFront("line");
				S.toFront("points");
				S.toFront("label");
			},
			highlight:function (aPos) {
				var S = this, radius,
					t = Y.highlight.t, e = Y.highlight.e;
				if (aPos != null) {
					S.highlighted = aPos;
					S.refresh({mode:{noUpdateData:true}, role:"label"}, t, e);
					S.show("label", t, e);
				} else {
					S.highlighted = null;
					S.G.delay(800, function () {S.hide("label", t, e)});
				};
				S.refresh({mode:{noUpdateData:true}, role:"points"}, t, e);
			},
			getPoint:function (aPos) {
				var S = this;
				return {x:tAxis.getX({a:aPos}), y:dAxis.getY(S.vals[aPos])};
			},
			updateData:function (t, e, b, w) {
				var S = this, i;
				S.vals = [];
				for (i = 0; i < dc.getSize(1); i++) {
					S.vals[i] = swarm.getVal([S.A[0], i]);
				};
				S.aStart = za.find(S.vals, 0, ">"); // The first valid year for this line item
				S.aEnd = za.findLast(S.vals, 0, ">"); // The first valid year for this line item
				dAxis.setShown([
					zt.getFactorOfTen(Math.min(0, za.min(S.vals))),
					zt.getFactorOfTen(za.max(S.vals))
				]);
				S.customLayer();
				// Plot points
				S.points = [];
				for (i = 0; i <= S.aStart; i++) S.points.push(S.getPoint(S.aStart)); // Draw placeholder points for empty/null values prior to first value *AT* the first value
				for (null; i <= S.aEnd; i++) S.points.push(S.getPoint(i)); // Draw actual values
				for (null; i < S.vals.length; i++) S.points.push(S.getPoint(S.aEnd)); // Draw placeholder points for empty/null values after to last value *AT* the last value
				// Remove highlight if the new line does not contain a valid value at this point
				if (S.highlighted != null && !S.vals[S.highlighted]) {
					S.hide("label");
					S.highlighted = null;
				};
			},
			plan:{
				background:{
					type:"zRectangle", mask:"fixed",
					init:function (S, D, mode) {return {layer:1, layout:S.L}}
				},
				title:{
					type:"zTextBox", mask:"fixed",
					init:function (S, D, mode) {return {layer:1, layout:L.title}},
					curr:function (S, D, mode) {return {text:dc.getName({d:0, as:S.A})}}
				},
				scale:{
					type:"zMultiDrone", mask:"fixed",
					init:function (S, D, mode) {
						return {
							mainBar:{
								type:"zRectangle",
								fill:"0-" + Y.negFill + "-" + Y.neuFill + "-" + Y.posFill,
								layout:L.scale
							},
							nullBox:{
								type:"zRectangle", fill:Y.nullFill,
								layout:{
									x:L.sideBar.right - L.sideBar.margin, y:L.scale.top,
									width:L.scale.width * 0.16, height:L.scale.height,
									xAlign:"right"
								}
							},
							posLabel:{
								type:"zTextBox", text:Y.maxVal,
								layout:{
									x:L.scale.right, y:L.scale.top,
									radial:270, radialEnd:4
								}
							},
							neuLabel:{
								type:"zTextBox", text:0,
								layout:{
									x:L.scale.centre.x, y:L.scale.top,
									radial:270, radialEnd:4
								}
							},
							negLabel:{
								type:"zTextBox", text:-Y.maxVal,
								layout:{
									x:L.scale.left, y:L.scale.top,
									radial:270, radialEnd:4
								}
							}
						};
					},
					curr:function (S, D, mode) {
						var baseVal = swarm.getBaseVal(S.A[0]),
							currVal = swarm.getCurrVal(S.A[0]),
							baseTime = dc.getMeta("name", {d:1, a:BASE_TIME}),
							currTime = dc.getMeta("name", {d:1, a:CURR_TIME}),
							decChange = currVal / baseVal - 1,
							dec = zt.calcDec(decChange, -Y.maxVal, Y.maxVal),
							text = zt.format(currVal, Y.valFormat) +
								" in " + currTime + (
								(!currVal) ? "" :
								(!baseVal) ? "\n(new)" :
								(decChange == 0) ? "\n(no change)" :
								"\n(" + zt.format(decChange, zo.clone(Y.decFormat, {wordSign:true})) + " " +
								baseTime + "-" + currTime + ")"),
							anchor =
								(!baseVal || !currVal) ? {
									x:L.sideBar.right - L.sideBar.margin - 0.5 * L.scale.width * 0.16,
									y:L.scale.bottom
								} :
								L.scale.getPoint(zt.forceBetween(dec, 0, 1), 1);
						return {
							layer:1,
							label:{
								type:"zTextBox", text:text,
								layout:{anchor:anchor, radial:90, radialEnd:D.Y.branchLength}
							}
						};
					}
				},
				description:{
					type:"zHTML", mask:"fixed",
					init:function (S, D, mode) {return {layout:L.description}},
					curr:Y.customDescription || function (S, D, mode) {
						var i, name, baseVal, currVal, content, vals = [],
							description = dc.getMeta("description", {d:0, as:S.A}),
							children = dc.findChildren({d:0, as:S.A}),
							addList = function (vals, mode) {
								var i, text = "",
									mod = (mode == "max") ? 1 : -1,
	 								vals = za.sortObjects(vals, "change", mode == "max");
								for (i = 0; i < Math.min(vals.length, 3); i++) { // Each list should have 3 items, unless there aren't enough vals
									if (mod * vals[i].change <= 0) break; // If out of increasing/decreasing values, quit
									if (i == 0) text = "<h4>Biggest <b>" + ((mode == "max") ? "increases" :"decreases") + "</b>:</h4>";
									text +=
										"<li>" + vals[i].name +
										" (" + zt.format(vals[i].change, zo.clone(Y.valFormat, {forceSign:true})) + ")";
								};
								return text;
							};
						if (description) content = "<p>" + description + "</p>";
						else if (children.length) {
							for (i = 0; i < children.length; i++) {
								baseVal = swarm.getBaseVal(children[i]);
								currVal = swarm.getCurrVal(children[i]);
								vals.push({
									name:dc.getName({d:0, a:children[i]}),
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
					ignore:!Y.sideBar.chartTitle, // Ignore if chartTitle not set
					type:"zTextBox", mask:"fixed",
					init:function (S, D, mode) {
						return {
							layer:1,
							layout:{
								x:tAxis.L.centre.x, y:dAxis.L.top,
								xAlign:"xCentre", yAlign:"bottom"
							}
						};
					},
					curr:function (S, D, mode) {
						var title = dc.getName({d:0, as:S.A}),
							startDate = dc.getName({d:1, a:0}),
							endDate = dc.getName({d:1, a:dc.getSize(1) - 1});
						return {text:title};
					}
				},
				line:{
					type:"zLine", mask:"fixed",
					curr:function (S, D, mode) {return {layer:1, points:S.points}}
				},
				points:{
					type:"zCircle", mask:["na", "mask"],
					init:function (S, D, mode) {
						var t = Y.highlight.t, e = Y.highlight.e;
						return {
							layer:2, circle:{radius:D.Y.radius},
							preRedraw:function (D) {
								if (D.A[1] < S.aStart || D.A[1] > S.aEnd) { // Point is invalid in new line
									D.newOrders = D.oldOrders; // Ignore new position
									D.hide(t, e, null, swarm.K);
								} else {
									if (D.hidden) D.oldOrders = D.newOrders; // Instant redraw
									D.show(t, e, null, swarm.K);
								};
							},
							mouseEvents:function (D) {
								if (!PAPER.isiPad) {
									D.hover(function () {S.highlight(D.A[1])}, function () {S.highlight()});
								} else {
									D.click(function () {S.highlight(D.A[1])});
								};
							}
						};
					},
					curr:function (S, D, mode) {
						return {
							circle:{
								centre:S.points[D.A[1]],
								radius:(S.highlighted == D.A[1]) ? D.Y.largeRadius : D.Y.radius
							}
						};
					}
				},
				label:{
					type:"zTextBox", mask:"fixed",
					curr:function (S, D, mode) {
						var aPos = S.highlighted,
							prevVal = swarm.getVal([S.A[0], aPos - 1]),
							currVal = swarm.getVal([S.A[0], aPos]),
							decChange = currVal / prevVal - 1,
 							text = zt.format(currVal, Y.valFormat) +
								" in " + dc.getMeta("name", {d:1, a:aPos}) + (
								(!currVal || !aPos) ? "" :
								(!prevVal) ? "\n(new)" :
								(decChange == 0) ? "\n(no change)" :
								"\n(" + zt.format(decChange, zo.clone(Y.decFormat, {forceSign:true})) + ")");
						return {
							layer:1, text:text,
							layout:{
								anchor:S.points[aPos], xAlign:"xCentre",
								radial:(decChange < 0) ? 90 : 270,
								radialStart:S.Y.points.largeRadius,
								radialEnd:D.Y.branchLength
							}
						};
					}
				}
			}
		});
	sideBar.customLayer();
	SWARM = swarm;
	SIDEBAR = sideBar;
	logger("HotTree(): Done.");
};