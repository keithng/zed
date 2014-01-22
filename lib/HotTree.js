HotTree = function (rawData, style, layout) {
	logger("HotTree(): Initialising.");
	// Layout
	var L = {base:zt.getMaxLayout(1024, 768, 32)};
	with (L.base) {
		L.sideBar = new zLayout({
			x:5, y:5,
			width:400, height:height - 10,
			margin:30
		});
		L.swarm = new zLayout({
			x:L.sideBar.right + margin + (innerWidth - L.sideBar.width) / 2, y:centre.y,
			width:innerWidth - L.sideBar.width - margin, height:innerHeight,
			xAlign:"xCentre", yAlign:"yCentre"
		});
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
			x:left + margin + 16, y:bottom - margin - 20,
			width:innerWidth * 0.95, height:zt.forceBetween(height - 500, 120, 300)
		});
	};
	with (L.lineChart) {
		L.tAxis = {anchor:anchor, width:width, height:margin};
		L.dAxis = {anchor:anchor, width:height, yAlign:"bottom", rotation:270};
	};
	with (L.swarm) {
		L.altHeight = height - 26;
		L.altSwarm = clone({ // When zoomed in, need to leave a bit of extra space on the bottom for zoomOutTab
			anchor:{x:x, y:L.base.margin + L.altHeight / 2},
			height:L.altHeight, width:L.altHeight * width / height
		});
		L.zoomOutTab = {
			x:xCentre, y:L.base.bottom + 8,
			xAlign:"xCentre", yAlign:"bottom"
		};
	};
	L.narrator = {width:400, xAlign:"xCentre", yAlign:"yCentre"};

	// Style
	var Y = {
		base:{
			valFormat:{prefix:"$", mode:"abbreviate", dp:1, multiply:1},
			decFormat:{mode:"%", dp:1, wordSign:true},
			axisText:{
				fill:"#444",
				"font-weight":"bold"
			},
			axisLine:{opacity:0.8}
		},
		background:{
			fill:"#f0f0f0",
			stroke:"#f0f0f0"
		},
		tooltipBox:{
			format:{wrap:40}
		},
		swarm:{
			neutralFill:"#ddc",
			posFill:"#292",
			negFill:"#a22",
			nullFill:"#aF8Dc3",
			block:{
				maxVal:0.5, // 0.5 will result in maximum saturations
				opacity:1,
				"stroke-width":0.1,
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
			},
			highlight:{t:400, e:"<>"},
			fadeIn:{t:800, e:"<>"},
			zoom:{t:1000, e:"<>"}
		},
		tAxis:{
			maxNotches:6,
			parallelSize:0.01,
			label:{baseStyle:"base.axisText"},
			axisLine:{baseStyle:"base.axisLine"}
		},
		dAxis:{
			maxNotches:5,
			label:{
				baseStyle:"base.axisText",
				radialStart:-L.lineChart.innerWidth, radialEnd:2,
				margin:2,
				format:{baseStyle:"base.valFormat"},
				branch:{"stroke-width":0.05}
			},
			axisLine:{baseStyle:"base.axisLine"}
		},
		sideBar:{
			baseStyle:"base",
			background:{
				rounded:16,
				fill:"#e8e8ef",
				opacity:0.9,
				"stroke-width":0.18
			},
			title:{
				format:{wrap:36},
				"font-size":"18",
				"font-weight":"bold"
			},
			scale:{
				maxNotches:6,
				branchLength:6,
				notch:{"stroke-width":0.4},
				label:{baseStyle:"sideBar.label"}
			},
			description:{
				objClass:"sideBarDescription"
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
			dc.addRootNode(0, "Total"); // Create root node
		};
		ROOT = meta[0].tree[0][0];
		setMeta("layout", {d:0, a:ROOT}, L.swarm.clone());
		// Add names to searchBox
		for (i = 0; i < getSize(0); i++) {
			index.push({key:i, label:meta[0].name[i]}); // Log name (searchBox will need this)
		};
		$("#searchBox").autocomplete({source:index, select:function (event, ui) {swarm.zoomTo(ui.item.key)}}); // Give list to searchBox
		// Set initial generation
		calcTreeData("sum", "val", 0); // Checks that low-level nodes add up to high level nodes if they exist, or creates them if they don't NOTE to Andrew - this stacks all the values *AND* does the checking
		dc.maxGen = meta[0].tree.length - 1;
		dc.rootGen = meta[0].tree[1];
		setShown(0, rootGen);
		CURR_YEAR = getSize(1) - 1;
		BASE_YEAR = CURR_YEAR - 1;
	};

	// Drawing
	logger("HotTree(): Drawing accessories.");
	PAPER = zt.makePaper(L.base);
	var background = new zRectangle({layout:L.base, base:Y.background}),
		tooltipBox = new zTooltipBox({base:Y.tooltipBox}),
		defaultMouseEvents = function (D) {
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
	defaultMouseEvents(background);
	tooltipBox.stopMouseEvents();

	logger("HotTree(): Drawing main swarm.");
	var swarm = new zSwarm({
		layout:L.swarm.clone(), style:Y.swarm,
		dc:dc,
		A:[dc.meta[0].tree[1], CURR_YEAR],
		d:0, selected:{d:0, a:ROOT},
		getCurrVal:function (aPos) {
			return dc.getData("val", {as:[aPos, CURR_YEAR]}) || 0;
		},
		getBaseVal:function (aPos) {
			return dc.getData("val", {as:[aPos, BASE_YEAR]}) || 0;
		},
		getColour:function (dec) {
			return (isNaN(dec)) ? this.Y.nullFill : zt.getColour(dec, this.Y.neutralFill, this.Y.posFill, this.Y.negFill);
		},
		setHighlight:function (aPos, t, e, b, w) {
			var S = this, t = t || S.Y.highlight.t, e = e || S.Y.highlight.e,
				layout, x = {d:0, a:aPos};
			if (aPos != null) {
				layout = zp.completeBox(dc.getMeta("layout", x));
				S.toFront(x);
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
		aggregate:function (x, b) {
			var S = this, t = S.Y.fadeIn.t, e = S.Y.fadeIn.e;
			logger("HotTree.aggregate(): Aggregating " + dc.getName(S.selected) + " " + zt.asString(S.selected) + ".");
			dc.shown[0] = za.subtract(dc.shown[0], S.children);
			S.updateData();
			S.show(S.selected); // Show parent
			S.remove({d:0, a:S.children}, t, e, b); // Remove children
		},
		disaggregate:function (x, b) {
			var S = this, t = S.Y.fadeIn.t, e = S.Y.fadeIn.e;
			logger("HotTree.disaggregate(): Disaggregating to " + dc.getName(x) + " " + zt.asString(x) + "." );
			dc.shown[0] = dc.shown[0].concat(S.children);
			S.updateData();
			S.add({d:0, a:S.children}, t, e, function () { // Add children
				S.hide(S.selected); // Hide parent
				if (b) b();
			});
		},
		zoomTo:function (aPos, b) {
			var S = this, t = S.Y.zoom.t, e = S.Y.zoom.e,
				iterate = function () {S.zoomTo(aPos, b)},
				path = dc.findRelationship(0, S.selected.a, (aPos == null) ? S.parent : aPos),
				generation = dc.getMeta("generation", {d:0, a:path});
			S.lock();
 			S.stopMouseEvents("all");
			// Check zoomOutTab
			if (aPos == ROOT) S.remove("zoomOutTab", t, e);
			else S.add("zoomOutTab", t, e);
			// Decide whether to zoom in, out, or whether already arrived
			if (path[1] == null) { // At right place
				logger("HotTree.ZoomTo(): Arrived at " + dc.getName({d:0, a:path[0]}) + " (" + path[0] + ")."  );
				S.unlock();
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
			} else logger("HotTree.ZoomTo(): YEAH NAH - attempting to go to a different element in the same generation." );
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
			block:{
				type:"zRectangle", mask:"mask",
				init:function (S, D, mode) {
					var currVal = S.getCurrVal(D.A[0]),
						baseVal = S.getBaseVal(D.A[0]),
						change = (currVal / baseVal - 1) / D.Y.maxVal;
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
	var tAxis = new zSmartAxis({layout:L.tAxis, style:Y.tAxis, d:1, dc:dc, plan:{axisTitle:null}}),
		dAxis = new zAxis({layout:L.dAxis, style:Y.dAxis, range:[0,10], plan:{axisTitle:null}}),
		sideBar = new zSwarm({
			layout:L.sideBar, style:Y.sideBar,
			dc:dc,
			A:[ROOT, "all"],
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
				title:{
					type:"zTextBox", mask:"fixed",
					init:function (S, D, mode) {return {layer:1, layout:L.title}},
					curr:function (S, D, mode) {return {text:dc.getName({d:0, as:S.A})}}
				},
				scale:{
					type:"zMultiDrone", mask:"fixed",
					init:function (S, D, mode) {
						var i, out = [],
							base = {
								type:"zRectangle", base:D.Y.notch,
								layout:{width:L.scale.width / D.Y.maxNotches, height:L.scale.height}
							};
						for (i = 0; i < D.Y.maxNotches; i++) out.push(zo.clone(base, {
							fill:swarm.getColour(2 * i / (D.Y.maxNotches - 1) - 1),
							layout:{anchor:L.scale.getPoint(i / D.Y.maxNotches, 0)}
						}));
						out.push(zo.clone(base, {
							fill:swarm.Y.nullFill,
							layout:{x:L.sideBar.right - L.sideBar.margin, y:L.scale.top, xAlign:"right"}
						}));
						return out;
					},
					curr:function (S, D, mode) {
						var baseVal = swarm.getBaseVal(S.A[0]),
							currVal = swarm.getCurrVal(S.A[0]),
							change = currVal / baseVal - 1,
							text = zt.format(currVal, S.Y.valFormat) +
								" in " + dc.getMeta("name", {d:1, a:CURR_YEAR}) + (
								(!currVal) ? "" :
								(!baseVal) ? "\n(new)" :
								(change == 0) ? "\n(no change)" :
								"\n(" + zt.format(change, S.Y.decFormat) + ")"),
							anchor =
								(!baseVal || !currVal) ? {x:L.sideBar.right - L.sideBar.margin - 0.5 * L.scale.width / D.Y.maxNotches, y:L.scale.bottom} :
								L.scale.getPoint(zt.forceBetween(change + 0.5, 0, 1), 1);
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
					curr:function (S, D, mode) {
						var i, name, prevVal, currVal, content, vals = [],
							description = dc.getMeta("description", {d:0, as:S.A}),
							children = dc.findChildren({d:0, as:S.A}),
							addList = function (vals, mode) {
								var i, name, valChange, text = "",
									mod = (mode == "min") ? 1 : -1,
	 								vals = za.sortObjects(vals, "valChange", mode == "max");
								for (i = 0; i < 3 && (mod * vals[i].valChange) < 0; i++) { // Go through list, and only accept if it's an actual cut
									name = vals[i].name;
									valChange = zt.format(vals[i].valChange, S.Y.valFormat);
									if (i == 0) text = "<h4>Biggest <b>" + ((mode == "min") ? "decreases" :"increases") + "</b>:</h4>";
									text += "<li>" + name + " (" + valChange + ")";
								};
								return text;
							};
						if (description) content = "<p>" + description + "</p>";
						else if (children.length) {
							for (i = 0; i < children.length; i++) {
								name = dc.getName({d:0, a:children[i]});
								prevVal = swarm.getBaseVal(children[i]);
								currVal = swarm.getCurrVal(children[i]);
								vals.push({name:name, valChange:currVal - prevVal});
							};
							content = addList(vals, "min") + "<br>" + addList(vals, "max"); // Find the biggest cuts/increase among children
						} else content = "No description.";
						return {content:content};
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
					curr:function (S, D, mode) {return {circle:{centre:S.points[D.A[1]]}}}
				},
				label:{
					type:"zTextBox", mask:"fixed",
					curr:function (S, D, mode) {
						var aPos = S.highlighted,
							prevVal = S.vals[aPos - 1],
							currVal = S.vals[aPos],
							decChange = currVal / prevVal - 1,
 							text = zt.format(currVal, S.Y.valFormat) +
								" in " + dc.getMeta("name", {d:1, a:aPos}) + (
								(!currVal || !aPos) ? "" :
								(!prevVal) ? "\n(new)" :
								(decChange == 0) ? "\n(no change)" :
								"\n(" + zt.format(decChange, S.Y.decFormat) + ")");
						return {
							layer:1, text:text,
							layout:{
								anchor:S.points[aPos], xAlign:"xCentre",
								radial:(decChange < 0) ? 90 : 270, radialStart:S.Y.points.largeRadius, radialEnd:D.Y.branchLength
							}
						};
					}
				}
			}
		});
	tAxis.toFront();
	dAxis.toFront();

	return;
	logger("HotTree(): Introductions...");
	var init = document.location.hash;
	if (init != "" && !isNaN(init) && init != ROOT) { // If init is a valid number and not root
		swarm.lock();
		swarm.G.delay(800, function () {swarm.zoomTo(init * 1)});
	} else {
		swarm.superLock();
		new zNarrator({base:Y.narrator, layout:L.narrator,
			onClose:function () {
				swarm.zoomTo(ROOT);
				sideBar.setHighlight();
				swarm.superUnlock();
			},
			script:[
				{
					content:"<h3>Introduction</h3><p>Welcome to ChewyData's HotTree visualisation. Each block in the main panel represents a category:<ul><li>The <b>bigger</b> the block, the bigger that category is. <li><b>Green</b> represents an <b>increase</b> since the last period. <li><b>Red</b> represents a <b>decrease</b> since the last period.</p></ul><p><i>All figures are inflation adjusted.</i></p></ul>",
					layout:{x:L.base.centre.x, y:L.base.getY(0.3), autoHeight:true}
				},{
					content:"<h3>Highlighting</h3><p>You can highlight a block by moving your mouse over it. The panel on the left will update automatically.</p>",
					layout:{x:L.sideBar.right, y:200, autoHeight:true},
					delay:Y.swarm.highlight.t,
					action:function () {
						swarm.zoomTo(ROOT, function () {swarm.setHighlight(1919)});
					}
				},{
					content:"<h3>Zooming</h3><p>Clicking on a block will zoom in on that block and show all the items that make up the category.</p><p><i>You can click 'Zoom Out' at the bottom of the screen to zoom back to the top.</i></p>",
					layout:{x:L.sideBar.right, y:200, autoHeight:true},
					delay:Y.swarm.zoom.t,
					action:function () {swarm.zoomTo(1919)}
				},{
					content:"<h3>Locking</h3><p>Clicking on a block will lock it in place...</p>",
					layout:{x:L.sideBar.right, y:200, xAlign:"xCentre", yAlign:"yCentre", autoHeight:true},
					delay:Y.swarm.zoom.t,
					action:function () {
						swarm.zoomTo(1382);
						sideBar.setHighlight();
					}
				},{
					content:"<h3>Locking</h3><p>...allowing you to use the side panel to look at changes over time.</p><p><i>Move your mouse over a point in the line to see the value for that period.</i></p>",
					layout:{x:20, y:L.base.centre.y, xAlign:"left", yAlign:"bottom", autoHeight:true},
					action:function () {sideBar.setHighlight(4)}
				},{
					content:"<h3>Advanced features</h3><p>You can also use the search box on the left to find specific items.</p><p><i>Note that items which were in previous periods but which no longer exists are not displayed.</i></p>",
					layout:{x:180, y:-5, yAlign:"top", autoHeight:true},
					action:function () {sideBar.setHighlight()}
				}
			]
		});
	};
	logger("HotTree(): Done.");
};
