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
				align:"centre", margin:10
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
			},
			button:{
				baseStyle:"base.controller",
				rounded:8,
				"font-size":18
			}
		},
		tooltipBox:{
			format:{wrap:80},
			margin:16,
			textXAlign:"left"
		},
		swarm:{
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
		Y.swarm.boxHeight = Y.swarm.legend.rowHeight * dLen + L.selector.margin * 2;
	};
	var groups = [
		{
			A:[[1], [2], [1,2,3,4,5], [1,2,3,4,5], [0], "all"],
			offset:-5,
			colour:"#BEAED4",
			swarm:{}
		},{
			A:[[1], [1], [1,2,3,4,5], [1,2,3,4,5], [0], "all"],
			offset:5,
			colour:"#7FC97F",
			swarm:{}
		}
	];

	with (dimensionsDC) {
		importDumb(za.extract(dc.meta, "title"));
		meta[0].type = [zMultiSelectAxis, zMultiSelectAxis, zMultiSelectAxis, zDragSelectAxis, zMultiSelectAxis, zDragSelectAxis];
	};

	// Drawing
	logger("Olappy(): Drawing accessories.");
	PAPER = zt.makePaper(L.base);
	// Custom controller label for hard fade ins/outs
	var tooltipBox = new zTooltipBox(Y.tooltipBox),
		sAxis = new zScrollAxis({
			dc:dimensionsDC, d:0,
			swarms:groups,
			selected:{a:INIT_SPLIT}, expanded:false,
			layout:L.sAxis, style:Y.sAxis,
			onSelect:function (t, e, b, w) {
				var i;
				if (!xAxis) return;
				xAxis.remove("label", t, e, function () {
					xAxis.updateData();
					xAxis.add("label", t, e, b, w);
					controller.setMaxVal();
					for (i = 0; i < groups.length; i++) {
						groups[i].refresh("legend", t, e, null, xAxis.K);
						groups[i].add("bars", t, e, null, xAxis.K);
					};
					sAxis.layer();
				}, w);
				for (i = 0; i < groups.length; i++) {
					groups[i].remove("bars", t, e, null, xAxis.K);
				};
			},
			plan:{
				axisTitle:null, upArrow:null, downArrow:null,
				label:{
					curr:function (S, D, mode) {
						var x = {d:S.d, a:D.A[S.d]},
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
				}
			}
		}),
		xAxis = new zSmartAxis({
			dc:dc, d:sAxis.selected.a,
			layout:L.xAxis, style:Y.xAxis,
			updateData:function () {
				var S = this;
				S.d = sAxis.selected.a;
				S.A = za.fill("na", S.dc.dLen);
				S.A[S.d] = dc.shown[S.d];
				S.setShown();
				if (S.Y.parallelSize) S.notchWidth = S.Y.parallelSize * S.L.innerWidth / S.dc.getSize(S.d, true);
				if (S.Y.perpendicularSize) S.notchHeight = S.Y.perpendicularSize * S.L.height;
			}
		}),
		yAxis = new zAxis({
			title:"Unit", range:[0, 1000],
			layout:L.yAxis, style:Y.yAxis,
			plan:{axisLine:null}
		}),
		editAll = new zTextBox({
			text:"Edit All",
			base:Y.base.button,
			layout:zo.clone(L.editAll, {y:L.editAll.y + groups.length * Y.swarm.boxHeight})
		}),
		close = new zTextBox({
			text:"Close",
			base:Y.base.button,
			layout:zo.clone(L.editAll, {y:L.editAll.y + L.editAll.height + groups.length * Y.swarm.boxHeight})
		});

	editAll.hoverHighlight(Y.base.button.highlight.t, Y.base.button.highlight.e);
	editAll.click(function () {controller.show(groups)});

	close.hoverHighlight(Y.base.button.highlight.t, Y.base.button.highlight.e);
	close.click(function () {controller.show([])});
	close.hide();

	logger("Olappy(): Drawing controller.");
	var controller = new zSwarm({
		dc:groupsDC, rSpace:"all", style:Y.controller,
		swarms:groups,
		activeSwarms:[],
		setMaxVal:function (t, e, b, w) {
			var maxVal = 1;
			this.forSwarms(function (S) {
				dc.forPos({d:sAxis.selected.a, r:"all"}, function (x) { // Iterate through each active pos on the selected dimension
					var aSpace = dc.addSpaces(S.A, x),
						sum = dc.calcData("sum", "val", {as:aSpace});
					maxVal = Math.max(maxVal, sum);
				});
			});
			yAxis.setShown([0, maxVal * 1.2], t, e, b, w); // Must set yAxis before replotting points
		},
		setLayout:function (layout, t, e, b, w) {
			var S = this, i;
			L.swarm.set(layout);
			with (L.swarm) {
				xAxis.move({x:getX(1, true), width:innerWidth}, t, e, null, S.K); // Move xAxis to new position
				yAxis.Y.label.radialStart = -innerWidth; // Need to change the style, or new elements will be drawn with the old style
				yAxis.redraw("label", {layout:{radialStart:-innerWidth}}, t, e, null, S.K);
				sAxis.move({x:centre.x}, t, e, null, S.K);
			};
			S.refresh("background", t, e, b, w);
			for (i = 0; i < groups.length; i++) {
				groups[i].refresh("bars", t, e, null, S.K);
			};
		},
		show:function (group, d) {
			var S = this, i, mode,
				t, e, b = null, w = S.K;
			tooltipBox.hide(t, e);
			S.activeSwarms = group;
			if (S.activeSwarms.length == 0) { // Remove controls then shrink background
				t = S.Y.show.t, e = S.Y.show.e;
				S.d = null;
				S.G.redraw(t, e, function () {
					t = S.Y.expand.t, e = S.Y.expand.e;
					S.setLayout({width:L.base.width - L.selector.right}, t, e, b, w);
				}, w);
				S.remove("dimensionControl", t, e, null, S.K);
				S.remove("elementControl", t, e, null, S.K);
				S.forSwarms("refresh", "legend");
				close.hide(t, e, null, S.K);
			} else if (S.plan.dimensionControl.ignore) { // Expand background then add controls
				t = S.Y.expand.t, e = S.Y.expand.e;
				S.d = (d == null) ? INIT_CONTROL : d; // When dimensionControl is being created, it looks up S.d
				S.setLayout({width:L.base.width - L.controller.right}, t, e, function () {
					t = S.Y.show.t, e = S.Y.show.e;
					S.G.redraw(t, e, b, w);
					S.add("dimensionControl", t, e, null, S.K);
					close.show(t, e, null, S.K);
					sAxis.layer();
				}, w);
			} else { // Change existing controllers
				t = S.Y.show.t, e = S.Y.show.e;
				var dimensionControl = S.get("dimensionControl")[0],
					elementControl = S.get("elementControl")[0];
				if (d != null && d != dimensionControl.selected.a) { // If a dimension has been specified and it has changed
					S.d = d;
					S.remove("elementControl", t, e, null, S.K); // Remove old elementControl
					dimensionControl.scrollSelect({a:d}, t, e, null, S.K); // Set dimensionControl (dimensionControl.onSelect() will automatically activate, which will create a new elementControl)
				} else { // Otherwise, the dimension remains the same but the activeSwarms may have changed
					elementControl.onAdd(elementControl, t, e, null, S.K); // Reset all the buttons on elementControl to make sure they match what's selected in activeSwarms
				};
				S.refresh("background", t, e, b, w); // Change background colour
			};
			for (i = 0; i < groups.length; i++) {
				if (S.activeSwarms.length == 0) {
					groups[i].unsetMode("all", t, e, null, S.K);
				} else {
					mode = (za.contains(S.activeSwarms, groups[i])) ? "select" : "fade";
					groups[i].setMode("all", mode, t, e, null, S.K);
				};
			};
		},
		plan:{
			background:{
				type:"zRectangle", mask:"fixed",
				curr:function (S, D, mode) {
					return {
						fill:
							(S.activeSwarms.length == 0) ? null :
							(S.activeSwarms.length == 1) ? S.activeSwarms[0].fill :
							D.Y.fill,
						layout:zo.extend(
							L.controller.getVitals(),
							(S.activeSwarms.length == 0) ? {width:0} : null)
					}
				}
			},
			dimensionControl:{
				type:zScrollAxis, mask:"fixed", ignore:true,
				init:function (S, D, mode) {
					return {
						dc:dimensionsDC, d:0,
						expanded:false, selected:{a:S.d},
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
							controller.d = S.selected.a;
							controller.forSwarms("refresh", "legend");
							controller.plan.elementControl.type = dimensionsDC.getMeta("type", S.selected);
							controller.add("elementControl", t, e, b, w);
							S.refresh("axisTitle");
							S.layer();
						},
						plan:{
							upArrow:null, downArrow:null, label:sAxis.plan.label,
							axisTitle:{
								type:"zTextBox", mask:"fixed",
								curr:function (S, D, mode) {
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
				init:function (S, D, mode) {
					var width = Math.min(L.controller.innerHeight, D.Y.label.layout.height * dc.getSize(S.d, true)),
						layout = zo.extend(L.elementControl, {width:width});
					return {
						dc:dc, d:S.d, initialising:true,
						A:dc.shown,
						layout:layout, style:D.Y,
						plan:{axisTitle:null, axisLine:null},
						onAdd:function (D, t, e, b, w) {
							var i, aPos, currA, nextA, same = true;
							D.initialising = false;
							for (i = 0; i < S.activeSwarms.length - 1; i++) {
								currA = S.activeSwarms[i].A[S.d];
								nextA = S.activeSwarms[i + 1].A[S.d];
								if (!zo.equals(currA, nextA)) same = false; // Check whether the groups share the same values in this dimension
							};
							if (same) aPos = S.activeSwarms[0].A[S.d]; // If they're the same, select
							else aPos = []; // Otherwise, reset
							D.selected.a = aPos.slice();
							D.unsetMode("all", t, e, b, w); // Reset all the buttons on elementControl
							if (aPos != null) D.setMode({a:aPos}, "select", t, e, b, w); // Select the selected buttons on elementControl
						},
						onSelect:function (t, e, b, w) {
							if (this.initialising) return;
							var i, t = this.Y.select.t, e = this.Y.select.e;
							for (i = 0; i < S.activeSwarms.length; i++) {
								S.activeSwarms[i].setSpace({d:S.d, a:this.selected.a});
							};
							S.setMaxVal(t, e, null, S.K);
							S.forSwarms("refresh", "all", t, e); // Swarm.updateData() happens here, which updates the values
						}
					};
				}
			}
		}
	});

	for (var i = 0; i < groups.length; i++) {
		groups[i] = new zSwarm({
			dc:dc, style:Y.swarm,
			group:i,
			A:groups[i].A,
			offset:groups[i].offset,
			fill:groups[i].colour,
			onInit:function () {
				if (this.group == 0) controller.setMaxVal();
			},
			updateData:function (t, e, b, w) {
				var S = this;
				S.d = sAxis.selected.a; // sAxis determines the selected dimension
				S.plan.bars.mask = S.A.slice();
				S.plan.bars.mask[S.d] = "mask";
				S.A[S.d] = dc.shown[S.d].slice();
				S.forDrones("bars", function (D) {
					for (var d = 0; d < S.A.length; d++) {
						if (d != S.d) D.A[d] = S.A[d].slice();
					};
				});
				S.layer();
				sAxis.layer(); // And bring sAxis above swarm
			},
			plan:{
				legend:{
					type:"zMultiDrone", mask:"fixed",
					init:function (S, D, mode) {
						var d, out = {},
							layout = {
								x:L.selector.left, y:L.selector.top + S.group * S.Y.boxHeight,
								width:L.selector.width, height:S.Y.boxHeight,
								margin:L.selector.margin
							};
						with (layout) {
							out.mouseEvents = function (D) {
								D.hoverHighlight(D.Y.highlight.t, D.Y.highlight.e);
								for (var p in D.parts) {
									D.parts[p].click(function () {controller.show([S], this.parent.O.d)});
									if (D.parts[p].O.d != null) D.parts[p].tooltip(null, tooltipBox);
								};
							};
							out.onAdd = out.postRedraw = function (D) {
								for (var p in D.parts) if (D.parts[p].O.d != null) {
									D.parts[p].O.tooltipText = D.O[p].text; // Text is updated on the zMultiDrone, and does not automatically flow through to the drone.O. Because the tooltip is being called from the drone, drone.O needs to be updated manually.
								};
							};
							out.background = {type:"zRectangle", fill:S.fill, layout:layout};
							out.key = {
								type:"zRectangle", fill:S.fill,
								layout:{
									x:x + margin, y:y + margin,
									width:D.Y.keyWidth, height:height - 2 * margin
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
								type:"zText", d:d, base:D.Y.row,
								layout:{
									x:x + margin * 2 + D.Y.keyWidth,
									y:y + margin + d * D.Y.rowHeight
								}
							};
						};
						return out;
					},
					curr:function (S, D, mode) {
						var d, out = {};
						for (d = 0; d < S.A.length; d++) out["row" + d] = {
							text:
								(d == S.d) ? "-" :
								(!S.A[d].length) ? "None" :
								(S.A[d].length == dc.shown[d].length) ? "All " + dc.getMeta("title", {d:d}) :
								dc.getMeta("name", {d:d, as:S.A}).join(", "),
							"font-weight":(d == controller.d) ? "bold" : "normal"
						};
						return out;
					}
				},
				bars:{
					type:"zRectangle", mask:"all", // Mask is recalculated by S.updateData()
					layer:1,
					init:function (S, D, mode) {
						return {
							fill:S.fill,
							layout:{y:yAxis.L.bottom, xAlign:"xCentre", yAlign:"bottom"},
							mouseEvents:function (D) {
								D.hoverHighlight(D.Y.highlight.t, D.Y.highlight.e);
								D.tooltip(null, tooltipBox);
							}
						};
					},
					curr:function (S, D, mode) {
						var val = dc.calcData("sum", "val", {as:D.A});
						return {
							layout:{
								x:xAxis.getX({a:D.A[S.d]}) + S.offset,
								width:xAxis.notchWidth,
								height:yAxis.getLength(val)
							},
							tooltipText:val // Text is updated on the zMultiDrone, and does not automatically flow through to the drone.O. Because the tooltip is being called from the drone, drone.O needs to be updated manually.
						};
					}
				}
			}
		});
	};
	controller.swarms = groups;
	sAxis.layer();
	logger("Olappy(): Done.");
};