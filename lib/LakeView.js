LakeView = function (rawData, style, layout) {
	logger("LakeView(): Initialising.");
	// Layout
	L = zt.getMaxLayout(800, 600, 50);
	with (L) {
		L.tooltipBox = {width:300}; // TooltipBox is floating, so position doesn't need to be defined, and height is automatic (depending on text)
		L.swarm = new zLayout({
			x:width * 0.5 + 40, y:height * 0.5, //y:height * 0.53,
			width:width - 80,
			height:(bottom - 10 - height * 0.5) * 2, //height:(bottom - 10 - height * 0.52) * 2,
			xAlign:"xCentre", yAlign:"yCentre"
		});
		L.credit = {x:left, y:bottom, xAlign:"left", yAlign:"bottom", margin:16};
	};
	with (L.swarm) {
		L.viewPort = new zLayout({
			x:x, y:y + 20,
			width:width - 280, height:height - 160,
			xAlign:xAlign, yAlign:yAlign
		});
		L.dAxis = {
			x:left, y:bottom, width:height,
			xAlign:"right", yAlign:"top", rotation:90
		};
		L.instructions = {
			anchor:getPoint(0.43, 0.04),
			width:280, xAlign:"xCentre"
		};
	};
	L = zo.extend(L, layout); // Overwrite layout with user-defined layout

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
		highlight:{t:300, e:"<>"},
		merge:{t:800, e:"<>"},
		zoom:{t:800, e:"<>"},
		// Text formating
		valFormat:{m:"abbreviate", dp:1, prefix:"$"},
		wordFormat:{base:"valFormat", wordSign:true},
		decFormat:{m:"%", dp:1},
		// Reference styles
		line:{"stroke-width":0.5},
		text:{
			margin:6,
			"font-size":14,
			fill:"#333",
			branch:{base:"line"}
		},
		title:{
			"font-size":24,
			"font-weight":"bold",
			fill:"#555"
		},
		// Objects
		background:{
			fill:"#f0f4f5",
			"stroke-width":0
		},
		credit:{
			opacity:0.6
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
		dAxis:{
			maxNotches:6,
			label:{
				format:{base:"decFormat"},
 				radialStart:-L.swarm.width,
				radialEnd:8,
				base:"text",
				fill:"#999",
				"font-weight":"bold",
				branch:{stroke:"#ccc"}
			},
			axisTitle:{
				base:"text",
				margin:42,
				fill:"#999"
			}
		},
		swarm:{
			backgroundLabel:{
				margin:20,
				"font-size":50,
				"font-weight":"bold",
				fill:"#ccc"
			},
			bar:{
				gap:0.003,
				"stroke-width":0,
				opacity:1,
				shader:{
 					base:"background",
					opacity:0.001
				},
				fade:{
					opacity:0.15,
					shader:{opacity:0.001}
				},
				highlight:{
					opacity:1,
					shader:{opacity:0.5}
				}
			},
			treemap:{
				stroke:"#666",
				"stroke-width":0.5,
				highlight:{"stroke-width":2}
			},
			label:{
				smallGap:3,
				bigGap:7,
				textGap:6,
				title:{
					base:"title",
					margin:4,
					format:{wrap:20}
				},
				subTitle:{
					base:"title",
					"font-size":12
				},
				text:{base:"text"},
				bracket:{base:"line"}
			},
			axisLine:{
				"stroke-width":1.5,
				"stroke-opacity":0.3
			},
			instructions:{opacity:0.8}
		}
	};
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("LakeView(): Collating and crunching data.");
	var dc = new zDataCube(2, rawData);
	dc.prepareData = function () { // Store preparation phase in function so changeMode can call it later
		var dc = this, i, index = [];
		with (dc) {
			CURR_TIME = getSize(1) - 1; // Last period
			BASE_TIME = CURR_TIME - 1; // Second to last period
			logger("LakeView(): Comparing dates " + getName({d:1, a:BASE_TIME}) + " and " + getName({d:1, a:CURR_TIME}));
			// Set initial generation
			if (meta[0].tree.length > 2) explode("LakeView(): More than two generations. Your data is broken because some of the parentNames already exist as names.");
			calcTreeData("sum", "val", 0); // Checks that low-level nodes add up to high level nodes if they exist, or creates them if they don't
			addCalcData("dec", "val", {as:"all", mask:{d:0, a:meta[0].tree[0]}});
			addCalcData("stacked", "valDec", {as:"all", mask:{d:0, a:meta[0].tree[0]}}); // Calculate stacked dec (used for horizontal positioning)
			setShown(0, meta[0].tree[0]);
			// Add names to searchBox
			for (i = 0; i < getSize(0); i++) {
				index.push({key:i, label:meta[0].name[i]}); // Log name (searchBox will need this)
			};
			$("#searchBox").autocomplete({source:index, select:function (event, ui) {swarm.zoomTo(ui.item.key)}}); // Give list to searchBox
			// Sanity checks
		};
	};
	dc.prepareData();

	// Drawing
	logger("LakeView(): Drawing accessorires.");
	PAPER = zt.makePaper(L);
	var background = new zRectangle({layout:L, base:Y.background}),
		credit = new zHTML({
			layout:L.credit, base:Y.credit,
			content:"<a id=chewy href=http://www.chewydata.com>Powered by ChewyData</a>"
		}),
		tooltipBox = new zHTMLTooltipBox({layout:L.tooltipBox, base:Y.tooltipBox}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			range:[-0.48, 0.48], title:"Change (%)",
			updateData:function () {if (swarm) this.L.set({y:swarm.L.bottom, width:swarm.L.height})},
			plan:{axisLine:null}
		});
	background.hover(function () {if (!swarm.locked) swarm.highlight()});
	background.click(function () {
		if (!swarm.locked && swarm.zoomLevel != 0) swarm.zoomTo();
	});

	logger("LakeView(): Drawing main swarm.");
	var swarm = new zSwarm({ // Resources
		layout:L.swarm, style:Y.swarm,
		dc:dc, A:[dc.meta[0].tree[0], CURR_TIME],
		zoomLevel:0, selected:null, highlighted:null,
		onInit:function () {
			var S = this, max = 0, min = 0;
			dc.forPos({d:0, as:S.A}, function (x) {
				var baseSum = S.getBaseVal(x.a) || 1,
					changes = S.getValChange(dc.findChildren(x)),
					out = {
						changeSum:za.sum(changes),
						changeSumPos:za.sum(za.getAll(changes, 0, ">")),
						changeSumNeg:za.sum(za.getAll(changes, 0, "<"))
					};
				dc.setMeta(null, x, out);
				min = Math.min(min, out.changeSumNeg / baseSum);
				max = Math.max(max, out.changeSumPos / baseSum);
			});
// 			dAxis.setShown([min * 1.1, max * 1.1]); // Reset dAxis
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
		getValChange:function (aPos) {
			if (aPos instanceof Array) {
				var i, out = [];
				for (i = 0; i < aPos.length; i++) {
					out[i] = this.getValChange(aPos[i]);
				};
				return out;
			} else return this.getCurrVal(aPos) - this.getBaseVal(aPos);
		},
		getColour:function (dec) {
			var S = this;
			if (isNaN(dec) || dec == Infinity) return Y.nullFill;
			return zt.getColour(dec / Y.maxVal, Y.neuFill, Y.posFill, Y.negFill);
		},
		getAll:function (x) {
			var S = this, aPos = dc.asAPos(x);
			return {
				base:S.getBaseVal(aPos),
				baseDec:dc.getData("valDec", {as:[aPos, BASE_TIME]}),
				baseStacked:dc.getData("valDecStacked", {as:[aPos, BASE_TIME]}),
				net:dc.getMeta("changeSum", {d:0, a:aPos}),
				pos:dc.getMeta("changeSumPos", {d:0, a:aPos}),
				neg:-dc.getMeta("changeSumNeg", {d:0, a:aPos})
			};
		},
		getBarLayout:function (x) {
			var S = this,
				v = S.getAll(x),
				rPos = dc.asRPos(x),
				scale = 1 - S.Y.bar.gap * (dc.meta[0].tree[0].length + 1), // Count how many gaps are required and scale down the width
				anchor = {
					x:S.L.getX(v.baseStacked.start * scale + S.Y.bar.gap * (rPos + 1)),
					y:dAxis.getPoint(0).y
				},
				width = S.L.width * v.baseDec * scale,
				posHeight = dAxis.getLength(v.pos / (v.base || 1)),
				negHeight = dAxis.getLength(v.neg / (v.base || 1)),
				shaderHeight = 2 * Math.min(posHeight, negHeight);
			return {
				anchor:anchor, width:width,
				posHeight:posHeight, negHeight:negHeight, shaderHeight:shaderHeight,
				left:anchor.x, right:anchor.x + width,
				top:anchor.y - posHeight, bottom:anchor.y + negHeight,
				centre:{x:anchor.x + width * 0.5, y:anchor.y},
				netTop:(posHeight > negHeight) ? anchor.y - posHeight : anchor.y + posHeight,
				netBottom:(posHeight > negHeight) ? anchor.y - negHeight : anchor.y + negHeight
			};
		},
		addTreemap:function (aPos, t, e, b, w) {
			var S = this,
				D = S.get({d:0, a:aPos})[0].parts,
				i, posChildren = [], negChildren = [], posChange = [], negChange = [],
				children = dc.findChildren({d:0, a:aPos}),
				changes = S.getValChange(children);
			for (i = 0; i < children.length; i++) {
				if (changes[i] > 0) {
					posChildren.push(children[i]);
					posChange.push(changes[i]);
				} else if (changes[i] < 0) {
					negChildren.push(children[i]);
					negChange.push(-changes[i]); // Treemap requires positive values
				};
			};
			dc.setTreemap({d:0, a:posChildren}, posChange, D.pos.L); // Actual treemapping happens here
			dc.setTreemap({d:0, a:negChildren}, negChange, D.neg.L); // Actual treemapping happens here
			children = posChildren.concat(negChildren); // Once posChildren and negChildren have been mapped, they can be remerged - however, all the children with change of 0 are still ignored
			S.add({d:0, a:children, role:"treemap"}, t, e, b, w);
		},
		highlight:function (aPos, b) {
			var S = this, t = Y.highlight.t, e = Y.highlight.e;
			if (aPos == S.targ) return; // Don't act on duplicate action
			S.targ = aPos;
			S.G.delay((b) ? null : (aPos == null) ? 200 : 20, function () {
				if (aPos != S.targ) return; // Quit if targ has changed
				if (aPos == null && S.zoomLevel == 0) { // Reset
					S.remove("label", t, e, null, S.K);
					S.add("instructions", t, e, null, S.K);
					S.reset("all", t, e, b);
					S.highlighted = aPos;
				} else { // Zoom
					if (S.highlighted == null) { // No current highlighted
						S.highlighted = (S.selected == null) ? aPos : S.selected; // Free move only at the top level - otherwise highlighted always == selected
						S.show("label", t, e, null, S.K); // Show will cancel out remove, in case a remove is in progress
						S.add("label", t, e, null, S.K); // Add won't work if remove hasn't finished
					} else {
						S.highlighted = (S.selected == null) ? aPos : S.selected; // Free move only at the top level - otherwise highlighted always == selected
					};
					S.refresh({role:"label", mode:{noUpdateData:true}}, t, e, b); // Move existing highlighted
					S.animate({d:0, a:"all"}, "fade", t, e, null, S.K);
					S.animate({d:0, a:[aPos, S.highlighted]}, "highlight", t, e, null, S.K); // Highlight aPos AND S.highlighted - they are one and the same at zoomLevel 0, but different at zoomLevel >0
					S.remove("instructions", t, e, null, S.K);
				};
				S.targ = -1;
			});
		},
		zoomTo:function (aPos) {
			var S = this, t, e;
			S.lock();
			if (S.zoomLevel == 0) { // Top level
				S.zoomLevel = 1;
				if (aPos == S.highlighted) S.zoomTo(aPos); // Straight to zoom if already highlighted
				else S.highlight(aPos, function () {S.zoomTo(aPos)}); // Otherwise highlight first
			} else if (S.zoomLevel == 1) { // Zoomed in already
				if (aPos == S.selected) { // Show treemap
					t = Y.merge.t, e = Y.merge.e;
					S.zoomLevel = 2;
					S.refresh({role:"label", mode:{noUpdateData:true}}, t, e, null, S.K);
					S.addTreemap(aPos, t, e, S.unlock);
				} else {
					t = Y.zoom.t, e = Y.zoom.e;
					if (aPos == null) { // Zoom out
						S.zoomLevel = 0;
						S.L.set(L.swarm);
					} else { // Shift/zoom to another bar
						S.L.zoom(S.getBarLayout({d:0, a:aPos}), L.viewPort);
					};
					dAxis.refresh("all", t, e, null, S.K); // dAxis has to go in the middle because dAxis depends on S.L, but S.plot() depends on dAxis
					S.refresh("all", t, e, function () {S.highlight(aPos, S.unlock)});
				};
				S.selected = aPos;
			} else if (S.zoomLevel == 2) { // Treemap already showing
				t = Y.merge.t, e = Y.merge.e;
				S.zoomLevel = 1;
				S.remove("treemap", t, e, function () {S.zoomTo(aPos)}); // Remove treemap
			};
		},
		plan:{
			backgroundLabel:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, D, mode) {
					return [{
						type:"zText", text:"New",
						layout:{
							x:S.L.right, y:S.L.top,
							xAlign:"right", yAlign:"top"
						}
					},{
						type:"zText", text:"Cuts",
						layout:{
							x:S.L.right, y:S.L.bottom,
							xAlign:"right", yAlign:"bottom"
						}
					}];
				}
			},
			bar:{
				type:"zMultiDrone", mask:"mask",
				init:function (S, D, mode) {
					return {
						pos:{
							type:"zRectangle", layer:0, fill:S.getColour(0.3)
						},
						neg:{
							type:"zRectangle", layer:0, fill:S.getColour(-0.3)
						},
						shader:{
							type:"zRectangle", layer:1
						},
						mouseEvents:function (D) {
							D.hover(function () {if (!S.locked) S.highlight(D.A[0])});
							D.click(function () {if (!S.locked) S.zoomTo(D.A[0])});
						}
					};
				},
				curr:function (S, D, mode) {
					var l = S.getBarLayout({d:0, as:D.A});
					return {
						layout:{anchor:l.anchor, width:l.width}, // Common layout
						pos:{
							layout:{yAlign:"bottom", height:l.posHeight}
						},
						neg:{
							layout:{yAlign:"top", height:l.negHeight}
						},
						shader:{
							layout:{yAlign:"yCentre", height:l.shaderHeight}
						}
					};
				}
			},
			treemap:{
				type:"zRectangle", mask:"mask", ignore:true,
				init:function (S, D, mode) {
					var layout = dc.getMeta("layout", {d:0, a:D.A[0]}),
						title = dc.getMeta("name", {d:0, a:D.A[0]}),
						description = dc.getMeta("description", {d:0, a:D.A[0]}),
 						baseYear = dc.getMeta("name", {d:1, a:BASE_TIME}),
						currYear = dc.getMeta("name", {d:1, a:CURR_TIME}),
						baseVal = S.getBaseVal(D.A[0]),
						currVal = S.getCurrVal(D.A[0]),
						change = currVal - baseVal,
						fill = S.getColour(currVal / baseVal - 1);
					return {
						layer:2, layout:layout, fill:fill,
						mouseEvents:function (D) {
							D.hover(function () {
								if (!zt.isBetween(zDebug.checkIE(), 0, 9)) D.toFront(); // In IE9 and below, toFront() strips events
							});
							D.hoverHighlight(160, "<>");
							D.tooltip(null, tooltipBox, {
								x:D.L.centre.x,
								y:(change > 0) ? D.L.bottom + 4 : D.L.top - 4,
								xAlign:"xCentre",
								yAlign:(change > 0) ? "top" : "bottom"
							});
						},
						tooltipText:
							"<h3>" + title + "</h4>" +
							"<i>" + ((!currVal) ? "Cut" : zt.format(currVal, Y.valFormat) + " in " + currYear) +
							" (" + ((!baseVal) ? "New" : zt.format(change, Y.wordFormat) + " since " + baseYear) + ")</i>" +
							"<p>" + description + "</p>"
					};
				}
			},
			label:{
				type:"zMultiDrone", mask:"fixed", ignore:true,
				init:function (S, D, mode) {
					return {
						mouseEvents:function (D) {
							D.click(function () {
								if (!S.locked) S.zoomTo((S.zoomLevel < 2) ? S.selected : null);
							});
						}
					};
				},
				curr:function (S, D, mode) {
					var labeller = function (text, point1, point2) {
						var deg = zp.deg(point1, point2) + 90,
							bigGap = S.Y.label.bigGap,
							smallGap = S.Y.label.smallGap,
							textGap = S.Y.label.textGap;
						return {
							type:"zMultiDrone",
							text:{
								type:"zTextBox",
								text:text,
								layout:{
									anchor:zo.mid(point1, point2), radial:deg,
									radialStart:bigGap, radialEnd:textGap + bigGap
								}
							},
							bracket:{
								type:"zLine",
								points:[
									zp.addVector(deg, smallGap, point1),
									zp.addVector(deg, bigGap, point1),
									zp.addVector(deg, bigGap, point2),
									zp.addVector(deg, smallGap, point2)
								]
							}
						};
					};
					var v = S.getAll({d:0, a:S.highlighted}),
						l = S.getBarLayout({d:0, a:S.highlighted}),
						name = dc.getMeta("name", {d:0, a:S.highlighted}),
						baseYear = dc.getMeta("name", {d:1, a:BASE_TIME});
					return {
						layer:2,
						title:{
							type:"zTextBox",
							text:name,
							layout:{
								x:l.centre.x, y:l.top - 28,
								xAlign:"xCentre", yAlign:"bottom"
							}
						},
						subTitle:{
							type:"zTextBox",
							text:
								(S.zoomLevel == 0) ? "Click to zoom" :
								(S.zoomLevel == 1) ? "Click again to show detailed breakdown" :
								(S.zoomLevel == 2) ? "Click background to zoom out" : "",
							layout:{
								x:l.centre.x, y:l.top - 28,
								xAlign:"xCentre", yAlign:"top"
							}
						},
						width:labeller(
							zt.format(v.base, Y.valFormat) + " \n" +
							"(" + zt.format(v.baseDec, Y.decFormat) + " of Budget in " + baseYear + ")",
							{x:l.left, y:l.bottom}, {x:l.right, y:l.bottom}
						),
						pos:labeller(
							zt.format(v.pos, Y.valFormat) + " of new funding",
							{x:l.left, y:l.top}, {x:l.left, y:l.centre.y}
						),
						neg:labeller(
							zt.format(v.neg, Y.valFormat) + " of cuts",
							{x:l.left, y:l.centre.y}, {x:l.left, y:l.bottom}
						),
						net:labeller(
							"Net " + ((v.pos >= v.neg) ? "increase" : "decrease") +
							" of \n" + zt.format(Math.abs(v.net), Y.valFormat) +
							" (" + zt.format(v.net / v.base, Y.decFormat) + ")",
							{x:l.right, y:l.netBottom}, {x:l.right, y:l.netTop}
						)
					};
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
			instructions:{
				type:"zHTML", mask:"fixed",
				init:function (S, D, mode) {
					var name = dc.getMeta("name", {d:1, a:S.A[1] - 1}); // Budget 2012 defines the budget for 2013, etc
					return {
						content:
							"<div><h1>Budget " + name + "</h1>" +
							"<p>This shows all the changes to the budget this year. " +
							"The width of each bar shows how big that category is at the moment. " +
							"The top part (green) shows the increases in that category, " +
							"the bottom part (purple) shows the cuts.</p>" +
							"<p><b>Move your mouse over a bar to see more details.</b></p><div>",
						layout:L.instructions
					};
				}
			}
		}
	});
	SWARM = swarm;
	logger("LakeView(): Done.");
};