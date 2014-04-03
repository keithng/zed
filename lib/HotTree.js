var SWARM;
HotTree = function (rawData, style, layout) {
	logger("HotTree(): Initialising.");
	// Layout
	var L = zt.getMaxLayout(1024, 717, 60);
	with (L) {
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
			width:innerWidth
		};
		L.lineChart = new zLayout({
			x:left + margin + 32, y:bottom - margin - 20,
			width:innerWidth - 32, height:zt.forceBetween(height - (style.descriptionSize || 500), 120, 400)
		});
	};
	with (L.lineChart) {
		L.tAxis = {anchor:anchor, width:width};
		L.dAxis = {anchor:anchor, width:height, yAlign:"bottom", rotation:270};
	};
	with (L.swarm) {
		L.altHeight = height - 26;
		L.altSwarm = clone({ // When zoomed in, need to leave a bit of extra space on the bottom for zoomOutTab
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

	// Style
	var Y = {
		// Reference styles
		valFormat:{mode:"abbreviate", dp:1},
		decFormat:{mode:"%", dp:1},
		axis:{
			maxNotches:6,
			label:{
				fill:"#888",
				"font-weight":"bold"
			},
			axisTitle:{
				margin:24,
				fill:"#888"
			},
// 			axisLine:{opacity:0.8},
		},
		scaleLabel:{
			base:"axis.label",
			format:{base:"decFormat", forceSign:true},
			branch:{}
		},
		// Objects
		background:{
			fill:"#f0f0f0",
			stroke:"#f0f0f0"
		},
		tooltipBox:{
			format:{wrap:40}
		},
		swarm:{
			maxVal:0.5, // 0.5 will result in maximum saturations
			neuFill:"#ddc",
			posFill:"#292",
			negFill:"#a22",
			nullFill:"#aF8Dc3",
			highlight:{t:400, e:"<>"},
			fadeIn:{t:800, e:"<>"},
			zoom:{t:1000, e:"<>"},
			breadcrumb:{},
			block:{
				opacity:1,
				"stroke-width":0.5,
				stroke:"#666",
				highlight:{"stroke-width":2},
				fade:{opacity:0.15}
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
				margin:2,
				format:{base:"valFormat"},
				branch:{"stroke-opacity":0.08}
			}
		},
		sideBar:{
			background:{
				rounded:16,
				fill:"#e8e8ef",
				opacity:0.5,
				"stroke-opacity":0.1
			},
			category:{
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
			description:{
				valFormat:{base:"valFormat", forceSign:true},
				decFormat:{base:"decFormat", forceSign:true}
			},
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
				"font-weight":"bold",
				branchLength:20,
				branch:{opacity:0.8}
			}
		}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("HotTree(): Collating and crunching data.");
	var ROOT, CURR_YEAR, BASE_YEAR,
		i, j, index = [],
		dc = new zDataCube(2, rawData);
	with (dc) {
		meta[0].description = meta[0].description || [];
		// There should always be a true root node which encompasses everything and is never shown
		if (meta[0].tree[0].length > 1) {
			dc.addRootNode(0, Y.customRootName || "Total"); // Create root node
		};
		ROOT = meta[0].tree[0][0];
		setMeta("layout", {d:0, a:ROOT}, L.swarm.clone());
		// Set initial generation
		calcTreeData("sum", "val", 0); // Checks that low-level nodes add up to high level nodes if they exist, or creates them if they don't NOTE to Andrew - this stacks all the values *AND* does the checking
		dc.maxGen = meta[0].tree.length - 1;
		dc.rootGen = meta[0].tree[1];
		setShown(0, rootGen);
		CURR_YEAR = getSize(1) - 1;
		BASE_YEAR = CURR_YEAR - 1;
		// Add names to searchBox
		for (i = 0; i < getSize(0); i++) {
			index.push({key:i, label:meta[0].name[i]}); // Log name (searchBox will need this)
		};
		$("#searchBox").autocomplete({source:index, select:function (event, ui) {swarm.zoomTo(ui.item.key)}}); // Give list to searchBox
	};

	// Drawing
	logger("HotTree(): Drawing accessories.");
	PAPER = zt.makePaper(L);
	var defaultMouseEvents = function (D) {
		var A = D.A || [];
		D.click(function () {
			var S = swarm;
			if (S.locked) return;
			if (za.contains(S.children, A[0])) S.zoomTo(A[0]); // Zoom in if target is a child of the active element
			else if (S.parent != null) S.zoomTo(S.parent); // Zoom out if parent is valid
		});
		if (D.role == "block") D.hover(function () {
			var S = swarm;
			if (S.locked || !za.contains(S.children, A[0])) return;
			S.targHighlight = A[0];
			S.G.delay(100, function () {
				if (!S.locked && S.targHighlight == A[0]) S.setHighlight(A[0]);
			});
		}, function () {
			var S = swarm;
			if (S.locked || !za.contains(S.children, A[0])) return;
			S.targHighlight = null;
			S.G.delay(100, function () {
				if (!S.locked && S.targHighlight == null) S.setHighlight(null);
			});
		});
	};
	var background = new zRectangle({L:L, base:Y.background}),
		tooltipBox = new zTooltipBox({base:Y.tooltipBox});
	defaultMouseEvents(background);
	tooltipBox.stopMouseEvents();

	logger("HotTree(): Drawing main swarm.");
	var swarm = new zSwarm({
		layout:L.swarm.clone(), style:Y.swarm,
		dc:dc, d:0,
		A:[dc.meta[0].tree[1], CURR_YEAR],
		selected:{d:0, a:ROOT},
		getCurrVal:function (aPos) {
			return dc.getData("val", {as:[aPos, CURR_YEAR]});
		},
		getBaseVal:function (aPos) {
			return dc.getData("val", {as:[aPos, BASE_YEAR]});
		},
		getColour:function (dec) {
			if (isNaN(dec) || dec == Infinity) return this.Y.nullFill;
			return zt.getColour(dec, this.Y.neuFill, this.Y.posFill, this.Y.negFill);
		},
		setHighlight:function (aPos, t, e, b, w) {
			var S = this, t = t || S.Y.highlight.t, e = e || S.Y.highlight.e,
				layout, x = {d:0, a:aPos};
			if (aPos != null) {
				layout = zp.completeBox(dc.getMeta("layout", x));
				if (zt.isBetween(zDebug.checkIE(), 0, 9)) { // In IE9 and below, toFront() strips events
// 					S.toFront(x);
// 					S.stopMouseEvents(x); // In IE, toFront() strips events, so try stopping...
// 					S.startMouseEvents(x); // ...and restarting them.
				} else S.toFront(x);
				S.highlight(x, t, e, b, w);
				sideBar.setSpace(x, t, e, null, S.K);
				sideBar.refresh("all", t, e, null, S.K);
				tooltipBox.showAt({
					text:dc.getName(x),
					layout:{x:layout.xCentre, y:layout.top + 1, xAlign:"xCentre", yAlign:"bottom"}
				}, t, e, null, S.K);
			} else {
				S.reset("all", t, e, b, w);
				sideBar.setSpace(S.selected, t, e, null, S.K);
				sideBar.refresh("all", t, e, null, S.K);
				tooltipBox.hide(t, e, null, S.K);
			};
		},
		setSelected:function (x, b) {
			var S = this, t = S.Y.fadeIn.t, e = S.Y.fadeIn.e,
				setFamily = function (x) {
					S.selected = x;
					S.parent = dc.findParent(x);
					S.children = dc.findChildren(x);
				};
			if (x) {
				logger("HotTree.setSelected(): Focusing on " + dc.getName(x) + " " + zt.asString(x) + "." );
				S.setMode({d:0, a:za.subtract(S.children, x.a)}, "fade", t, e, null, S.K);
				S.setHighlight(x.a, t, e, b);
				setFamily(x);
			} else {
				logger("HotTree.setSelected(): Unfocusing " + dc.getName(S.selected) + " " + zt.asString(S.selected) + ".");
				setFamily({d:0, a:S.parent});
				S.unsetMode({d:0, a:S.children}, t, e, null, S.K);
				S.setHighlight(null, t, e, b);
			};
			document.location.hash = S.selected.a;
		},
		disaggregate:function (x, b) {
			var S = this, t = S.Y.fadeIn.t, e = S.Y.fadeIn.e;
			logger("HotTree.disaggregate(): Disaggregating to " + dc.getName(x) + " " + zt.asString(x) + "." );
			dc.shown[0] = dc.shown[0].concat(S.children);
			S.updateData(); // .updateData will provide layouts for new rectangles - this is why treemaps need their own aggregation/disaggregation functions
			S.add({d:0, a:S.children}, t, e, function () { // Add children
				S.hide(S.selected); // Hide parent
				if (b) b();
			});
		},
		aggregate:function (x, b) {
			var S = this, t = S.Y.fadeIn.t, e = S.Y.fadeIn.e;
			logger("HotTree.aggregate(): Aggregating " + dc.getName(S.selected) + " " + zt.asString(S.selected) + ".");
			dc.shown[0] = za.subtract(dc.shown[0], S.children);
			S.updateData(); // .updateData will provide layouts for new rectangles - this is why treemaps need their own aggregation/disaggregation functions
			S.show(S.selected); // Show parent
			S.remove({d:0, a:S.children}, t, e, b); // Remove children
		},
		zoomTo:function (aPos, b) {
			var S = this, t = S.Y.zoom.t, e = S.Y.zoom.e,
				iterate = function () {S.zoomTo(aPos, b)},
				path = dc.findRelationship(0, S.selected.a, (aPos == null) ? S.parent : aPos),
				generation = dc.getMeta("generation", {d:0, a:path});
			S.lock();
 			S.stopMouseEvents("all");
			// Check zoomOutTab
			if (aPos == ROOT) { // If it exists but it shouldn't
				S.remove("zoomOutTab", t, e); // Fade out
			} else if (S.plan.zoomOutTab.ignore) { // If it doesn't already exist but it should
				S.add("zoomOutTab", t, e); // Fade in
			} else {
				S.remove("zoomOutTab"); // Add and remove rather than toFront(), because toFront breaks mouseevents in IE
				S.add("zoomOutTab");
			};
			// Decide whether to zoom in, out, or whether already arrived
			if (path[1] == null) { // At right place
				logger("HotTree.ZoomTo(): Arrived at " + dc.getName({d:0, a:path[0]}) + " (" + path[0] + ")."  );
				S.unlock();
				S.refresh("breadcrumb");
				S.startMouseEvents("all");
				if (b) b();
			} else if (generation[0] < generation[1]) { // Going deeper
				var x = {d:0, a:path[1]},
					targChildren = dc.findChildren(x),
					targLayout = dc.getMeta("layout", x);
				if (!targChildren.length) S.setSelected(x, iterate); // If target has no children, select only - do not zoom
				else S.setSelected(x, function () {
					logger("HotTree.ZoomIn(): Zooming in to " + dc.getName(x) + " " + zt.asString(x) + "." );
					sideBar.layer(); // Need to raise sideBar against blocks which have been highlighted and brought toFront()
					dAxis.toFront();
					tAxis.toFront();
					tooltipBox.hide(t, e);
					S.zoom(targLayout, L.altSwarm, t, e, function () { // Redraw into new position
						S.disaggregate(x, iterate);
					});
				});
			} else if (generation[0] > generation[1]) { // Coming back out
				var targLayout = dc.getMeta("layout", {d:0, a:S.parent}),
					targViewPort = (S.parent == ROOT) ? L.swarm : L.altSwarm;
 				if (!S.children.length) S.setSelected(null, iterate); // If current selected element has no children, then unselect but don't zoom out
				else S.aggregate({d:0, a:S.children[0]}, function () {
					logger("HotTree.ZoomTo(): Zooming out from " + dc.getName(S.selected) + " " + zt.asString(S.selected) + "." );
					tooltipBox.hide(t, e);
					S.zoom(targLayout, targViewPort, t, e, function () {
						S.setSelected(null, iterate);
					});
				});
			} else logger("HotTree.ZoomTo(): YEAH NAH - attempting to go to a different element in the same generation - something must have gone wrong with the pathfinding." );
		},
		onInit:function () {
			var S = this;
			S.parent = dc.findParent(S.selected);
			S.children = dc.findChildren(S.selected);
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
				dc.treemap({d:0, a:children}, vals, layout);
			};
		},
		plan:{
			breadcrumb:{
				type:"zHTML", mask:"fixed",
				init:function (S, D, mode) {
					return {layout:L.breadcrumb};
				},
				curr:function (S, D, mode) {
					var i, out = "",
						aPos = dc.findFamily("ancestors", S.selected).reverse().concat(S.selected.a),
						name = dc.getName({d:0, a:aPos});
					for (i = 0; i < aPos.length; i++) {
						if (i < aPos.length - 1) {
							out += "<a href=javascript:SWARM.zoomTo(" + aPos[i] + ")>" + name[i] + "</a> > ";
						} else {
							out += "<b>" + name[i] + "</b>";
						};
					};
					return {content:out};
				}
			},
			block:{
				type:"zRectangle", mask:"mask",
				init:function (S, D, mode) {
					var baseVal = S.getBaseVal(D.A[0]),
						currVal = S.getCurrVal(D.A[0]),
						change = (currVal / baseVal - 1) / S.Y.maxVal;
					return {fill:S.getColour(change), mouseEvents:defaultMouseEvents};
				},
				curr:function (S, D, mode) {return {layout:dc.getMeta("layout", {d:0, as:D.A})}}
 			},
 			zoomOutTab:{
				type:"zTextBox", mask:"fixed", ignore:true,
				init:function (S, D, mode) {
					return {
						text:"Zoom out", layout:L.zoomOutTab,
						mouseEvents:function (D) {
							D.click(function () {if (!S.locked) S.zoomTo(ROOT)}); // Zoom out
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
			range:[0,10],
			plan:{axisLine:null}
		}),
		sideBar = new zSwarm({
			layout:L.sideBar, style:Y.sideBar,
			dc:dc,
			A:[ROOT, "all"],
			swarm:swarm,
			highlighted:null,
			setHighlight:function (aPos) {
				var S = this, radius,
					t = swarm.Y.highlight.t, e = swarm.Y.highlight.e;
				if (aPos != null) {
					radius = S.Y.points.largeRadius;
					S.highlighted = aPos;
					S.refresh("label");
					S.show("label", t, e);
				} else {
					radius = S.Y.points.radius;
					S.G.delay(800, function () {
						S.hide("label", t, e);
					});
				};
				S.forDrones({role:"points", d:1, a:S.highlighted}, "redraw", {circle:{radius:radius}}, t, e);
				tAxis.toFront();
			},
			getPoint:function (aPos) {
				var S = this;
				return {x:tAxis.getX({a:aPos}), y:dAxis.getY(S.vals[aPos])};
			},
			updateData:function (t, e, b, w) {
				var S = this, i;
				S.vals = dc.getData("val", {as:S.A});
				S.aStart = za.find(S.vals, 0, ">"); // The first valid year for this line item
				S.aEnd = za.findLast(S.vals, 0, ">"); // The first valid year for this line item
				dAxis.setShown([
					zt.getFactorOfTen(Math.min(0, za.min(S.vals))),
					zt.getFactorOfTen(za.max(S.vals))
				]);
				// Plot points
				S.points = [];
				for (i = 0; i <= S.aStart; i++) S.points.push(S.getPoint(S.aStart)); // Draw placeholder points for empty/null values prior to first value *AT* the first value
				for (null; i <= S.aEnd; i++) S.points.push(S.getPoint(i)); // Draw actual values
				for (null; i < S.vals.length; i++) S.points.push(S.getPoint(S.aEnd)); // Draw placeholder points for empty/null values after to last value *AT* the last value
			},
			plan:{
				background:{
					type:"zRectangle", mask:"fixed",
					init:function (S, D, mode) {return {layer:1, layout:S.L}}
				},
				category:{
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
								fill:"0-" + swarm.Y.negFill + "-" + swarm.Y.neuFill + "-" + swarm.Y.posFill,
								layout:L.scale
							},
							nullBox:{
								type:"zRectangle",
								fill:swarm.Y.nullFill,
								layout:{
									x:L.sideBar.right - L.sideBar.margin, y:L.scale.top,
									width:L.scale.width * 0.16, height:L.scale.height,
									xAlign:"right"
								}
							},
							posLabel:{
								type:"zTextBox",
								text:Y.swarm.maxVal,
								layout:{
									x:L.scale.right, y:L.scale.top,
									radial:270, radialEnd:4
								}
							},
							neuLabel:{
								type:"zTextBox",
								text:0,
								layout:{
									x:L.scale.centre.x, y:L.scale.top,
									radial:270, radialEnd:4
								}
							},
							negLabel:{
								type:"zTextBox",
								text:-Y.swarm.maxVal,
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
							change = currVal / baseVal - 1,
							dec = zt.calcDec(change, -swarm.Y.maxVal, swarm.Y.maxVal),
							text = zt.format(currVal, Y.valFormat) +
								" in " + dc.getMeta("name", {d:1, a:CURR_YEAR}) + (
								(!currVal) ? "" :
								(!baseVal) ? "\n(new)" :
								(change == 0) ? "\n(no change)" :
								"\n(" + zt.format(change, zo.clone(Y.decFormat, {wordSign:true})) + ")"),
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
						var i, name, prevVal, currVal, content, vals = [],
							description = dc.getMeta("description", {d:0, as:S.A}),
							children = dc.findChildren({d:0, as:S.A}),
							addList = function (vals, mode) {
								var i, text = "",
									mod = (mode == "max") ? 1 : -1,
	 								vals = za.sortObjects(vals, "valChange", mode == "max");
								for (i = 0; i < Math.min(vals.length, 3); i++) { // Each list should have 3 items, unless there aren't enough vals
									if (mod * vals[i].valChange <= 0) break; // If out of increasing/decreasing values, quit
									if (i == 0) text = "<h4>Biggest <b>" + ((mode == "max") ? "increases" :"decreases") + "</b>:</h4>";
									text +=
										"<li>" + vals[i].name +
										" (" + zt.format(vals[i].valChange, D.Y.valFormat) + ")";
								};
								return text;
							};
						if (description) content = "<p>" + description + "</p>";
						else if (children.length) {
							for (i = 0; i < children.length; i++) {
								prevVal = swarm.getBaseVal(children[i]);
								currVal = swarm.getCurrVal(children[i]);
								vals.push({
									name:dc.getName({d:0, a:children[i]}),
									valChange:currVal - prevVal,
									decChange:currVal / prevVal - 1
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
								x:tAxis.L.centre.x,
								y:dAxis.L.top,
								xAlign:"xCentre",
								yAlign:"bottom"
							}
						};
					},
					curr:function (S, D, mode) {
						var title = dc.getName({d:0, as:S.A}),
							startDate = dc.getName({d:1, a:0}),
							endDate = dc.getName({d:1, a:dc.getSize(1) - 1});
						return {
							text:"Number of " + title
						};
					}
				},
				line:{
					type:"zLine", mask:"fixed",
					curr:function (S, D, mode) {return {layer:1, points:S.points}}
				},
				points:{
					type:"zCircle", mask:["na", "mask"],
					init:function (S, D, mode) {
						var t = swarm.Y.highlight.t, e = swarm.Y.highlight.e;
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
								D.hover(function () {S.setHighlight(D.A[1])}, function () {S.setHighlight()});
							}
						};
					},
					curr:function (S, D, mode) {
						return {circle:{centre:S.points[D.A[1]]}};
					}
				},
				label:{
					type:"zTextBox", mask:"fixed",
					curr:function (S, D, mode) {
						var aPos = S.highlighted,
							prevVal = S.vals[aPos - 1],
							currVal = S.vals[aPos],
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
	tAxis.toFront();
	dAxis.toFront();
	SWARM = swarm;
	logger("HotTree(): Done.");
};
