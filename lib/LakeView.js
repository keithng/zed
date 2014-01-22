/*
TODO:
Revenue version
Scrolling sideways
Dynamic position to show net changes
Filtering - can't do without rewriting .calcTreeData() because .filterMeta() only changes .shown, which does not affect .calcTreeData() because it relies on child-parent relationships rather than shown.
Can rewrite filter, as there are only two generations, which should be easy
*/
LakeView = function (rawData, style, layout) {
	logger("Budget2012(): Initialising.");
	// Layout
	var L = {base:zt.getMaxLayout(1024, 768)};
	with (L.base) {
		L.swarm = new zLayout({
			x:width * 0.52, y:height * 0.5, //y:height * 0.53,
			width:(right - 10 - width * 0.52) * 2,
			height:(bottom - 10 - height * 0.5) * 2, //height:(bottom - 10 - height * 0.52) * 2,
			xAlign:"xCentre", yAlign:"yCentre"
		});
	};
	with (L.swarm) {
		L.viewPort = new zLayout({
			x:x, y:y + 20,
			width:width - 280, height:height - 160,
			xAlign:xAlign, yAlign:yAlign
		});
		L.tAxis = {
			x:left + 10, y:10,
			width:width - 20, height:top - 20
		};
		L.dAxis = {
			x:left, y:bottom, width:height, height:70,
			xAlign:"right", yAlign:"top", rotation:90
		};
		L.credits = {
			x:left, y:bottom,
			xAlign:"left", yAlign:"bottom"
		};
	};

	// Style
	var Y = {
		base:{
			valFormat:{mode:"abbreviate", dp:1},
			decFormat:{mode:"%", dp:1},
			line:{
				opacity:0.8
			},
			text:{
				margin:6,
				"font-size":14,
				fill:"#333",
				branch:{
					baseStyle:"base.line"
				}
			},
			title:{
				"font-size":24,
				"font-weight":"bold",
				fill:"#555"
			}
		}
	};
	zo.extend(Y, {
		background:{
			fill:"#f0f4f5",
			stroke:null,
			"stroke-opacity":0
		},
		tAxis:{
			select:{t:300},
			extension:0
		},
		dAxis:{
			minNotchGap:0.1,
			axisTitle:{
				baseStyle:"base.text",
				opacity:0.6
			},
			label:{
				baseStyle:"base.text",
				format:Y.base.decFormat,
 				radialStart:-L.swarm.width,
				radialEnd:8,
				opacity:0.4,
				branch:{
					stroke:"#666",
					opacity:0.1
				}
			}
		},
		swarm:{
			topLabel:{
				margin:20,
				"font-size":50,
				"font-weight":"bold",
				fill:"#666",
				opacity:0.2
			},
			bottomLabel:{baseStyle:"swarm.topLabel"},
			title:{
				"font-size":36,
				"font-weight":"bold",
				fill:"#666",
				opacity:0.85,
				fade:{opacity:0}
			},
			notes:{
				margin:8,
				format:{wrap:60},
				"font-size":12,
				fill:"#666",
				opacity:0.9,
				fade:{opacity:0}
			},
			instructions:{
				margin:10,
				format:{wrap:28},
				"font-size":16,
				"font-weight":"bold",
				fill:"#666",
				opacity:1,
				fade:{opacity:0}
			},
			bar:{
				gap:0.003,
				pos:{
					stroke:null,
					"stroke-opacity":0,
					fill:"#5FA25B",
					opacity:0.9
				},
				neg:{
					baseStyle:"swarm.bar.pos",
					fill:"#8F6DA3"
				},
				shader:{
					baseStyle:"background",
					opacity:0
				},
				fade:{
					pos:{opacity:0.15},
					neg:{opacity:0.15},
					shader:{opacity:0}
				},
				highlight:{
					pos:{opacity:1},
					neg:{opacity:1},
					shader:{opacity:0.5}
				}
			},
			label:{
				valFormat:Y.base.valFormat,
				decFormat:Y.base.decFormat,

				smallGap:3,
				bigGap:7,
				textGap:6,
				title:{
					baseStyle:"base.title",
					margin:0,
					format:{wrap:20}
				},
				subTitle:{
					baseStyle:"base.title",
					"font-size":12
				},
				width:{baseStyle:"base.text"},
				pos:{baseStyle:"base.text"},
				neg:{baseStyle:"base.text"},
				net:{
					baseStyle:"base.text",
					"font-weight":"bold"
				},
				widthLine:{baseStyle:"base.line"},
				posLine:{baseStyle:"base.line"},
				negLine:{baseStyle:"base.line"},
				netLine:{baseStyle:"base.line"}
			},
			treemap:{
				fill:"#fff",
				opacity:0.1,
				highlight:{opacity:0.5}
			},
			altTreeMap:{
				baseStyle:"swarm.treemap",
				opacity:0.25
			},
			axisLine:{
				"stroke-width":2,
				"stroke-opacity":0.3
			},
			treeTip:{
				valFormat:Y.base.valFormat,
				background:{
					rounded:5,
					fill:"#cdddfd",
					stroke:"#6d7d9d",
					"stroke-opacity":0.3,
					opacity:0.9
				},
				title:{
					format:{wrap:52},
					"font-size":14,
					"font-weight":"bold",
					fill:"#333"
				},
				val:{
					"font-size":12,
					fill:"#333"
				},
				description:{
					format:{wrap:72},
					"font-size":11,
					fill:"#333"
				}
			}
		},
		credits:{
			margin:5,
			fill:"#999"
		}
	});
	Y = zo.parseStyle(zo.extend(Y, style)); // Overwrite style with user-defined style first, then parse

	// Data
	logger("Budget2012(): Collating and crunching data.");
	var BASE_TIME = 0, CURR_TIME = 1,
		dc = new zDataCube(2, rawData);
	with (dc) { // Load rawStrip
		if (meta[0].tree.length > 2) explode("Budget2012(): More than two generations. Your data is broken because some of the parentLabels already exist as a label.");
		calcTreeData("sum", "val", 0);
		addCalcData("dec", "val", {as:"all", mask:{d:0, a:meta[0].tree[0]}});
		addCalcData("stacked", "valDec", {as:"all", mask:{d:0, a:meta[0].tree[0]}}); // Calculate stacked dec (used for horizontal positioning)
		addCalcData("change", "val", {as:"all", mask:{d:1, a:[BASE_TIME, CURR_TIME]}});
		setShown(0, meta[0].tree[0]);
	};

	// Drawing
	logger("Budget2012(): Drawing accessorires.");
	PAPER = zt.makePaper(L.base);
	var background = new zRectangle({layout:L.swarm, base:Y.background}),
		credits = new zTextBox({text:"Created by Keith Ng", layout:L.credits, base:Y.credits}),
		dAxis = new zAxis({
			layout:L.dAxis, style:Y.dAxis,
			range:[-0.48, 0.48], title:"Change (%)",
			updateData:function () {if (swarm) this.L.set({y:swarm.L.bottom, width:swarm.L.height})},
			plan:{axisLine:null}
		});
	background.click(function () {swarm.zoom()});
	background.hover(function () {
		if (swarm.zoomLevel == 0) swarm.focus();
		else swarm.highlight();
	});

	logger("Budget2012(): Drawing main swarm.");
	var swarm = new zSwarm({ // Resources
		layout:L.swarm.getVitals(), style:Y.swarm,
		dc:dc, d:0,
		rSpace:["all", 1],
		A:[dc.meta[0].tree[0], 1],
		focused:null,
		focus:function (aPos, b) {
			var S = this, t = 400, e = "<>";
			S.targFocus = aPos;
			S.G.stop();
			S.G.redraw((aPos == null) ? 400 : 50, null, function () {
				if (aPos != S.targFocus) return; // Quit if targHighlighted has changed
				if (aPos == S.focused) return; // Quit if already highlighted
				if (aPos == null) { // Reset
					S.focused = aPos;
					S.reset("all", t, e);
					S.remove("label", t, e);
				} else {
					if (S.focused == null) {
						S.focused = aPos;
						S.show("label", t, e); // Show will cancel out remove, in case a remove is in progress
						S.add("label", t, e); // Add won't work if remove hasn't finished
					} else S.focused = aPos;
					S.animate("title", "fade", t, e);
					S.animate("notes", "fade", t, e);
					S.animate("instructions", "fade", t, e);
					S.highlight(aPos, b);
					S.refresh({string:"label", mode:{noUpdateData:true}}, t, e); // Move existing focus
				};
			});
		},
		highlight:function (aPos, b) {
			var S = this, t = 400, e = "<>",
				toHighlight = [], toFade = dc.meta[0].tree[0].slice();
			if (S.zoomed != null) {
				if (S.zoomLevel < 2) toHighlight.push(S.zoomed);
				za.remove(toFade, S.zoomed);
			};
			if (aPos != null && aPos != S.zoomed) {
				toHighlight.push(aPos);
				za.remove(toFade, aPos);
			};
			S.animate({d:0, a:toFade}, "fade", t, e);
			S.animate({d:0, a:toHighlight}, "highlight", t, e);
		},
		zoomLevel:0, zoomed:null,
		getZoomLayout:function (aPos) {
			var S = this, D = S.get({d:0, a:aPos})[0],
				posL = D.parts.pos.L, negL = D.parts.neg.L;
			return {x:posL.left, y:posL.top, width:posL.width, height:posL.height + negL.height};
		},
		zoom:function (aPos) {
			var S = this, i, t, e;
			if (S.zoomLevel == 0) { // Zoom from total
				logger("Zooming in.");
				if (aPos == null) return; // Can't unzoom further
				if (S.focused != aPos) return S.focus(aPos, function () {S.zoom(aPos)}); // If not already focused, focus first, then try again
				t = 800, e = "<>";
				S.zoomLevel = 1;
				S.L.zoom(S.getZoomLayout(aPos), L.viewPort);
				dAxis.refresh("all", t, e, null, S.K); // dAxis has to go in the middle because dAxis depends on S.L, but S.plot() depends on dAxis
				S.remove("title", t, e);
				S.remove("notes", t, e);
				S.remove("instructions", t, e);
				S.refresh("all", t, e);
			} else if (S.zoomLevel == 1) { // Zoom out
				t = 500, e = "<>";
				if (aPos == S.zoomed) { // Show treemap
					logger("Showing treemap.");
					S.zoomLevel = 2;
					S.refresh({string:"label", mode:{noUpdateData:true}}, t, e);
					S.reset({d:0, a:aPos}, t, e);
					S.treemap(aPos, t, e);
				} else {
					if (aPos == null) { // Zoom out
						logger("Zooming out.");
						S.zoomLevel = 0;
						S.L.set(L.swarm);
						S.add("title", t, e);
						S.add("notes", t, e);
						S.add("instructions", t, e);
					} else { // Shift to another bar
						logger("Shifting.");
						S.L.zoom(S.getZoomLayout(aPos), L.viewPort);
					};
					dAxis.refresh("all", t, e, null, S.K); // dAxis has to go in the middle because dAxis depends on S.L, but S.plot() depends on dAxis
					S.refresh("all", t, e, function () {S.focus(aPos)});
				};
			} else if (S.zoomLevel == 2) {
				logger("Removing treemap.");
				t = 500, e = "<>";
				S.zoomLevel = 1;
				for (i = 0; i < S.treeNodes.length; i++) S.treeNodes[i].remove(t, e, null, S.K);
				return S.G.redraw(t, e, function () {S.zoom(aPos)});
			};
			S.zoomed = aPos;
		},
		treeNodes:[],
		treemap:function (aPos, t, e, b, w) {
			var S = this,
				D = S.get({d:0, a:aPos})[0],
				i, layout, obj, posChildren = [], negChildren = [], posChange = [], negChange = [],
				currTime = dc.asAPos({d:1, a:S.A[1]}),
				children = dc.findChildren({d:0, a:aPos}),
				changes = dc.getData("valChange", {as:[children, currTime]}),
				posL = D.parts.pos.L, negL = D.parts.neg.L;
			for (i = 0; i < children.length; i++) {
				if (changes[i] > 0) {
					posChildren.push(children[i]);
					posChange.push(changes[i]);
				} else if (changes[i] < 0) {
					negChildren.push(children[i]);
					negChange.push(-changes[i]); // Treemap requires positive values
				};
			};
			dc.treemap({d:0, a:posChildren}, posChange, posL); // Actual treemapping happens here
			dc.treemap({d:0, a:negChildren}, negChange, negL); // Actual treemapping happens here
			children = posChildren.concat(negChildren); // Once posChildren and negChildren have been mapped, they can be remerged - however, all the children with change of 0 are still ignored
			for (i = 0; i < children.length; i++) {
				layout = dc.getMeta("layout", {d:0, a:children[i]});
				val = dc.getData("val", {as:[children[i], currTime]});
				change = dc.getData("valChange", {as:[children[i], currTime]});
				obj = new zRectangle({layout:layout, base:(!val || val == change) ? S.Y.altTreeMap : S.Y.treemap}, t, e, null, S.K);
				obj.aPos = children[i];
				obj.hover(function (D) {S.treeTip(this.parent.aPos, this.parent.L)}, function () {S.treeTip()});
				obj.hoverHighlight(400, "<>");
				S.treeNodes.push(obj);
			};
			S.G.redraw(t, e, b, w);
		},
		treeFocused:null, treeTipLayout:null,
		treeTip:function (aPos, layout) {
			var S = this, t, e;
			S.targTreeFocused = aPos;
			S.G.redraw(50, null, function () {
				if (aPos != S.targTreeFocused) return; // Quit if targHighlighted has changed
				if (aPos == S.treeFocused) return; // Quit if already highlighted
				if (aPos == null) S.remove("treeTip"); // Reset
				else {
					S.treeTipLayout = layout;
					S.treeFocused = aPos;
					if (S.plan.treeTip.ignore) S.add("treeTip"); // Add won't work if remove hasn't finished
					S.refresh({string:"treeTip", mode:{noUpdateData:true}}); // Move existing focus
				};
			});
		},
		plan:{
			title:{
				type:"zTextBox", mask:"fixed",
				init:function (S, D, mode) {
					return {
						text:"Budget " + dc.getMeta("name", {d:1, a:S.A[1] - 1}),
						layout:{anchor:S.L.getPoint(0.43, 0.12), xAlign:"xCentre", yAlign:"bottom"}
					};
				}
			},
			notes:{
				type:"zTextBox", mask:"fixed",
				init:function (S, D, mode) {
					var layout = S.get("title")[0].L;
					return {
						text:"This shows all the changes to the budget this year. The width of each bar shows how big that category is at the moment. The top part (green) shows the increases in that category, the bottom part (purple) shows the cuts.",
						layout:{x:layout.x, y:layout.bottom, xAlign:"xCentre", yAlign:"top"}
					};
				}
			},
			instructions:{
				type:"zTextBox", mask:"fixed",
				init:function (S, D, mode) {
					var layout = S.get("notes")[0].L;
					return {
						text:"Move your mouse over a bar to see more details.",
						layout:{x:layout.x, y:layout.bottom, xAlign:"xCentre", yAlign:"top"}
					};
				}
			},
			topLabel:{
				type:"zTextBox", mask:"fixed",
				init:function (S, D, mode) {
					return {
						text:"New",
						layout:{x:S.L.right, y:S.L.top, xAlign:"right", yAlign:"top"}
					};
				}
			},
			bottomLabel:{
				type:"zTextBox", mask:"fixed",
				init:function (S, D, mode) {
					return {
						text:"Cuts",
						layout:{x:S.L.right, y:S.L.bottom, xAlign:"right", yAlign:"bottom"}
					};
				}
			},
			bar:{
				type:"zMultiDrone", mask:"mask",
				init:function (S, D, mode) {
					return {
						mouseEvents:function (D) {
							D.hover(function () {
								if (S.zoomLevel == 0) S.focus(D.A[0]);
								else S.highlight(D.A[0]);
							});
							D.click(function () {S.zoom(D.A[0])});
						},
						pos:{type:"zRectangle"},
						neg:{type:"zRectangle"},
						shader:{type:"zRectangle"}
					};
				},
				curr:function (S, D, mode) {
					var rPos = dc.asRPos({d:0, a:D.A[0]}),
						baseDec = dc.getData("valDecStacked", {as:[D.A[0], BASE_TIME]}),
						scale = 1 - S.Y.bar.gap * (dc.meta[0].tree[0].length + 1), // Count how many gaps are required and scale down the width
						width = S.L.width * (baseDec.end - baseDec.start) * scale,
						baseVal = dc.getData("val", {as:[D.A[0], BASE_TIME]}),
						children = dc.findChildren({d:0, a:D.A[0]}),
						childrenVal = dc.getData("valChange", {as:[children, D.A[1]]}),
						netVal = za.sum(childrenVal),
						posVal = za.sum(za.getAll(childrenVal, 0, ">")),
						negVal = -za.sum(za.getAll(childrenVal, 0, "<")),
						anchor = {
							x:S.L.left + S.L.width * (baseDec.start * scale + S.Y.bar.gap * (rPos + 1)),
							y:dAxis.getPoint(0).y + ((true) ? 0 : ((posVal >= negVal) ? negHeight : -posHeight)) // Align on net change
						},
						posL = {anchor:anchor, width:width, height:dAxis.getLength(posVal / baseVal), yAlign:"bottom"},
						negL = {anchor:anchor, width:width, height:dAxis.getLength(negVal / baseVal), yAlign:"top"},
						shaderL = {
							anchor:posL.anchor, yAlign:"yCentre",
							width:posL.width, height:2 * Math.min(posL.height, negL.height)
						};
					return {
						data:{baseVal:baseVal, baseDec:baseDec, netVal:netVal, posVal:posVal, negVal:negVal, posL:posL, negL:negL, shaderL:shaderL},
						pos:{layout:posL},
						neg:{layout:negL},
						shader:{layout:shaderL}
					};
				}
			},
			axisLine:{
				type:"zLine", mask:"fixed",
				curr:function (S, D, mode) {
					return {
						layer:1,
						points:[{x:L.swarm.left, y:dAxis.getPoint(0).y}, {x:L.swarm.right, y:dAxis.getPoint(0).y}]
					};
				}
			},
			label:{
				type:"zMultiDrone", mask:"fixed", ignore:true,
				init:function (S, D, mode) {
					return {
						mouseEvents:function (D) {
							D.click(function () {
								if (S.zoomLevel < 2) S.zoom(S.zoomed);
								else S.zoom();
							});
						},
						title:{type:"zTextBox"},
						subTitle:{type:"zTextBox"},
						width:{type:"zTextBox"},
						widthLine:{type:"zLine"},
						pos:{type:"zTextBox"},
						posLine:{type:"zLine"},
						neg:{type:"zTextBox"},
						negLine:{type:"zLine"},
						net:{type:"zTextBox"},
						netLine:{type:"zLine"}
					};
				},
				curr:function (S, D, mode) {
					var smallGap = D.Y.smallGap,
						bigGap = D.Y.bigGap,
						textGap = D.Y.textGap,
						leader = S.get({d:0, a:S.focused})[0],
						data = leader.O.data,
						posL = new zLayout(data.posL),
						negL = new zLayout(data.negL),
						shaderL = new zLayout(data.shaderL),
						currName = dc.getMeta("name", {d:0, a:S.focused}),
						baseYear = dc.getMeta("name", {d:1, a:BASE_TIME});
					return {
						title:{
							text:currName,
							layout:{
								x:posL.centre.x, y:posL.top - D.Y.subTitle["font-size"] * 3,
								xAlign:"xCentre", yAlign:"bottom"
							}
						},
						subTitle:{
							text:
								(S.zoomLevel == 0) ? "Click to zoom" :
								(S.zoomLevel == 1) ? "Click again to show detailed breakdown" :
								(S.zoomLevel == 2) ? "Click background to zoom out" :
								"",
							layout:{
								x:posL.centre.x, y:posL.top - D.Y.subTitle["font-size"] * 1.8,
								xAlign:"xCentre", yAlign:"xCentre"
							}
						},
						width:{
							text:
								"$" + zt.format(data.baseVal, D.Y.valFormat) + " \n" +
								"(" + zt.format(data.baseDec.end - data.baseDec.start, D.Y.decFormat) + " of Budget in " + baseYear + ")",
							layout:{
								x:negL.centre.x, y:negL.bottom + bigGap,
								radial:90, radialEnd:textGap
							}
						},
						widthLine:{
							points:[
								{x:negL.left, y:negL.bottom + smallGap},
								{x:negL.left, y:negL.bottom + bigGap},
								{x:negL.right, y:negL.bottom + bigGap},
								{x:negL.right, y:negL.bottom + smallGap}
							]
						},
						pos:{
							text:
								"$" + zt.format(data.posVal, D.Y.valFormat) + " of new funding",
							layout:{
								x:posL.left - bigGap, y:posL.top + posL.height * 0.5,
								radial:180, radialEnd:textGap
							}
						},
						posLine:{
							points:[
								{x:posL.left - smallGap, y:posL.top},
								{x:posL.left - bigGap, y:posL.top},
								{x:posL.left - bigGap, y:posL.bottom},
								{x:posL.left - smallGap, y:posL.bottom}
							]
						},
						neg:{
							text:
								"$" + zt.format(data.negVal, D.Y.valFormat) + " of cuts",
							layout:{
								x:negL.left - bigGap, y:negL.bottom - negL.height * 0.5,
								radial:180, radialEnd:textGap
							}
						},
						negLine:{
							points:[
								{x:negL.left - smallGap, y:negL.top},
								{x:negL.left - bigGap, y:negL.top},
								{x:negL.left - bigGap, y:negL.bottom},
								{x:negL.left - smallGap, y:negL.bottom}
							]
						},
						net:{
							text:
								"Net " + ((data.posVal >= data.negVal) ? "increase" : "decrease") +
								" of \n$" + zt.format(Math.abs(data.netVal), D.Y.valFormat) +
								" (" + zt.format(Math.abs(data.netVal / data.baseVal), D.Y.decFormat) + ")",
							layout:{
								x:posL.right + bigGap,
								y:(data.posVal > data.negVal) ? zt.calcMid(0.5, posL.top, shaderL.top) : zt.calcMid(0.5, negL.bottom, shaderL.bottom),
								radial:0, radialEnd:textGap
							}
						},
						netLine:{
							points:(data.posVal > data.negVal) ? [
								{x:posL.right + smallGap, y:posL.top},
								{x:posL.right + bigGap, y:posL.top},
								{x:posL.right + bigGap, y:shaderL.top},
								{x:posL.right + smallGap, y:shaderL.top}
							] : [
								{x:posL.right + smallGap, y:negL.bottom},
								{x:posL.right + bigGap, y:negL.bottom},
								{x:posL.right + bigGap, y:shaderL.bottom},
								{x:posL.right + smallGap, y:shaderL.bottom}
							]
						}
					};
				}
			},
			treeTip:{
				type:"zMultiDrone", mask:"fixed", ignore:true,
				curr:function (S, D, mode) {
					var x = {d:0, as:[S.treeFocused, dc.asAPos({d:1, a:S.A[1]})]},
						title = dc.getMeta("name", x),
						description = dc.getMeta("description", x),
						val = dc.getData("val", x) || 0,
						change = dc.getData("valChange", x),
						year = dc.getMeta("name", {d:1, a:S.A[1]}),
						rows = [
							20,
							(S.Y.treeTip.title["font-size"] + 3) * Math.ceil(title.length / S.Y.treeTip.title.format.wrap) + 8,
							(S.Y.treeTip.val["font-size"] + 3) + 8,
							(S.Y.treeTip.description["font-size"] + 3) * Math.ceil(description.length / S.Y.treeTip.description.format.wrap) + 20
						],
						WIDTH = 440,
						layout = new zLayout({
							x:zt.forceBetween(S.treeTipLayout.centre.x, L.swarm.left + WIDTH * 0.5, L.swarm.right - WIDTH * 0.5),
							y:(change > 0) ? S.treeTipLayout.bottom + 4 : S.treeTipLayout.top - 4,
							width:WIDTH, height:za.sum(rows),
							xAlign:"xCentre", yAlign:(change > 0) ? "top" : "bottom"
						});
					return {
						layer:2,
						mouseEvents:function (D) {
							D.click(function () {D.hide(200, "<>")});
						},
						background:{type:"zRectangle", layout:layout},
						title:{
							type:"zTextBox", text:title,
							layout:{x:layout.left + 20, y:layout.top + rows[0]}
						},
						val:{
							type:"zTextBox",
							text:(
								(val > 0) ? "$" + zt.format(val, D.Y.valFormat) + " in " + year : "Cut") +
								" (" + ((change == val) ? "New" : ((change > 0) ? "up $" : "down $") + zt.format(Math.abs(change), D.Y.valFormat)) + ")",
							layout:{x:layout.left + 20, y:layout.top + rows[0] + rows[1]}
						},
						description:{
							type:"zTextBox",
							text:description,
							layout:{x:layout.left + 20, y:layout.top + rows[0] + rows[1] + rows[2]}
						}
					};
				}
			}
		}
	});
	logger("Budget2012(): Done.");
};
