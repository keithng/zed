var SWARM;
DaliPie = function (rawData, style, layout) {
	logger("DaliPie(): Initialising.");
	// Layout
	var L = zt.getMaxLayout(800, 400, 50);
	with (L) {
		L.tooltipBox = {width:300}; // TooltipBox is floating, so position doesn't need to be defined, and height is automatic (depending on text)
		L.tAxis = new zLayout({
			x:60, y:bottom - 52,
			width:width - 80, height:15
		});
		L.sideBar = new zLayout({
			x:20, y:0,
			width:460,
			height:L.tAxis.y - 20,
			margin:margin
		});
		var swarmSize = Math.min(width - sideBar.width - 240, sideBar.height * 0.75);
		L.swarm = new zLayout({
			anchor:{
				x:zt.calcMid(sideBar.right, right, 0.5),
				y:L.sideBar.getY(0.6)
			},
 			width:swarmSize, height:swarmSize,
			xAlign:"xCentre", yAlign:"yCentre"
		});
		L.zoomOutTab = {
			x:centre.x, y:L.tAxis.y,
			xAlign:"xCentre", yAlign:"bottom"
		};
	};
	with (L.sideBar) {
		L.fakeTAxis = {
			anchor:getPoint(0, 1, true), // Last flag ("true") tells getPoint to innerSpace, which takes margins into consideration
			width:innerWidth,
			xAlign:"left", yAlign:"top"
		};
		L.dAxis = {
			anchor:getPoint(0, 1, true),
			width:height - 260,
			xAlign:"left", yAlign:"bottom",
			rotation:270
		};
	};
	L = zo.extend(L, layout); // Overwrite layout with user-defined layout

	// Style
	var Y = {
		// Reference styles
		decFormat:{mode:"%", dp:1},
		weightFormat:{mode:"%", dp:1},
		changeFormat:{base:"decFormat", forceSign:true},
		descriptionFormat:{base:"decFormat", noSign:true},
		lines:{stroke:"#ddd"},
		axis:{
			maxNotches:6,
			label:{
				fill:"#888",
				"font-weight":"bold"
			},
			axisTitle:{
				margin:0,
				fill:"#888"
			}
		},
		// Objects
		tooltipBox:{
			margin:16
		},
		tAxis:{
			base:"axis",
			maxNotches:10,
			select:{t:100, e:"-"},
			notchLabel:{
				margin:7,
				"font-size":12,
				"font-weight":"bold",
				fill:"#aaa",
			},
			currNotch:{width:80},
			baseNotch:{width:60}
		},
		fakeTAxis:{
			base:"axis",
			title:"",
			maxNotches:4,
			label:{
				margin:7,
				"font-size":12
			}
		},
		dAxis:{
			base:"axis",
			maxNotches:8,
			minNotchGap:0.01,
			label:{
				format:{mode:"%"},
				radialStart:-L.sideBar.innerWidth, radialEnd:2,
				branch:{base:"lines"}
			}
		},
		swarm:{
			baseOffset:0, // Default pie orientation (degrees)
			baseRingsOffset:270, // Default ring label angle (degrees)
			zoomedOffset:225, // Pie orientation when zoomed (degrees)
			zoomedRingsOffset:20, // Ring label angle when zoomed (in points, not degrees)
			highlight:{t:400, e:"<>"},
			spin:{t:600, e:"<>"},
			zoom:{t:600, e:"<>"},
			merge:{t:600, e:"<>"},
			background:{fill:"#fff", opacity:0}, // Invisible background to serve clicks
			rings:{
				minGap:0.2,
				label:{fill:"#999"},
				ring:{base:"lines"}
			},
			title:{
				margin:3,
				fill:"#666",
				title:{
					format:{wrap:26},
					"font-size":28,
					"font-weight":"bold"
				},
				subtitle:{
					"font-size":16
				}
			},
			slice:{
				opacity:0.8,
				highlight:{opacity:1},
				faded:{opacity:0.1}
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
		sideBar:{
			text:{},
			bar:{
				parallelSize:1,
				opacity:1,
				"stroke-opacity":0.1
			}
		}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("DaliPie(): Collating and crunching data.");
	var ROOT, ENTITY = 0, CATEGORY = 0,
		i, index = [],
		dc = new zDataCube(3, rawData);
	with (dc) {
		// Categories
		if (meta[1].tree[0].length > 1) addRootNode(1);
		ROOT = meta[1].tree[0][0];
		// Weight must always add up to 1
 		calcTreeData("sum", "weight", 1); // Calc weights for root categories
		forSpaces({as:"all", mask:{d:1, a:"all"}}, function (x) {
			var base = getData("weight", {as:addSpaces(x.as, {d:1, a:ROOT})}); // baseWeight is the weight of the root category
			forData("weight", x, function (oldVal) {return oldVal / base});
		});
		// Make sure the whole tree is coherent
		calcTreeData("sum", "val", 1);
 		calcTreeData("stacked", "weight", 1);
		setColour({d:1}, null, "tree");
		// Time
		for (i = 0; i < getSize(2); i++) meta[2].name[i] += ""; // Force type to string
		// Add names to searchBox
		for (i = 0; i < getSize(1); i++) {
			index.push({key:i, label:meta[1].name[i]}); // Log name (searchBox will need this)
		};
		$("#searchBox").autocomplete({source:index, select:function (event, ui) {swarm.zoomTo(ui.item.key)}}); // Give list to searchBox
	};

	// Drawing
	logger("DaliPie(): Drawing accessories.");
	PAPER = zt.makePaper(L);
	var tooltipBox = new zHTMLTooltipBox({layout:L.tooltipBox, base:Y.tooltipBox}),
		tAxis = new zSlideAxis({
			L:L.tAxis, Y:Y.tAxis,
			dc:dc, d:2,
			baseSelected:{
				a:
					(Y.tAxis.initBaseSelected > 0) ? Y.tAxis.initBaseSelected :
					(Y.tAxis.initBaseSelected < 0) ? dc.getSize(2) + Y.tAxis.initBaseSelected - 1 :
					0
			},
			selected:{a:dc.getSize(2) - 1},
			plan:{axisTitle:null, axisLine:null}
		}),
		fakeTAxis = new zSmartAxis({
			layout:L.fakeTAxis, style:Y.fakeTAxis,
			dc:dc, d:2,
			plan:{axisLine:null, notch:null, notchLabel:null}
		}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			scale:[0, 0.5],
			plan:{
				axisLine:null,
				axisTitle:{
					init:function (S, D, mode) {
						return {
							text:S.title || S.Y.title || dc.getMeta("title", {d:1}),
							layout:{
								x:S.L.left, y:S.L.top,
								xAlign:"left", yAlign:"bottom"
							}
						};
					}
				}
			}
		});

	logger("DaliPie(): Drawing main swarm.");
	var swarm = new zSwarm({ // Resources
		layout:L.swarm, style:Y.swarm, axes:{t:tAxis},
		dc:dc, A:[0, dc.meta[1].tree[1], tAxis.selected.r],
		onInit:function () {
			var S = this;
			S.selected = {d:1, a:ROOT};
			S.parent = dc.findParent({d:1, a:ROOT});
			S.children = dc.findChildren({d:1, a:ROOT});
		},
		// Calcuation functions - gets a specific type of data (should NOT need to change this, but might need to add more)
		calcAll:function (A) {
			var S = this,
				baseA = [A[0], A[1], tAxis.baseSelected.a],
				prevA = [A[0], A[1], A[2] - 1],
				val = dc.getData("val", {as:A});
			return {
				val:val,
				change:val / dc.getData("val", {as:prevA}) - 1,
				baseChange:(A[2] > 0) ? val / dc.getData("val", {as:baseA}) - 1 : 0,
				category:dc.getName({d:1, as:A}),
				parentCategory:dc.getFamily("parent", "name", {d:1, as:A}),
				childrenCategory:dc.getFamily("children", "name", {d:1, as:A}),
				time:dc.getName({d:2, as:A}),
				baseTime:dc.getName({d:2, as:baseA}),
				weight:dc.getData("weight", {as:A}),
				baseWeight:dc.getData("weight", {as:baseA})
			};
		},
		// Display functions - calculates radius/degree/tooltips based on data (change this to alter visualisation behaviour)
		getDefault:function (A) {
			var base = dc.getData("val", {as:[A[0], A[1], tAxis.baseSelected.a]}),
				curr = dc.getData("val", {as:A}),
				out = curr / base - 1;
			return (isNaN(out) || out == Infinity) ? -1 : out;
		},
		getRadius:function (val) {
			var S = this;
			return S.radius * Math.sqrt(val + 1) / Math.sqrt(S.maxVal + 1);
		},
		getDeg:function (A) {
			var S = this,
				dec = dc.getData("weightStacked", {as:[A[0], A[1], tAxis.baseSelected.a]});
			return {
				start:S.offset + zp.decToDeg(dec.start),
				end:S.offset + zp.decToDeg(dec.end)
			};
		},
		getTooltip:function (A, D) {
			var S = this,
				asPercent = function (dec) {
					return (dec) ? zt.format(dec, Y.changeFormat) : "No change";
				};
			with (S.calcAll(A)) return "" +
				"<h3>" + category + "</h3>" +
				((A[2] > 0) ? "<b>" + asPercent(change) + "</b> in " + time : "") +
				"<br><b>" + asPercent(baseChange) + "</b> between " + baseTime + " and " + time +
				"<br><b>" + zt.format(baseWeight, Y.weightFormat) + "</b> of " + baseTime + " CPI basket" +
				"<i>" + (
					(D.role == "bar") ?
						(!PAPER.isiPad) ?
							"<p>Click to select this period" :
							"<p>Click again to select this period" : // iPad
					(D.role == "slice" && childrenCategory.length) ?
						(!PAPER.isiPad) ?
							"<p>Click to zoom in" : // If it has children, then zoom must be possible
							"<p>Click again to zoom in" : // If it has children, then zoom must be possible
					""
				) + "</p></i>";
		},
		setOffset:function () {
			var S = this, oldDeg, newDeg,
				A = [0, S.selected.a, tAxis.selected.a];
			if (S.zoomed) {
				oldDeg = zo.midStack(S.getDeg(A)); // Find bisect of segment
				newDeg = S.Y.zoomedOffset + S.offset - oldDeg; // Convert to offset
				S.offset = zp.matchDeg(newDeg, S.offset); // Use matchDeg to ensure spin in the right direction
			} else S.offset = S.Y.baseOffset; // Default angle
		},
		setRings:function () {
			var S = this,
				notchGap = Math.max(zt.getClosestFactorOfTen((S.maxVal - S.minVal) / 2), S.Y.rings.minGap),
				startNotch = notchGap * Math.round(S.minVal / notchGap);
 			S.rings = za.fill(startNotch, 3, notchGap);
		},
		setCircle:function () {
			var S = this, vals = [],
				children = dc.findChildren(S.selected),
				time =
					(!Y.tAxis.disableBackwards) ? "all" :
					za.getAll(dc.shown[2], tAxis.baseSelected.a, ">="); // If disableBackwards, only get vals from time past baseSelected
			// Get maxVal
			dc.forSpaces([0, children, time], function (x) { // Targeted category and all its children
				var curr = S.getDefault(x.as);
				if (curr != -1) vals.push(curr);
			});
			S.minVal = za.min(vals);
			S.maxVal = za.max(vals);
			// Reset radius and centre
			S.radius = S.L.height * 0.5; // Set radius based on new layout
			S.centre = S.L.getPoint(0.5, 0.5, true); // Set centre based on new layout
			if (S.zoomed) {
				// Use original radius and centre to calculate arcPoints and zoom in
				var points = [];
				dc.forSpaces([0, children, time], function (x) { // Targeted category and all its children
					var deg = S.getDeg(x.as),
						val = S.getDefault(x.as),
						arcPoints = zp.arcToPoints(S.centre, S.getRadius(-1.00), S.getRadius(val), deg.start, deg.end); // Calculate its edge point
					if (val != -1) points = points.concat(arcPoints);
				});
				S.L.zoom(zp.pointsToBox(points)); // Turn points into a box - and zoom into it
				// Calculate new radius and centre
				S.radius = S.L.height * 0.5; // Set radius based on new layout
				S.centre = S.L.getPoint(0.5, 0.5, true); // Set centre based on new layout
				S.L.unzoom(); // Reset layout
			};
		},
		highlight:function (aPos, t, e, b, w) {
			var S = this, t = t || S.Y.highlight.t, e = e || S.Y.highlight.e;
			S.baseHighlight({d:1, a:aPos}, t, e, b, w);
			sideBar.setSpace({d:1, a:aPos});
			sideBar.refresh("all", t, e, null, S.K);
		},
		select:function (x, t, e, b, w) {
			var S = this, t = t || S.Y.highlight.t, e = e || S.Y.highlight.e;
			S.selected = x;
			S.parent = dc.findParent(x);
			S.children = dc.findChildren(x);
			S.highlight(x.a);
			S.setMode({d:1, a:"all"}, "faded", t, e, null, w);
			S.unsetMode({d:1, a:S.children.concat(x.a)}, t, e, b, w);
			document.location.hash = S.selected.a;
		},
		zoomIn:function (x, b) {
			var S = this;
			S.remove("rings", S.Y.spin.t, S.Y.spin.e);
			S.select(x, S.Y.spin.t, S.Y.spin.e);
			S.refresh("all", S.Y.spin.t, S.Y.spin.e, function () { // Spin!
				S.setCircle(); // Find boundary for all children recalculate circle
				S.refresh("all", S.Y.zoom.t, S.Y.zoom.e, function () { // Zoom!
					S.disaggregate(S.selected); // Create children
					tAxis.layer(); // Bring tAxis in front of swarms
					S.refresh("all", S.Y.merge.t, S.Y.merge.e, b); // Unmerge and iterate!
				});
			});
		},
		zoomOut:function (b) {
			var S = this;
			S.remove("rings", S.Y.merge.t, S.Y.merge.e);
			S.refresh({d:1, a:S.children, mode:{asParent:true}}, S.Y.merge.t, S.Y.merge.e, function () { // Aggregate!
				S.aggregate({d:1, a:S.children[0]}); // Remove children
				tAxis.layer(); // Bring tAxis in front of swarms
				S.select({d:1, a:S.parent}, S.Y.zoom.t, S.Y.zoom.e);
				S.setCircle();
				S.refresh("all", S.Y.zoom.t, S.Y.zoom.e, b); // Zoom, spin and iterate!
			});
		},
		zoomFinish:function (aPos, b) {
			var S = this;
			S.unlock();
			S.setRings();
			S.add("rings", S.Y.highlight.t, S.Y.highlight.e);
			tAxis.layer();
			S.highlight(aPos);
			if (b) b();
		},
		zoomTo:function (aPos, b) {
			var S = this, t = S.Y.highlight.t, e = S.Y.highlight.e,
				iterate = function () {S.zoomTo(aPos, b)},
				path = dc.findRelationship(1, S.selected.a, aPos),
				generation = dc.getMeta("generation", {d:1, a:path});
			if (path == null) return; // Path is not valid - abort
			S.lock();
			tooltipBox.hide(t, e);
			if (aPos == ROOT) S.remove("zoomOutTab", t, e);
			else if (!S.zoomed) S.add("zoomOutTab", t, e);
			// Decide whether to zoom in, out, or whether already arrived
			if (path[1] == null) { // Arrived at target
				S.zoomFinish(path[0], b);
			} else if (!dc.findChildren({d:1, a:path[1]}).length) { // Final element has no children so stopping one level above
				S.zoomFinish(path[1], b);
			} else if (generation[0] < generation[1]) { // Going deeper
				S.zoomIn({d:1, a:path[1]}, iterate);
			} else if (generation[0] > generation[1]) { // Coming back out
				S.zoomOut(iterate);
			} else explode("DaliPie.zoomTo(): YEAH NAH - attempting to go to a different element in the same generation - something must have gone wrong with the pathfinding." );
		},
		updateData:function () {
			var S = this;
			if (S.prevBase != tAxis.baseSelected.a || S.prevSelected != tAxis.selected.a) { // Recalculate only if it's a time change (i.e. Don't recalculate on zoom)
				S.setCircle();
				S.setRings();
				S.prevBase = tAxis.baseSelected.a;
				S.prevSelected = tAxis.selected.a;
			};
			S.zoomed = (S.selected.a != ROOT); // Reset zoomed flag if it's zoomed out to top
			S.setOffset(); // .setOffset() is in .updateData() so that offset is recalculated during time animation
		},
		plan:{
			background:{
				type:"zRectangle", mask:"fixed",
				init:function (S, D, mode) {
					return {
						layout:L,
						mouseEvents:function (D) {
							D.click(function () {S.zoomTo(S.parent)});
						}
					};
				}
			},
			rings:{
				type:"zMultiDrone", mask:["mask", "na", "mask"],
				curr:function (S, D, mode) {
					var i, radius, out = [],
						selectedDeg = S.getDeg(dc.addSpaces(D.A, S.selected)),
						deg = (!S.zoomed) ? S.Y.baseRingsOffset - 90 :
							selectedDeg.start - zp.asin(S.Y.zoomedRingsOffset / S.radius); // Label is always 20 points away from selectedDeg.start
					for (i = 0; i < S.rings.length; i++) {
						radius = S.getRadius(S.rings[i]);
						out.push({
							type:"zMultiDrone",
							label:{
								type:"zTextBox",
								text:zt.format(S.rings[i], "%"),
								layout:{
									anchor:S.centre,
									radial:zp.matchDeg(deg),
									radialStart:radius + 2
								}
							},
							ring:{
								type:"zCircle",
								circle:{centre:S.centre, radius:radius}
							}
						});
					};
					return out;
				}
			},
			title:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, D, mode) {
					return {
						layer:2,
						title:{type:"zTextBox", layout:{yAlign:"bottom"}},
						subtitle:{type:"zTextBox", layout:{yAlign:"top"}},
						mouseEvents:function (D) {
							if (!PAPER.isiPad) { // On a non-iPad
								D.hover(function () {S.highlight(S.selected.a)}); // On hover, highlight
								D.click(function () {S.zoomTo(S.parent)}); // On click, zoom out
							} else { // On an iPad
								D.click(function () { // Only has click interaction..
									if (S.highlighted != S.selected.a) { // On first click (not yet highlighted)
										S.highlight(S.selected.a); // Highlight
									} else S.zoomTo(S.parent); // On second click, zoom
								});
							};
						}
					};
				},
				curr:function (S, D, mode) {
					var category = dc.getName(S.selected),
						currTime = dc.getName(tAxis.selected),
						baseTime = dc.getName(tAxis.baseSelected),
						val = S.getDefault(dc.addSpaces(S.A, S.selected));
					return {
						layout:{
							x:(S.zoomed) ? S.L.left : S.L.centre.x,
							y:S.L.top - 36,
							xAlign:"xCentre"
						},
						title:{
							text:category + " (" + zt.format(val, Y.changeFormat) + ")"
						},
						subtitle:{
							text:"from " + baseTime + " to " + currTime
						}
					};
				}
			},
			slice:{
				type:"zArc", mask:"mask",
				curr:function (S, D, mode) {
					var parent = dc.findParent({d:1, as:D.A}),
						deg = S.getDeg(D.A),
						A = (mode.asParent) ? dc.addSpaces(D.A, {d:1, a:parent}) : D.A, // If it's being inserted or removed, use parent's value
						val = S.getDefault(A),
						fill = dc.getMeta("colour", {d:1, as:A});
					return {
						layer:1,
						arc:{
							minSeg:4, centre:S.centre,
							innerRadius:0, outerRadius:S.getRadius(val),
							degStart:deg.start, degEnd:deg.end
						},
						fill:fill, stroke:fill,
						mouseEvents:function (D) {
							if (parent != S.selected.a) { // Inactive elements...
								D.click(function () {S.zoomTo(S.parent)}); // Only has one action
							} else if (!PAPER.isiPad) { // Active elements on a non-iPad
								D.tooltip(null, tooltipBox, {width:L.tooltipBox.width}); // Hover tooltips
								D.hover(function () {S.highlight(D.A[1])}); // On hover, highlight
								D.click(function () {S.zoomTo(D.A[1])}); // On click, zoom
							} else { // Active elements on an iPad...
								D.click(function (event) { // Only has click interaction..
									if (S.highlighted != D.A[1]) { // On first click (not yet highlighted)
										S.highlight(D.A[1]); // Highlight
										tooltipBox.showAt({text:D.O.tooltipText}); // Show text box
										tooltipBox.moveToEvent(event); // Move to click location
									} else S.zoomTo(D.A[1]); // On second click, zoom
								});
							};
						},
						tooltipText:S.getTooltip(D.A, D)
					};
				}
			},
 			zoomOutTab:{
				type:"zTextBox", mask:"fixed", ignore:true,
				init:function (S, D, mode) {
					return {
						text:"Zoom out", layout:L.zoomOutTab, layer:2,
						mouseEvents:function (D) {
							if (!PAPER.isiPad) D.hoverHighlight(200); // Hoverhiglight if not on an iPad
							D.click(function () {if (!S.locked) S.zoomTo(ROOT)}); // Zoom out
						}
					};
				}
 			}
		}
	});
	SWARM = swarm;

	logger("DaliPie(): Drawing side bar graph.");
	var sideBar = new zSwarm({ // Resources
		layout:L.sideBar, style:Y.sideBar, axes:{t:tAxis},
		dc:dc,
		A:[0, ROOT, "all"],
		// Current setting: Sidebar displays change for that period
		getDefault:function (A) {
			if (A[2] == 0) return 0;
			var prev = dc.getData("val", {as:[A[0], A[1], A[2] - 1]}),
				curr = dc.getData("val", {as:A}),
				out = curr / prev - 1;
			return (isNaN(out) || out == Infinity) ? 0 : out;
		},
		updateData:function (t, e, b, w) {
			var S = this, i, vals = [];
			dc.forSpaces({as:S.A}, function (x) {
				vals.push(S.getDefault(x.as));
			});
			dAxis.setShown([
				Math.min(za.min(vals) * 1.2, 0),
				Math.max(za.max(vals) * 1.2, 0)
			], t, e, b, w);
			S.layer("bars"); // Brings bars to front
			dAxis.toFront({d:0, a:0}); // Bring baseline to front
		},
		plan:{
			text:{
				type:"zHTML", mask:["mask", "mask", "na"],
				init:function (S, D, mode) {
					return {
						layout:{
							anchor:S.L.getPoint(0, 0, true),
							width:S.L.innerWidth // Height is automatic
						}
					};
				},
				curr:function (S, D, mode) {
					var data = swarm.calcAll(dc.addSpaces(S.A, tAxis.selected));
					with (data) return {content:
						"<h2>" + category + "</h2><p>" +
						category + (
							(childrenCategory.length) ? " contains " +childrenCategory.length + " subcategories" :
							" is a subcategory of " + parentCategory) +
						" and was " + zt.format(baseWeight, Y.weightFormat) + " of the " + baseTime + " CPI basket.<p>" +
						"Prices " + (
							(!change) ? "did not change" :
							((change < 0) ? "fell by " : "rose by ") + zt.format(change, Y.descriptionFormat)
						) + " in " + time + ", " +
						"and were " + zt.format(baseChange, Y.descriptionFormat) + ((baseChange < 0) ? " lower" : " higher") +
						" than they were in " + baseTime + "."
					};
				}
			},
			bar:{
				type:"zRectangle", mask:"mask",
				init:function (S, D, mode) {
					return {
						layout:{
							x:fakeTAxis.getPoint({d:2, as:D.A}).x,
							width:fakeTAxis.getLength(D.Y.parallelSize),
							xAlign:"xCentre", yAlign:"bottom"
						},
						mouseEvents:function (D) {
							if (!PAPER.isiPad) {
								D.tooltip(null, tooltipBox, {width:L.tooltipBox.width}); // No hover tooltips on an iPad
								D.click(function () { // On click
									tooltipBox.hide(); // Hide tooltipbox
									tAxis.axisSelect({a:D.A[2]}, tAxis.Y.select.t, tAxis.Y.select.e); // And change time to current bar
								});
							} else {
								D.click(function () { // On click
									if (D.A[2] != S.clicked) {
										tooltipBox.showAt({text:D.O.tooltipText}); // Show text box
										tooltipBox.moveToEvent(event); // Move to click location
										S.clicked = D.A[2];
									} else {
										S.clicked = null;
										tooltipBox.hide(); // Hide tooltipbox
										tAxis.axisSelect({a:D.A[2]}, tAxis.Y.select.t, tAxis.Y.select.e); // And change time to current bar
									};
								});
							};
						}
					};
				},
				curr:function (S, D, mode) {
					var val = S.getDefault(D.A),
						fill = dc.getMeta("colour", {d:1, as:D.A});
					if (D.A[2] == tAxis.selected.a) { // For selected bar
						fill = zt.getColour(0.15, fill, "#000"); // Darken by 15%
					};
					return {
						layer:1,
						tooltipText:swarm.getTooltip(D.A, D),
						layout:{
							y:dAxis.getPoint(0).y,
							height:dAxis.getLength(val)
						},
						fill:fill
					};
				}
			}
		}
	});
	SWARM = swarm;
	logger("DaliPie(): Done.");
};