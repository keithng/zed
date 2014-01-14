DaliPie = function (rawData, style, layout) {
	logger("DaliPie(): Initialising.");
	// Layout
	var L = {base:zt.getMaxLayout(1200, 600, 50)}; // minWidth, minHeight, margin
	with (L.base) {
		L.tooltipBox = {
			width:280 // TooltipBox is floating, so position doesn't need to be defined, and height is automatic (depending on text)
		};
		L.swarm = new zLayout({
			anchor:getPoint(0.72, 0.92, true),
			width:innerHeight * 0.8, height:innerHeight * 0.8,
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
		L.sideSwarm = new zLayout({
			x:margin + 20, y:margin,
			width:460, height:height - 160
		});
		L.credits = {
			anchor:getPoint(1, 1, true),
			xAlign:"right", yAlign:"bottom"
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
			width:height - 260, height:width,
			xAlign:"right", yAlign:"top",
			rotation:90
		};
	};

	// Style
	var Y = {
		base:{
			lines:{
				"stroke-width":0.3,
				stroke:"#ccc"
			}
		},
		introText:{
			"z-index":9999, // To top
			"border":"solid 1px #c4dde2",
			"background-color":"#d4edf2",
			"font-family":"sans-serif",
			"font-size":"13px",
			"text-align":"center",
			opacity:0.9,
			margin:L.height * 0.35
		},
		iAxis:{},
		tAxis:{
			maxNotches:20,
			select:{t:300},
			notchLabel:{
				margin:7,
				"font-size":12,
				"font-weight":"bold",
				fill:"#aaa",
			},
			currNotch:{
				width:80
			},
			baseNotch:{
				width:60,
				margin:5,
				"font-size":12,
				"font-weight":"bold",
				highlighted:{background:{opacity:1}},
				background:{
					rounded:10,
					fill:"white",
					opacity:0.75
				}
			}
		},
		swarm:{
			baseOffset:0,
			zoomedOffset:225,
			minZoomDeg:35,
			spin:{t:600, e:"<>"},
			zoom:{t:600, e:"<>"},
			merge:{t:600, e:"<>"},
			rings:{
				label:{
					"font-weight":"bold",
					fill:"#888"
				},
				ring:{baseStyle:"base.lines"}
			},
			title:{
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
// 				stroke:null,
// 				"stroke-opacity":0,
				opacity:0.8,
				"stroke-width":0.2,
				"stroke-opacity":1,
				highlight:{
	 				"stroke-opacity":0,
					opacity:1
				},
				faded:{opacity:0.1}
			}
		},
		sideSwarm:{
			select:{t:400, e:"<>"},
			text:{},
			bar:{
				rounded:0, // Force rounded so complex rectangles are drawn
				parallelSize:1,
				"stroke-width":0.5
			}
		},
		fakeTAxis:{
			maxNotches:4,
			label:{
				margin:7,
				"font-size":12,
				fill:"#aaa"
			}
		},
		dAxis:{
			maxNotches:8,
			minNotchGap:0.01,
			axisTitle:{
				fill:"#ccc"
			},
			label:{
				format:{mode:"%"},
				fill:"#666",
				radialStart:-L.sideSwarm.innerWidth,
				radialEnd:2,
				branch:{
					baseStyle:"base.lines"
				},
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
		credits:{fill:"#ccc"},
		background:{fill:"#060606", opacity:0.1}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("DaliPie(): Collating and crunching data.");
	var RINGS = [0, 0.2, 0.4],
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
		for (var i = 0; i < getSize(2); i++) meta[2].name[i] += ""; // Force type to string
	};

	// Drawing
	logger("DaliPie(): Drawing accessories.");
	PAPER = zt.makePaper(L.base);
	var background = new zRectangle({layout:L.base, base:Y.background}),
		credits = new zTextBox({text:"Created by Keith Ng", layout:L.credits, base:Y.credits}),
// 		iAxis = new zScrollAxis({
// 			layout:L.iAxis, style:Y.iAxis,
// 			dc:dc, d:0,
// 			selected:{a:dc.getSize(2) - 1},
// 			plan:{axisTitle:null}
// 		}),
		tAxis = new zSlideAxis({
			layout:L.tAxis, style:Y.tAxis,
			dc:dc, d:2,
			baseSelected:{a:0},
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
			scale:[0, 0.5], title:"Quarterly Change",
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
		layout:L.swarm, style:Y.swarm,
		dc:dc, axes:{t:tAxis},
		selected:{d:1, a:ROOT},
		aSpace:[0, dc.meta[1].tree[1], tAxis.selected.r],
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
		setCircle:function () {
			var S = this, vals = [],
				children = dc.findChildren(S.selected);
			// Get maxVal
			dc.forSpaces([0, children, "all"], function (x) { // Targeted category and all its children
				vals.push(S.getDefault(x.as));
			});
			S.maxVal = za.max(vals);

			console.log(S.maxVal);
			// Reset radius and centre
			S.radius = S.L.height * 0.5; // Set radius based on new layout
			S.centre = S.L.getPoint(0.5, 0.5, true); // Set centre based on new layout
			if (S.zoomed) {
				// Use original radius and centre to calculate arcPoints and zoom in
				var points = [];
				dc.forSpaces([0, children, "all"], function (x) { // Targeted category and all its children
					var deg = S.getDeg(x.as),
						val = S.getDefault(x.as),
						arcPoints = zp.arcToPoints(S.centre, S.getRadius(0.2), S.getRadius(val), deg.start, deg.end); // Calculate its edge point
					points = points.concat(arcPoints);
				});
				S.L.zoom(zp.pointsToBox(points)); // Turn points into a box - and zoom into it
				// Calculate new radius and centre
				S.radius = S.L.height * 0.5; // Set radius based on new layout
				S.centre = S.L.getPoint(0.5, 0.5, true); // Set centre based on new layout

				S.L.unzoom(); // Reset layout
			};
		},
		// Disaggregrate (zoom in)
		zoomIn:function (A) {
			var S = this;
			if (!dc.findChildren({d:1, as:A}).length) return; // Can't zoom in to element with no children
			tooltipBox.hide();
			S.selected = {d:1, a:A[1]};
			S.zoomed = true;
			S.setOffset();
			S.refresh("all", S.Y.spin.t, S.Y.spin.e, function () { // Spin to new offset (angle of spin will be calculated by updateData once CATEGORY is updated)
				S.setCircle();
				S.refresh("all", S.Y.zoom.t, S.Y.zoom.e, function () { // Find boundary for all children and zoom in
					S.disaggregate(S.selected);
					zoomOutTab.toFront();
					tAxis.layer(); // Bring tAxis in front of swarms
					zoomOutTab.show(S.Y.merge.t, S.Y.merge.e, null, S.K);
					S.refresh("all", S.Y.merge.t, S.Y.merge.e);
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
			S.refresh({d:1, a:children, mode:{asParent:true}}, S.Y.merge.t, S.Y.merge.e, function () { // Merge children back into parent
				S.aggregate({d:1, a:children[0]}); // Remove children
				zoomOutTab.toFront();
				tAxis.layer(); // Bring tAxis in front of swarms
				S.selected = {d:1, a:parent};
				if (parent == ROOT) S.zoomed = false; // Reset zoomed flag if it's zoomed out to top
				S.setOffset();
				S.setCircle();
				if (!S.zoomed) zoomOutTab.hide(S.Y.zoom.t, S.Y.zoom.e, null, S.K);
				S.refresh("all", S.Y.zoom.t, S.Y.zoom.e); // Zoom out and spin back into position
			});
		},
		onInit:function () {this.setCircle()},
		updateData:function () {this.setOffset()},
		plan:{
			rings:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, A, D) {
					var i, out = [];
					for (i = 0; i < RINGS.length; i++) {
						out.push({
							type:"zMultiDrone",
							label:{
								type:"zTextBox",
								text:zt.format(RINGS[i], "%"),
								layout:{xAlign:"right", yAlign:"bottom"}
							},
							ring:{type:"zCircle"}
						})
					};
					return out;
				},
				curr:function (S, A, D) {
					var i, radius, out = [];
					for (i = 0; i < RINGS.length; i++) {
						radius = S.getRadius(RINGS[i]);
						out.push({
							label:{layout:zp.addVector(225, radius, S.centre)},
							ring:{circle:{centre:S.centre, radius:radius}}
						});
					};
					return out;
				}
			},
			title:{
				type:"zMultiDrone", mask:["mask", "na", "mask"],
				init:function (S, A, D) {
					return {
						title:{type:"zTextBox", layout:{yAlign:"bottom"}},
						subtitle:{type:"zTextBox", layout:{yAlign:"top"}}
					};
				},
				curr:function (S, A, D) {
					var A = dc.addSpaces(A, S.selected),
						category = dc.getName(S.selected),
						currTime = dc.getName(tAxis.selected),
						baseTime = dc.getName(tAxis.baseSelected),
						val = S.getDefault(A),
						layout = {x:(S.zoomed) ? S.L.left : S.L.centre.x, y:S.L.top, xAlign:"xCentre"};
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
				curr:function (S, A, D, Y, mode) {
					var parent = dc.findParent({d:1, as:A}),
						state = ( // Element is inactive if it is not a child of the selected element
							(A[1] == S.selected.a) ? "parent" :
							(parent == S.selected.a) ? "child" :
							"inactive"),
						deg = S.getDeg(A),
						val = S.getDefault(A);
					if (mode.asParent) { // If it's being inserted or removed, use parent's value
						A = dc.addSpaces(A, {d:1, a:parent});
						val = S.getDefault(A);
					};
					return {
						arc:{
							minSeg:4, centre:S.centre,
							innerRadius:0, outerRadius:S.getRadius(val),
							degStart:deg.start, degEnd:deg.end
						},
						fill:dc.getMeta("colour", {d:1, as:A}),
						opacity:(state == "inactive") ? Y.faded.opacity : Y.opacity,
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
						tooltipText:S.getTooltipText(A, D)
					};
				}
			}
		}
	});

	logger("DaliPie(): Drawing side bar graph.");
	var sideSwarm = new zSwarm({ // Resources
		layout:L.sideSwarm, style:Y.sideSwarm,
		dc:dc,
		aSpace:[0, ROOT, "all"],
		axes:{t:tAxis},
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
			dc.forSpaces({as:S.aSpace}, function (x) {
				vals.push(S.getDefault(x.as));
			});
			dAxis.setShown([
				Math.min(za.min(vals) * 1.2, 0),
				Math.max(za.max(vals) * 1.2, 0)
			], (S.frame == null) ? null : S.Y.select.t, S.Y.select.e, null, S.K);
		},
		plan:{
			text:{
				type:"zHTML", mask:["mask", "mask", tAxis.selected.a],
				init:function (S, A, D, Y) {
					return {
						layout:{
							anchor:S.L.getPoint(0, 0, true),
							width:S.L.innerWidth
						}
					};
				},
				curr:function (S, A, D, Y) {
					with (swarm.calcAll(A)) return {content:
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
				init:function (S, A, D, Y) {
					return {
						layout:{
							x:fakeTAxis.getPoint({d:2, as:A}).x,
							width:fakeTAxis.getLength(Y.parallelSize),
							xAlign:"xCentre", yAlign:"bottom"
						},
						mouseEvents:function (D) {
							D.tooltip(null, tooltipBox, {width:L.tooltipBox.width});
							D.click(function () {
								tooltipBox.hide();
								tAxis.axisSelect({a:A[2]}, tAxis.Y.select.t, tAxis.Y.select.e);
							});
						}
					};
				},
				curr:function (S, A, D, Y) {
					var val = S.getDefault(A);
					return {
						tooltipText:swarm.getTooltipText(A, D),
						layout:{
							y:dAxis.getPoint(0).y,
							height:dAxis.getLength(val)
						},
						fill:dc.getMeta("colour", {d:1, as:A}),
						opacity:(A[2] == tAxis.selected.a) ? 1 : 0.5
					};
				}
			}
		}
	});
	logger("DaliPie(): Done.");
};