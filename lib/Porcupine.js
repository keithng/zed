var SWARM;
Porcupine = function (rawData, style, layout) {
	logger("Porcupine(): Initialising.");
	// Layout
	var L = zt.getMaxLayout(800, 600, 50);
	with (L) {
		L.tooltipBox = {
			radial:90, radialStart:20,
			margin:5
		}; // TooltipBox is floating, so position doesn't need to be defined, and height is automatic (depending on text)
		L.swarm = new zLayout({
			x:100, y:20,
			width:width - 120, height:height - 100
		});
	};
	with (L.swarm) {
		L.fakeTAxis = {
			x:left, y:bottom,
			width:width, height:16
		};
		L.tAxis = {}; // tAxis is placed on fakeTAxis, based on time range
		L.dAxis = {
			x:left, y:bottom, width:height,
			xAlign:"right", rotation:90
		};
		L.notes = {
			x:left + 50, y:top + 50,
			width:400
		}
	};
	L = zo.extend(L, layout); // Overwrite layout with user-defined layout

	// Style
	var Y = {
		// Animation parameters
		highlight:{t:300, e:"<>"},
		// Text formating
		valFormat:{m:"abbreviate", dp:1, prefix:"$", multiply:1000000000},
		// Reference styles
		line:{
			stroke:"#004071",
			"stroke-width":3
		},
		axisLabel:{
			format:{base:"valFormat"},
			margin:6,
			"font-size":14,
			fill:"#666",
			branch:{"stroke-width":0.5}
		},
		// Objects
		background:{
			fill:"#F0F4F5",
			"stroke-width":0
		},
		tooltipBox:{
			margin:10, // Overrides layout margins
			opacity:0.92,
// 			"z-index":9999, // To top
			"-moz-box-shadow":null,
			"-webkit-box-shadow":null,
			"box-shadow":null,
// 			"border":"solid 1px #c4dde2",
// 			"border-radius":"10px",
// 			"background-color":"#d4edf2",
// 			"font-family":"sans-serif",
// 			"font-size":"13px"
		},
		fakeTAxis:{
			extension:0,
			maxNotches:16,
			label:{base:"axisLabel"}
		},
		tAxis:{extension:0},
		dAxis:{
			maxNotches:6,
			label:{
				base:"axisLabel",
 				radialStart:-L.swarm.width,
				radialEnd:6,
				branch:{stroke:"#ccc"}
			}
		},
		swarm:{
			notes:{},
			date:{
				margin:20,
				"font-size":32,
				"font-weight":"bold",
				fill:"#96AECA"
			},
			actual:{base:"line"},
			projection:{
				base:"line",
				opacity:0.5,
				highlight:{
					stroke:"#000",
					opacity:1
				},
				fade:{
					"stroke-width":1,
					opacity:0.2
				},
				hidden:{
					opacity:0
				}
			},
			axisLine:{
				"stroke-width":1.5,
				"stroke-opacity":0.3
			},
			dot:{
				circle:{radius:3.5},
				fill:"#000"
			},
			gladwrap:{
				outerSnap:25, // Will select the closest line if it's within this range
				innerSnap:8, // Will select actual or current lines if it's within this range, regardless of whether it's the closest
				fill:"magenta", opacity:0
			}
		}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("Porcupine(): Collating and crunching data.");
	var ACTUAL = 0, START_YEAR = 1, LAST_YEAR,
		param = (document.location.hash) ? document.location.hash.slice(1).split("-") : [],
		INIT_MODE = parseInt((!isNaN(param[0])) ? param[0] : 0),
		INIT_YEAR = parseInt((!isNaN(param[1])) ? param[1] : 0),
		i, name, options = "",
		dc = new zDataCube(3, rawData);

	with (dc) {
		for (i = 0; i < shown[0].length; i++) {
			name = getName({d:0, a:i});
			options += "<option value='" + i + "'>" + name + "</option>";
		};
		$("#modeChange").html(options);
		$("#modeChange").change(function (a) {
			swarm.modeChange(parseInt($("#modeChange")[0].value));
		});
		shown[1] = shown[1].slice(1, shown[1].length - 2);
		shown[2] = shown[2].slice(0, shown[2].length - 5);
		LAST_YEAR = START_YEAR + (shown[1].length - 1) / 2;
		logger(dc.getName({d:2, a:START_YEAR}));
		logger(dc.getName({d:2, a:LAST_YEAR}));

		addDataType("comments");
		// Core Crown OBEGAL
		setData("comments", {as:[0, 1, 0]}, // 08-BEFU
			"In 2008 Budget, the government's operating balance was expected to fall to almost nothing by 2011/12."
		);
		setData("comments", {as:[0, 2, 0]}, // 08-PREFU
			"Soon after, concerns about the emerging financial crisis led to a downward revision of forecasts..."
		);
		setData("comments", {as:[0, 3, 0]}, // 09-BEFU
			"...but as the scope of the Global Financial Crisis became clear, forecasts were revised downwards once again. Under this forecast, NZ was in for a decade of deficits."
		);
		setData("comments", {as:[0, [4, 5], 0]},
			"These forecasts were cautiously revised up..."
		);
		setData("comments", {as:[0, 6, 0]},
			"Until the first Canterbury earthquake.."
		);
		setData("comments", {as:[0, 7, 0]},
			"...and then the second Canterbury earthquake.."
		);
	};

	// Drawing
	logger("Porcupine(): Drawing accessorires.");
	PAPER = zt.makePaper(L);
	var background = new zRectangle({layout:L.swarm, base:Y.background}),
		tooltipBox = new zHTMLTooltipBox({layout:L.tooltipBox, base:Y.tooltipBox}),
		fakeTAxis = new zSmartAxis({
			layout:L.fakeTAxis, style:Y.fakeTAxis,
			dc:dc, d:2, A:dc.shown,
			plan:{axisLine:null}
		}),
		tAxis = new zSlideAxis({
			layout:{
				x:fakeTAxis.getX({a:START_YEAR}), y:fakeTAxis.L.y, // FIXME: Don't know if this is correct
				width:fakeTAxis.getLength(LAST_YEAR - START_YEAR),
				height:fakeTAxis.L.height
			}, style:Y.tAxis,
			dc:dc, d:1,
			selected:{d:1, a:INIT_YEAR},
			plan:{
				label:null, playButton:null, baseNotch:null,
				currNotch:{
					init:function (S, D, mode) {
						return {
							ring:{type:"zCircle", layer:3},
							mouseEvents:function (D) {
								if (!PAPER.isiPad) D.drag(function (rx, ry, x) {
									S.axisSelect({x:x, y:0})
								});
							}
						};
					}
				}
			}
		}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			range:[-1, 1],
			plan:{axisLine:null, axisTitle:null}
		});
	tooltipBox.hover(function () {tooltipBox.hide(50)});

	logger("Porcupine(): Drawing main swarm.");
	var swarm = new zSwarm({ // Resources
		layout:L.swarm, style:Y.swarm,
		dc:dc, A:[INIT_MODE, dc.shown[1], "all"],
		axes:{t:tAxis},
		onInit:function (t, e, b, w) {
			var S = this,
				min = dc.calcData("min", "val", {as:S.A}),
				max = dc.calcData("max", "val", {as:S.A});
			dAxis.setShown([min - 0.1 * (max - min), max + 0.1 * (max - min)], t, e, b, w);
		},
		modeChange:function (mode) {
			if (mode < 0 || mode >= dc.getSize(0)) return; // Out of bounds
			var S = this, t = 800, e = "<>";
			$("#modeChange")[0].value = mode + ""; // Convert to string
			S.setSpace({d:0, a:mode});
			S.onInit(t, e, null, S.K);
 			S.refresh("all", t, e);
		},
		getPoint:function (A) {
			var val = dc.getVal({as:A});
			return {x:fakeTAxis.getX({as:A}), y:dAxis.getY(val)};
		},
		highlight:function (A) {
			var S = this;
			S.reset();
			S.remove("dot");
			if (A) {
				S.selected = {as:A};
				S.add("dot");
				S.baseHighlight({d:1, as:A});
				var forecast = dc.getName({d:1, as:A}).split("-"),
					forecastYear = "20" + forecast[0],
					forecastType =
						(forecast[1] == "HYEFU") ? "Half-Yearly Update" :
						(forecast[1] == "PREFU") ? "Pre-Election Update" :
						"Budget Update",
					year = "20" + dc.getName({d:2, as:A}),
					val = dc.getVal({as:A});
				tooltipBox.showAt({
					text:
						"<b>" + ((forecast[0] == "Actual") ? "Actual:" : forecastYear + " " + forecastType + " forecasted:") + "</b><br>" +
						zt.format(val, Y.valFormat) + " in " + year,
					layout:{anchor:S.getPoint(A)}
				});
			} else tooltipBox.hide();
		},
		updateData:function () {
			var S = this;
			document.location.hash = S.A[0] + "-" + tAxis.selected.a;
			S.actual = za.find(dc.getVal({as:[S.A[0], tAxis.selected.a, "all"]}), "", "!="); // The first valid entry of the current estimate is always the last actual value
		},
		plan:{
			notes:{
				type:"zHTML", mask:"fixed",
				curr:function (S, D, mode) {
					var text = dc.getData("comments", {as:[S.A[0], tAxis.selected.a, 0]});
					return {
						id:"navigator",
						layout:L.notes,
						content:
							"<div id='nav'>" +
								"<a href=javascript:void(0) id='prev'>Prev</a>" +
								"<a href=javascript:void(0) id='next'>Next</a>" +
								"<div id='middle'>" +
									"<div id='pageCount'></div>" +
									"<a href=javascript:void(0) id='close'>Close</a>" +
								"</div>" +
							"</div><br><br>" +
							"<div id='content'>" + text + "</div>"
					};
				}
			},
			date:{
				type:"zText", mask:"fixed",
				curr:function (S, D, mode) {
					return {
						text:dc.getName(tAxis.selected),
						layout:{
							x:S.L.right, y:S.L.bottom,
							xAlign:"right", yAlign:"bottom"
						}
					};
				}
			},
			actual:{
				type:"zLine", mask:["mask", ACTUAL, "all"],
				curr:function (S, D, mode) {
					var i, curr = 0, points = [],
						vals = dc.getVal({as:D.A});
					for (i = 0; i < vals.length; i++) if (vals[i] != "") {
						if (i <= S.actual) curr = i;
						points.push(S.getPoint([D.A[0], D.A[1], curr]));
					};
					return {points:points};
				}
			},
			projection:{
				type:"zLine", mask:["mask", "mask", "all"],
				curr:function (S, D, mode) {
					var i, points = [],
						vals = dc.getVal({as:D.A}),
						base =
							(D.A[1] > tAxis.selected.a) ? D.Y.hidden : // Future (hide)
							(D.A[1] == tAxis.selected.a) ? D.Y : // Current (show)
							D.Y.fade; // Past (fade)
					for (i = 0; i < vals.length; i++) if (vals[i] != "") {
						points.push(S.getPoint([D.A[0], D.A[1], i]));
					};
					return zo.extend({points:points}, base);
				}
			},
			axisLine:{
				type:"zLine", mask:"fixed",
				curr:function (S, D, mode) {
					var y = dAxis.getPoint(0).y;
					return {
						layer:3,
						points:[{x:L.swarm.left, y:y}, {x:L.swarm.right, y:y}]
					};
				}
			},
			dot:{
				type:"zCircle", mask:"fixed", ignore:true,
				curr:function (S, D, mode) {
					return {circle:{centre:S.getPoint(S.selected.as)}};
				}
			},
			gladwrap:{ // Invisible layer for capturing mouse position
				type:"zRectangle", mask:"fixed",
				init:function (S, D, mode) {
					return {
						layout:S.L,
						mouseEvents:function (D) {
							D.mousemove(function (e) {
								var actual, current, closest, targ = {}, out = [],
									d = 2,
									mousePos = zt.getEventPosition(e),
 									rPos = fakeTAxis.pointToRPos(mousePos), // Find segment
									aPos = dc.asAPos({d:d, r:Math.floor(rPos)}),
									A = [
										S.A[0],
										za.fill(0, tAxis.selected.a + 1, 1), // Include actual
										[aPos - 1, aPos, aPos + 1] // Do pair before and pair after (to account for steep slopes)
									];
								// Find the distance from each segment to the mouse position
								dc.forSpaces({as:A}, function (x) {
									var A = [x.as, dc.addSpaces(x.as, {d:d, a:x.as[d] + 1})];
									// Filter out invalid segments
									if (x.as[1] == ACTUAL && x.as[2] >= S.actual) return; // Line for actual, but out of actual range
									if (!zt.isBetween(A[0][d], 0, dc.getSize(d) - 1)) return; // Invalid segment (out of range)
									if (dc.getVal({as:A[0]}) == "") return; // Invalid segment (contains null values)
									if (dc.getVal({as:A[1]}) == "") return; // Invalid segment (contains null values)
									// Work out distance between mouse position and segment
									var points = [
											S.getPoint(A[0]), // Prev point
											S.getPoint(A[1]) // Next point
										],
										dist = [
											zp.dist(points[0], mousePos), // Prev to mouse
											zp.dist(points[1], mousePos) // Next to mouse
										];
									out.push({
										as:(dist[0] <= dist[1]) ? A[0] : A[1], // Use aSpace of the closer point
										dist:zp.distToLine(mousePos, points)
									});
								});
								// Get best point
								actual = za.getObject(za.getAllObjects(out, "as", ACTUAL, "atPos", 1), "dist", null, "min");
								current = za.getObject(za.getAllObjects(out, "as", tAxis.selected.a, "atPos", 1), "dist", null, "min");
								closest = za.getObject(out, "dist", null, "min");
								if (actual && actual.dist < D.Y.innerSnap) targ = actual; // If actual is within innerSnap range, use it
								else if (current && current.dist < D.Y.innerSnap) targ = current; // If current is within innerSnap range, use it
								else if (closest && closest.dist < D.Y.outerSnap) targ = closest; // Otherwise, pick the closest, as long as it's within outerSnap range
								// Check if current point is an actual (rather than forecast) point
								if (targ.as){
									var prevA = [targ.as[0], targ.as[1], targ.as[2] - 1];
									if (!dc.getVal({as:prevA})) targ.as[1] = ACTUAL; // If previous value is empty, this mean this is the first point, so use ACTUAL instead
								};
								S.highlight(targ.as);
							});
						}
					};
				}
			}
		}
	});
	SWARM = swarm;

	// Keyboard accessibility
	$(document).keydown(function (e) {
		// Up
		if (e.keyCode == 38) {
			swarm.modeChange(parseInt($("#modeChange")[0].value) - 1);
		// Down
		} else if (e.keyCode == 40) {
			swarm.modeChange(parseInt($("#modeChange")[0].value) + 1);
		// Left
		} else if (e.keyCode == 37) {
			tAxis.axisSelect({a:tAxis.selected.a - 1});
		// Right
		} else if (e.keyCode == 39) {
			tAxis.axisSelect({a:tAxis.selected.a + 1});
		// Page up/page down
		} else if (e.keyCode == 33 || e.keyCode == 34) {

		};
	});

	logger("Porcupine(): Done.");
};