DaliPie = function (rawData, style, layout) {
	logger("DaliPie(): Initialising.");
	// Layout
	var L = zt.getMaxLayout(1200, 600); // minWidth, minHeight, margin
	with (L) {
		L.tooltipBox = {
			width:280 // TooltipBox is floating, so position doesn't need to be defined, and height is automatic (depending on text)
		};
		L.sideSwarm = new zLayout({
			x:20, y:0,
			width:460, height:height - 72,
			margin:50
		});
		L.swarm = new zLayout({
			anchor:{
				x:zt.calcMid(sideSwarm.right, right, 0.5),
				y:bottom - 72
			},
 			width:Math.min(width - sideSwarm.width - 280, height - 72 - 100),
 			height:Math.min(width - sideSwarm.width - 280, height - 72 - 100),
			xAlign:"xCentre", yAlign:"bottom"
		});
		L.iAxis = {
			x:centre.x, y:200,
			innerWidth:160, innerHeight:600,
			xAlign:"left", yAlign:"yCentre",
			margin:10, rotation:90
		};
		L.tAxis = {
			x:60, y:bottom - 52,
			width:width - 80, height:15
		};
		L.credits = {
			anchor:getPoint(1, 0),
			xAlign:"right", yAlign:"top",
			margin:20
		};
		L.zoomOutTab = {
			x:centre.x, y:L.tAxis.y,
			xAlign:"xCentre", yAlign:"bottom"
		};
	};
	with (L.sideSwarm) {
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
		lines:{
			"stroke-width":0.3,
			stroke:"#ccc"
		},
		axis:{
			maxNotches:6,
			label:{
				fill:"#888",
				"font-weight":"bold"
			},
			axisTitle:{
				margin:20,
				fill:"#444"
			}
		},
		// Objects
// 		introText:{
// 			"z-index":9999, // To top
// 			"border":"solid 1px #c4dde2",
// 			"background-color":"#d4edf2",
// 			"font-family":"sans-serif",
// 			"font-size":"13px",
// 			"text-align":"center",
// 			opacity:0.9,
// 			margin:L.height * 0.35
// 		},
		background:{fill:"#060606", opacity:0.1},
		credits:{fill:"#ccc"},
		iAxis:{},
		tAxis:{
			base:"axis",
			maxNotches:10,
			select:{t:300},
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
				radialStart:-L.sideSwarm.innerWidth, radialEnd:2,
				branch:{base:"lines"},
				baseBranch:{
					"stroke-width":2,
					opacity:1
				}
			}
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
		tooltipBox:{},
		swarm:{
			baseOffset:0, // Default pie orientation (degrees)
			baseRingsOffset:270, // Default ring label angle (degrees)
			zoomedOffset:225, // Pie orientation when zoomed (degrees)
			zoomedRingsOffset:20, // Ring label angle when zoomed (in points, not degrees)
			spin:{t:600, e:"<>"},
			zoom:{t:600, e:"<>"},
			merge:{t:600, e:"<>"},
			rings:{
				minGap:0.2,
				label:{fill:"#999"},
				ring:{base:"lines"}
			},
			title:{
				margin:3,
				fill:"#888",
				title:{
					format:{wrap:22},
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
			}
		},
		sideSwarm:{
			select:{t:400, e:"<>"},
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
	var i,
		ROOT, ENTITY = 0, CATEGORY = 0,
		dc = new zDataCube(3, rawData);
	with (dc) {
		// Categories
		if (meta[1].tree[0].length > 1) addRootNode(1);
		ROOT = meta[1].tree[0][0];
 		calcTreeData("sum", "weight", 1);
		// Weight must always be dec
		forSpaces({as:"all", mask:{d:1, a:"all"}}, function (x) {
			var base = calcData("sum", "weight", addSpaces(x.as, {d:1, a:meta[1].tree[0]})); // baseWeight
			forData("weight", x, function (oldVal) {
				return oldVal / base;
			});
		});
		// Make sure the whole tree is coherent
		calcTreeData("sum", "val", 1);
 		calcTreeData("stacked", "weight", 1);
		setColour({d:1}, null, "tree");
		// Time
		for (i = 0; i < getSize(2); i++) meta[2].name[i] += ""; // Force type to string
	};

	// Drawing
	logger("DaliPie(): Drawing accessories.");
	PAPER = zt.makePaper(L);
	var background = new zRectangle({L:L, base:Y.background}),
		credits = new zTextBox({text:"Created by Keith Ng", L:L.credits, base:Y.credits}),
// 		iAxis = new zScrollAxis({
// 			L:L.iAxis, style:Y.iAxis,
// 			dc:dc, d:0,
// 			selected:{a:dc.getSize(0) - 1},
// 			plan:{axisTitle:null}
// 		}),
		tAxis = new zSlideAxis({
			L:L.tAxis, Y:Y.tAxis,
			dc:dc, d:2,
			baseSelected:{a:dc.getSize(2) - 2},
			selected:{a:dc.getSize(2) - 1},
			plan:{axisTitle:null, axisLine:null}
		}),
		fakeTAxis = new zSmartAxis({
			layout:L.fakeTAxis, style:Y.fakeTAxis,
			dc:dc, d:2,
			plan:{axisTitle:null, axisLine:null, notch:null, notchLabel:null}
		}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			scale:[0, 0.5],
			plan:{axisLine:null}
		}),
		zoomOutTab = new zTextBox({text:"Zoom out", layout:L.zoomOutTab, base:Y.zoomOutTab}),
		tooltipBox = new zHTMLTooltipBox({layout:L.tooltipBox, base:Y.tooltipBox});
	background.click(function () {swarm.zoomOut()});
	zoomOutTab.hide();
	zoomOutTab.click(function () {swarm.zoomOut()});
	zoomOutTab.hoverHighlight(200);

	logger("DaliPie(): Drawing main pie.");
	var swarm = new zSwarm({ // Resources
		layout:L.swarm, style:Y.swarm, axes:{t:tAxis},
		dc:dc,
		A:[0, dc.meta[1].tree[1], tAxis.selected.r],
		selected:{d:1, a:ROOT},
		// Calcuation functions - gets a specific type of data (should NOT need to change this, but might need to add more)
		calcAll:function (A, noIterate) {
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
		getTooltipText:function (A, D) {
			var S = this,
				asPercent = function (dec) {
					return (dec) ? zt.format(dec, {m:"%", dp:1, forceSign:1}) : "No change";
				};
			with (S.calcAll(A)) return "<div class='alttext'>" +
				"<div class='title'>" + category + "</div>" +
				((A[2] > 0) ? "<br><b>" + asPercent(change) + "</b> in " + time : "") +
				"<br><b>" + asPercent(baseChange) + "</b> between " + baseTime + " and " + time +
				"<br><b>" + asPercent(baseWeight) + "</b> of " + baseTime + " CPI basket" +
				"<b><i>" + (
					(D.role == "bar") ? "<br><br>Click to select this period" :
					(D.role == "slice" && childrenCategory.length) ? "<br><br>Click to zoom in" : // If it has children, then zoom must be possible
					""
				) + "</i></b></div>";
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
					za.getAll(dc.shown[2], tAxis.baseSelected.a, ">"); // If disableBackwards, only get vals from time past baseSelected
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
						arcPoints = zp.arcToPoints(S.centre, S.getRadius(-0.75), S.getRadius(val), deg.start, deg.end); // Calculate its edge point
					if (val != -1) points = points.concat(arcPoints);
				});
				S.L.zoom(zp.pointsToBox(points)); // Turn points into a box - and zoom into it
				// Calculate new radius and centre
				S.radius = S.L.height * 0.5; // Set radius based on new layout
				S.centre = S.L.getPoint(0.5, 0.5, true); // Set centre based on new layout
				S.L.unzoom(); // Reset layout
			};
		},
		layerAccessories:function (t, e, b, w) {
			zoomOutTab.toFront();
			if (this.zoomed) zoomOutTab.show(t, e, b, w);
			else zoomOutTab.hide(t, e, b, w);
			tAxis.layer(); // Bring tAxis in front of swarms
		},
		// Disaggregrate (zoom in)
		zoomIn:function (A) {
			var S = this;
			if (!dc.findChildren({d:1, as:A}).length) return; // Can't zoom in to element with no children
			tooltipBox.hide();
			S.selected = {d:1, a:A[1]};
			S.zoomed = true;
			S.setOffset(); // Recalculate offset
			S.refresh("all", S.Y.spin.t, S.Y.spin.e, function () { // Spin!
				S.setCircle(); // Find boundary for all children recalculate circle
				S.refresh("all", S.Y.zoom.t, S.Y.zoom.e, function () { // Zoom!
					S.disaggregate(S.selected);
					S.layerAccessories(S.Y.merge.t, S.Y.merge.e, null, S.K);
					S.setRings();
					S.refresh("all", S.Y.merge.t, S.Y.merge.e); // Disaggregate!
				});
			});
		},
		// Aggregrate (zoom out)
		zoomOut:function () {
			var S = this,
				parent = dc.findParent(S.selected),
				children = dc.findChildren(S.selected);
			if (S.selected.a == ROOT) return; // Can't zoom out from root
			tooltipBox.hide();
			S.refresh({d:1, a:children, mode:{asParent:true}}, S.Y.merge.t, S.Y.merge.e, function () { // Aggregate!
				S.aggregate({d:1, a:children[0]}); // Remove children
				S.layerAccessories(S.Y.zoom.t, S.Y.zoom.e, null, S.K);
				S.selected = {d:1, a:parent};
				if (parent == ROOT) S.zoomed = false; // Reset zoomed flag if it's zoomed out to top
				S.setCircle();
				S.setRings();
				S.refresh("all", S.Y.zoom.t, S.Y.zoom.e, function () { // Zoom!
					S.setOffset();
					S.refresh("all", S.Y.spin.t, S.Y.spin.e); // Spin!
				});
			});
		},
		onInit:function () {
			this.setCircle();
			this.setRings();
		},
		updateData:function () {
			this.setOffset(); // .setOffset() is in .updateData() so that offset is recalculated during time animation
		},
		plan:{
			rings:{
				type:"zMultiDrone", mask:["mask", "na", "mask"],
				curr:function (S, D, mode) {
					var i, radius, out = [],
						selectedDeg = S.getDeg(dc.addSpaces(D.A, S.selected)),
						deg = (!S.zoomed) ? S.Y.baseRingsOffset - 90:
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
								circle:{
									centre:S.centre,
									radius:radius
								}
							}
						});
					};
					return out;
				}
			},
			title:{
				type:"zMultiDrone", mask:["mask", "na", "mask"],
				init:function (S, D, mode) {
					return {
						title:{type:"zTextBox", layout:{yAlign:"bottom"}},
						subtitle:{type:"zTextBox", layout:{yAlign:"top"}},
						mouseEvents:function (D) {
							D.hover(function () {
								sideSwarm.setSpace({d:1, a:S.selected.a});
								sideSwarm.refresh("all", sideSwarm.Y.select.t, sideSwarm.Y.select.e);
							});
							D.click(function () {S.zoomOut()});
						}
					};
				},
				curr:function (S, D, mode) {
					var A = dc.addSpaces(D.A, S.selected),
						category = dc.getName(S.selected),
						currTime = dc.getName(tAxis.selected),
						baseTime = dc.getName(tAxis.baseSelected),
						val = S.getDefault(A),
						layout = {x:(S.zoomed) ? S.L.left : S.L.centre.x, y:S.L.top - 24, xAlign:"xCentre"};
					return {
						title:{
							text:category + " (" + zt.format(val, {mode:"%", dp:1, forceSign:true}) + ")",
							layout:layout
						},
						subtitle:{
							text:"from " + baseTime + " to " + currTime,
							layout:layout
						}
					};
				}
			},
			slice:{
				type:"zArc", mask:"mask",
				curr:function (S, D, mode) {
					var parent = dc.findParent({d:1, as:D.A}),
						state = ( // Element is inactive if it is not a child of the selected element
							(D.A[1] == S.selected.a) ? "parent" :
							(parent == S.selected.a) ? "child" :
							"inactive"),
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
						fill:fill,
						stroke:fill,
						opacity:(state == "inactive") ? D.Y.faded.opacity : D.Y.opacity,
						mouseEvents:(state == "child") ? function (D) {
							D.hoverHighlight(100);
							D.tooltip(null, tooltipBox, {width:L.tooltipBox.width});
							D.hover(function () {
								sideSwarm.setSpace({d:1, a:D.A[1]});
								sideSwarm.refresh("all", sideSwarm.Y.select.t, sideSwarm.Y.select.e);
							});
							D.click(function () {S.zoomIn(D.A)});
						} : function (D) {
							D.click(function () {S.zoomOut()});
						},
						tooltipText:S.getTooltipText(D.A, D)
					};
				}
			}
		}
	});

	logger("DaliPie(): Drawing side bar graph.");
	var sideSwarm = new zSwarm({ // Resources
		layout:L.sideSwarm, style:Y.sideSwarm, axes:{t:tAxis},
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
		updateData:function () {
			var S = this, i, vals = [];
			dc.forSpaces({as:S.A}, function (x) {
				vals.push(S.getDefault(x.as));
			});
			dAxis.setShown([
				Math.min(za.min(vals) * 1.2, 0),
				Math.max(za.max(vals) * 1.2, 0)
			], (S.frame == null) ? null : S.Y.select.t, S.Y.select.e, null, S.K);
			S.layer("bars"); // Brings bars to front
			dAxis.toFront({d:0, a:0}); // Bring baseline to front
		},
		plan:{
			text:{
				type:"zHTML", mask:["mask", "mask", tAxis.selected.a],
				init:function (S, D, mode) {
					return {
						layout:{
							anchor:S.L.getPoint(0, 0, true),
							width:S.L.innerWidth
						}
					};
				},
				curr:function (S, D, mode) {
					with (swarm.calcAll(D.A)) return {content:
						"<div class='text title'>" + category + "</div><p>" +
						"<div class='text'>" + category + ((childrenCategory.length) ? " contains " + childrenCategory.length + " subcategories" : " is a subcategory of " + parentCategory) +
						" and was " + zt.format(baseWeight, {m:"%", dp:1}) + " of the " + baseTime + " CPI basket.<p>" +
						"Prices " + ((change < 0) ? "fell" : "rose") + " by " +
						zt.format(change, {m:"%", dp:1, noSign:1}) + " in the " + time + " quarter, " +
						"and were " + zt.format(baseChange, {m:"%", dp:1, noSign:1}) + ((baseChange < 0) ? " lower" : " higher") +
						" than they were in " + baseTime + ".</div>"
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
							D.tooltip(null, tooltipBox, {width:L.tooltipBox.width});
							D.click(function () {
								tooltipBox.hide();
								tAxis.axisSelect({a:D.A[2]}, tAxis.Y.select.t, tAxis.Y.select.e);
							});
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
						tooltipText:swarm.getTooltipText(D.A, D),
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
	logger("DaliPie(): Done.");
};