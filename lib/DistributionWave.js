DistributionWave = function (rawData, style, layout) {
	logger("DistributionWave(): Initialising.");
	var L = new zLayout({width:645, height:600});

	with (L) {
		L.tooltipBox = {};
		L.credits = {x:right, y:bottom, xAlign:"right", yAlign:"bottom"};
		L.narrator = {anchor:getPoint(0.5, 1), width:width, height:"auto", xAlign:"xCentre", yAlign:"top"};
		L.sAxis = { // Top selector bar
			x:centre.x, y:40,
			height:640, innerWidth:32, // Each row takes up this much space
			yAlign:"yCentre", rotation:90
		};
		L.tAxis = { // Bottom bar, with time
			x:60, y:bottom - 80,
			width:width - 120, height:16
		};
		L.swarm = new zLayout({
			x:70, y:tAxis.y - 70,
			width:width - 110, height:tAxis.y - 190,
			yAlign:"bottom"
		});
		L.xAxis = {
			anchor:L.swarm.anchor, width:L.swarm.width
		};
		L.yAxis = {
			anchor:L.swarm.anchor,
			width:L.swarm.height, height:50,
			xAlign:"right", rotation:90
		};
	};
	var darkBlue = "#003768",
		middleBlue = "#0b61a4",
		centerBlue = "#0081c6",
		screenBlue = "#f3fafe",
		orange = "#eb9123",
		screenOrange = "#fde0a9",
		focusRed = "#b8292f";

	var Y = zo.parseStyle({
		background:{
			fill:screenBlue,
			stroke:centerBlue
		},
		credits:{fill:"#666", margin:6},
		tooltipBox:{},
		sAxis:{
			expandedShown:5,
			background:{
				baseStyle:"background",
				rounded:12,
				opacity:0.8,
				"stroke-width":0
			},
			label:{
				fill:centerBlue,
				select:{"font-size":20}
			},
			downArrow:{
				xSize:14, ySize:28,
				fill:centerBlue,
				opacity:0.3
			}
		},
		xAxis:{
			label:{
				format:{case:"title"},
				margin:10,
				fill:"#333",
				"font-weight":"bold"
			}
		},
		yAxis:{
			maxNotches:5,
			axisTitle:{opacity:0.5},
			notch:{
				format:{mode:"abbreviate"},
				radialStart:-L.swarm.width,
				radialEnd:2,
				fill:"#666",
				"font-weight":"bold",
				branch:{"stroke-opacity":0.1}
			}
		},
		tAxis:{
			maxNotches:4,
			select:{t:200},
			slideBar:{
				rounded:8,
				fill:middleBlue,
				"stroke-width":0.1,
				background:{opacity:0.2},
				foreground:{opacity:1}
			},
			currNotch:{
				flagWidth:14, flagHeight:10,
				width:48, height:32,
				ring:{
					stroke:middleBlue,
					"stroke-width":3,
					fill:screenBlue
				},
				label:{
					format:{dp:0, noCommas:true},
					"font-family":"sans-serif",
					"font-size":16,
					fill:screenBlue,
					background:null
				},
				background:{
					fill:centerBlue,
					opacity:0.9,
					"stroke-width":0.1
				},
				highlight:{opacity:1}
			},
			baseNotch:{
				baseStyle:"tAxis.currNotch",
				label:{"font-size":12},
				background:{fill:darkBlue}
			},
			playButton:{
				background:{fill:darkBlue},
				foreground:{fill:screenBlue}
			}
		},
		swarm:{
			year:{
				format:{dp:0, noCommas:true},
				opacity:0.04,
				"font-weight":"bold",
				"font-size":160
			},
			currBars:{
				offset:0.01,
				size:0.65,
				opacity:0.98,
				"stroke-opacity":0.5,
				fill:centerBlue,
				highlight:{
					t:200, e:"<>",
					opacity:1,
					"stroke-opacity":0.5
				},
				faded:{
					opacity:0.2,
					"stroke-opacity":0.5
				}
			},
			baseBars:{
				baseStyle:"swarm.currBars",
				offset:-0.02,
				size:0.6,
				fill:darkBlue
			}
		}
	});

	logger("DistributionWave(): Parsing data.");
	PAPER = zt.makePaper(L);
	var i, init,
		INIT_TYPE = 0, INIT_YEAR = 0,
		dc = new zDataCube(3, rawData);

	with (dc) {
 		meta[1].name = ["bottom 20%","second 20%","middle 20%","fourth 20%","top 20%","everyone","81st-90th percentiles","91st-95th percentiles","96th-99th percentiles","top 1 percent"];
// 		// Broken down top quintile
// 		meta[1].percentile = [[0,0.2],[0.2,0.4],[0.4,0.6],[0.6,0.8],[0.8,1],[0,1],[0.8,0.9],[0.9,0.95],[0.95,0.99],[0.99,1]];
// 		shown[1] = [0,1,2,3,6,7,8,9];
		// All quintiles, plus top 1% breakdown
		meta[1].percentile = [[0,0.16],[0.16,0.32],[0.32,0.48],[0.48,0.64],[0.64,0.8],[0,1],[0.8,0.9],[0.9,0.95],[0.95,0.99],[0.84,1]];
		shown[1] = [0,1,2,3,4,9];
 		meta[2].name = [
			"Total Average Federal Tax Rate", "Average After-Tax Income", "Share of After-Tax Income", "Growth in Average After-Tax Income Since 1979", "Growth in Average Before-Tax Income Since 1979",
			"Total Average Federal Tax Rate", "Average After-Tax Income", "Share of After-Tax Income", "Growth in Average After-Tax Income Since 1979", "Growth in Average Before-Tax Income Since 1979"
		];
		meta[2].unit = ["%", "2009 dollars", "%", "%", "%"];
		setShown(2);
	};
	dc.findName = function (x) {
		return dc.findMeta("name", x);
	};

// 	// Set start state based on URL
// 	if (document.location.hash) {
// 		init = document.location.hash.slice(1).split("&");
// 		INIT_YEAR = dc.findMeta("name", {d:0}, init[1]);
// 		INIT_TYPE = dc.findMeta("name", {d:2}, init[0].replace(/_/g," "));
// 	};

	logger("DistributionWave(): Drawing...");
	var background = new zRectangle({layout:L, base:Y.background}),
		tooltipBox = new zTooltipBox(Y.tooltipBox),
		credits = new zTextBox({text:"Data from Congressional Budget Office. Powered by ChewyData.", layout:L.credits, base:Y.credits}),
		sAxis = new zScrollAxis({
			dc:dc, d:2,
			selected:{a:INIT_TYPE}, expanded:false,
			layout:L.sAxis, style:Y.sAxis,
			plan:{
				axisTitle:null,
				background:{
					type:"zRectangle", mask:"fixed",
					curr:function (S, D, mode) {
						return {
							layer:0,
							layout:{anchor:S.L.anchor, width:S.L.height, height:S.L.width, xAlign:"xCentre"}
						};
					}
				}
			}
		}),
		xAxis = new zSmartAxis({
			dc:dc, d:1,
			layout:L.xAxis, style:Y.xAxis,
			plan:{
				axisLine:null, notch:null,
				label:{
					curr:function (S, D, mode) {
						var percentile = dc.getMeta("percentile", {d:1, as:D.A});
						return {layout:S.L.getPoint(za.mean(percentile), 0)};
					}
				}
			}
		}),
		yAxis = new zAxis({
			layout:L.yAxis, style:Y.yAxis,
			plan:{
				axisLine:null,
				axisTitle:{
					init:function (S, D, mode) {
						var rotation = zt.isBetween(S.L.rotation, 90, 270) ? zp.inverseDeg(S.L.rotation) : S.L.rotation;
						return {
							layout:{
								anchor:S.L.getPoint(0.5, 1),
								xAlign:"xCentre", yAlign:"top",
								rotation:rotation
							}
						};
					},
					curr:function (S, D, mode) {
						return {text:dc.getMeta("unit", {d:2, a:sAxis.selected.a})};
					}
				}
			}
		}),
		tAxis = new zSlideAxis({
			dc:dc, d:0, selected:{a:INIT_YEAR},
			layout:L.tAxis, style:Y.tAxis,
			plan:{axisTitle:null, axisLine:null, notch:null}
		}),
		swarm = new zSwarm({
			dc:dc, A:[tAxis.selected.a, "all", sAxis.selected.a],
			axes:{s:sAxis, t:tAxis},
			layout:L.swarm, style:Y.swarm,
			updateData:function (t, e, w) {
				var vals = za.flatten(dc.getData("val", {rs:["all", "all", sAxis.selected.r]})),
					year = dc.getName({d:0, a:tAxis.selected.a}),
					type = dc.getName({d:2, a:sAxis.selected.a});
				document.location.hash = type.replace(/ /g,"_") + "&" + year;
				yAxis.setShown([Math.min(za.min(vals) * 1.1, 0), za.max(vals) * 1.1], t, e, null, w);
				this.layer();
				sAxis.layer();
			},
			plan:{
				year:{
					type:"zTextBox", mask:["mask", "na", "na"],
					init:function (S, D, mode) {
						return {layout:{anchor:S.L.centre, xAlign:"xCentre", yAlign:"yCentre"}};
					},
					curr:function (S, D, mode) {
						return {text:dc.getName({d:0, as:D.A})};
					}
				},
				baseBars:{
					type:"zRectangle", mask:"mask",
					init:function (S, D, mode) {
						return S.plan.currBars.init(S, D, mode);
					},
					curr:function (S, D, mode) {
						D.A[0] = tAxis.baseSelected.a;
						return S.plan.currBars.curr(S, D, mode);
					}
				},
				currBars:{
					type:"zRectangle", mask:"mask",
					init:function (S, D, mode) {
						var percentile = dc.getMeta("percentile", {d:1, a:D.A[1]});
						return {
							layer:1,
							layout:{
								x:S.L.getX(za.mean(percentile) + Y.offset),
								width:S.L.width * (percentile[1] - percentile[0]) * Y.size,
								xAlign:"xCentre", yAlign:"bottom"
							},
							mouseEvents:function (D) {
								D.hoverHighlight(D.Y.highlight.t, D.Y.highlight.e);
								D.tooltip(null, tooltipBox);
							}
						};
					},
					curr:function (S, D, mode) {
						var year = dc.getName({d:0, as:D.A});
							percentile = dc.getName({d:1, as:D.A}),
							type = dc.getName({d:2, as:D.A}).toLowerCase(),
							unit = dc.getMeta("unit", {d:2, as:D.A}),
							val = dc.getData("val", D.A),
							valText = (unit == "%") ? val + "%" : zt.format(val, {mode:"abbreviate", prefix:"$", suffix:" (2009 dollars)"});
						return {
							tooltipText:"In " + year + ", the " + type + " for the " + percentile + " was " + valText + ".",
							layout:{
								y:yAxis.getY(0),
								height:yAxis.getLength(val)
							}
						};
					}
				}
			}
		});

	return;
	logger("DistributionWave(): Introductions...");
	if (!init) {
		swarm.superLock();
		new zNarrator({layout:L.narrator, base:Y.narrator,
			onClose:function () {swarm.superUnlock()},
			script:[
				{
					content:
						"<h3>1</h3>" +
						"<p>This chart shows the percentage changes in after-tax income for each fifth of the income distribution, and the top 1 percent, since 1979.</p></ul>",
					action:function () {
						sAxis.scrollSelect({a:dc.findName({d:2}, "Growth in Average After-Tax Income Since 1979")});
						tAxis.axisSelect({a:dc.findName({d:0}, "1980")}, 120, "-");
					}
				},{
					content:
						"<h3>2</h3>" +
						"<p>From 1979 to 2007 – the last year before the financial crisis and the Great Recession -- average after-tax incomes for the top 1 percent of the distribution quadrupled.  The increases in the middle 60 percent and bottom 20 percent of the income distribution were much smaller.</p>",
					action:function () {
						tAxis.axisSelect({a:dc.findName({d:0}, "2007")}, 120, "-");
					}
				},{
					content:
						"<h3>3</h3>" +
						"<p>Incomes fell sharply at the top of the distribution in 2008 and 2009 due to the recession and financial crisis – although even after those losses, the increase in the average income of the top 1 percent of households from 1979 to 2009 were still much larger than that of the middle 60 percent and bottom 20 percent.</p>",
					action:function () {
						tAxis.axisSelect({a:dc.findName({d:0}, "2009")}, 120, "-");
					}
				},{
					// FIXME
					content:
						"<h3>4</h3>" +
						"<p>In 2010 and 2011, the pattern of disproportionate gains at the top resumed. Additional detail to come.</p>",
					action:function () {
						sAxis.scrollSelect({a:dc.findName({d:2}, "Growth in Average After-Tax Income Since 1979")}, 600, "<>");
					}
				},{
					content:
						"<h3>5</h3>" +
						"<p>Putting these trends in dollar terms, between 1979 and 2010 the average after-tax income of a household in the top one percent grew from about $340,000 to $XXXXXX, while the average income of a household in the middle 20 percent of the income distribution grew from $43,000 to XXXXX.</p>",
					action:function () {
// 						tAxis.axisSelect({a:dc.findName({d:0}, "2010")});
						tAxis.axisSelect({a:dc.findName({d:0}, "2009")});
						sAxis.scrollSelect({a:dc.findName({d:2}, "Average After-Tax Income")}, 600, "<>");
					}
				},{
					content:
						"<h3>6</h3>" +
						"<p>The growth in income inequality since 1979 can also be seen in the increasing share of total after-tax income going to the top 1 percent.</p>",
					action:function () {
						tAxis.axisSelect({a:dc.findName({d:0}, "1979")});
						sAxis.scrollSelect({a:dc.findName({d:2}, "Share of After-Tax Income")}, 600, "<>");
						swarm.unsetMode("all", 600, "<>")
					}
				},{
					content:
						"<h3>7</h3>" +
						"<p>By 2010. The top one percent of households in 201X had more annual income than the bottom 20% of households, and more annual income than the second 20 percent of households.</p>",
					action:function () {
						sAxis.scrollSelect({a:dc.findName({d:2}, "Share of After-Tax Income")}, 600, "<>");
// 						tAxis.axisSelect({a:dc.findName({d:0}, "2010")}, 120, "-");
						tAxis.axisSelect({a:dc.findName({d:0}, "2009")}, 120, "-", function () {
							swarm.setMode("all", "faded", 600, "<>");
							swarm.setMode({role:"currBars", d:1, a:[0,9]}, "highlight", 600, "<>");
						});
					}
				},{
					content:
						"<h3>8</h3>" +
						"<p>During the last 30 years the overall federal income tax system (including income tax, payroll tax, and other taxes) has remained progressive.</p>",
					action:function () {
						tAxis.axisSelect({a:dc.findName({d:0}, "1979")});
						sAxis.scrollSelect({a:dc.findName({d:2}, "Total Average Federal Tax Rate")}, 600, "<>");
						swarm.unsetMode("all", 600, "<>")
					}
				},{
					content:
						"<h3>9</h3>" +
						"<p>However, average federal tax rates have declined for all income groups between 1979 and 2007. This is one of the reasons why the federal tax system did less to push against growing income inequality in 2007 than it did in 1979.</p>",
					action:function () {
						tAxis.axisSelect({a:dc.findName({d:0}, "2007")}, 120, "-");
					}
				},{
					content:
						"<h3>10</h3>" +
						"<p>During the recession and recovery, temporary tax cuts were enacted to support the economic recovery and recession.<br>(The data do not yet extend to 2012 when these temporary measures expire, or to 2013, when parts of the high-income tax cuts first enacted under President Bush were allowed to expire.)</p>",
					action:function () {
// 						tAxis.axisSelect({a:dc.findName({d:0}, "2010")}, 120, "-");
						sAxis.scrollSelect({a:dc.findName({d:2}, "Total Average Federal Tax Rate")}, 600, "<>");
					}
				},{
					content:
						"<h3>11</h3>" +
						"<p>Partially due to the decline in average federal tax rates between 1979 and 2010, trends in before tax income growth look very similar to the very first chart in this series (trends in after-tax income growth).  </p>",
					action:function () {
						sAxis.scrollSelect({a:dc.findName({d:2}, "Growth in Average Before-Tax Income Since 1979")}, 600, "<>");
					}
				},{
					content:
						"<h3>12</h3>" +
						"<p>For more, please<br>Explore this visualization<br>Read our Guide to Statistics on Historical Trends in Income Inequality<br>Source: Congressional Budget Office [will link to new data set]<br>Visualization by Chewy Data</p>",
					action:function () {
// 						sAxis.scroll({a:13}, 500, "-", function () {sAxis.axisSelect({a:13}, 500, "-")});
					}
				}
			]
		});
	};
	logger("DistributionWave(): Done.");
};
