var SWARM;
HealthDash = function (rawData, style, layout) {
	logger("HealthDash(): Initialising.");
	// Layout
	var L = zt.getMaxLayout(800, 680, 0);
	with (L) {
		var yGap = 28; // Vertical gap
		var xGap = 180;
		L.tooltipBox = {};
		L.leftBox = new zLayout({
			x:0, y:0,
			width:280, height:L.height,
			margin:28
		});
		L.topBox = new zLayout({
			x:L.leftBox.right, y:0,
			width:width - L.leftBox.width, height:height * 0.5,
			margin:48
		});
		L.bottomBox = new zLayout({
			x:L.topBox.left, y:L.topBox.bottom,
			width:L.topBox.width, height:height - L.topBox.height,
			margin:L.topBox.margin
		});
		with (L.leftBox) {
			L.list = new zLayout({
				x:getX(0, true), y:getY(0, true) + 88,
				width:innerWidth
			});
		};
		with (L.topBox) {
			L.profile = new zLayout({
				x:getX(0, true) + xGap, y:getY(0, true) + yGap,
				width:innerWidth - xGap, height:innerHeight - yGap
			});
		};
		with (L.bottomBox) {
			L.tAxis = new zLayout({
				x:L.profile.left, y:getY(1, true),
				width:L.profile.width, height:10
			});
			L.dAxis = new zLayout({
				anchor:L.tAxis.anchor,
				xAlign:"right", yAlign:"top",
				width:innerHeight, rotation:90
			});
		};
	};
	L = zo.extend(L, layout); // Overwrite layout with user-defined layout

	// Style
	var Y = {
		// Object styles
		base:{
			text:{
				normal:{
					color:"#333",
					"font-weight":"normal"
				},
				select:{
					color:"#333",
					"font-weight":"bold"
				},
				highlight:{
					color:"#000",
					"font-weight":"normal"
				},
				fade:{
					color:"#bbb",
					"font-weight":"normal"
				}
			}
		},
		format:{
			count:{m:"none", dp:0},
			DeprivQ5:{m:"%", dp:1},
			DeprivRatio:{m:"none", dp:2},
			age:{m:"none", dp:2},
			"1stTrimesterReg":{m:"%", dp:1}
		},
		decFormat:{m:"%", dp:1},
		tooltipBox:{},
		dAxis:{
			maxNotches:6,
			label:{
				branch:{opacity:0.1},
				margin:20,
				radialStart:-L.tAxis.innerWidth,
				radialEnd:0,
				fill:"#76B7AB"
			}
		},
		tAxis:{
			extension:0,
			slideBar:{
				fill:"#76B7AB",
				rounded:0
			},
			currNotch:{
				flagHeight:12, flagWidth:8,
				height:30, width:60,
				xAlign:"xCentre", yAlign:"top",
				ring:{
					stroke:"#76B7AB",
					"stroke-width":2,
					fill:"#dedede"
				},
				label:{fill:"#76B7AB"},
				background:{
					fill:"#FFF",
					opacity:0.9,
					"stroke-opacity":0.2
				},
				highlight:{opacity:1}
			},
			label:{
				branch:{stroke:"#56978B"},
				fill:"#76B7AB",
				"font-weight":"normal"
			}
		},
		list:{
			highlight:{t:300, e:"<>", delay:50, resetDelay:200},
			rowHeight:24,
			background:{
				fill:"#FFF",
				"stroke-width":0,
				"stroke-opacity":0
			},
			title:{},
			dividers:{
				"stroke-width":0.8,
				stroke:"#ccc"
			},
			items:{base:"base.text"}
		},
		profile:{
			gap:0.015,
			highlight:{t:0, e:"<>", delay:0, resetDelay:200},
			background:{
				arrowHeight:30,
				arrowWidth:20,
				fill:"#D5EFEA",
				opacity:0.5,
				"stroke-width":0
			},
			title:{margin:6},
			xLabels:{base:"base.text"},
			yLabels:{base:"base.text"},
			blocks:{
				"stroke-opacity":0.4,
				normal:{
					opacity:0.8,
					"stroke-width":0
				},
				select:{
					opacity:1,
					"stroke-width":2
				},
				highlight:{
					opacity:1,
					"stroke-width":0
				},
				fade:{
					opacity:0.3,
					"stroke-width":0
				}
			},
			lines:{
				normal:{
					opacity:0.8,
					"stroke-width":1.5
				},
				select:{
					opacity:1,
					"stroke-width":2
				},
				highlight:{
					opacity:1,
					"stroke-width":2
				},
				fade:{
					opacity:0.12,
					"stroke-width":1
				}
			},
			guideline:{
				stroke:"#666",
				"stroke-dasharray":"- ",
				opacity:0.4
			},
			gladwrap:{
				snap:12 // Will select the closest line if it's within this range
			}
		}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	var TITLES = ["Year", "Ethnicity", "Facility Type", "Registration Trimester", "DHBs", "Deprivation"];
	var COLOURS = [
		null,
		["#253494", "#2c7fb8", "#41b6c4", "#a1dab4", "#e0ff98", "#c994c7"], // Ethnicity
		["#253494", "#2c7fb8", "#41b6c4", "#a1dab4", "#e0ff98", "#c994c7"], // Facility type
		["#253494", "#2c7fb8", "#41b6c4", "#a1dab4", "#e0ff98", "#c994c7"], // Registration trimester
		null,
		["#253494", "#2c7fb8", "#41b6c4", "#a1dab4", "#e0ff98", "#c994c7"] // Deprivation Deciles: 1, 2, 3, 4, 5, Unknown
	];
	var PROFILE_MODES = [1, 2, 3, 5]; // Dimensions which are valid for profiles
	var MEASURE_MODES = {
		"count":{
			label:"Count",
			format:{m:"none", dp:0}
		},
		"1stTrimesterReg":{
			label:"% registered in first trimester",
			format:{m:"%", dp:1}
		},
		"DeprivQ5":{
			label:"% in deprivation quintile 5",
			format:{m:"%", dp:1}
		},
		"DeprivRatio":{
			label:"Deprivation quintile 5:1 ratio",
			format:{m:"none", dp:2}
		},
		"parity":{
			label:"Mean parity",
			format:{m:"none", dp:2}
		},
		"age":{
			label:"Mean age",
			format:{m:"none", dp:2}
		}
	};
	var INIT_YEAR = 1, PROFILE_PRI = 1, PROFILE_SEC = 5, MEASURE = "1stTrimesterReg";

	// Data
	logger("HealthDash(): Collating and crunching data.");
	var rawdc = new zDataCube(8, rawData),
		dc = new zDataCube(4);

	dc.updateData = function () {
		// Set mask
		var i, p, d, targPos, root, aPos, names,
			mask = za.fill("all", rawdc.meta.length),
			dMap = [0, za.find(TITLES, "DHBs"), PROFILE_PRI, PROFILE_SEC]; // Year, DHB, primary profile dimension, secondary profile dimension
		for (i = 0; i < dMap.length; i++) mask[dMap[i]] = "mask";
		// Reset/update meta
		dc.meta = zo.clone(za.map(rawdc.meta, dMap)); // Get meta from rawdc
		dc.setShown();
		dc.addDataType("count");
		dc.addDataType("priDec");
		dc.addDataType("secDec");
		dc.addDataType("priStacked");
		dc.addDataType("secStacked");
		dc.addDataType(MEASURE);
		// For each cell in dc, calculate count from rawdc
		rawdc.forSpaces({as:"all", mask:mask}, function (x) {
			var destX = {as:za.map(x.as, dMap)}, // Convert x (mapped to rawdc) to destX (mapped to dc)
				count = rawdc.calcData("sum", "val", x); // Headcount for this cell
			dc.setData("count", destX, count); // Headcount for this cell
		});
		// Set up parameters for secondary measures
		if (MEASURE == "DeprivQ5") {
			d = za.find(TITLES, "Deprivation");
			targPos = rawdc.findMeta("name", {d:d}, "5");
		} else if (MEASURE == "DeprivRatio") {
			d = za.find(TITLES, "Deprivation");
			targPos = [
				rawdc.findMeta("name", {d:d}, "5"),
				rawdc.findMeta("name", {d:d}, "1")
			];
		} else if (MEASURE == "1stTrimesterReg") {
			d = za.find(TITLES, "Registration Trimester");
			targPos = rawdc.findMeta("name", {d:d}, "1");
		};
		// For each cell in dc, calculate secondary measure from rawdc
		if (MEASURE != "count") rawdc.forSpaces({as:"all", mask:mask}, function (x) {
			var i, out, matches,
				destX = {as:za.map(x.as, dMap)}, // Convert x (mapped to rawdc) to destX (mapped to dc)
				count = dc.getData("count", destX); // Headcount for this cell
			// Empty cell
			if (count == 0) {
				out = 0;
			// Special case: Deprivation quintile 1:5 ratio
			} else if (MEASURE == "DeprivRatio") {
				if (x.as[d] == "all") {
					x.as[d] = targPos[0];
					matches = [rawdc.calcData("sum", "val", x)]; // Number of quintile 5 in this cell
					x.as[d] = targPos[1];
					matches[1] = rawdc.calcData("sum", "val", x); // Number of quintile 1 in this cell
					out = (!matches[0]) ? 0 : (!matches[1]) ? 1 : matches[0] / matches[1]; // Calculate ratio
				} else {
					out = 0; // Deprivation quintile 1:5 ratio not possible when iterating by deprivation quintiles
				};
			// Generic: Age or Parity
			} else if (MEASURE == "age" || MEASURE == "parity") {
				out = rawdc.calcData("sum", MEASURE, x) / count; // Average age or parity
			// Generic: Matching % for this cell (e.g. % of cell where trimester of registration == "1")
			} else if (MEASURE == "1stTrimesterReg" || MEASURE == "DeprivQ5") {
				if (x.as[d] == "all") {
					x.as[d] = targPos;
					matches = rawdc.calcData("sum", "val", x); // Number of matches in this cell
					out = matches / count; // Matching % for this cell
				} else {
					out = (x.as[d] == targPos) ? 1 : 0;
				};
			};
			dc.setData(MEASURE, destX, out);
		});
		// Generate root nodes and summary values (don't do for year)
		for (d = 1; d < 4; d++) { // For each dimension
			root = dc.getSize(d);
			dc.addRootNode(d, "All " + dc.meta[d].title); // Add a root node
			dc.forSpaces({as:"all", mask:{d:d, a:dc.meta[d].tree[1]}}, function (x) { // Iterate through all the other dimensions
				var i, out = 0, measure, count,
					sum = dc.calcData("sum", "count", x),
					destX = {as:dc.addSpaces(x.as, {d:d, a:root})}; // Convert x (refers to .tree[1]) to destX (refers to root node)
				dc.setData("count", destX, sum);
				// Take AVERAGE of secondary measure
				if (MEASURE == "count") return; // Don't do count
				for (i = 0; i < dc.getSize(d) - 1; i++) { // Iterate through active dimension (i.e. Each cell)
					x.as[d] = i;
					measure = dc.getData(MEASURE, x);
					count = dc.getData("count", x);
					out += (measure * count) || 0;
				};
				dc.setData(MEASURE, destX, (out / sum) || 0);
			});
		};
		// Order profile dimensions (d:[2,3])
		for (d = 2; d < 4; d++) {
			aPos = dc.meta[d].tree[1];
			names = dc.getName({d:d, a:aPos}); // Grab names for the current profile dimension (exclude root node)
			dc.meta[d].tree[1] = za.unmap(za.rank(names), aPos); // Rank names then map them back to aPos
		}
	};
	dc.getTitle = function (d) {return dc.meta[d].title};

	with (rawdc) {
		var i, options;
		for (i = 0; i < meta.length; i++) {
			meta[i].title = TITLES[i];
			if (COLOURS[i]) meta[i].colour = COLOURS[i];
		};
		// Set up profile options
		for (options = "", i = 0; i < PROFILE_MODES.length; i++) {
			options +=
				"<option value='" + PROFILE_MODES[i] + "'>" +
				getMeta("title", {d:PROFILE_MODES[i]}) + "</option>"
		};
		$("#profilePri, #profileSec").html(options).change(function (a) {
			var t = 200, e = "<>";
			PROFILE_PRI = $("#profilePri")[0].value * 1;
			PROFILE_SEC = $("#profileSec")[0].value * 1;
			dc.updateData();
			profile.A = [tAxis.selected.a, dc.getSize(1) - 1, dc.meta[2].tree[1], dc.meta[3].tree[1]];
			list.onInit();
			profile.onInit();
			profile.updateData();
			profile.remove("lines", t, e);
			profile.remove("yLabels", t, e);
			profile.remove("xLabels", t, e);
			profile.remove("title", t, e);
			profile.remove("blocks", t, e, function () {
				profile.add("lines", t, e);
				profile.add("blocks", t, e);
				profile.add("yLabels", t, e);
				profile.add("xLabels", t, e);
				profile.add("title", t, e);
				list.refresh("all", t, e, null, profile.K);
			});
		});
		// Set up measures
		options = "";
		for (p in MEASURE_MODES) {
			options += "<option value='" + p + "'>" + MEASURE_MODES[p].label + "</option>"
		};
		$("#measure").html(options).change(function (a) {
			var t = null, e = "<>";
			MEASURE = $("#measure")[0].value;
			dc.updateData();
			list.filter(null, t, e);
			profile.filter(null, t, e, null, list.K);
		});
		// Initialise defaults
		$("#profilePri")[0].value = PROFILE_PRI + "";
		$("#profileSec")[0].value = PROFILE_SEC + "";
		$("#measure")[0].value = MEASURE;
		dc.updateData();
	};

	// Drawing
	logger("HealthDash(): Drawing accessorires.");
	PAPER = zt.makePaper(L);
	var baseMouseEvents = function (D) {
			var A = (D.A == "fixed") ? null : D.A;
			D.hover(function () {D.parent.highlight(A)}, function () {D.parent.highlight()});
			D.click(function () {D.parent.select(A)});
		},
		// Check whether A is captured by base A
		match = function (A, baseA, d) {
			var i;
			if (!baseA) return false;
			d = za.asArray(d);
			for (i = 0; i < d.length; i++) {
				if (baseA[d[i]] != A[d[i]] && !(baseA[d[i]] instanceof Array)) return false;
			};
			return true;
		};

	var G = new zGuide(),
		tooltipBox = new zHTMLTooltipBox({layout:L.tooltipBox, base:Y.tooltipBox}),
		tAxis = new zSlideAxis({
			layout:L.tAxis, style:Y.tAxis,
			dc:dc, d:0, baseLayer:7,
			selected:{d:0, a:INIT_YEAR},
			plan:{playButton:null, baseNotch:null, axisTitle:null}
		}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			range:[0, 1000], baseLayer:7,
			plan:{axisLine:null, axisTitle:null}
		});

	logger("HealthDash(): Drawing main swarms.");
	var list = new zSwarm({
		layout:L.leftBox, style:Y.list,
		dc:dc, A:[INIT_YEAR, "all", "na", "na"],
 		axes:{t:tAxis},
		highlighted:null,
		getVal:function (A, mode) {
			return dc.getData(mode || MEASURE, {as:A});
		},
		getState:function (A) {
			var S = this;
			return (
				(!S.highlighted) ? "normal" : // Normal
				(match(A, S.selected, 1)) ? "select" : // Selected
				(match(A, S.highlighted, 1)) ? "highlight" : // Highlighted
				"fade" // Not highlighted
			);
		},
		onInit:function (A) {
			var S = this;
			S.A[2] = (!A || A[2] instanceof Array) ? dc.getSize(2) - 1 : A[2]; // Primary
			S.A[3] = (!A || A[3] instanceof Array) ? dc.getSize(3) - 1 : A[3]; // Secondary
		},
		updateData:function () {
			var S = this, list = [];
			// Rank DHBs by whatever measure is in use
			dc.forSpaces({as:S.A, mask:["mask", "mask", S.A[2], S.A[3]]}, function (x) { // Current year, all DHBs
				list.push({idx:x.as[1], val:S.getVal(x.as)});
			});
			list = za.sortObjects(list, "val", true);
			for (i = 0; i < list.length; i++) {
				dc.setMeta("rank", {d:1, a:list[i].idx}, i);
			};
		},
		filter:function (A, t, e, b, w) {
			var S = this;
			S.onInit(A);
			S.refresh("all", t, e, b, w);
			profile.refresh("background", t, e, b, w);
		},
		select:function (A, t, e, b, w) {
			var S = this;
			if (t == null) t = S.Y.highlight.t, e = S.Y.highlight.e;
			if (S.selected == A) A = null; // Deselect if already selected
			S.selected = A;
			S.highlighted = A;
			S.baseHighlight(A, t, e, b, w);
		},
		highlight:function (A, t, e, b, w) {
			var S = this, delay;
			if (!w) {
				if (S.selected) return; // Currently selected
				if (A == S.highlighted) return; // Already highlighted, abort
				t = S.Y.highlight.t, e = S.Y.highlight.e;
				delay = (A) ? S.Y.highlight.delay : S.Y.highlight.resetDelay;
			};
			S.targ = A;
			G.forget(); // Cancel previously queued actions
			G.delay(delay, function () {
				S.highlighted = A;
				S.baseHighlight(A, t, e, b, w);
			});
		},
		baseHighlight:function (A, t, e, b, w) {
			var S = this;
			S.refresh({role:"items", mode:{keepMouseEvents:true}}, t, e, b, w);
			if (!w) profile.filter(A, t, e, null, S.K); // Do others, but only if this is the original
		},
		plan:{
			background:{
				type:"zRectangle", mask:"fixed",
				init:function (S, D, mode) {
					return {layout:S.L, mouseEvents:baseMouseEvents};
				}
			},
			title:{
				type:"zHTML", mask:"fixed",
				init:function (S, D, mode) {
					return {layout:L.leftBox.getPoint(0, 0, true)};
				},
				curr:function (S, D, mode) {
					return {
						content:
							"<div class=title>" +
								zt.titleCase(MEASURE_MODES[MEASURE].label) +
							"</div><div class=subtitle>" +
								dc.getTitle(2) + " - " + dc.getName({d:2, as:S.A}) + "<br>" +
								dc.getTitle(3) + " - " + dc.getName({d:3, as:S.A}) + "<br>" +
								dc.getTitle(0) + " - " + dc.getName({d:0, as:S.A}) +
							"</div>"
					};
				}
			},
			dividers:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, D, mode) {
					var i, yPos, out = [];
					for (i = 0; i <= dc.getSize(1); i++) {
						yPos = L.list.top + i * S.Y.rowHeight;
						out[i] = {
							type:"zLine",
							points:[{x:L.list.left, y:yPos}, {x:L.list.right, y:yPos}]
						};
						if (i == 0 || i == dc.getSize(1)) { // First and last bar
							out[i].stroke = "#000";
							out[i]["stroke-width"] = 2;
						};
					};
					return out;
				}
			},
			items:{
				type:"zHTML", mask:["mask", "mask", "na", "na"], // Dimensions 2 & 3 are controlled at the swarm level,
				init:function (S, D, mode) {
					return {
						layout:{x:L.list.left, yAlign:"yCentre"},
						mouseEvents:baseMouseEvents
					};
				},
				curr:function (S, D, mode) {
					var rank = dc.getMeta("rank", {d:1, as:D.A}),
						yPos = L.list.top + (rank + 0.5) * S.Y.rowHeight,
						measure = S.getVal([D.A[0], D.A[1], S.A[2], S.A[3]], MEASURE),
						count = S.getVal([D.A[0], D.A[1], S.A[2], S.A[3]], "count");
					return zo.extend({
						content:
							"<table class='list" + ((D.A[1] == dc.getSize(1) - 1) ? " allDHB" : "") + "'><tbody><tr>" +
							"<td class=dhbname>" + dc.getName({d:1, as:D.A}) + "</td>" +
							"<td class=measure>" + zt.format(measure, MEASURE_MODES[MEASURE].format) + "</td>" +
							"<td class=count>" + zt.format(count, Y.format.count) + "</td>" +
							"</tr></tbody></table>",
						layout:{y:yPos}
					}, D.Y[S.getState(D.A)]);
				}
			}
		}
	});

	var profile = new zSwarm({
		layout:L.topBox, style:Y.profile,
		dc:dc, A:[INIT_YEAR, dc.getSize(1) - 1, dc.meta[2].tree[1], dc.meta[3].tree[1]],
 		axes:{t:tAxis, d:dAxis},
		highlighted:null,
		getVal:function (A, mode) {
			return dc.getData(mode || MEASURE, {as:A});
		},
		getStacked:function (A, mode, d) {
			A = A.slice();
			if (typeof d == "number") A[d] = dc.getSize(d) - 1;
			return dc.getData(mode + "Stacked", {as:A});
		},
		getDec:function (A, mode) {
			A = A.slice();
			var S = this, curr,
				d = (mode == "pri") ? [2, 3] : [3, 2],
				summed = S.getStacked(A, mode, d[1]); // Row as proportion of sum column
			// Set % value based on what is selected
			if (!S.highlighted || !S.highlighted.length) { // Nothing is highlighted..
				return summed.end - summed.start; // ..row as proportion of sum column
			} else if (S.highlighted[d[0]] instanceof Array) { // Column is highlighted..
				A[d[1]] = S.highlighted[d[1]];
				curr = S.getStacked(A, mode);
				return curr.end - curr.start; // ..cell as proportion of highlighted column
			} else if (S.highlighted[d[0]] == A[d[0]]) { // Single cell or whole row highlighted, so always 100%
				return 1;
			};
		},
		getState:function (A, d) {
			var S = this;
			if (d == null) d = [2,3];
			return (
				(!S.highlighted) ? "normal" : // Normal
				(match(A, S.selected, d)) ? "select" : // Selected
				(match(A, S.highlighted, d)) ? "highlight" : // Highlighted
				"fade" // Not highlighted
			);
		},
		getPoint:function (A) {
			var S = this, val = S.getVal(A) || 0;
			return {x:S.axes.t.getX({a:A[0]}), y:S.axes.d.getY(val)};
		},
		onInit:function (A) {
			var S = this, x, max = 0.01;
			S.plan.lines.mask = ["all", "na", "mask", "mask"];
			S.setSpace({d:1, a:(!A) ? dc.getSize(1) - 1 : A[1]});
			x = {as:["all", S.A[1], S.A[2], S.A[3]]};
			// Find maximum
			dc.forSpaces(x, function (x) { // Each year and each DHB EXCLUDING all
				max = Math.max(max, S.getVal(x.as));
			});
			S.axes.d.Y.label.format = MEASURE_MODES[MEASURE].format;
			S.axes.d.setShown([0, max * 1.2]); // Set maximum
		},
		// Generates the stacked values required for the mosaic plot
		updateData:function () {
			var S = this,
				stack = function (x, prefix) {
					dc.forSpaces(x, function (x) {
						var dec, stacked = 0, sum = dc.calcData("sum", "count", x); // Get sum of this row/column
						dc.forSpaces(x, function (x) { // For each cell within this row/column
							dec = (dc.getData("count", x) / sum) || 0;
							dc.setData(prefix + "Dec", x, dec);
							dc.setData(prefix + "Stacked", x, {start:stacked, end:stacked += dec});
						});
					});
				};
			if (dc.getData("priStacked", {as:[S.A[0], S.A[1], 0, 0]})) return; // Already stacked - don't do again
			stack({as:[S.A[0], S.A[1], "na", "all"], mask:{d:2, a:S.A[2]}}, "pri"); // For every column (including total), stack primary dimension
			stack({as:[S.A[0], S.A[1], "all", "na"], mask:{d:3, a:S.A[3]}}, "sec"); // For every row (including total), stack secondary dimension
		},
		filter:list.filter,
		select:list.select,
		highlight:list.highlight,
		baseHighlight:function (A, t, e, b, w) {
			var S = this;
			S.refresh({as:"all", mode:{keepMouseEvents:true}}, t, e, b, w);
			S.layer();
			tAxis.layer();
			if (!w) list.filter(A, t, e, null, S.K); // Do others, but only if this is the original
		},
		plan:{
			background:{
				type:"zShape", mask:"fixed",
				init:function (S, D, mode) {return {mouseEvents:baseMouseEvents}},
				curr:function (S, D, mode) {
					var rank = dc.getMeta("rank", {d:1, as:S.A}),
						yPos = L.list.top + (rank + 0.5) * list.Y.rowHeight;
					return {
						points:[
							{x:S.L.left, y:L.top}, {x:S.L.right, y:L.top},
							{x:S.L.right, y:L.bottom}, {x:S.L.left, y:L.bottom},
							{x:S.L.left, y:yPos - D.Y.arrowHeight / 2},
							{x:S.L.left - D.Y.arrowWidth, y:yPos},
							{x:S.L.left, y:yPos + D.Y.arrowHeight / 2}
						]
					};
				}
			},
			profileTitle:{
				type:"zHTML", mask:"fixed",
				init:function (S, D, mode) {
					return {layout:{x:L.profile.left, y:L.topBox.top + 24}};
				},
				curr:function (S, D, mode) {
					return {
						content:
							"<div class=title>Proportion of total births" +
							"</div><div class=subtitle>" +
								dc.getName({d:1, as:S.A}) + ", " +
								"by " + dc.getTitle(2) + " and " + dc.getTitle(3) + ", " +
								dc.getName({d:0, as:S.A}) +
							"</div>"
					};
				}
			},
			trendsTitle:{
				type:"zHTML", mask:"fixed",
				init:function (S, D, mode) {
					return {layout:{x:L.dAxis.left, y:L.dAxis.top}};
				},
				curr:function (S, D, mode) {
					return {
						content:
							"<div class=title>" +
								zt.titleCase(MEASURE_MODES[MEASURE].label) +
							"</div><div class=subtitle>" +
								dc.getName({d:1, as:S.A}) + ", " +
								"by " + dc.getTitle(2) + " and " + dc.getTitle(3) + ", " +
								dc.getName({d:0, a:0}) + "-" + dc.getName({d:0, a:dc.getSize(0) - 1}) +
							"</div>"
					};
				}
			},
			yLabels:{
				type:"zHTML", mask:["mask", "mask", "mask", dc.meta[3].tree[1]],
				init:function (S, D, mode) {
					return {
						layout:{x:S.L.left + S.L.margin, yAlign:"yCentre"},
						mouseEvents:baseMouseEvents
					};
				},
				curr:function (S, D, mode) {
					var dec = S.getDec(D.A, "pri"),
						summed = S.getStacked(D.A, "pri", 3), // Row as proportion of sum column
						mod = 1 - (dc.meta[2].tree[1].length - 1) * S.Y.gap,
						offset = za.find(dc.meta[2].tree[1], D.A[2]) * S.Y.gap;
					return zo.extend({
						content:
							(summed.end == summed.start) ? "" :
							"<table class=yLabels><tbody><tr>" +
							"<td class=name>" + dc.getName({d:2, as:D.A}) + "</td>" +
							"<td class=val>" + zt.format(dec || 0, Y.decFormat) + "</td>" +
							"</tr></tbody></table>",
						layout:{
							y:L.profile.getY(zo.mid(summed.start, summed.end) * mod + offset)
						}
					}, D.Y[S.getState(D.A, 2)]);
				}
			},
			xLabels:{
				type:"zHTML", mask:["mask", "mask", dc.meta[2].tree[1], "mask"],
				init:function (S, D, mode) {
					return {
						layout:{y:L.profile.bottom + 12},
						mouseEvents:baseMouseEvents
					};
				},
				curr:function (S, D, mode) {
					var dec = S.getDec(D.A, "sec"),
						summed = S.getStacked(D.A, "sec", 2); // Row as proportion of sum column
					return zo.extend({
						content:
							(summed.end == summed.start) ? "" :
							"<table class=xLabels><tbody>" +
							"<tr><td class=val>" + zt.format(dec || 0, Y.decFormat) + "</td></tr>" +
							"<tr><td class=name>" + dc.getName({d:3, as:D.A}) + "</td></tr>" +
							"</tbody></table>",
// 						layout:{x:L.profile.getX(zo.mid(summed.start, summed.end)) - 40}
						layout:{x:L.profile.getX(za.find(S.A[3], D.A[3]) / (dc.getSize(3) - 1))}
					}, D.Y[S.getState(D.A, 3)]);
				}
			},
			blocks:{
				type:"zRectangle", mask:"mask",
				init:function (S, D, mode) {
					return {
						fill:dc.getMeta("colour", {d:3, as:D.A}),
						mouseEvents:baseMouseEvents
					};
				},
				curr:function (S, D, mode) {
					var pri = S.getStacked(D.A, "pri", 3),
						sec = S.getStacked(D.A, "sec"),
						mod = 1 - (dc.meta[2].tree[1].length - 1) * S.Y.gap,
						offset = za.find(dc.meta[2].tree[1], D.A[2]) * S.Y.gap;
					return zo.extend({
						layout:{
							x:L.profile.getX(sec.start),
							y:L.profile.getY(pri.start * mod + offset),
							width:(sec.end - sec.start) * L.profile.width,
							height:(pri.end - pri.start) * mod * L.profile.height
						}
					}, D.Y[S.getState(D.A)]);
				}
			},
			lines:{
				type:"zLine", mask:null,
				curr:function (S, D, mode) {
					var i, points = [],
						state = S.getState(D.A);
					for (i = 0; i < dc.getSize(0); i++) { // Iterate through years
						points[i] = S.getPoint([i, S.A[1], D.A[2], D.A[3]]);
					};
					return zo.extend({
						layer:(state == "highlight" || state == "select") ? 1 : 0,
						stroke:(state == "fade") ? "#000" : dc.getMeta("colour", {d:3, as:D.A}),
						points:points
					}, D.Y[state]);
				}
			},
			guideline:{
				type:"zLine", mask:"fixed",
				curr:function (S, D, mode) {
					var x = tAxis.getX(tAxis.selected);
					return {
						layer:98,
						points:[{x:x, y:dAxis.L.top}, {x:x, y:dAxis.L.bottom}]
					};
				}
			},
			gladwrap:{ // Invisible layer for capturing mouse position
				type:"zGladwrap", mask:"fixed",
				init:function (S, D, mode) {
					return {
						layout:{
							x:L.tAxis.left, y:L.dAxis.top,
							width:L.tAxis.width, height:L.dAxis.width
						},
						mouseEvents:function (D) {
							D.hover(function () {}, function () {S.highlight()});
							D.mousemove(function (e) {
								var A = D.getClosestLine(e, tAxis, ["mask", S.A[1], "mask", "mask"]);
								S.highlight(A);
							});
							D.click(function (e) {
								var A = D.getClosestLine(e, tAxis, ["mask", S.A[1], "mask", "mask"]);
								S.select(A);
							});
						}
					};
				}
			}
		}
	});

// 	// Keyboard accessibility
// 	$(document).keydown(function (e) {
// 		// Up
// 		if (e.keyCode == 38) {
// 			swarm.modeChange(parseInt($("#modeChange")[0].value) - 1);
// 		// Down
// 		} else if (e.keyCode == 40) {
// 			swarm.modeChange(parseInt($("#modeChange")[0].value) + 1);
// 		// Left
// 		} else if (e.keyCode == 37) {
// 			tAxis.axisSelect({a:tAxis.selected.a - 1});
// 		// Right
// 		} else if (e.keyCode == 39) {
// 			tAxis.axisSelect({a:tAxis.selected.a + 1});
// 		// Page up/page down
// 		} else if (e.keyCode == 33 || e.keyCode == 34) {
//
// 		};
// 	});
	logger("HealthDash(): Done.");
};