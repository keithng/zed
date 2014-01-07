Olappy = function (rawData, style, layout) {
	logger("Olappy(): Initialising.");
	// Layout
	var L = {base:zt.getMaxLayout(1200, 600, 20)};
	with (L.base) {
		L.selector = new zLayout({
			x:left, y:top,
			width:260, height:height,
			margin:20
		});
		L.controller = new zLayout({
			x:L.selector.right, y:top,
			width:260, height:height,
			margin:20
		});
		L.swarm = new zLayout({
			x:right, y:top,
			width:width - L.selector.width, height:height - 80,
			xAlign:"right",
			margin:68
		});
		with (L.selector) {
			L.editAll = {
				x:centre.x, y:top + 40,
				width:120, height:40,
				align:"centre", margin:margin
			};
		};
		with (L.controller) {
			L.dimensionControl = {
				x:centre.x, y:margin,
				width:30, height:innerWidth,
				yAlign:"yCentre",
				rotation:90
			};
			L.elementControl = {
				x:centre.x, y:L.dimensionControl.y + 100,
				width:200, height:innerWidth,
				yAlign:"yCentre",
				rotation:90
			};
		};
		with (L.swarm) {
			L.xAxis = {
				anchor:getPoint(1, 1, true),
				width:innerWidth, height:12
			};
			L.yAxis = {
				anchor:getPoint(0, 1, true),
				width:innerHeight, height:60,
				rotation:270
			};
			L.sAxis = {
				x:centre.x, y:L.base.bottom - 50,
				innerWidth:30, height:200,
				xAlign:"right", yAlign:"yCentre",
				rotation:90
			};
		};
	};
	zo.extend(L, layout); // Overwrite layout with user-defined layout

	// Style
	var Y = {
		base:{
			controller:{
				"font-weight":"normal",
				fill:"#666",
				background:{
					opacity:0.7,
					stroke:"#eaeaea",
					fill:"#f0f0f0"
				},
				highlight:{
					t:500, e:"<>",
					background:{
						stroke:"#ccfcfc",
						fill:"#ccfcfc"
					}
				}
			}
		},
		tooltipBox:{
			format:{wrap:80},
			margin:16,
			textXAlign:"left"
		},
		swarm:{
			editAll:{
				baseStyle:"base.controller",
				rounded:8,
				"font-size":18
			},
			close:{baseStyle:"swarm.editAll"},
			legend:{
				keyWidth:20,
				rowHeight:20,
				opacity:1,
				row:{
					format:{shorten:30, noCommas:true},
					"font-size":12,
					fill:"#666"
				},
				key:{"stroke-opacity":0.3},
				edit:{
					baseStyle:"base.controller",
					"font-weight":"bold",
					opacity:0
				},
				background:{
					opacity:0.25,
					"stroke-opacity":0
				},
				highlight:{
					t:300, e:"<>",
					opacity:1,
					background:{opacity:0.5},
					edit:{
						opacity:1
					}
				},
				select:{
					background:{opacity:0.3},
					edit:{opacity:0}
				},
				fade:{
					opacity:0.2,
					background:{opacity:0.1},
					edit:{opacity:0}
				}
			},
			bars:{
				"stroke-opacity":0.2,
				highlight:{
					t:500, e:"<>",
					"stroke-opacity":1
				}
			}
		},
		controller:{
			expand:{t:500, e:"<>"},
			show:{t:300, e:"<>"},
			background:{
				opacity:0.3,
				"stroke-opacity":0,
				fill:"#bbb"
			},
			dimensionControl:{
				style:{
					expandedShown:6,
					expand:{t:400},
					scroll:{t:400},
					axisTitle:{
						margin:25,
						"font-size":12,
						fill:"#666"
					},
					label:{
						baseStyle:"base.controller",
						margin:7,
						select:{"font-size":20}
					}
				}
			},
			elementControl:{
				baseStyle:"base.sAxis",
				label:{
					baseStyle:"base.controller",
					format:{shorten:30, noCommas:true},
					layout:{height:24, width:L.controller.innerWidth},
					"font-size":12,
					select:{
						background:{
							stroke:"#cceded",
							fill:"#cceded"
						}
					}
				}
			}
		},
		sAxis:{
			label:{
				baseStyle:"base.controller",
				margin:7,
				"font-size":14,
				select:{"font-size":20}
			}
		},
		xAxis:{
			label:{
				format:{wrap:12, noCommas:true},
				"font-size":12,
				"font-weight":"bold",
				fill:"#999"
			}
		},
		yAxis:{
			maxNotches:5,
			axisTitle:{
				fill:"#999"
			},
			label:{
				radialStart:-L.swarm.innerWidth,
				radialEnd:2,
				"font-size":12,
				fill:"#999",
				branch:{
					stroke:"#999",
					"stroke-opacity":0.2
				}
			}
		},
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("Olappy(): Parsing data.");
	var INIT_SPLIT = 5, INIT_CONTROL = 0,
		dc = new zDataCube(1, rawData),
		groupsDC = new zDataCube(1),
		dimensionsDC = new zDataCube(1);
	with (dc) {
		makeTree();
		setShown(0, findAllMeta("generation", {d:0}, 1));
		setShown(1, findAllMeta("generation", {d:1}, 1));
		setShown(2, findAllMeta("generation", {d:2}, 1));
		setShown(3, findAllMeta("generation", {d:3}, 1));
		Y.sAxis.expandedShown = meta.length;
	};
	with (groupsDC) {
		importDumb([
			[[0], [1], [0,1,2,3,4], [0,1,2,3,4], [0], [5]],
			[[0], [0], [0,1,2,3,4], [0,1,2,3,4], [0], [5]]
		]);
		meta[0].offset = [-0.1, 0.1];
// 		importDumb([
// 			[[0], [0,1], [0], [0,1,2,3,4], [0], [5]],
// 			[[0], [0,1], [1], [0,1,2,3,4], [0], [5]],
// 			[[0], [0,1], [2], [0,1,2,3,4], [0], [5]]
// 		]);
// 		meta[0].offset = [-0.1, 0.00, 0.1];
		meta[0].colour = ["#BEAED4", "#7FC97F", "#FDC086"];
	};
	with (dimensionsDC) {
		importDumb(za.extract(dc.meta, "title"));
		meta[0].type = [zMultiSelectAxis, zMultiSelectAxis, zMultiSelectAxis, zDragSelectAxis, zMultiSelectAxis, zDragSelectAxis];
	};

	// Drawing
	logger("Olappy(): Drawing accessories.");
	PAPER = zt.makePaper(L.base);
	// Custom controller label for hard fade ins/outs
	var controllerLabel = {
		curr:function (S, A, D, Y) {
			var x = {d:S.d, a:A[S.d]},
				inL = zt.isBetween(S.asRPos(x), S.range[0], S.range[1]);
			return {
				layout:{anchor:S.getPoint(x, true), width:S.L.height},
				opacity:(inL) ? 1 : 0,
				preRedraw:function (D) {
					if (inL && D.hidden) {
						D.animate({opacity:0});
						D.invisibleShow();
					};
				},
				postRedraw:function (D) {if (!inL) D.hide()}
			};
		}
	};
	var tooltipBox = new zTooltipBox(Y.tooltipBox),
		sAxis = new zScrollAxis({
			dc:dimensionsDC, d:0,
			selected:{a:INIT_SPLIT}, expanded:false,
			layout:L.sAxis, style:Y.sAxis,
			onSelect:function (t, e, b, w) {
				if (!swarm) return;
				swarm.remove("bars", t, e, b, w);
				xAxis.remove("label", t, e, function () {
					xAxis.updateData();
					swarm.refresh("legend", t, e);
					xAxis.add("label", t, e, null, swarm.K);
					swarm.add("bars", t, e, null, swarm.K);
					sAxis.layer();
				}, w);
			},
			plan:{axisTitle:null, upArrow:null, downArrow:null, label:controllerLabel}
		}),
		xAxis = new zSmartAxis({
			dc:dc, d:sAxis.selected.a,
			layout:L.xAxis, style:Y.xAxis,
			updateData:function () {
				var S = this;
				S.d = sAxis.selected.a;
				S.R = za.fill("na", S.dc.dLen);
				S.R[S.d] = "all";
				S.setShown();
				if (S.Y.parallelSize) S.notchWidth = S.Y.parallelSize * S.L.innerWidth / S.dc.getSize(S.d, true);
				if (S.Y.perpendicularSize) S.notchHeight = S.Y.perpendicularSize * S.L.height;
			}
		}),
		yAxis = new zAxis({
			title:"Unit", range:[0, 1000],
			layout:L.yAxis, style:Y.yAxis,
			plan:{axisLine:null}
		});

	logger("Olappy(): Drawing main swarm.");
	var swarm = new zSwarm({
		dc:groupsDC, rSpace:"all", style:Y.swarm,
		controlDimension:null,
		boxHeight:Y.swarm.legend.rowHeight * (dc.meta.length + 1) + L.selector.margin * 2,
		setLayout:function (layout, t, e, b, w) {
			L.swarm.set(layout);
			with (L.swarm) {
				xAxis.move({x:getX(1, true), width:innerWidth}, t, e, b, w); // Move xAxis to new position
				yAxis.Y.label.radialStart = -innerWidth; // Need to change the style, or new elements will be drawn with the old style
				yAxis.redraw("label", {layout:{radialStart:-innerWidth}}, t, e, b, w);
				sAxis.move({x:centre.x}, t, e, b, w);
			};
			swarm.refresh("all", t, e, b, w);
		},
		updateData:function (t, e, b, w) {
			var S = this, i, j, rSpace,
				d = sAxis.selected.a,
				groups = groupsDC.getMeta("name", {d:0, a:"all"});
			// Calculate sum
			S.vals = [];
			for (i = 0; i < groups.length; i++) { // For every group
				S.vals[i] = [];
				rSpace = groups[i].slice(); // Grab rSpace for that group
				for (j = 0; j < dc.getSize(d, true); j++) { // Run through sAxis.selected.a
					rSpace[d] = j;
					S.vals[i][j] = dc.calcData("sum", "val", {rs:rSpace});
				};
			};
			yAxis.setShown([0, za.max(za.flatten(S.vals)) * 1.2], t, e, b, w); // Must set yAxis before replotting points
			S.layer();
			sAxis.layer(); // And bring sAxis above swarm
		},
		plan:{
			editAll:{
				type:"zTextBox", mask:"fixed",
				init:function (S, A, D, Y) {
					return {
						mouseEvents:function (D) {
							D.hoverHighlight(Y.highlight.t, Y.highlight.e);
							D.click(function () {controller.show("all")});
						},
						text:"Edit All",
						layout:zo.clone(L.editAll, {y:L.editAll.y + groupsDC.getSize(0) * S.boxHeight})
					};
				}
			},
			close:{
				type:"zTextBox", mask:"fixed", ignore:true,
				init:function (S, A, D, Y) {
					return {
						mouseEvents:function (D) {
							D.hoverHighlight(Y.highlight.t, Y.highlight.e);
							D.click(function () {controller.show()});
						},
						text:"Close",
						layout:zo.clone(L.editAll, {y:L.editAll.y + L.editAll.height + groupsDC.getSize(0) * S.boxHeight})
					};
				}
			},
			legend:{
				type:"zMultiDrone", mask:"mask",
				init:function (S, A, D, Y) {
					var d, out = {},
						fill = groupsDC.getMeta("colour", {d:0, as:A}),
						layout = {
							x:L.selector.left, y:L.selector.top + A[0] * S.boxHeight,
							width:L.selector.width, height:S.boxHeight,
							margin:L.selector.margin
						};
					with (layout) {
						out.mouseEvents = function (D) {
							D.hoverHighlight(Y.highlight.t, Y.highlight.e);
							for (var p in D.parts) {
								D.parts[p].click(function () {controller.show(A[0], this.parent.O.rowID)});
								if (D.parts[p].O.rowID != null) D.parts[p].tooltip(null, tooltipBox);
							};
						};
						out.onAdd = out.postRedraw = function (D) {
							for (var p in D.parts) if (D.parts[p].O.rowID != null) {
								D.parts[p].O.tooltipText = D.O[p].text; // Text is updated on the zMultiDrone, and does not automatically flow through to the drone.O. Because the tooltip is being called from the drone, drone.O needs to be updated manually.
							};
						};
						out.background = {type:"zRectangle", fill:fill, layout:layout};
						out.key = {
							type:"zRectangle", fill:fill,
							layout:{
								x:x + margin, y:y + margin,
								width:Y.keyWidth, height:height - 2 * margin
							}
						};
						out.edit = {
							type:"zText", text:"Edit", layer:0,
							layout:{
								x:x + width - margin, y:y + height - margin,
								xAlign:"right", yAlign:"bottom"
							}
						}
						for (d = 0; d < dc.meta.length; d++) out["row" + d] = {
							type:"zText", rowID:d, base:Y.row,
							layout:{
								x:x + margin * 2 + Y.keyWidth,
								y:y + margin + d * Y.rowHeight
							}
						};
					};
					return out;
				},
				curr:function (S, A, D, Y) {
					var d, out = {},
						rSpace = groupsDC.getMeta("name", {d:0, as:A}); // rSpace for the current legend
					for (d = 0; d < rSpace.length; d++) out["row" + d] = {
						text:
							(d == sAxis.selected.a) ? "-" :
							(!rSpace[d].length) ? "None" :
							(rSpace[d].length == dc.shown[d].length) ? "All " + dc.getMeta("title", {d:d}) :
							dc.getMeta("name", {d:d, rs:rSpace}).join(", "),
						"font-weight":(d == S.controlDimension) ? "bold" : "normal"
					};
					return out;
				}
			},
			bars:{
				type:"zMultiDrone", mask:"mask",
				init:function (S, A, D, Y) {
					var i, out = {},
						d = sAxis.selected.a, // Primary dimension
						fill = groupsDC.getMeta("colour", {d:0, as:A});
					out.mouseEvents = function (D) {
						for (var p in D.parts) {
							D.parts[p].hoverHighlight(Y.highlight.t, Y.highlight.e);
							D.parts[p].tooltip(null, tooltipBox);
						};
					};
					out.onAdd = out.postRedraw = function (D) {
						for (var p in D.parts) {
							D.parts[p].O.tooltipText = S.vals[A[0]][p]; // Text is updated on the zMultiDrone, and does not automatically flow through to the drone.O. Because the tooltip is being called from the drone, drone.O needs to be updated manually.
						};
					};
					for (i = 0; i < dc.getSize(d, true); i++) {
						out[i] = {
							type:"zRectangle", base:Y, fill:fill, layer:1,
							layout:{y:yAxis.L.bottom, xAlign:"xCentre", yAlign:"bottom"}
						};
					};
					return out;
				},
				curr:function (S, A, D, Y) {
					var i, out = {},
						d = sAxis.selected.a,
						vals = S.vals[A[0]],
						offset = groupsDC.getMeta("offset", {d:0, as:A});
					for (i = 0; i < dc.getSize(d, true); i++) {
						out[i] = {
							layout:{
								x:xAxis.getX({r:i + offset}),
								width:xAxis.notchWidth,
								height:yAxis.getLength(vals[i])
							}
						};
					};
					return out;
				}
			}
		}
	});

	logger("Olappy(): Drawing controller.");
	var controller = new zSwarm({
		dc:groupsDC, rSpace:"all", style:Y.controller,
		show:function (group, d) {
			var t, e, b = null, w = controller.K;
			tooltipBox.hide(t, e);
			swarm.activeGroup = group;
			if (group == null) { // Remove controls then shrink background
				t = controller.Y.show.t, e = controller.Y.show.e;
				swarm.controlDimension = null;
				swarm.remove("close", t, e, b, w);
				controller.remove("dimensionControl", t, e, b, w);
				controller.remove("elementControl", t, e, b, w);
				controller.G.redraw(t, e, function () {
					t = controller.Y.expand.t, e = controller.Y.expand.e;
					swarm.setLayout({width:L.base.width - L.selector.right}, t, e, b, w);
					swarm.unsetMode("all", t, e, b, w);
					controller.refresh("background", t, e);
				});
			} else if (controller.plan.dimensionControl.ignore) { // Expand background then add controls
				t = controller.Y.expand.t, e = controller.Y.expand.e;
				swarm.controlDimension = (d == null) ? INIT_CONTROL : d; // When dimensionControl is being created, it looks up swarm.controlDimension
				swarm.setLayout({width:L.base.width - L.controller.right}, t, e, b, w);
				swarm.setMode({d:0, a:"all"}, "fade", t, e, b, w);
				swarm.setMode({d:0, a:group}, "select", t, e, b, w);
				controller.refresh("background", t, e, function () {
					t = controller.Y.show.t, e = controller.Y.show.e;
					swarm.add("close", t, e, b, w);
					controller.add("dimensionControl", t, e, b, w);
					controller.G.redraw(t, e);
					sAxis.layer();
				});
			} else { // Change existing controllers
				t = controller.Y.show.t, e = controller.Y.show.e;
				if (d != null) swarm.controlDimension = d;
				swarm.refresh("legend", t, e, b, w); // Change background colour
				swarm.setMode({d:0, a:"all"}, "fade", t, e, b, w); // Reset legends
				swarm.setMode({d:0, a:group}, "select", t, e, b, w); // Select legends
				controller.refresh("background", t, e); // Change background colour
				var dimensionControl = controller.get("dimensionControl")[0],
					elementControl = controller.get("elementControl")[0];
				if (d != null) { // If a dimension has been specified
					if (d == dimensionControl.selected.a) return;
					controller.remove("elementControl", t, e, b, w); // Remove old elementControl
					dimensionControl.scrollSelect({a:d}, t, e, b, w); // Set dimensionControl (dimensionControl.onSelect() will automatically activate, which will create a new elementControl)
				} else { // Otherwise, the dimension remains the same but the activeGroup may have changed
					elementControl.onAdd(elementControl, t, e, b, w); // Reset all the buttons on elementControl to make sure they match what's selected in activeGroup
				};
			};
		},
		plan:{
			background:{
				type:"zRectangle", mask:"fixed",
				curr:function (S, A, D, Y) {
					var group = swarm.activeGroup;
					return {
						fill:(group == null) ? null : (typeof group == "number") ? groupsDC.getMeta("colour", {d:0, a:group}) : Y.fill,
						layout:zo.extend(L.controller.getVitals(), (group == null) ? {width:0} : null)
					}
				}
			},
			dimensionControl:{
				type:zScrollAxis, mask:"fixed", ignore:true,
				init:function (S, A, D, Y) {
					return {
						dc:dimensionsDC, d:0,
						expanded:false, selected:{a:swarm.controlDimension},
						layout:L.dimensionControl,
						expand:function (t, e, b, w) {
							var S = this;
							if (S.expanded) return;
							S.expanded = true;
							S.maxShown = S.Y.expandedShown;
							S.L.set({innerWidth:S.L.innerWidth * S.Y.expandedShown / S.Y.collapsedShown});
							S.scroll({r:S.selected.r}, t, e, b, w);
							controller.remove("elementControl", t, e, null, S.K);
						},
						onSelect:function (t, e, b, w) {
							var S = this;
							swarm.controlDimension = S.selected.a;
							swarm.refresh("legend");
							controller.plan.elementControl.type = dimensionsDC.getMeta("type", {d:0, a:S.selected.a});
							controller.add("elementControl", t, e, b, w);
							S.refresh("axisTitle");
							S.layer();
						},
						plan:{
							upArrow:null, downArrow:null, label:controllerLabel,
							axisTitle:{
								type:"zTextBox", mask:"fixed",
								curr:function (S) {
									if (S.expanded) return {};
									var type = controller.plan.elementControl.type;
									return {
										text:
											(type == zDragSelectAxis) ? "Click or drag to select" :
											(type == zMultiSelectAxis) ? "Click to select/deselect" :
											"Click to select",
										layout:{
											x:S.L.centre.x, y:S.L.bottom,
											xAlign:"xCentre", yAlign:"top"
										}
									};
								}
							}
						}
					};
				}
			},
			elementControl:{
				type:null, mask:"fixed", ignore:true,
				init:function (S, A, D, Y) {
					var d = swarm.controlDimension,
						width = Math.min(L.controller.innerHeight, Y.label.layout.height * dc.getSize(d, true)),
						layout = zo.extend(L.elementControl, {width:width});
					return {
						dc:dc, d:d, initialising:true,
						layout:layout, style:Y,
						plan:{axisTitle:null, axisLine:null},
						onAdd:function (D, t, e, b, w) {
							D.initialising = false;
							var i, rPos, same = true,
								group = swarm.activeGroup,
								rSpace = groupsDC.getMeta("name", {d:0, a:group});
							if (group == "all") { // If select all
								for (i = 0; i < rSpace.length - 1; i++) {
									if (!za.equals(rSpace[i][d], rSpace[i + 1][d])) same = false; // Check whether the groups share the same values in this dimension
								};
								if (same) rPos = rSpace[0][d]; // If they're the same, select
								else rPos = []; // Otherwise, reset
							} else rPos = rSpace[d]; // If only one group selected, select whatever that group is
							D.selected.r = rPos.slice();
							D.unsetMode("all", t, e, b, w); // Reset all the buttons on elementControl
							if (rPos != null) D.setMode({r:rPos}, "select", t, e, b, w); // Select the selected buttons on elementControl
						},
						onSelect:function (t, e, b, w) {
							if (this.initialising) return;
							var i, t = this.Y.select.t, e = this.Y.select.e,
								group = za.asArray(swarm.activeGroup),
								rSpace = groupsDC.getMeta("name", {d:0, a:group});
							for (i = 0; i < rSpace.length; i++) rSpace[i][d] = this.selected.r.slice();
							swarm.refresh("all", t, e); // Swarm.updateData() happens here, which updates the values
						}
					};
				}
			}
		}
	});
	sAxis.layer();
	logger("Olappy(): Done.");
};