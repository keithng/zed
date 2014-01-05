// Zed Data Visualisation Toolkit. Keith Ng, 2013-02-12.
// Depends on jQuery

var startTime = $.now(),
	logger = function (text) {
		var message = $.now() - startTime + ": " + text;
		if (typeof console == "object") console.log(message);
	},
	logobj = function (obj) {
		if (typeof console == "object") console.log($.now() - startTime + ": " + zt.asString(obj));
	},
	explode = function (text) {
		logger("KABOOOM!: " + text);
		buggerSelf(); // Crash
	},
	zDebug = {
		show:function (a, colour, t) {
			colour = colour || "red";
			var marker;
			if (a.left != null && a.right != null && a.top != null && a.bottom != null) {
				marker = new zShape({points:zp.boxToPoints(a), stroke:colour, "stroke-width":1});
			} else if (za.isArray(a) && a[0].x != null && a[0].y != null) {
				marker = new zLine({points:a, stroke:colour, "stroke-width":0.5});
			} else if (a.x != null && a.y != null) {
				marker = new zCircle({circle:{centre:a, radius:5}, fill:colour});
			};
			marker.remove(t || 5000, "<");
		},
		mapShow:function (a, utmWindow, layout, colour) {
			zDebug.show(zt.mapPoints(a, utmWindow, layout), colour);
		},
		button:function (action, point) {
			var button = new zCircle({
				circle:{
					centre:point || {x:20,y:20},
					radius:10
				},
				stroke:"#666",
				fill:"#888",
				opacity:0.3
			});
			button.click(action);
		}
	};

/*

zLayout - Smart layout object

Precalculates a rectangular layout based on "vital" inputs, such as anchor (x & y), width, height, alignment, rotation, skew.
	anchor: (point) Reference point for layout
	x/y: (numbers) Equals anchor.x and anchor.y (anchor has priority)
	width/height: (numbers) Outer size for layout - if specified, it takes priority over innerWidth/innerHeight, which will be derived from width/height
	innerWidth/innerHeight: (numbers) Inner size for layout (width/height has priority)
	margin: (number) Distance between innerWidth/Height and width/height (i.e. width = innerWidth + 2 * margin)
	xAlign/yAlign: (strings) Valid alignments: "left", "xCentre", "right", "top", "yCentre", "bottom"
	align: (string) Valid alignments: "centre", "leftTop", "centreTop", "rightTop", "rightCentre", "rightBottom", "centreBottom", "leftBottom", "leftCentre"
	rotation: (deg) Rotation of layout, centred on anchor
	radial: (deg) Angle of offset between trueAnchor and anchor (radialStartPoint and radialEndPoint will be on this angle as well)
	radialStart: (number) radialStartPoint will be this distance from anchor
	radialEnd: (number) radialEndPoint will be this distance from anchor

Derived:
	trueAnchor: (point) Usually same as anchor, except in radialMode, when it be fitted so that radialEnd
	corners: ([point, point, point, point]) Gets the four corners of the layout - affected by rotation, so should always reflect the true position of layout; NOT the same as a bounding box
	left/right/top/bottom: (points) Furtherest point of the layout - IS equal to bounding box
	centre: (point) Centre of layout, affected by rotation
	xCentre/yCentre: (numbers) Equals centre.x and centre.y

*/
function zLayout (l, parent) {
	var c = this;
	/////////////////////
	//  Set functions  //
	/////////////////////
	// Sets to a new layout - if the new layout doesn't define it, then it stays the same; if neither exist, default values are used
	c.set = function (l) {
		if (!l) return c;
		c = zo.extend(c, (l instanceof zLayout) ? l.getVitals() : l); // Load whatever is in l (if it's an object, only load the vitals, not the object itself), then recalculate all derived information
		// Anchor
		if (l.anchor) { // If anchor is defined (top priority)
			c.x = c.anchor.x; // Update (or overwrite) x/y
			c.y = c.anchor.y;
		} else { // Otherwise
			c.x = c.x || 0; // Check that x/y exist
			c.y = c.y || 0;
			c.anchor = {x:c.x, y:c.y}; // Update anchor with new c.x/y
		};
		// Margin
		c.margin = c.margin || 0; // Default to 0
		// Width
		if (c.autoWidth && c.parent.bBox) { // AutoWidth has first priority
			c.innerWidth = c.parent.bBox.width || 0;
			c.width = c.innerWidth + 2 * c.margin;
		} else if (l.width == null) { // If width is not defined, calculate width from innerWidth (default = 0 + 2 * margin)
			c.innerWidth = c.innerWidth || 0;
			c.width = c.innerWidth + 2 * c.margin;
		} else c.innerWidth = c.width - 2 * c.margin; // If width is defined, then calculate innerWidth from width (i.e. width supercedes innerWidth)
		// Height
		if (c.autoHeight && c.parent && c.parent.bBox) { // AutoHeight has first priority
			c.innerHeight = c.parent.bBox.height || 0;
			c.height = c.innerHeight + 2 * c.margin;
		} else if (l.height == null) { // If height is not defined, calculate height from innerHeight (default = 0 + 2 * margin)
			c.innerHeight = c.innerHeight || 0;
			c.height = c.innerHeight + 2 * c.margin;
		} else c.innerHeight = c.height - 2 * c.margin; // If height is defined, then calculate innerHeight from height (i.e. height supercedes innerHeight)
		// Parse alignment
		if (c.align) {
			if (c.align == "centre") c.xAlign = "xCentre", c.yAlign = "yCentre";
			else if (c.align == "leftTop") c.xAlign = "left", c.yAlign = "top";
			else if (c.align == "centreTop") c.xAlign = "xCentre", c.yAlign = "top";
			else if (c.align == "rightTop") c.xAlign = "right", c.yAlign = "top";
			else if (c.align == "rightCentre") c.xAlign = "right", c.yAlign = "yCentre";
			else if (c.align == "rightBottom") c.xAlign = "right", c.yAlign = "bottom";
			else if (c.align == "centreBottom") c.xAlign = "xCentre", c.yAlign = "bottom";
			else if (c.align == "leftBottom") c.xAlign = "left", c.yAlign = "bottom";
			else if (c.align == "leftCentre") c.xAlign = "left", c.yAlign = "yCentre";
		};
		if (c.radial == null) { // Normal alignment
			c.xAlign = c.xAlign || "left";
			c.yAlign = c.yAlign || "top";
			c.trueAnchor = c.anchor;
		} else { // Radial alignment (this is NOT radians!)
			var normRadial = zp.normaliseDeg(c.radial); // Normalise so that quadrants can be calculated, but keep original so spinning works properly
			c.xAlign = c.xAlign || "xCentre";
			c.yAlign = c.yAlign || "yCentre";
			c.radialStartPoint = (c.radialStart != null) ? zp.addVector(normRadial, c.radialStart, c.anchor) : c.anchor; // Start of the branch
			c.radialEndPoint = (c.radialEnd != null) ? zp.addVector(normRadial, c.radialEnd, c.anchor) : c.radialStartPoint; // End of the branch === radialAnchor
			c.trueAnchor = zo.add(
				(normRadial < 45) ? {x:0.5 * c.width, y:0.5 * c.height * zt.calcDec(normRadial, 0, 45)} : // South-East
				(normRadial < 135) ? {x:0.5 * c.width * zt.calcDec(normRadial, 90, 45), y:0.5 * c.height} : // South
				(normRadial < 225) ? {x:-0.5 * c.width, y:0.5 * c.height * zt.calcDec(normRadial, 180, 135)} : // West
				(normRadial < 315) ? {x:0.5 * c.width * zt.calcDec(normRadial, 270, 315), y:-0.5 * c.height} : // North
				{x:0.5 * c.width, y:-0.5 * c.height * zt.calcDec(normRadial, 360, 315)}, // North-East
				c.radialEndPoint);
		};
		// Derived values (rotated and skewed)
		c.centre = c.getPoint(0.5, 0.5);
		c.xCentre = c.centre.x;
		c.yCentre = c.centre.y;
		c.corners = c.getCorners();
		zo.extend(c, zp.pointsToBox(c.corners));
		c.innerBox = zp.pointsToBox(c.getCorners(true));
		return c;
	};
	// Targ is a section of layout; expand layout so that targ is the size of viewport (or layout, if viewport is not defined)
	c.zoom = function (targ, viewPort) {
		c.prevLayout = c.getVitals(); // Create undo values
		targ = zp.completeBox(targ);
		viewPort = zp.completeBox(viewPort || c); // Use current layout if viewPort is not defined
		var dec, align,
			scale = {x:c.width / targ.width, y:c.height / targ.height};
		// Extend targ to so it has the same aspect ratio as viewPort
		if (scale.x < scale.y) { // x is the dominant scale (the SMALLER scale is dominant)
			scale = scale.x;
			targ.height = c.height / scale; // Submissive scale is expanded so it has the same ratio to targ as the dominant scale
			align = viewPort.yAlign || targ.yAlign || c.yAlign; // Use new alignment if it's defined
			targ.top =
				(align == "top") ? targ.top :
				(align == "bottom") ? targ.bottom - targ.height :
				targ.yCentre - targ.height / 2;
			targ.bottom = targ.top + targ.height;
		} else if (scale.y < scale.x) { // y is the dominant scale (the SMALLER scale is dominant)
			scale = scale.y;
			targ.width = c.width / scale;  // Submissive scale is expanded so it has the same ratio to targ as the dominant scale
			align = viewPort.xAlign || targ.xAlign || c.xAlign; // Use new alignment if it's defined
			targ.left =
				(align == "left") ? targ.left :
				(align == "right") ? targ.right - targ.width :
				targ.xCentre - targ.width / 2;
			targ.right = targ.left + targ.width;
		} else scale = scale.x; // Aspect ratios are the same, do nothing
		// Get relative distance of c.anchor from targ.anchor
		dec = {
			x:(c[c.xAlign] - targ[c.xAlign]) / targ.width,
			y:(c[c.yAlign] - targ[c.yAlign]) / targ.height
		};
		// Relative distance of c.anchor and viewPort.anchor should be the same, after this redraw
		return c.set({
			x:viewPort.x + viewPort.width * dec.x,
			y:viewPort.y + viewPort.height * dec.y,
			width:viewPort.width * scale,
			height:viewPort.height * scale
		});
	};
	c.unzoom = function () {
		if (c.prevLayout) {
			c.set(c.prevLayout);
			c.prevLayout = null;
		};
	};
	/////////////////////
	//  Get functions  //
	/////////////////////
	// Clones itself with additional properties using the set function (optional - set() will ignore if it's empty)
	c.clone = function (l) {
		return new zLayout(c.getVitals(l));
	};
	// Return the minimum set of values required to fully reconstruct this layout
	c.getVitals = function (l) {
		var i, out = {},
			vitals = ["x", "y", "anchor", "margin", "width", "height", "xAlign", "yAlign", "left", "right", "top", "bottom", "rotation", "radial", "radialStart", "radialEnd", "verticalSkew"];
		for (i = 0; i < vitals.length; i++) if (c[vitals[i]] != null) out[vitals[i]] = zo.clone(c[vitals[i]]);
		return (l) ? zo.extend(out, l) : out;
	};
	c.getCorners = function (innerBox) {
		return [c.getPoint(0,0,innerBox), c.getPoint(1,0,innerBox), c.getPoint(1,1,innerBox), c.getPoint(0,1,innerBox)];
	};
	///////////////////////
	//  Point functions  //
	///////////////////////
	// Get a point in layout - THIS IS A REALLY IMPORTANT FUNCTION
	c.getPoint = function (xDec, yDec, innerBox) {
		var out = {x:c.getX(xDec, innerBox), y:c.getY(yDec, innerBox)};
		if (c.rotation) out = c.getRadialPoint(out, c.rotation);
		if (c.verticalSkew) out.y += (out.x - c.x) * Math.sin(c.verticalSkew);
		return out;
	};
	// Caution: Doesn't account for rotation or verticalSkew!
	c.getX = function (dec, innerBox) {
		if (c.xAlign == "xCentre") dec -= 0.5;
		else if (c.xAlign == "right") dec *= -1;
		if (!innerBox) return c.trueAnchor.x + c.width * dec;
		else return c.trueAnchor.x + c.innerWidth * dec + ((c.xAlign == "left") ? c.margin : (c.xAlign == "right") ? -c.margin : 0);
	};
	// Caution: Doesn't account for rotation or verticalSkew!
	c.getY = function (dec, innerBox) {
		if (c.yAlign == "yCentre") dec -= 0.5;
		else if (c.yAlign == "bottom") dec *= -1;
		if (!innerBox) return c.trueAnchor.y + c.height * dec;
		else return c.trueAnchor.y + c.innerHeight * dec + ((c.yAlign == "top") ? c.margin : (c.yAlign == "bottom") ? -c.margin : 0);
	};
	// Get offset between point and anchor
	c.getOffset = function (xDec, yDec, innerBox) {
		return zo.subtract(c.getPoint(xDec, yDec, innerBox), c.trueAnchor);
	};
	// Get the decimal values of a point relative to the anchor (e.g. The centre point would return {x:.5, y:.5}, the anchor would return {x:0, y:0})
	c.getDec = function (point, innerBox) {
		if (c.rotation) point = c.getRadialPoint(point, -c.rotation); // Unrotate point
		if (innerBox) return {x:zt.calcDec(point.x, c.innerLeft, c.innerRight), y:zt.calcDec(point.y, c.innerTop, c.innerBottom)};
		else return {x:zt.calcDec(point.x, c.left, c.right), y:zt.calcDec(point.y, c.top, c.bottom)};
	};
	// Equals getDec().x
	c.getXDec = function (point, innerBox) {
		return c.getDec({x:(point.x != null) ? point.x : point, y:0}, innerBox).x;
	};
	// Equals getDec().y
	c.getYDec = function (point, innerBox) {
		return c.getDec({x:0, y:(point.y != null) ? point.y : point}, innerBox).y;
	};
	// Rotates point around trueAnchor
	c.getRadialPoint = function (point, deg) {
		if (!deg) return point;
		var v = zp.vector(c.trueAnchor, point);
		return zp.addVector(v.deg + deg, v.dist, c.trueAnchor);
	};
	// Get an array of points
	c.getPoints = function (a, innerBox) {
		var i, out = [];
		for (i = 0; i < a.length; i++) out.push(c.getPoint(a[i][0], a[i][1], innerBox));
		return out;
	};
	// Initialise
	c.type = "zLayout";
	c.parent = parent;
	c.set(l);
};

/*

zDrones - Interface with raphObjs

Constructor contains functions to pass instructions to the raphObj (e.g. show, hide). Presents a unified interface for higher level components to interact with (e.g. Everything can be highlighted, or faded-in, etc.).
Drones should never deal directly with data, only direct instructions or sets of orders.

Attributes:
	.raphObj (Raphael object)
		Actual Raphael object associated with zSimpleDrone, provided by each drone type, and set by .add().
	.parts (object/array)
		All of a zComplexDrone's drones.
	.parent (swarm or zMultiDrone)
		The swarm this drone belongs to.
	.A (aSpace)
		The aSpace for this drone - only makes sense if it's in a swarm.
	.O (orders, object)
		All the values of a drone, as defined on creation. When drone belongs to a swarm, it is updated on frameRedraw().
	.origO (orders)
		Backup of orders, enables unsetMode() to work.
	.L (layout, zLayout)
		Optional for some drones. NOTE: .O.margin overrides .L.margin
	.hiding (boolean)
		Is in the process of being hidden.
	.hidden (boolean)
		Has been hidden.
	.markOfDeath (boolean)
		Has been marked for removal.

Debugging attributes:
	.type (string)
		instanceof of drone (e.g. zRectangle).
	.tag (string)
		A drone's tag is passed on to all its parts, so everything can be identified

*/

function zSimpleDrone (c, orders, type) {
	zo.shyExtend(c, {
		class:"zSimpleDrone",
		type:type, // Name of the type of drone, provided by each drone type
		//////////////////////
		//  Meta functions  //
		//////////////////////
		forEach:function (f, v1, v2, v3, v4, v5, v6) {
			if (typeof f == "string") c.raphObj[f](v1, v2, v3, v4, v5, v6);
			else if (typeof f == "function") f(c.raphObj, v1, v2, v3, v4, v5, v6);
		},
		////////////////////
		//  Add / Remove  //
		////////////////////
		// Adds a raphObj part to this drone
		add:function (raphObj, orders) {
			raphObj.attr(orders);
			raphObj.parent = c;
			c.raphObj = raphObj;
			return raphObj;
		},
		// Removes this drone from the DOM and from its parent
		remove:function (t, e, b, w) {
			if (t) { // Animated remove
				c.clearEvents();
				c.hide(t, e, function () {c.remove(null, null, b)}, w); // Fade out then call remove() again - if hiding has been cancelled, remove will be cancelled as well
			} else { // Remove the screen element immediately
				c.markOfDeath = true;
				if (c.parent && c.parent.drones) za.remove(c.parent.drones, c); // If it has a parent, remove from parent membership
				c.forEach("remove");
				delete c;
				if (b) b();
			};
		},
		/////////////////
		//  Show/hide  //
		/////////////////
		show:function (t, e, b, w) {
			c.invisibleShow();
			c.animate({opacity:c.O.opacity || 1}, t, e, b, w); // If no defined opacity, fade in to opacity of 1
		},
		hide:function (t, e, b, w) {
			c.hiding = true; // animate() ignores .hidden objects, so .hiding flag is used for animated hiding
			c.animate({opacity:0}, t, e, function () {
				if (!c.hiding) return; // If hiding has been cancelled, don't hide (need this check because even if show() overrides hide(), hide() will contintue to run and try to complete)
				c.forEach("hide");
				c.hidden = true;
				if (b) b();
			}, w); // Fade out, then callback (optional) and hide
		},
		// Show object in the dom, but don't change its opacity
		invisibleShow:function () {
			if (c.hidden) c.forEach("show");
			else if (!c.hiding) return; // Quit if not hidden or hiding
			c.hidden = c.hiding = false;
		},
		// Instant hide, then animated show
		appear:function (t, e, b, w) {
			if (!t) return;
			c.hide();
			c.show(t, e, b, w);
		},
		toFront:function () {c.forEach("toFront")},
		toBack:function () {c.forEach("toBack")},
		///////////////
		//  Animate  //
		///////////////
		parseOrders:function (orders) {
			if (typeof orders == "string") orders = c.O[orders];
			return (orders) ? za.asObject(orders) : {};
		},
		animate:function (orders, t, e, b, w) {
			orders = c.parseOrders(orders);
			if (zo.isEmpty(orders) || c.markOfDeath) return; // Quit if no orders is defined, or if the targeted drone is in the final stages of being removed
			if (!t || c.hidden || PAPER.noAnimation) { // Instant animation
				c.forEach("attr", orders);
				if (b) b();
			} else {
				c.forEach((w && w.animation) ? function (d) { // animateWith
					d.animation = Raphael.animation(orders, t, e, b);
					d.animateWith(w, w.animation, d.animation)
					b = null; // b should only go with the first part
				} : function (d) { // Normal animate
					d.animation = Raphael.animation(orders, t, e, b);
					d.animate(d.animation);
					b = null; // b should only go with the first part
				});
			};
			return orders;
		},
		setMode:function (mode, t, e, b, w) {
			if (typeof mode != "string" || !c.O[mode]) return;
			if (c.origO) c.O = zo.clone(c.origO); // If already in a mode, reset c.O to original before proceeding
			else c.origO = zo.clone(c.O); // Otherwise, create it
			c.O = zo.extend(c.O, c.parseOrders(mode));
			c.reset(t, e, b, w);
		},
		unsetMode:function (t, e, b, w) {
			if (!c.origO) return;
			c.O = c.origO;
			c.origO = null;
			c.reset(t, e, b, w);
		},
		highlight:function (t, e, b, w) {c.animate("highlight", t, e, b, w)},
		reset:function (t, e, b, w) {c.animate(c.O, t, e, b, w)},
		select:function (t, e, b, w) {c.setMode("select", t, e, b, w)},
		deselect:function (t, e, b, w) {c.unsetMode(t, e, b, w)},
		stop:function () {c.forEach("stop")},
		//////////////
		//  Events  //
		//////////////
		clearEvents:function () {
			c.forEach(function (d) {
				if (!d.events) return;
				for (var i = 0; i < d.events.length; i++) d.events[i].unbind(); // Unbind every event
				delete d.events; // Then delete them
			});
		},
		click:function (f) {c.forEach("click", f)},
		dblclick:function (f) {c.forEach("dblclick", f)},
		mousedown:function (f) {c.forEach("mousedown", f)},
		mouseup:function (f) {c.forEach("mouseup", f)},
		mousemove:function (f) {c.forEach("mousemove", f)},
		touchstart:function (f) {c.forEach("touchstart", f)},
		touchmove:function (f) {c.forEach("touchmove", f)},
		touchend:function (f) {c.forEach("touchend", f)},
		touchcancel:function (f) {c.forEach("touchcancel", f)},
		hover:function (inF, outF) {c.forEach("hover", inF, outF)},
		drag:function (onmove, onstart, onend) {c.forEach("drag", onmove, onstart, onend)},
		onAnimation:function (f) {c.forEach("onAnimation", f)},
		hoverHighlight:function (t, e) {c.hover(function () {c.highlight(t, e)}, function () {c.reset(t, e)})},
		tooltip:function (tooltipText, tooltipBox, layout) {
			c.mousemove(function (event) {
				if (tooltipBox.hidden) tooltipBox.showAt({text:tooltipText || c.O.tooltipText}, 100); // Show if it's not already shown
				tooltipBox.moveToEvent(event, layout);
			});
			c.hover(function (event) {
				tooltipBox.showAt({text:tooltipText || c.O.tooltipText}, 100);
				tooltipBox.moveToEvent(event, layout);
			}, function () {
				tooltipBox.hide(100);
			});
		},
		initialise:function (orders) {
			if (orders.base) orders = zo.clone(zo.remove(orders, "base"), orders);
			c.O = c.parseOrders(orders);
			if (c.O.layout) {
				if (c.O.margin != null) c.O.layout.margin = c.O.margin; // O.margin overrides layout.margin
				c.L = (c.O.layout.type == "zLayout") ? c.O.layout : new zLayout(c.O.layout, c);
			};
		}
	});
	c.initialise(orders);
};

// Guide - does nothing, serves as guide for animateWith functions
function zGuide () {
	this.redraw = function (t, e, b, w) {
		this.redrawTo(0); // Reset position first
		this.redrawTo(1, t, e, b, w);
	};
	this.redrawTo = function (val, t, e, b, w) {
		if (b) this.bQueue.push(b); // Any b that's asked for will be added to the queue REGARDLESS OF WHETHER ANIMATION STARTS
		if (this.scripting) return; // A scripting redraw is already running - don't change the state of the guide
		this.stop();
		var guide = this;
		this.animating = true;
		this.animate({path:zp.start({x:val * 1000, y:0})}, t, e, function () {
			var i, q = guide.bQueue; // Save and reset queue before calling any other function (which might use this guide)
			guide.bQueue = [];
			guide.animating = false;
			for (i = 0; i < q.length; i++) q[i]();
		}, w);
	};
	this.stop = function () {
		this.animating = false;
		this.forEach("stop");
	};
	// Return val of zGuide
	this.getVal = function () {
		var path = this.K.attrs.path,
			x = (za.isArray(path)) ? path[0][1] :
				(path[1] == " ") ? path.substr(2, path.length - 4) :
				path.substr(1, path.length - 3); // Extract x val from path
		return x / 1000;
	};
	// Use zGuide to run a script, which is an array of scenes: [[[t, e], action], [[t, e], action], etc.]
	this.runScript = function (script, w) {
		if (!script || !script.length) return;
		if (!PAPER.noAnimation) { // Animate
			var c = this,
				line = script.shift(), // Remove and read first line from script
				t = line[0][0] || 1,
				e = line[0][1],
				action = line[1]; // Action is a function (t, e, w) {};
			this.redrawTo(0); // Must be set to 0 so getVal() will work correctly
			this.redrawTo(1, t, e, function () {c.runScript(script, w)}, w); // Run again when finished, but only if there's more script left to run
			this.scripting = true; // Scripting flag will stop guide from drawing again - the scripting redraw should be the ONLY redraw
			if (action) action(t, e, this.K); // All the callback actions will be logged first, before the script to run is added
			this.scripting = false;
		} else for (var i = 0; i < script.length; i++) script[i][1](); // No animation
	};
	this.delay = function (t, action) {
		this.redraw(t, "-", action);
	};
	// Initialise
	zSimpleDrone(this, {}, "zGuide");
	this.K = this.add(PAPER.path(zp.start()));
	this.animating = false;
	this.bQueue = [];
};

// Line
function zLine (orders, t, e, b, w) {
	this.redraw = function (orders, t, e, b, w) {
		if (orders.points) orders.path = zp.line(orders.points);
		this.animate(orders, t, e, b, w);
	};
	// Initialise
	zSimpleDrone(this, orders, "zLine");
	this.add(PAPER.path(zp.line(this.O.points)), this.O);
	this.appear(t, e, b, w);
};

// Shape
function zShape (orders, t, e, b, w) {
	this.redraw = function (orders, t, e, b, w) {
		if (orders.points) orders.path = zp.shape(orders.points);
		this.animate(orders, t, e, b, w);
	};
	// Initialise
	zSimpleDrone(this, orders, "zShape");
	this.add(PAPER.path(zp.shape(this.O.points)), this.O);
	this.appear(t, e, b, w);
};

// Arc/slice/ring between degStart and degEnd, or whole circle if deg arguments are null (arc = innerRadius && !outerRadius, slice = !innerRadius && outerRadius, ring = innerRadius && outerRadius)
function zArc (orders, t, e, b, w) {
	this.redraw = function (orders, t, e, b, w) {
		if (orders.arc) orders.path = zp.arc(orders.arc);
		this.animate(orders, t, e, b, w);
	};
	// Initialise
	zSimpleDrone(this, orders, "zArc");
	this.add(PAPER.path(zp.arc(this.O.arc)), this.O);
	this.appear(t, e, b, w);
};

// Circle
function zCircle (orders, t, e, b, w) {
	this.redraw = function (orders, t, e, b, w) {
		if (orders.circle) {
			var a = orders.circle;
			if (a.centre) orders.cx = a.centre.x, orders.cy = a.centre.y;
			if (a.radius) orders.r = a.radius;
		};
		this.animate(orders, t, e, b, w);
	};
	// Initialise
	zSimpleDrone(this, orders, "zCircle");
	var a = this.O.circle;
	this.add(PAPER.circle(a.centre.x, a.centre.y, a.radius), this.O);
	this.appear(t, e, b, w);
};

// Rectangle based on layout (remembers attributes in .layout, so can be incrementally changed)
function zRectangle (orders, t, e, b, w) {
	zSimpleDrone(this, orders, "zRectangle");
	// Choose mode (mode is fixed upon creation)
	if (!this.L && this.O.rect) { // No layout, direct draw based on rect attribute (fastest)
		var r = this.O.rect;
		this.add(PAPER.rect(r.x, r.y, Math.abs(r.width), Math.abs(r.height)), this.O);
		this.redraw = function (orders, t, e, b, w) {
			if (!orders) return;
			if (orders.rect) zo.extend(orders, orders.rect);
			this.animate(orders, t, e, b, w);
		};
	} else if (this.O.rounded == null) { // Rect mode, with layout (marginally slower)
		var l = this.L;
		this.add(PAPER.rect(l.left, l.top, Math.abs(l.width), Math.abs(l.height)), this.O);
		this.redraw = function (orders, t, e, b, w) {
			if (!orders) return;
			this.L.set(orders.layout);
			if (orders.layout) zo.extend(orders, {
				x:l.left, y:l.top,
				width:Math.abs(l.width),
				height:Math.abs(l.height)
			});
			this.animate(orders, t, e, b, w);
		};
	} else { // Complex mode - allows for rounded corners (uses .path instead of .rect, which is much slower)
		// Get SVG path from layout
		this.L.getSVG = function (rounded) {
			if (!rounded || !this.width || !this.height) return zp.shape(this.corners);
			var s = zp.start, l = zp.lineTo,
				a = ((this.xAlign == "right" && this.yAlign != "bottom") || (this.xAlign != "right" && this.yAlign == "bottom")) ? zp.reverseArcTo : zp.arcTo,
				xDec = rounded / this.width,
				yDec = rounded / this.height;
			return (
				s(this.getPoint(xDec, 0)) +
				l(this.getPoint(1 - xDec, 0)) +
				a(rounded, this.getPoint(1, yDec)) +
				l(this.getPoint(1, 1 - yDec)) +
				a(rounded, this.getPoint(1 - xDec, 1)) +
				l(this.getPoint(xDec, 1)) +
				a(rounded, this.getPoint(0, 1 - yDec)) +
				l(this.getPoint(0, yDec)) +
				a(rounded, this.getPoint(xDec, 0)));
		};
		var svg = this.L.getSVG(this.O.rounded);
		this.add(PAPER.path(svg), this.O); // Rounded must be set from the start
		this.redraw = function (orders, t, e, b, w) {
			if (!orders) return;
			this.L.set(orders.layout);
			if (orders.rounded != null) orders.path = this.L.getSVG(orders.rounded); // Rounding has changed (Path must be entirely recalculated either way)
			else if (orders.layout) orders.path = this.L.getSVG(this.O.rounded); // Layout has changed (Path must be entirely recalculated either way)
			this.animate(orders, t, e, b, w);
		};
	};
	this.appear(t, e, b, w);
};

// Text
function zText (orders, t, e, b, w) {
	var c = this;
	// Text is automatically parsed if c.O.format exists
	c.parseText = function (text) {
		var f = c.O.format;
		if (!f || typeof f != "object") return text;
		if (!isNaN(text)) text = zt.format(text, f); // Parse numbers
		if (f.rows) text = zt.wrap(text, 1.1 * text.length / f.rows);
		else if (f.wrap) text = zt.wrap(text, f.wrap); // Rows and wrap are mutually exclusive (if both exists, only row is used)
		if (f.shorten) text = zt.shorten(text, f.shorten);
		if (f.case) text =
			(f.case == "upper") ? text.toUpperCase() :
			(f.case == "lower") ? text.toLowerCase() :
			(f.case == "camel") ? zt.camelCase(text) :
			(f.case == "title") ? zt.titleCase(text) :
			text;
		return text;
	};
	c.getBBox = function (orders) {
		var i, newOrders = {}, oldOrders = {}, changed = false,
			p = ["text", "font-size", "font-weight"]; // These attributes will affect the bBox size
		for (i = 0; i < p.length; i++) if (orders[p[i]] != null) { // Check each attribute, and if it's changed..
			newOrders[p[i]] = orders[p[i]]; // Prepare to temporarily implement it
			oldOrders[p[i]] = c.O[p[i]]; // Save it in oldOrders
			changed = true;
		};
 		if (changed) {
			c.raphObj.attr(newOrders); // Implement text and text style (e.g. font-size)
			c.bBox = c.raphObj.getBBox(true); // Recalculate bBox
			c.raphObj.attr(oldOrders); // Revert to original text and text style (e.g. font-size)
		};
		return c.bBox;
	};
	c.redraw = function (orders, t, e, b, w) {
		if (!orders) return;
		var textXAlign, textYAlign, boxX, boxY, textX, textY, layout,
			O = c.parseOrders(orders); // Parse new style
		if (O.text != null) O.text = c.parseText(O.text); // Parse text
		// Calculate new layout
		c.getBBox(O); // Apply styles and calc new bBox
		c.L.set(O.layout); // Apply new layout
		// Calculate text position (relative to layout)
		textXAlign = O.textXAlign || c.O.textXAlign || c.L.xAlign; // If no textAlignment is defined, use layout alignment
		textYAlign = O.textYAlign || c.O.textYAlign || c.L.yAlign;
		boxX = zp.alignmentToDec(c.L.xAlign);
		boxY = zp.alignmentToDec(c.L.yAlign);
		textX = zp.alignmentToDec(textXAlign);
		textY = zp.alignmentToDec(textYAlign);
		layout = {
			x:c.L.trueAnchor.x + (textX - boxX) * c.L.width - (textX - 0.5) * 2 * c.L.margin,
			y:c.L.trueAnchor.y + (textY - boxY) * c.L.height - (textY - 0.5) * (2 * c.L.margin + c.bBox.height), // Text is always yCentred
			transform:(c.L.rotation) ? "r" + c.L.rotation + "," + c.L.trueAnchor.x + "," + c.L.trueAnchor.y : null, // Parse rotation
			"text-anchor":(textXAlign == "left") ? "start" : (textXAlign == "right") ? "end" : "middle" // Add anchor
		};
		O = zo.shyExtend(layout, O); // WATCH OUT! Layout must NOT be stored in c.O, as it is a *derived* layout based on the size of the text. If it's stored in c.O, it would be treated as the *source* layout, and another derived layout would be produced from it. Use shyExtend or clone to make sure that c.O is not infected by layout.
		c.animate(O, t, e, b, w); // Redraw
	};
	// Initialise
	zSimpleDrone(c, orders, "zText");
	c.bBox = {};
	if (!c.L.innerWidth) c.L.autoWidth = true;
	if (!c.L.innerHeight) c.L.autoHeight = true;
	c.add(PAPER.text(c.L.x, c.L.y, "Placeholder"), c.O);
 	if (!c.O.selectable) $(c.raphObj.node).attr("style", $(c.raphObj.node).attr("style") + "-webkit-touch-callout:none; -webkit-user-select:none; -khtml-user-select:none; -moz-user-select:none; -ms-user-select:none; user-select:none;"); // Make unselectable
	c.redraw(c.O); // Must redraw for sophisticated placement to work properly
	c.appear(t, e, b, w);
};

// Image file with layout attribute
function zImage (orders, t, e, b, w) {
	this.redraw = function (orders, t, e, b, w) {
		var L = this.L;
		L.set(orders.layout);
		zo.extend(orders, {
			x:Math.round(L.left + L.margin), y:Math.round(L.top + L.margin),
			width:Math.round(L.innerWidth), height:Math.round(L.innerHeight)
		});
		this.animate(orders, t, e, b, w);
	};
	// Initialise
	zSimpleDrone(this, orders, "zImage");
	var L = this.L;
	this.add(PAPER.image(this.O.url, L.left, L.top, L.innerWidth, L.innerHeight), this.O);
	this.appear(t, e, b, w);
};

// SVG object - NOTE: Position/size is controlled using translate, so original SVG string is not changed (UNTESTED)
function zSVG (orders, t, e, b, w) {
	this.redraw = function (orders, t, e, b, w) {
		this.animate(orders, t, e, b, w);
		if (this.L && orders.layout) {
			var L = this.L, prevAnchor = {x:L.x, y:L.y};
			L.set(orders.layout);
			this.raphObj.translate(L.x - prevAnchor.x, L.y - prevAnchor.y);
		};
	};
	// Initialise
	zSimpleDrone(this, orders, "zSVG");
	this.add(PAPER.path(this.O.path), this.O);
	this.appear(t, e, b, w);
};

// Complex drone with multiple zSimpleDrones object (based on zSimpleDrone)
function zComplexDrone (c, orders, type) {
	zSimpleDrone(zo.shyExtend(c, {
		class:"zComplexDrone",
		parts:{},
		//////////////////////
		//  Meta functions  //
		//////////////////////
		forEach:function (f, v1, v2, v3, v4, v5, v6) {
			if (typeof f == "string") for (var p in c.parts) c.parts[p][f](v1, v2, v3, v4, v5, v6);
			else if (typeof f == "function") for (var p in c.parts) f(c.parts[p], p);
		},
		////////////////////
		//  Add / Remove  //
		////////////////////
		// Adds a raphObj part to this drone
		add:function (orders, partName) {
			var drone = zDrones.make(orders.type, orders);
			if (!drone) return;
			drone.parent = c;
			c.parts[partName] = drone;
			return drone;
		},
		/////////////////
		//  Show/hide  //
		/////////////////
		show:function (t, e, b, w) {
			c.invisibleShow();
			var p, O = {opacity:c.O.opacity || 1};
			for (p in c.parts) if (c.O[p] && c.O[p].opacity) O[p] = {opacity:c.O[p].opacity}
			c.animate(O, t, e, b, w);
		},
		// Show object in the dom, but don't change its opacity
		invisibleShow:function () {
			if (c.hidden) c.forEach("invisibleShow");
			else if (!c.hiding) return; // Quit if not hidden or hiding
			c.hidden = c.hiding = false;
		},
		///////////////
		//  Animate  //
		///////////////
		// NOTE: All events for zComplexDrones need to exist at the zMultiDrone level, NOT the drone level
		parseOrders:function (orders) {
			if (!orders) return {};
			orders = za.asObject(orders);
			var p, partOrders = {}, out = {},
				allOrders = zo.clone((typeof orders == "string") ? c.O[orders] || {} : orders); // Set base
			for (p in c.parts) partOrders[p] = (allOrders[p]) ? zo.remove(allOrders, p) : {}; // If orders contains part-specific instructions, extract it and move it to partOrders
			out = zo.clone(allOrders);
			for (p in c.parts) out[p] = zo.shyExtend(partOrders[p], allOrders); // Populate partOrders with allOrders
			return out;
		},
		animate:function (orders, t, e, b, w) {
			orders = c.parseOrders(orders);
			if (zo.isEmpty(orders) || c.markOfDeath) return; // Quit if no orders is defined, or if the targeted drone is in the final stages of being removed
			for (var p in c.parts) if (orders[p]) {
				c.parts[p].animate(orders[p], t, e, b, w);
				b = null, w = c.K;
			};
			return orders;
		},
		redraw:function (orders, t, e, b, w) {
			orders = c.parseOrders(orders);
			if (zo.isEmpty(orders) || c.markOfDeath) return; // Quit if no orders is defined, or if the targeted drone is in the final stages of being removed
			for (var p in c.parts) if (orders[p]) {
				c.parts[p].redraw(orders[p], t, e, b, w);
				b = null, w = c.K;
			};
		},
		//////////////
		//  Events  //
		//////////////
		clearEvents:function () {c.forEach("clearEvents")},
		initialise:function (orders) {
			if (orders.base) orders = zo.clone(zo.remove(orders, "base"), orders);
			for (var p in orders) if (orders[p] && orders[p].type) c.parts[p] = {}; // Create placeholders for parts so parseOrders can work properly
			c.O = c.parseOrders(orders);
			if (c.O.layout) {
				if (c.O.margin != null) c.O.layout.margin = c.O.margin; // O.margin overrides layout.margin
				c.L = (c.O.layout.type == "zLayout") ? c.O.layout : new zLayout(c.O.layout, c);
			};
		}
	}), orders, type);
};

// Drone containing multiple drones
function zMultiDrone (orders, t, e, b, w) {
	var c = this, p, curr;
	zComplexDrone(c, orders, "zMultiDrone");
	// Initialise
	orders = c.parseOrders(c.O);
	for (p in c.parts) {
		curr = c.add(orders[p], p);
		if (!c.K) c.K = curr.K;
	};
	c.appear(t, e, b, w);
};

// Text box (complicated because it deals with both the text and the background)
function zTextBox (orders, t, e, b, w) {
	var c = this, p, curr;
	// Plot the location for background and branch - c.parts.textObj MUST already exist for this to work
	c.plotAccessories = function (orders) {
		if (c.parts.background) orders.background.layout = c.L; // Always lock orders.background to c.L (which is linked to textObj.L)
		if (c.parts.branch) orders.branch.points = [c.L.radialStartPoint, c.L.radialEndPoint];
	};
	c.redraw = function (orders, t, e, b, w) {
		orders = c.parseOrders(orders);
		if (zo.isEmpty(orders) || c.markOfDeath) return; // Quit if no orders is defined, or if the targeted drone is in the final stages of being removed
		c.parts.textObj.redraw(orders.textObj, t, e, b, w);
		c.plotAccessories(orders); // Must redraw textObj before plotting accessories
		if (c.parts.background) c.parts.background.redraw(orders.background, t, e, null, c.K);
		if (c.parts.branch) c.parts.branch.redraw(orders.branch, t, e, null, c.K);
	};
	c.initialise = function (orders, type) {
		if (orders.base) orders = zo.clone(zo.remove(orders, "base"), orders); // Base extraction must take place before background/branch can be determined
		if (orders.background) orders.background.type = "zRectangle";
		if (orders.branch && orders.layout.radialEnd != null) orders.branch.type = "zLine"; // Don't draw a line if no radialEnd defined
		orders.textObj = orders.textObj || {};
		orders.textObj.type = "zText";
		for (p in orders) if (orders[p] && orders[p].type) c.parts[p] = {}; // Create placeholders for parts so parseOrders can work properly
		c.O = c.parseOrders(orders);
		if (c.O.layout) {
			if (c.O.margin != null) c.O.layout.margin = c.O.margin; // O.margin overrides layout.margin
			c.L = (c.O.layout.type == "zLayout") ? c.O.layout : new zLayout(c.O.layout, c);
		};
	};
	// Initialise
	zComplexDrone(c, orders, "zTextBox");
	c.add(c.O.textObj, "textObj");
	c.K = c.parts.textObj.K;
	c.L = c.parts.textObj.L;
	if (c.parts.background) {
		c.O.background.layout = c.L;
		c.add(c.O.background, "background");
	};
	if (c.parts.branch) {
		c.O.branch.points = [c.L.radialStartPoint, c.L.radialEndPoint];
		c.add(c.O.branch, "branch");
	};
	c.parts.textObj.toFront();
	c.appear(t, e, b, w);
};

// Special instance of zTextBox with some behaviours built in, and starts hidden
function zTooltipBox (orders) {
	var c = new zTextBox(zo.extend({
		type:"zTooltipBox",
		text:"Empty tooltip",
		margin:10, // Overrides layout margins
		layout:{},
		"font-size":14,
		fill:"#eee",
		background:{
			rounded:15,
			stroke:null,
			fill:"black",
			opacity:0.85
		}}, orders));
	c.moveToEvent = function (event, layout) {
		var eventPos = zt.getEventPosition(event);
		c.redraw({layout:zo.extend({
			x:Math.max(eventPos.x - 12, c.L.width),
			y:Math.max(eventPos.y - 12, c.L.height),
			xAlign:"right", yAlign:"bottom"
		}, layout)});
	};
	c.showAt = function (orders, t, e, b, w) {
		c.redraw(orders); // Update text
		c.toFront();
		c.show(t, e, b, w);
	};
	c.type = "zTooltipBox";
	c.hide();
	c.hover(function () {c.show(100)}, function () {c.hide(100)});
	c.click(function () {c.hide(100)});
	return c;
};

// HTML object, uses jQuery - NOTE: NOT PART OF THE SVG
function zHTML (orders, t, e, b, w) {
	var c = this;
	c.add = function (orders) {
		var html = $("<div" + ((orders.setClass) ? " class=" + orders.setClass : "") + ((orders.setID) ? " id=" + orders.setID : "") + "></div>"); // Don't change name to class - it breaks it in goddamn retarded IE
		c.raphObj = html;
 		$("#Raphael").append(html);
		return html;
	};
	c.animate = function (orders, t, e, b, w) {
		orders = c.parseOrders(orders);
		if (zo.isEmpty(orders) || c.markOfDeath) return; // Quit if no orders is defined, or if the targeted drone is in the final stages of being removed
		c.stop();
		// FIXME: Easing doesn't work properly for zHTML
		$(c.raphObj).animate(orders, t || 0, "linear", b); // Animate - no animateWith or instant animate (attr doesn't work)
		return orders;
	};
	c.clearEvents = function () {$(c.raphObj).unbind()}; // Use jQuery
// 	c.parseHTML = function (content) {
// 		var i, text, div = $(content);
// 		if (div.length > 1) {
// 			for (i = 0; i < div.length; i++) {
// 				div[i] = c.parseHTML(div[i]);
// 			};
// 		} else {
// 			text = div.html().replace("'", ""); // Get text and remove quote marks
// 			div.html(text);
// 			return div[0];
// 		};
// 		return div;
// 	};
	c.getBBox = function (orders, revert) {
		if (orders.content) {
			c.raphObj.html(zo.remove(orders, "content")); // Don't pass any further - quote marks in orders.content gum up c.raphObj.attr() for unknown reasons
			c.bBox = {width:c.raphObj.width(), height:c.raphObj.height()};
		};
		return c.bBox;
	};
	c.redraw = function (orders, t, e, b, w) {
		if (!orders || c.markOfDeath) return; // Quit if no orders are defined
		var docPos, orders = c.parseOrders(orders); // Parse new style
		c.getBBox(orders); // Apply style and update bBox
		if (orders.layout) {
			c.L.set(orders.layout); // Apply new layout
			docPos = zt.getDocumentPosition({x:c.L.left, y:c.L.top});
			zo.extend(orders, {
				position:"absolute",
				left:docPos.x + "px",
				top:docPos.y + "px",
				width:(c.L.autoWidth) ? "auto" : Math.round(c.L.innerWidth) + "px",
				height:(c.L.autoHeight) ? "auto" : Math.round(c.L.innerHeight) + "px",
				padding:c.L.margin + "px"
			});
		};
		// Redraw
		orders = zo.clone(c.O, orders);
		c.raphObj.attr("style", zo.asCSSString(orders)); // FIXME: Use jQuery.animate(), maybe?
	};
	// Initialise
	zSimpleDrone(c, orders, "zHTML");
	c.bBox = {};
	if (!c.L.innerWidth) c.L.autoWidth = true;
	if (!c.L.innerHeight) c.L.autoHeight = true;
	c.add(c.O);
	c.redraw(c.O);
	c.appear(t, e, b, w);
};

// Special instance of zHTML with some behaviours built in, and starts hidden
function zHTMLTooltipBox (orders) {
	var c = new zHTML(zo.extend({
		text:"Empty tooltip",
		layout:{},
		margin:10, // Overrides layout margins
		opacity:0.8,
		"z-index":9999, // To top
		"-moz-box-shadow": "10px 10px 5px #888",
		"-webkit-box-shadow": "10px 10px 5px #888",
		"box-shadow": "5px 5px 5px #bbb",
		"border":"solid 1px #c4dde2",
		"border-radius":"10px",
		"background-color":"#d4edf2",
		"font-family":"sans-serif",
		"font-size":"13px"
	}, orders));
	c.moveToEvent = function (event, layout) {
		var eventPos = zt.getEventPosition(event);
		c.redraw({layout:zo.extend({
			x:Math.max(eventPos.x - 12, c.L.width),
			y:Math.max(eventPos.y - 12, c.L.height),
			xAlign:"right", yAlign:"bottom"
		}, layout)});
	};
	c.showAt = function (orders, t, e, b, w) {
		if (orders.text) orders.content = zo.remove(orders, "text");
		c.redraw(orders, null, null, function () {c.show(t, e, b, w)}); // Update text
	};
	c.type = "zHTMLTooltipBox";
	c.hide();
	c.hover(function () {c.show(100)}, function () {c.hide(100)});
	c.click(function () {c.hide(100)});
	return c;
};

function zNarrator (orders) {
	var c = new zHTML(zo.extend({
		setID:"narrator",
		margin:20, // Overrides layout margins
		opacity:0.92,
		"z-index":9999, // To top
		"-moz-box-shadow": "10px 10px 5px #888",
		"-webkit-box-shadow": "10px 10px 5px #888",
		"box-shadow": "5px 5px 5px #bbb",
		"border":"solid 1px #c4dde2",
		"border-radius":"10px",
		"background-color":"#d4edf2",
		"font-family":"sans-serif",
		"font-size":"13px",
		layout:{},
		content:
			"<div id='content'>bfgb</div><br><br>" +
			"<div id='nav'>" +
				"<a href=javascript:void(0) id='prev'>Prev</a>" +
				"<a href=javascript:void(0) id='next'>Next</a>" +
				"<div id='middle'>" +
					"<div id='pageCount'></div>" +
					"<a href=javascript:void(0) id='close'>Close</a>" +
				"</div>" +
			"</div>"
	}, orders));
	c.setScene = function (page) {
		var scene = c.script[page - 1];
		c.page = page;
		if (page == 1) c.elements.prev.hide(); // On first page, hide "prev" button
		else if (page == 2) c.elements.prev.show(); // On second page, show "prev" button again
		else if (page == c.script.length - 1) c.elements.next.html("Next"); // On second to last page, show "next" button if it's been hidden
		else if (page == c.script.length) c.elements.next.html("Close"); // On last page, change "next" button to "Close"
		else if (page > c.script.length) { // Script is finished..
			c.remove(200, "<>"); // Remove itself..
			if (orders.onClose) orders.onClose(); // Run onClose actions
			return;
		};
		c.elements.content.html(scene.content);
		c.elements.pageCount.html(page + "/" + c.script.length);
		if (scene.action) scene.action(); // Execute action
		c.redraw({layout:scene.layout}); // Redraw layout if required and unlock at the end of it
	};
	c.type = "zNarrator";
	c.script = orders.script;
	c.elements = {
		content:$("#narrator #content"),
		prev:$("#narrator #nav #prev"),
		next:$("#narrator #nav #next"),
		pageCount:$("#narrator #nav #middle #pageCount"),
		close:$("#narrator #nav #middle #close")
	};
	c.elements.close.click(function () {c.setScene(c.script.length + 1)});
	c.elements.prev.click(function () {c.setScene(c.page - 1)});
	c.elements.next.click(function () {c.setScene(c.page + 1)});
	c.setScene(1);
	return c;
};


/*

zDataCube - Data/metadata storage and calculation

	----------
	Properties
	----------
	.dLen: Number of dimensions. Each dimension has its own set of metadata, and adds an additional dimension to each data type.
	.shown: Array determining which values on a given dimension is shown. e.g. If .meta[0].name == [a,b,c,d,e], and .shown[0] == [1,3,4], that means only [b,d,e] are shown. .get("name", {d:0, r:0}) will return "b", but .get("name", {d:0, a:0}) will return "a".

	.meta[d]: Object containing all the types of metadata for that dimension.
		.name: Array of id extracted from the source data - it doesn't *have* to be unique, but if it's not, .shyPushMeta() and .makeTree() won't work.
		"all": Special type name used to get every type of data within a dimension.
	.data[type]: Every .data[type] is a dLen-dimensional array (e.g. Cube) containing the actual data.

	----------
	Arguments:
	----------
	pos or p: Reference to a single position in a dimension - needs to be paired with a dimension and specified as aPos (default) or rPos to be a meaningful reference.
		Valid formats:
			number - refers to a single aPos/rPos in that dimension.
			array - refers to a list of aPos/rPos in that dimension.
			"all" - refers to every aPos/rPos in that dimension.
			null - refer to the whole dimension (subtly different from "all", since "all" will return an array of fixed length based on .getSize(d), whereas null will simply get that metadata type as a whole).
		Note: .asAPos({d:d, a:"all"}) will return an array, while .asAPos({d:d}) or .asAPos({d:d, a:null}) will return null - this is the check used by .getMeta() et al.

	space or s: An array which defines a range within the data cube.
		Valid formats:
			array - Must be dLen long and contain a pos or "mask" for each dimension (e.g. [0,0,0] or ["all","mask","mask"]).
			"all" --> ["all", "all", "all"]
			"mask" --> ["mask", "mask", "mask"]
			{d:1, a:5} --> ["mask", 5, "mask"]
		Note: "mask" is a special case for spaces. Not meaningful on their own, but can be used to combine spaces.
			.addSpaces([0, 0, 0], ["mask", "mask", 8]) --> [0, 0, 8]

	x: An object containing a dimension and a pos, or a space.
		Valid formats:
			{d:d, a:pos} or {d:d, p:pos, isR:false}: Absolute position (i.e. Actual position in .meta[d].type).
			{d:d, r:pos} or {d:d, p:pos, isR:true}: Relative position (i.e. Position in .shown[d]). Note: .shown[d][rPos] contains the aPos value.
			{d:d, as:[0,0,0]} or {d:d, s:[0,0,0], isR:false}: Implied absolute position; the position will be extracted from the space, based on which dimension was defined.
			{d:d, rs:[0,0,0]} or {d:d, s:[0,0,0], isR:true}: Implied relative position; the position will be extracted from the space, based on which dimension was defined.
			{as:[0,0,0]} or {s:[0,0,0], isR:false}: Absolute space is an array of absolute positions.
			{rs:[0,0,0]} or {s:[0,0,0], isR:true}: Relative space is an array of relative positions.

*/
function zDataCube (d) {
	var c = this;
	///////////////
	//  Parsing  //
	///////////////
	c.isR = function (x) {return x && (x.isR || x.rs || x.r != null)};
	// Converts {d:, a:}, {d:, r:}, {d:, as:}, {d:, rs:}, {d:, s:} into {d:, p:, isR:} form
	c.parsePos = function (x) {
		if (x == null) logger("zDataCube.parsePos(): null is not a valid pos.");
		else if (x.d == null) logger("zDataCube.parsePos(): No dimension defined (" + zt.asString(x) + ").");
		else {
			if (x.a != null) return {d:x.d, p:x.a};
			if (x.r != null) return {d:x.d, p:x.r, isR:true};
			if (x.p != null) return {d:x.d, p:x.p, isR:x.isR};
			if (za.isArray(x.as)) return {d:x.d, p:x.as[x.d]};
			if (za.isArray(x.rs)) return {d:x.d, p:x.rs[x.d], isR:true};
			if (za.isArray(x.s)) return {d:x.d, p:x.s[x.d], isR:x.isR};
		};
	};
	// Converts {d:, as:}, {d:, rs:}, {d:, s:} into [,,,] form
	c.parseSpace = function (x) {
		if (x == null) return logger("zDataCube.parseSpace(): null is not a valid space.");
		var s = x.as || x.rs || x.s || x; // Extract the space - agnostic about what type of space it is
		if (za.isArray(s)) return s.slice(); // Clean space: ["mask", 5, "mask"] --> ["mask", 5, "mask"]
		else if (typeof s == "string") { // String shortcut: "all" --> ["all", "all", "all"] OR "mask" --> ["mask", "mask", "mask"]
			if (s != "all" && s != "mask") logger("zDataCube.parseSpace(): Only 'all' or 'mask' are valid strings for spaces. I don't know what " + zt.asString(s) + " is.");
			else return za.fill(s, c.dLen);
		} else { // Pos shortcut: {d:1, a:5} --> ["mask", 5, "mask"]
			var out, pos = c.parsePos(x);
			if (pos) {
				out = za.fill("mask", c.dLen);
				out[pos.d] = pos.p;
				return out;
			};
		};
		logger("zDataCube.parseSpace(): " + zt.asString(x) + " is not a valid space.");
	};
	// For every pos in maskS which is "mask", take the value from baseS
	c.addSpaces = function (baseS, maskS) {
		baseS = c.parseSpace(baseS);
		if (!maskS) return baseS;
		maskS = c.parseSpace(maskS);
		for (var d = 0; d < c.dLen; d++) if (maskS[d] == "mask") maskS[d] = baseS[d];
		return maskS;
	};
	///////////////////////////
	//  Location conversion  //
	///////////////////////////
	c.asAPos = function (x) {
		x = c.parsePos(x);
		if (!x) return; // Check if there's a valid pos
		if (x.isR) { // If it an rPos, convert to aPos
			if (x.p == "all") return c.shown[x.d].slice();
			if (typeof x.p == "number" || za.isArray(x.p)) return za.map(c.shown[x.d], x.p);
			return x.p; // r is unparsable, return anyway
		} else { // Otherwise, try to grab the aPos and use it as is
			if (x.p == "all") return za.fill(0, c.getSize(x.d), 1);
			return x.p;
		};
	};
	c.asRPos = function (x) {
		x = c.parsePos(x);
		if (!x) return; // Check if there's a valid pos
		if (!x.isR) { // If it an aPos, convert to rPos
			if (x.p == "all") return za.unmap(c.shown[x.d], za.fill(0, c.getSize(x.d), 1));
			if (typeof x.p == "number" || za.isArray(x.p)) return za.unmap(c.shown[x.d], x.p);
			return x.p; // a is unparsable, return anyway
		} else { // Otherwise, try to grab the rPos and use it as is
			if (x.p == "all") return za.fill(0, c.shown[x.d].length, 1);
			return x.p;
		};
	};
	c.asASpace = function (x) {
		var d, isR = c.isR(x), out = c.parseSpace(x);
		for (d = 0; d < c.dLen; d++) out[d] = c.asAPos({d:d, p:out[d], isR:isR});
		return out;
	};
	c.asRSpace = function (x) {
		var d, isR = c.isR(x), out = c.parseSpace(x);
		for (d = 0; d < c.dLen; d++) out[d] = c.asRPos({d:d, p:out[d], isR:isR});
		return out;
	};
	// Get a list of spaces in x.as, but extended by x.mask and with no duplication (e.g. If x.as == "all" and x.mask == ["all", "mask", "mask"], then this will return [["all", 0, 0], ["all", 0, 1], ["all", 1, 0]...])
	c.listSpaces = function (x) {
		var d, counter, currS = [], out = [], maxPos = [],
			baseS = (c.isR(x)) ? c.asRSpace(x) : c.asASpace(x); // Parse baseS,
			maskS = (x.mask) ? c.parseSpace(x.mask) : null;
		if (maskS) for (d = 0; d < maskS.length; d++) {
			if (maskS[d] != "mask") baseS[d] = "mask"; // If maskS[d] has a real value (i.e. Not "mask"), then set s[d] to "mask" - this will stop listSpaces() from generating reference spaces in that dimension
		};
		// Work out the iteration parameters for each dimension
		for (d = 0; d < c.dLen; d++) {
			baseS[d] = za.asArray(baseS[d]);
			maxPos[d] = baseS[d].length - 1;
			if (maxPos[d] < 0) return out; // A dimension is empty, quit
		};
		// Generate a list of reference spaces and add maskS to them
		counter = za.count(maxPos);
		for (i = 0; i < counter.length; i++) {
			for (d = 0; d < c.dLen; d++) currS[d] = baseS[d][counter[i][d]]; // Converts counter to baseS val
			out.push(c.addSpaces(currS, maskS)); // Add maskS
		};
		return out;
	};
	/////////////////
	//  Iterators  //
	/////////////////
	c.forPos = function (x, f) {
		var i, aPos = za.asArray(c.asAPos(x));
		for (i = 0; i < aPos.length; i++) f({d:x.d, a:aPos[i]});
	};
	c.forSpaces = function (x, f) {
		var i, list = c.listSpaces(x);
		for (i = 0; i < list.length; i++) f({as:list[i]});
	};
	c.forGenerations = function (d, f, reverse, skipFirst, skipLast) {
		var g, tree = c.getMeta("tree", {d:d});
		skipFirst = skipFirst || 0;
		skipLast = skipLast || 0;
		if (reverse) {
			for (g = tree.length - 1 - skipFirst; g >= skipLast; g--) {
				f({d:d, a:tree[g]});
			};
		} else {
			for (g = skipFirst; g < tree.length - skipLast; g++) {
				f({d:d, a:tree[g]});
			};
		};
	};
	c.forMeta = function (type, x, f) {
		var oldVal, newVal;
		c.forPos(x, function (x) {
			oldVal = c.getMeta(type, x);
			newVal = f(oldVal, x);
			c.setMeta(type, x, newVal);
		});
	};
	c.forData = function (type, x, f) {
		var oldVal, newVal;
		c.forSpaces(x, function (x) {
			oldVal = c.getData(type, x);
			newVal = f(oldVal, x);
			c.setData(type, x, newVal);
		});
	};
	/////////////
	//  Shown  //
	/////////////
	// Sets shown[d], and backs up the old one to oldShown[d]
	c.setShown = function (d, newShown) {
		if (d != null) { // Set/reset a specified shown
			c.oldShown[d] = c.shown[d];
			c.shown[d] = newShown || za.fill(0, c.getSize(d), 1); // Replace shown with newShown or a sequential array (i.e. Everything)
		} else for (d = 0; d < c.dLen; d++) c.setShown(d); // Reset all
	};
	// Filter shown by metadata (additive to previous filters)
	c.filterShown = function (type, d, v1, mode, v2) {
		var meta = c.getMeta(type, {d:d, r:"all"}), // Get all shown values of the targeted metadata set
			rPos = za.findAll(meta, v1, mode, v2), // Find the pos of all matching values - these will be rPos, since we're only searching the set of *shown* values
			aPos = c.asAPos({d:d, r:rPos}); // Convert rPos to aPos
		c.setShown(d, aPos);
		return shown;
	};
	// Shortcut for getting the size of each dimension
	c.getSize = function (d, isR) {
		if (d != null) {
			if (!c.meta[d].name) explode("zDataCube.getSize(): Dimension " + d + " does not contain name property.");
			else return (isR) ? c.shown[d].length : c.meta[d].name.length;
		} else {
			for (var out = [], d = 0; d < c.dLen; d++) out[d] = c.getSize(d, isR);
			return out;
		};
	};
	////////////////
	//  Metadata  //
	////////////////
	c.setMeta = function (type, x, val) {
		if (type != null && type != "all") { // Type is specified
			var i, meta = c.meta[x.d], aPos = c.asAPos(x);
			if (aPos == null) meta[type] = val; // Treat x as dimension, and set entire meta[type] to val
			else { // Set a single element of meta
				if (!meta[type]) { // If this meta is empty, create it
					logger("zDataCube.setMeta(): Creating new meta of type " + type + " in dimension " + x.d + ".");
					meta[type] = [];
				};
				if (typeof aPos == "number") meta[type][aPos] = val;
				else if (za.isArray(aPos)) for (i = 0; i < aPos.length; i++) {
					meta[type][aPos[i]] = val;
				};
			};
		} else for (type in val) { // Set many types at once
			if (type == "all") logger("zDataCube.setMeta(): 'all' is a reserved type name used to call up all types of metadata at once. Don't use it in your data.");
			else c.setMeta(type, x, val[type]);
		};
	};
	c.getMeta = function (type, x) {
		var aPos = c.asAPos(x), meta = c.meta[x.d];
		if (type == "all") {
			var i, out;
			if (aPos == null) return null;
			if (za.isArray(aPos)) {
				out = [];
				for (i = 0; i < aPos.length; i++) out[i] = c.getMeta("all", {d:x.d, a:aPos[i]});
			} else {
				out = {};
				for (type in meta) out[type] = meta[type][aPos];
				out.a = aPos; // Give it an aPos - this overrides meta[type].a, which shouldn't exist anyway
			};
			return out;
		} else {
			if (!meta[type]) logger("zDataCube.getMeta(): Metadata type " + type + " in dimension " + x.d + " is empty or does not exist.");
			else return (aPos == null) ? meta[type] : za.map(meta[type], aPos); // If it's a partial selection, grab the elements requested in aPos
		};
	};
	c.getName = function (x) {return c.getMeta("name", x)},
	// Finds the first pos in .meta[d] which matches the arguments
	c.findMeta = function (type, x, v1, mode, v2) {
		var aPos = c.asAPos(x), meta = c.getMeta(type, x), // Get metadata in the search range
			match = za.find(meta, v1, mode, v2); // Find matches within the range (positions returned here are only relative to the search range!)
		return (aPos == null) ? match : za.map(aPos, match); // If only part of the dimension was searched, then matches have to mapped against the search range to get the real position
	};
	// Finds all the pos in .meta[d] which matches the arguments
	c.findAllMeta = function (type, x, v1, mode, v2) {
		var aPos = c.asAPos(x), meta = c.getMeta(type, x), // Get metadata in the search range
			matches = za.findAll(meta, v1, mode, v2); // Find matches within the range (positions returned here are only relative to the search range!)
		return (aPos == null) ? matches : za.map(aPos, matches); // If only part of the dimension was searched, then matches have to mapped against the search range to get the real position
	};
	// Extend a dimension by adding a set of meta (meta.name is required as the uid) and return its position - if name already exists, it will return position and NOT add
	c.shyPushMeta = function (type, d, meta) {
		var aPos = c.findMeta(type || "name", {d:d}, meta.name || meta); // Find aPos
		if (aPos != null) return aPos; // If it exist, return it
		aPos = c.getSize(d);
		c.shown[d].push(aPos);
		c.setMeta(type, {d:d, a:aPos}, meta);
		return aPos;
	};
	// Apply za.calc functions (sum, mean, etc.)
	c.calcMeta = function (mode, type, x, v1, v2, v3) {
		var a = za.asArray(c.getMeta(type, x));
		return za.calc(mode, a, v1, v2, v3);
	};
	// Creates a new meta type, calculated using .calcMeta()
	c.addCalcMeta = function (mode, type, x, v1, v2, v3) {
		var i, aPos = c.asAPos(x),
			nameStr = zt.camelCase([type, mode]),
			result = c.calcMeta(mode, type, x, v1, v2, v3);
		for (i = 0; i < aPos.length; i++) {
			c.setMeta(nameStr, {d:x.d, a:aPos[i]}, result[i]);
		};
	};
	// Algorithms for assigning colours - pain in the balls
	c.setColour = function (x, palette, mode) {
		palette = palette || zt.getPalette(null, 12, "sequential");
		var g, i, j, k, n, out = [], pool = [], prev, isMatch,
			aPos = c.asAPos(x);
		if (mode == "hierarchic" || mode == "randomHierarchic") {
			if (palette.length < 3) explode("zDataCube.setColour(): Can't do a hierarchic assignment with less than 3 colours.");
			g = c.meta[x.d].tree;
			for (i = 0; i < g.length; i++) for (j = 0; j < g[i].length; j++) {
				if (!pool.length) pool = (mode == "hierarchic") ? palette.slice() : za.getRandom(palette, palette.length);
				n = c.getMeta("all", {d:x.d, a:g[i][j]});
				for (k = 0; k < pool.length; k++) {
					isMatch =
						(prev && out[prev.a] == pool[k]) ? false : // Same colour as the previous element - unacceptable
						(n.parent != null && out[n.parent] == pool[k]) ? false : // Same colour as parent - unacceptable
						true;
					if (isMatch) {
						out[n.a] = pool.splice(k, 1)[0];
						break;
					} else if (k == pool.length - 1) { // Reset (if the palette is only 2 or less, then a match may be impossible, so don't reset)
						k = -1;
						za.add(pool, (mode == "hierarchic") ? palette.slice() : za.getRandom(palette, palette.length));
					};
				};
				prev = n;
			};
		} else out = zt.getPalette(palette, aPos.length, mode || "sequential");
		c.setMeta("colour", {d:x.d}, out);
	};
	////////////
	//  Data  //
	////////////
	c.addDataType = function (type, data) {c.data[type] = data || []};
	c.setData = function (type, s, data) {za.setDeep(c.data[type], c.asASpace(s), data)};
	c.getData = function (type, s) {return za.getDeep(c.data[type], c.asASpace(s))};
	// Apply za.calc functions (sum, mean, etc.)
	c.calcData = function (mode, type, x, v1, v2, v3) {
		var a = za.flatten(za.asArray(c.getData(type, x)));
		return za.calc(mode, a, v1, v2, v3);
	};
	// Creates a new data type
	c.addCalcData = function (mode, type, x, v1, v2, v3) {
		var i, nameStr = zt.camelCase([type, mode]);
		if (!c.data[nameStr]) c.addDataType(nameStr); // Create data object only if it doesn't already exist
		c.forSpaces(x, function (x) {
			var result = c.calcData(mode, type, x, v1, v2, v3),
				cells = c.listSpaces(x);
			for (i = 0; i < cells.length; i++) {
				c.setData(nameStr, {as:cells[i]}, result[i]);
			};
		});
		return c.getData(type, x);
	};
	//////////////////
	//  Tree nodes  //
	//////////////////
	c.makeTree = function (d) {
		if (d != null) {
			var i, p, currGen = [], nextGen,
				children = [], leaves = [], generation = [], tree = [],
				parent = c.meta[d].parent, // meta[d].parent is the position of the parent
				parentName = c.meta[d].parentName, // meta[d].parentName is the name of the parent
				origLength = (parentName) ? parentName.length : (parent) ? parent.length : null;
			// Use parentName to find parent
			if (parentName) for (parent = [], i = 0; i < c.getSize(d); i++) {
				if (parentName[i] == "root" || parentName[i] == null) parent[i] = null; // "root" and null mean this is a root node
				else parent[i] = c.shyPushMeta("name", d, parentName[i]); // Extend is a shy function - if the name already exists, it will only find rather than extend
			};
			// Create nodes and set parents
			if (parent) for (i = 0; i < c.getSize(d); i++) {
				p = parent[i];
				if (p == i) explode("zDataCube.makeTree(): UH OH - " + c.getName({d:d, a:i}) + " is its own parent. Space-time continuum collapsing.");
				parent[i] = (p == -1) ? null : p; // -1 or null mean this is a root node
				children[i] = [];
				leaves[i] = 0;
			} else return; // If no meta[d].parentName or meta[d].parent, quit
			// Set children
			for (i = 0; i < c.getSize(d); i++) {
 				p = parent[i];
				if (p != null) children[p].push(i);
			};
			// Set tree
			currGen = za.findAll(parent, null); // Start with root generation
			while (currGen.length > 0) {
				nextGen = []; // Reset next generation
				for (i = 0; i < currGen.length; i++) { // For each member of the current generation
					p = currGen[i];
					generation[p] = tree.length; // Give it a generation value...
					za.add(nextGen, children[p]); // ...and add its children to the next generation
				};
				tree.push(currGen); // Put the current generation aside
				currGen = nextGen; // And move on to the next generation
			};
			// Put into datacube
			c.setMeta(null, {d:d}, {
				parent:parent,
				children:children,
				leaves:leaves,
				tree:tree,
				generation:generation
			});
			c.showNodes({d:d, a:"all"}); // Set shown values of nodes (show all)
			logger("zDataCube.makeTree(): " + parent.length + " nodes added into " + tree.length + " generations, with " + (parent.length - origLength) + " imputed nodes.");
		} else for (d = 0; d < c.dLen; d++) c.makeTree(d);
	};
	// Create a new root node and move all existing nodes underneath it
	c.addRootNode = function (d, name) {
		var i, meta = c.meta[d],
			aPos = c.findMeta("name", {d:d}, name || "root");
		if (aPos == null) aPos = c.getSize(d);
		// Bump all existing nodes up by one generation
		for (i = 0; i < meta.generation.length; i++) {
			if (meta.generation[i] == 0) meta.parent[i] = aPos; // Make current root generation its child
			meta.generation[i]++; // Bump
		};
		// Create root node
		c.setMeta(null, {d:d, a:aPos}, {
			name:name || "root", parent:null, children:meta.tree[0],
			generation:0, leaves:c.calcMeta("leaves", {d:d, a:meta.tree[0]}, "sum")
		});
		meta.tree = [[aPos]].concat(meta.tree); // Add to tree
		return c.getMeta("all", {d:d, a:aPos});
	};
	// showNode() propagates upwards (when a child shows, it gets a leaves++, and ALL of its ancestors get a leaves++)
	c.showNodes = function (x) {
		var i, parent, currLeaves,
			leaves = c.meta[x.d].leaves,
			aPos = za.asArray(c.asAPos(x));
		for (i = 0; i < aPos.length; i++) {
			x = {d:x.d, a:aPos[i]};
			parent = c.findParent(x);
			currLeaves = c.calcFamily("children", "sum", "leaves", x);
			c.setMeta("leaves", x, Math.max(1, currLeaves)); // Leaves is the number of leaves on its children, or 1 if it has no children
			za.shyPush(c.shown[x.d], x.a); // Add to shown
			if (parent != null) c.showNodes({d:x.d, a:parent}); // Iterate up the tree
		};
	};
	// hideNode() propagates upwards (all ancestors lose the leaves being hidden) AND downwards (all decendent nodes are hidden as well)
	c.hideNodes = function (x) {
		var i, parent, ancestors, descendants, currLeaves,
			leaves = c.meta[x.d].leaves,
			aPos = c.asAPos(x);
		for (i = 0; i < aPos.length; i++) {
			x = {d:x.d, a:aPos[i]};
			parent = {d:x.d, a:c.findParent(x)};
			ancestors = {d:x.d, a:c.findFamily("ancestors", x)};
			descendants = {d:x.d, a:[aPos[i]].concat(c.findFamily("descendants", x))};
			currLeaves = c.getMeta("leaves", x);
			if (c.getMeta("leaves", parent) > currLeaves) currLeaves--; // If node is parent's only child, then leave one leaf behind (i.e. parent will become a standalone leaf)
			c.forMeta("leaves", ancestors, function (val) {return val - currLeaves}); // Remove from ancestors
			c.setMeta("leaves", descendants, 0); // Hide node
			za.remove(c.shown[x.d], descendants); // Remove from shown
		};
	};
	c.findFamily = function (relationship, x, liveOnly) {
		var out = [], curr;
		if (relationship == "all") {
			out = c.asAPos(x);
		} else if (relationship == "parent") {
			out = c.getMeta("parent", x);
		} else if (relationship == "children") {
			out = c.getMeta("children", x);
		// Children of node, plus their children, plus their children... (liveOnly excludes all the ones with leaves of 0)
		} else if (relationship == "descendants") {
			curr = za.flatten(c.findChildren(x, liveOnly)); // Flatten, in case multiple targets are selected
			while (curr != null && curr.length > 0) {
				za.add(out, curr);
				curr = za.flatten(c.findChildren({d:x.d, a:curr}, liveOnly)); // Flatten, in case multiple targets are selected
			};
		} else {
			var i, parent, children,
				aPos = c.asAPos(x);
			if (relationship == "siblings") {
				parent = c.findParent(x); // Find its parent
				children = za.flatten(c.findChildren({d:x.d, a:parent})); // Its parents children are its siblings and itself
				out = za.subtract(children, aPos); // Remove itself from group
			// Parent of node, plus its parent, plus its parent...
			} else if (relationship == "ancestors") {
				for (i = 0; i < c.getMeta("generation", x); i++) {
					aPos = c.findParent({d:x.d, a:aPos});
					if (aPos == null) break;
					out.push(aPos);
				};
			};
		};
		if (liveOnly && za.isArray(out)) return za.asArray(c.findAllMeta("leaves", {d:x.d, a:out}, 0, ">")); // Return the same array structure, but with only live members
		else return out;
	};
	// Shortcuts
	c.findParent = function (x) {return c.findFamily("parent", x)};
	c.findChildren = function (x, liveOnly) {return c.findFamily("children", x, liveOnly)};
	// Find a path of nodes between two nodes
	c.findRelationship = function (d, startAPos, endAPos) {
		if (c.asAPos({d:d, a:startAPos}) == null) return logger("zDataCube.findRelationship(): startAPos " + zt.asString(startAPos) + " is not valid.");
		if (c.asAPos({d:d, a:endAPos}) == null) return logger("zDataCube.findRelationship(): endAPos " + zt.asString(endAPos) + " is not valid.");
		var i, pos,
			startToRoot = za.add([startAPos], c.findFamily("ancestors", {d:d, a:startAPos}));
			endToRoot = za.add([endAPos], c.findFamily("ancestors", {d:d, a:endAPos})).reverse();
		for (i = 0; i < startToRoot.length; i++) {
			pos = za.find(endToRoot, startToRoot[i]);
			if (pos != null) return za.add(startToRoot.slice(0, i), endToRoot.slice(pos));
		};
		return [];
	};
	c.getFamily = function (relationship, type, x) {
		var aPos = c.findFamily(relationship, x);
		return c.getMeta(type, {d:x.d, a:aPos});
	};
	// Calc functions
	c.calcFamily = function (relationship, mode, type, x, liveOnly) {
		var aPos = c.findFamily(relationship, x, liveOnly),
			vals = c.getMeta(type, {d:x.d, a:aPos});
		return za.calc(mode, vals);
	};
	// Aggregate all children values and add it to parents
	c.calcTreeMeta = function (mode, type, d) {
		if (mode == "stacked") { // Stack is special because children must all fit within the range of the parent
			var tree = c.meta[d].tree;
			c.addCalcMeta("stacked", type, {d:d, a:tree[0]}, 0); // Stack for root generation
			c.forGenerations(d, function (x) {
				c.forPos(x, function (x) {
					var newVal,
						oldVal = c.getMeta(type + "Stacked", x),
						children = {d:d, a:c.findChildren(x)};
					c.addCalcMeta("stacked", type, children, oldVal.start); // Stack for each subsequent generation
					newVal = za.mergeStacked(c.getMeta(type + "Stacked", children));
// 					if (zt.round(newVal.end, 10) != zt.round(oldVal.end, 10)) {
// 						logger("zDataCube.calcTreeMeta(): UH OH - Range for " + c.getName(x) + " is " + zt.asString(oldVal) + ", but its children is " + zt.asString(newVal) + " {d:" + d + ", a:" + x.a + ", type:" + type + "}.");
// 					};
				});
			}, false, 0, 1);
		} else { // For non-stacked, elements just have to be calculated within each generation
			c.forGenerations(d, function (x) {
				c.forMeta(type, x, function (oldVal, x) {
					var newVal = c.calcFamily("children", mode, type, x);
// 					if (oldVal != null && newVal != oldVal) {
// 						logger("zDataCube.calcTreeMeta(): UH OH - Value for " + c.getName(x) + " is " + oldVal + ", but the " + mode + " of its children is " + newVal + " {d:" + d + ", a:" + x.a + ", type:" + type + "}.");
// 					};
					return newVal;
				});
			}, true, 1, 0);
		};
	};
	// Aggregate all children values and add it to parents
	c.calcTreeData = function (mode, type, d) {
		if (mode == "stacked") {
			c.forSpaces({as:"all", mask:{d:d, a:"na"}}, function (space) { // Iterate through each space NOT in the selected dimension
				space.as[d] = c.getMeta("tree", {d:d})[0]; // Find the root generation
				c.addCalcData("stacked", type, space, 0); // Stack for members of that generation
				c.forGenerations(d, function (x) { // Then for each generation IN the selected dimension
					c.forSpaces({as:c.addSpaces(space, x)}, function (x) { // Go through each member (and combine the current space with that member)
						var newVal,
							oldVal = c.getData(type + "Stacked", x), // Get the value for that member
							children = {d:d, a:c.findChildren({d:d, as:x.as})};
						x.mask = children; // Find the children for that member and add it as mask
						c.addCalcData("stacked", type, x, oldVal.start); // Stack for those children, starting at oldVal
						newVal = za.mergeStacked(c.getData(type + "Stacked", c.addSpaces(x.as, children)));
// 						if (zt.round(newVal.end, 10) != zt.round(oldVal.end, 10)) {
// 							logger("zDataCube.calcTreeMeta(): UH OH - Range for node " + zt.asString(x) + " is " + zt.asString(oldVal) + ", but its children is " + zt.asString(newVal) + " (type:" + type + ").");
// 						};
					});
				}, false, 0, 1);
			});
		} else {
			c.forSpaces({as:"all", mask:{d:d, a:"na"}}, function (space) {
				c.forGenerations(d, function (x) {
					c.forData(type, {as:c.addSpaces(space, x)}, function (oldVal, x) {
						space.as[d] = c.findChildren({d:d, as:x.as});
						var newVal = c.calcData(mode, type, space);
// 						if (oldVal != null && oldVal != newVal) {
// 							logger("zDataCube.calcTreeData(): UH OH - Value for node " + x + " is " + oldVal + ", but the " + mode + " of its children is " + newVal + " (type:" + type + ").");
// 						};
						return newVal;
					})
				}, true, 1, 0);
			});
		};
	};
	// Plot a treemap based on vals and store in .meta[d].layout
	c.treemap = function (x, vals, layout) {
		var i, j, n, batch, primary, secondary, currX, currY, out = [],
			nodes = c.getMeta("all", x), // Note that metaObjs are temporary
			sum = za.sum(za.getAll(vals, 0, ">")), // Ignore all negative values
			L = (layout instanceof zLayout) ? layout.getVitals() : zp.completeBox(layout), // Don't use original, as L will need to shrink as more of the treemap is plotted
			xAlign = (L.xAlign == "right") ? "right" : "left",
			yAlign = (L.yAlign == "bottom") ? "bottom" : "top",
			xMod = (xAlign == "right") ? -1 : 1,
			yMod = (yAlign == "bottom") ? -1 : 1;
		for (i = 0; i < nodes.length; i++) {
			nodes[i].area = (isNaN(vals[i]) || vals[i] <= 0) ? 0 : L.width * L.height * vals[i] / sum; // Calculate area for each node
		};
		nodes = za.sortObjects(nodes, "area", true); // Sort in descending size
		for (i = 0; i < nodes.length; null) { // Don't iterate here...
			batch = [nodes[i]]; // The batch must have at least one node
			primary = Math.min(L.width, L.height) - Math.sqrt(nodes[i].area); // Primary dimension is the shorter one
			// See how many nodes fit on that dimension at a 1:1 (i.e. Square, hence .sqrt()) ratio
			for (i++; i < nodes.length && primary >= 0; i++) { // ..this is the real iterator
				primary -= Math.sqrt(nodes[i].area);
				batch.push(nodes[i]);
			};
			secondary = za.calcObjects(batch, "area", "sum") / Math.min(L.width, L.height); // Total area for batch / primary dimension = secondary dimension
			// For each object, calculate its primary dimension by dividing its area by the secondary dimension
			if (secondary <= 0) { // No actual area left - just placeholders
				for (j = 0; j < batch.length; j++) {
					n = batch[j];
					c.setMeta("layout", {d:x.d, a:n.a}, {
						x:L[xAlign], y:L[yAlign],
						width:0, height:0,
						xAlign:xAlign, yAlign:yAlign
					});
				};
			} else if (L.width < L.height) { // Plot whole row (i.e. Width is primary)
				currX = L[xAlign];
				for (j = 0; j < batch.length; j++) {
					n = batch[j];
					c.setMeta("layout", {d:x.d, a:n.a}, {
						x:currX, y:L[yAlign],
						width:n.area / secondary, height:secondary,
						xAlign:xAlign, yAlign:yAlign
					});
					currX += xMod * n.area / secondary;
				};
				L[yAlign] += yMod * secondary;
				L.height -= secondary;
			} else { // Plot whole column (i.e. Height is primary)
				currY = L[yAlign];
				for (j = 0; j < batch.length; j++) {
					n = batch[j];
					c.setMeta("layout", {d:x.d, a:n.a}, {
						x:L[xAlign], y:currY,
						width:secondary, height:n.area / secondary,
						xAlign:xAlign, yAlign:yAlign
					});
					currY += yMod * n.area / secondary;
				};
				L[xAlign] += xMod * secondary;
				L.width -= secondary;
			};
		};
	};
	//////////////////////
	//  Push functions  //
	//////////////////////
	// Push a strip into the cube - strips are space-inefficient, but very easy to use
	c.importStrip = function (newStrip, noReset) {
		var i, a, d, p, type, row, aSpace, metaCols = [], dataCols = {};
		// Read headers and parse data structure
		for (i = 0; i < newStrip[0].length; i++) { // For each column
			a = newStrip[0][i].split("~"); // Read and split header
			if (a.length == 2) { // If it has two components, it must be metadata, and the first value must be the dimension (e.g. "1~name" means metadata type "name" for dimension 1)
				d = a[0]; // Dimension
				type = a[1]; // Type
				metaCols[d] = metaCols[d] || {}; // MetaData is collected for each dimension in metaCols
				if (metaCols[d][type]) logger("zDataCube.importStrip(): UH OH - " + metaCols[d][type] + " already exists.");
				metaCols[d][type] = i;
			} else if (a.length == 1) { // data
				type = a[0]; // a[0] is meta type
				dataCols[type] = i;
			} else logger("zDataCube.importStrip(): UH OH - I don't understand header " + newStrip[0][i] + ". Metadata headers should be [dimension]~[type] (e.g. '0~name'), data headers should be [type] (e.g. 'data').");
		};
		if (zo.isEmpty(dataCols)) logger("zDataCube.importStrip(): UH OH - no data found in strip.");
		if (zo.isEmpty(metaCols)) logger("zDataCube.importStrip(): UH OH - no metadata found in strip.");
		for (d = 0; d < metaCols.length; d++) if (metaCols[d].name == null) logger("zDataCube.importStrip(): UH OH - no name found for dimension " + d +".");
		// Populate cubes with data
		if (!noReset) c.initialise(metaCols.length); // Set number of dimensions
		for (p in dataCols) c.addDataType(p); // Add data types
		for (i = 1; i < newStrip.length; i++) { // Go through each row
			row = newStrip[i];
			aSpace = []; // aSpace is the address for the data cell which corresponds to this row
			for (d = 0; d < c.dLen; d++) { // Check all dimensions to figure out what the correct aSpace should be
				aSpace[d] = c.findMeta("name", {d:d}, row[metaCols[d].name]); // In each dimension, look for name (metaCols[d].name is the column number for name in dimension d, e.g. If the header for the fifth column is 1~name, then metaCols[1].name == 4; rows[metaCols[d].name] is the actual name)
				if (aSpace[d] == null) { // If existing dimension doesn't contain name (NOTE: this only happens when name is not found, so other meta will not be looked at unless the name is new)
					a = {};
					for (p in metaCols[d]) a[p] = row[metaCols[d][p]]; // Collate all valid meta in that dimension
					aSpace[d] = c.shyPushMeta(null, d, a); // Extend dimension with meta
				};
			};
			for (p in dataCols) c.setData(p, {as:aSpace}, row[dataCols[p]]); // For every dataType, insert data
		};
		c.setShown(); // Recalculates dimension sizes, based on the new names
		c.makeTree(); // Construct hierarchies if required
		return c;
	};
	// Creates a dumb dc - has nothing in it but a single dimension of names, used for creating a comboBox etc.
	c.importDumb = function (a) {
		c.meta[0]["name"] = a || [];
		c.setShown(); // Recalculates dimension sizes, based on the new names
		return c;
	};
	// Set from a protoCube - overwrites all existing data (everything is ready to slot straight in except for trees)
	c.importProtoCube = function (protoCube) {
		c.dLen = protoCube.meta.length;
		c.meta = protoCube.meta;
		c.data = protoCube.data;
		c.setShown(); // Recalculates dimension sizes, based on the new names
		// Verify data size
		var i, p, dataSize, metaSize = c.getSize();
		for (p in c.data) {
			dataSize = za.deepLength(c.data[p]);
 			if (dataSize.length != metaSize.length) {
				logger("zDataCube.importProtoCube(): Data type " + p + " has " + dataSize.length + " dimensions but " + metaSize.length + " dimensions have been defined in meta.");
			};
			for (i = 0; i < c.dLen; i++) if (dataSize[i] != metaSize[i]) {
				logger("zDataCube.importProtoCube(): Data type " + p + " has " + dataSize[i] + " elements in dimension " + i + " but meta has " + metaSize[i] + " elements: " + zt.asString(c.meta[i].name) + ".");
			};
		};
		return c;
	};
	c.exportProtoCube = function () {
		return zt.asString({meta:c.meta, data:c.data});
	};

	// Initialise
	c.initialise = function (dLen) {
		c.meta = [];
		c.shown = []; // Metaaxis used to show/hide parts of the cube
		c.oldShown = []; // The previous shown, so a comparison can be made when required
		c.data = {}; // Filled with actual 3D arrays containing data
		c.dLen = dLen; // How many dimensions
		for (var d = 0; d < dLen; d++) {
			c.meta[d] = {name:[]}; // At minimum, names are required
			c.shown[d] = [];
			c.oldShown[d] = [];
		};
	};
	c.type = "zDataCube";
	c.initialise(d);
};

/*

Swarms - controls drones by giving them orders

Swarms can be controlled by an axes, which are special instances of swarm.

.L or .layout
	Layout for the swarm. Only used as a guide for everyone else.
.Y or .style
	Style for the swarm. Only used to hold style for the drones being drawn.
.R or .rSpace
	rSpace for the swarm.

Plan
	Swarm.plan is the basis of any visualisation. A plan specifies the types of drones that should be created (a subplan for each drone).

	Each subplan consists of these elements:
		type: A zDrone class.
		mask: Swarm combines swarm.rSpace and swarm.plan.[ELEMENT].mask to create a list, containing the aSpace of every drone of that type which should be created.
		init(): The starting orders of a type of drone. This is only loaded when a drone is being added using add(), and it overrides any orders created by curr().
		curr(): Like init(), but this is rerun (and reapplied) by plot(), so it refreshes every redraw.

Orders
	Orders generated by init() and curr(). One set of orders is generated for every drone every time plot() or add() is run. The orders they generate are passed directly to drones via drone.redraw().

	Orders contain:
		.layer (used by swarm.layer() to determine layer order)
		.base
		Drone-specific plot information (e.g. orders.arc)
		Events (fired by certain functions. e.g. swarm.add() runs drone.O.onAdd() for every drone it adds)
			.onAdd()
			.preRedraw()
			.onRedraw()
			.postRedraw()
			.mouseEvents()
		Any data necessary to construct a state can be put into orders. Only orders from curr() get updated, so for maximum efficiency, move all the static data into init() and have curr() as small as possible.

Filters
	It is possible to filter by role, mask, dimension & position, or a combination thereof.

	x only specifies one dimension
	s is a complete specification - even if it only specificies one dimension, the rest can be imputed
	x can be s, but s cannot be x

	x can be a string, or be an object containing a string property, or just an object. All the rules are defined in .get()
	// null, "all", {string:"all"}
	// "curr", {curr:true}
	// role (string), {string:role}

	Role: The top-level name defined in plan. (e.g. "label") If null, it will assume you mean every type of drone that is not ignored.

	Mask: A valid rSpace mask. (e.g. ["mask", 3, "mask"], or "all" or "mask" (== ["mask", "mask", "mask"] == c.rSpace)
		"all" refers to every drone of every type (as defined in plan) for every single rSpace. This is the default.
		"curr" calls the drones grabbed by setCurrDrones()
		"fixed" is a special mask, which does not correspond to an rSpace

	Dimension & position: An alternative to masks. Allows use of aPos or rPos, but can only specify one dimension at a time. (e.g. {d:1, r:3} == {d:1, aPos:asAPos(1, 3)} == {d:1, p:asAPos(1, 3)} == ["mask", 3, "mask"]}
		d must be defined, but position will default to "all" if null.

	Mask and dimension cannot be used together, but role can be used together with one of them. (e.g. {role:"label", mask:[5, "mask", "mask"]})

*/

function zSwarmConstructor (c, orders, type) {
	zo.shyExtend(c, {
		//////////////////////
		//  Meta functions  //
		//////////////////////
		forSwarms:function (f, v1, v2, v3, v4, v5, v6) {
			for (var i = c.swarms.length - 1; i >= 0; i--) { // Backwards so that remove functions work properly
				if (typeof f == "function") f(c.swarms[i], v1, v2, v3, v4, v5, v6);
				else if (c.swarms[i][f]) c.swarms[i][f](v1, v2, v3, v4, v5, v6); // Backwards so that remove functions work properly
			};
		},
		forOwnedSwarm:function (f, v1, v2, v3, v4, v5, v6) {
			for (var i = c.swarms.length - 1; i >= 0; i--) if (c.swarms[i] != c) { // Backwards so that remove functions work properly
				if (typeof f == "function") f(c.swarms[i], v1, v2, v3, v4, v5, v6);
				else if (c.swarms[i][f]) c.swarms[i][f](v1, v2, v3, v4, v5, v6);
			};
		},
		forDrones:function (x, f, v1, v2, v3, v4, v5, v6) {
			var i, drones = c.get(x);
			if (!drones) return;
			if (typeof f == "string") {
				for (i = drones.length - 1; i >= 0; i--) { // Backwards so that remove functions work properly
					if (drones[i][f]) {
						if (drones[i].class == "zSwarm") drones[i][f]("swarm", v1, v2, v3, v4, v5, v6); // Swarms can be drones for other swarms. When swarms are controlling other swarms, they can only control them as a whole (hence the use of "all")
						else drones[i][f](v1, v2, v3, v4, v5, v6);
					};
				};
			} else if (typeof f == "function") { // Backwards so that remove functions work properly
				for (i = drones.length - 1; i >= 0; i--) {
					f(drones[i]);
				};
			};
		},
		forRoles:function (f, v1, v2, v3, v4, v5, v6) {
			for (var p in c.P) if (c.P[p] && !c.P[p].ignore) f(c.P[p]);
		},
		lock:function () {
			if (c.locked != "Superlocked") c.locked = Math.round(Math.random() * 9000) + 999; // Cannot override superlock
		},
		unlock:function () {
			if (c.locked != "Superlocked") c.locked = null;
		},
		superLock:function () { // Cannot be unlocked by normal lock
			c.locked = "Superlocked";
		},
		superUnlock:function () {
			c.locked = null;
		},
		////////////////////////
		//  Data Coordinates  //
		////////////////////////
		getRole:function (x) {
			var roleName =
				(x.role) ? x.role :
				(typeof x == "string" && x != "all" && x != "mask" && x != "fixed") ? x :
				null;
			return (roleName) ? c.P[roleName] : null;
		},
		addDimension:function (x) {
			if (x != null && x.d == null && (x.a != null || x.r != null || x.as || x.rs)) x.d = c.d; // Adds default dimension
			return x;
		},
		asAPos:function (x) {return c.dc.asAPos(c.addDimension(x))},
		asRPos:function (x) {return c.dc.asRPos(c.addDimension(x))},
		asASpace:function (x) {return c.dc.asASpace(c.addDimension(x))},
		asRSpace:function (x) {return c.dc.asRSpace(c.addDimension(x))},
		///////////////////
		//  Magic sauce  //
		///////////////////
		// Change the rSpace for the swarm and aSpace for all cells (d specifies the part of the space to change, and p specifies what to change it to, but every drone receives the change)
		// CAUTION: No filtering
		setSpace:function (x, t, e, b, w) {
			var d = (x.d == null) ? c.d : x.d,
				aPos = c.asAPos(x),
				rPos = c.asRPos(x);
			// Change in a single dimension
			if (rPos != null) {
				// Change single value in that dimension - only roles which have
				if (typeof rPos == "number") {
					if (aPos == null) return logger(c.type + ".setSpace(): Found rPos for " + zt.asString(x) + ", but it doesn't match to a valid aPos.");
					if (typeof c.R[d] == "number") c.R[d] = rPos; // Change rSpace for swarm if it's a valid candidate for setSpace (drones can be valid candidates even if the swarm is not, depending on the drone's mask)
					c.forRoles(function (role) {
						if (role.mask == "fixed") return; // Ignore fixed roles
						if (role.mask[d] == "number") role.mask[d] = rPos; // Change roles which are valid candidates
						if (typeof c.dc.addSpaces(c.R, role.mask)[d] == "number") { // Change drone which are valid candidates (i.e. If their role.mask[d] is a number, or if role.mask[d] is "mask" and c.R[d] is a number)
							c.forDrones(role.name, function (D) {D.A[d] = aPos});
						};
					});
				} else if (za.isArray(rPos)) {
					if (za.isArray(c.R[d]) || c.R[d] == "all") {
						c.R[d] = rPos.slice(); // Change rSpace for swarm - very important to use .slice(), or else all kinds of shit fuck up
						c.forRoles(function (role) {
							if (role.mask[d] != "mask") return;
							c.forDrones(role.name, function (D) {
								if (!za.contains(aPos, D.A[d])) D.remove(t, e, null, w || c.K);
							});
							c.add(role.name, t, e, null, w || c.K);
						});
						if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
					} else explode(c.type + ".setSpace(): Can't change " + zt.asString(c.R[d]) + " to " + zt.asString(rPos) + ".");
				} else explode(c.type + ".setSpace(): " + za.asString(x) + " contains rPos (" + za.asString(rPos) + "), but is neither an array nor a number.");
			} else logger(c.type + ".setSpace(): No rPos or rMask specified (" + zt.asString(x) + ").");
		},
		// Removes an element, replaces it with its children
		disaggregate:function (x, t, e, b, w) {
			if (x.d == null) x.d = c.d; // Add dimension, if it was omitted
			var shown = c.dc.shown,
				rPos = c.dc.asRPos(x),
				parent = c.dc.asAPos(x),
				children = c.dc.findChildren(x);
			if (!children.length) return; // Don't disaggregate if there are no children
			shown[x.d] = za.subtract(shown[x.d], parent); // Remove parent from datacube
			shown[x.d] = za.insertAt(shown[x.d], children, rPos); // Add children to datacube
			c.updateData(t, e, null, c.K);
			c.remove({d:x.d, a:parent}, t, e, null, c.K); // Remove from swarm
			c.add({d:x.d, a:children, mode:{asParent:true}}, t, e, b, w); // Add in place
		},
		// Removes an element and all its siblings, replaces it with its parents
		aggregate:function (x, t, e, b, w) {
			if (x.d == null) x.d = c.d; // Add dimension, if it was omitted
			var shown = c.dc.shown,
				rPos = c.dc.asRPos(x),
				parent = c.dc.findParent(x),
				siblings = c.dc.findChildren({d:x.d, a:parent});
			if (parent == null) return; // Don't aggregate if there is no parent
			shown[x.d] = za.subtract(shown[x.d], siblings); // Remove siblings from datacube
			shown[x.d] = za.shyInsert(shown[x.d], parent, rPos); // Add parent to datacube it doesn't already exist
			c.updateData(t, e, null, c.K);
			c.remove({d:x.d, a:siblings, mode:{asParent:true}}, t, e, null, c.K); // Remove from swarm
			c.add({d:x.d, a:parent}, t, e, b, w);
		},
		// Generates a list of drones - THIS IS A REALLY IMPORTANT FUNCTION (nearly all swarm functions rely on get())
		get:function (x) {
			if (za.isArray(x)) return x; // x is an array of drones
			else if (x == null || x == "swarm" || x == "all" || x.all) return c.drones; // Everything
			else if (x == "curr" || x.curr) return c.currDrones; // Whatever was grabbed last time
			else if (x == "fixed") return za.getAllObjects(c.drones, "A", "fixed"); // Everything with a mask/A of "fixed"
			else if (x.string || typeof x == "string") return za.getAllObjects(c.drones, "role", x.string || x); // Role only
			else if (x.role && x.d == null) return za.getAllObjects(c.drones, "role", x.role); // Role only
			var d, i, matches,
				aSpace = c.asASpace(x),
				out = (x.role) ? za.getAllObjects(c.drones, "role", x.role) : c.drones; // Filter by role first (i.e. Everything can be filtered by role)
			for (d = 0; d < aSpace.length; d++) { // Use only active parts of the mask as filtering conditions
				if (out.length == 0) break; // If there are no more candidates, quit
				if (typeof aSpace[d] == "number") {
					out = za.getAllObjects(out, "A", aSpace[d], "atPos", d); // atPos is much more efficient than matching whole addresses
				} else if (za.isArray(aSpace[d])) {
					matches = [];
					for (i = 0; i < out.length; i++) {
						if (za.contains(aSpace[d], out[i].A[d])) matches.push(out[i]);
					};
					out = matches;
				}; // Ignore "all"/"mask"/null since they'll capture everything anyway
			};
			return out;
		},
		// Uses get() to grab drones and stores them in currDrones, so get() doesn't have find them again every time (but get() is still responsible for grabbing them from currDrones)
		setCurrDrones:function (x) {return c.currDrones = c.get(x)},
		// Sets new orders for x drones
		plot:function (x, forced) {
			var i, D, drones = c.get(x),
				mode = (x && x.mode) ? x.mode : {};
			for (i = 0; i < drones.length; i++) { // Can't use forDrones, as it must go forwards not backwards
				D = drones[i];
				D.oldOrders = D.currOrders; // Start from where the last animation left off
				D.newOrders = (c.P[D.role].curr) ? c.P[D.role].curr(c, D.A, D, c.Y[D.role], mode) : {};
				D.noChange = !forced && zo.equals(D.newOrders, D.oldOrders); // If the new orders are same as the old orders, throw up an ignore flag which frameRedraw will pick up
				zo.extend(D.O, D.parseOrders(D.newOrders)); // Push back into O
			};
		},
		// Brings objects toFront() base on their layer value (can be defined statically or dynamically in plan)
		layer:function () {
			var i, p, layers = [],
				addToLayer = function (D) { // For each drone, find the right layer and put them there
					var a = D.O.layer * 1; // Make sure it's a number - if it's a string, layers will be converted to an object, and the properties (i.e. The actual layers) will not be in order in IE and Firefox
					if (a != null && !isNaN(a)) { // If a valid layer is defined
						layers[a] = layers[a] || []; // Create new layer
						layers[a].push(D); // Or add drone to existing layer
					} else if (D.type == "zMultiDrone") { // Look into individual drones of a zMultiDrone *only* if the zMultiDrone doesn't have a layer defined
						for (p in D.parts) addToLayer(D.parts[p]);
					};
				};
			c.forDrones("all", addToLayer); // Sort drones into layers
			for (i = 0; i < layers.length; i++) if (layers[i]) c.forDrones(layers[i], "toFront"); // Bring drones in each layer toFront()
		},
		////////////////////
		//  Add / Remove  //
		////////////////////
		// Add a single drone, based on role and aSpace (only used by c.addRole())
		addDrone:function (role, aSpace, mode, t, e, b, w) {
			var orders, plan = c.P[role],
				D = {
					id:zt.asString(aSpace) + " " + role,
					A:aSpace,
					role:role,
					parent:c,
					directRedraw:plan.directRedraw // Set this flag to avoid frameRedraw and directly redraw using Raphael
				};
			if (za.getObject(c.drones, "id", D.id)) return;// logger(c.type + ".addDrone(): Uh oh - A " + role + " at " + zt.asString(aSpace) + " already exists."); // Check if it already exists
			// Parse orders
			D.currOrders = (plan.curr) ? plan.curr(c, aSpace, D, c.Y[role], mode) || {} : {};
			orders = zo.clone(c.Y[role]); // Start with style
			orders = zo.extend(orders, D.currOrders); // Add currOrders
			orders = zo.extend(orders, (plan.init) ? plan.init(c, aSpace, D, c.Y[role], mode) || {} : {}); // Add initOrders
			// Create drone from orders
			if (orders.ignore) return;
			else if (typeof plan.type == "string" || typeof plan.type == "function") {
				D = zo.extend(zDrones.make(plan.type, orders, t, e, b, w), D);
				c.drones.push(D);
				if (D.O.onAdd) D.O.onAdd(D);
				if (D.O.mouseEvents) D.O.mouseEvents(D);
			} else logger(c.type + ".addDrone(): Plan.type (" + plan.type + " is invalid.");
		},
		// Creates new drones based on roles (only used by c.add())
		addRole:function (role, rSpace, mode, t, e, b, w) {
			if (role.mask == "fixed") c.addDrone(role.name, "fixed", mode, t, e, b, w);
			else {
				var i, spaces = c.dc.listSpaces({rs:role.rSpace || rSpace, mask:{rs:role.mask}});
				for (i = 0; i < spaces.length; i++) {
					c.addDrone(role.name, c.asASpace({rs:spaces[i]}), mode, t, e, b, w);
					b = null;
				};
			};
		},
		// Creates new drones based on filter rules
		add:function (x, t, e, b, w) {
			var role = c.getRole(x),
				mode = zo.extend({initialising:true}, x.mode),
				rSpace = c.dc.addSpaces(c.R, (typeof x == "string") ? null : c.asRSpace(x)); // If x is a string specifying a role, then use a mask of "all" as default, which is the same as using no mask
			mode.initialising = true;
			if (role) { // A role is specified
				role.ignore = false; // Cancel ignore flag
				c.addRole(role, rSpace, mode, t, e, null, w || c.K);
			} else if (x == "fixed") { // Fixed
				c.forRoles(function (role) {
					if (role.mask == "fixed") c.addRole(role, rSpace, mode, t, e, null, w || c.K);
				});
			} else { // No role specified and not fixed (i.e. Normal)
				c.forRoles(function (role) {
					if (role.mask != "fixed") c.addRole(role, rSpace, mode, t, e, null, w || c.K);
				});
			};
			c.layer();
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		// Remove selected drones or the entire swarm
		remove:function (x, t, e, b, w) {
			if (x == "swarm") {
				if (t) { // Animated remove
					c.clearEvents();
					c.hide("all", t, e, function () {c.remove("swarm", null, null, b)}, w); // Fade out then call remove() again - if hiding has been cancelled, remove will be cancelled as well
				} else { // Remove the screen element immediately
					c.markOfDeath = true;
					if (c.parent && c.parent.drones) za.remove(c.parent.drones, c); // If it has a parent, remove from parent membership
					c.forDrones("all", "remove");
					delete c;
					if (b) b();
				};
			} else {
				var role = c.getRole(x);
				if (role) role.ignore = true; // If removing by role, that role gets ignored in future redraws
				c.forDrones(x, "remove", t, e, null, w || c.K);
				if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
			};
		},
		/////////////////
		//  Show/hide  //
		/////////////////
		show:function (x, t, e, b, w) {
			c.forDrones(x, "show", t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		hide:function (x, t, e, b, w) {
			c.forDrones(x, "hide", t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		invisibleShow:function (x) {
			c.forDrones(x, "invisibleShow");
		},
		appear:function (x, t, e, b, w) {
			c.forDrones(x, "appear", t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		toFront:function (x) {c.forDrones(x, "toFront")},
		toBack:function (x) {c.forDrones(x, "toBack")},
		///////////////
		//  Animate  //
		///////////////
		parseOrders:function (orders) {return orders}, // Not applicable to zSwarms
		animate:function (x, orders, t, e, b, w) {
			c.forDrones(x, "animate", orders, t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		// Redraw x drones at a specific frame (defined by dec) between oldOrders and orders
		frameRedraw:function (x, dec) {
			c.forDrones(x, function (D) {
				D.currOrders = zo.mid(D.oldOrders, D.newOrders, dec);
				if (D.class == "zSwarm") D.frameRedraw("all", dec);
				else D.redraw(D.currOrders); // WATCH OUT! If currOrders is changed, oldOrders will be changed, and then it may not match with newOrders and then it'll all fuck the fuck up
				if (D.O.onRedraw) D.O.onRedraw(D);
			});
			c.currDec = dec;
			c.frame++; // Count frame
		},
		redraw:function (x, orders, t, e, b, w) {
			c.forDrones(x, "redraw", orders, t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		// Selective redraw (arguments determine whether to updateData() is run)
		refresh:function (x, t, e, b, w) {
			var i, D, frameRedrawDrones = [], directRedrawDrones = [],
				thread = c.thread = Math.round(Math.random() * 1000), // Save so callback function can check if it's been superceded
				mode = (x && x.mode) ? x.mode : {},
				curr = c.setCurrDrones(x);
			c.frame = 0; // Count frames
			if (c.currDec < 1) c.frameRedraw(curr, c.currDec, true); // If previous draw is incomplete, force frameRedraw to last position before plotting
			if (!mode.noUpdateData && c.updateData) c.updateData(t, e, null, c.K);
			c.plot({curr:true, mode:mode});
			c.preRedraw(curr); // Do pre-draw events
			// Sort drones by method of drawing
			if (mode.forceFrameRedraw) frameRedrawDrones = curr; // Everything will be redrawn using swarm.frameRedraw()
			else if (mode.forceDirectRedraw) directRedrawDrones = curr; // Everything will be redrawn using native drone.redraw() command
			else {
				frameRedrawDrones = curr.slice();
				directRedrawDrones = za.removeAllObjects(frameRedrawDrones, "directRedraw", true);
			};
			za.removeAllObjects(frameRedrawDrones, "noChange", true);
			za.removeAllObjects(frameRedrawDrones, "markOfDeath", true);
			za.removeAllObjects(directRedrawDrones, "noChange", true);
			za.removeAllObjects(directRedrawDrones, "markOfDeath", true);
			// Start-up sequence (only for new redraws)
			if (c.currDec == 1) {
				c.clearEvents("all"); // Stop mouseEvents
				c.G.onAnimation(function () {c.frameRedraw(frameRedrawDrones, c.G.getVal())}); // Frame redraw every step of the way
			};
			// Start frameRedraw
			c.G.redraw(t, e, function () {
				if (c.thread != thread) return; // If c.thread != thread, this means new threads has started since this one began - don't do any postRedraw activity
				c.G.onAnimation(); // Stop frameRedraw
				c.frameRedraw(curr, 1); // frameRedraw to last position (this will make D.currOrders = D.newOrders)
				c.postRedraw(curr); // Do post-draw events
				c.mouseEvents("all"); // Restart mouseEvents
				if (b) b();
// 				if (t && c.frame) logger(c.type + ".redraw(): " + c.frame + " frames in " + t + " milliseconds."); // Count frames
			}, w);
			// Start direct redraws
			for (i = 0; i < directRedrawDrones.length; i++) { // Do directRedraw drones separately
				D = directRedrawDrones[i];
				D.redraw(D.newOrders, t, e, null, c.K);
			};
		},
		stop:function (x) {
			c.G.stop();
			c.forDrones(x, "stop");
		},
		setMode:function (x, mode, t, e, b, w) {
			c.forDrones(x, "setMode", mode, t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		unsetMode:function (x, t, e, b, w) {
			c.forDrones(x, "unsetMode", t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		highlight:function (x, t, e, b, w) {
			var newHighlighted = c.asAPos(x), // Get all aPos within posRange - this is the new highlighted
				toHighlight = za.subtract(newHighlighted, c.highlighted),
				toReset = za.subtract(c.highlighted, newHighlighted);
			c.forDrones({d:(x.d == null) ? c.d : x.d, a:toReset}, "reset", t, e, null, w || c.K);
			c.forDrones({d:(x.d == null) ? c.d : x.d, a:toHighlight}, "highlight", t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
			c.highlighted = newHighlighted;
		},
		reset:function (x, t, e, b, w) {
			c.forDrones(x, "reset", t, e, null, w || c.K);
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
			c.highlighted = [];
		},
		select:function (x, t, e, b, w) {
			c.forDrones(c.selected, "deselect", t, e, null, w || c.K);
			c.forDrones(x, "select", t, e, null, w || c.K);
			c.oldSelected = c.selected;
			c.selected = {d:c.d, a:c.asAPos(x), r:c.asRPos(x)};
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		deselect:function (x, t, e, b, w) {
			c.unsetMode(x, t, e, b, w);
		},
		//////////////
		//  Events  //
		//////////////
		clearEvents:function (x) {c.forDrones(x, "clearEvents")},
		enableEvents:function (x) {c.forDrones(x, "enableEvents")},
		disableEvents:function (x) {c.forDrones(x, "disableEvents")},
		click:function (x, f) {c.forDrones(x, "click", f)},
		dblclick:function (x, f) {c.forDrones(x, "dblclick", f)},
		mousedown:function (x, f) {c.forDrones(x, "mousedown", f)},
		mouseup:function (x, f) {c.forDrones(x, "mouseup", f)},
		mousemove:function (x, f) {c.forDrones(x, "mousemove", f)},
		touchstart:function (x, f) {c.forDrones(x, "touchstart", f)},
		touchMove:function (x, f) {c.forDrones(x, "touchMove", f)},
		touchend:function (x, f) {c.forDrones(x, "touchend", f)},
		touchcancel:function (x, f) {c.forDrones(x, "touchcancel", f)},
		hover:function (x, inF, outF) {c.forDrones(x, "hover", inF, outF)},
		drag:function (x, onmove, onstart, onend) {c.forDrones(x, "drag", onmove, onstart, onend)},
		onAnimation:function (x, f) {c.forDrones(x, "onAnimation", f)},
		hoverHighlight:function (x, t, e) {c.forDrones(x, "hoverHighlight", t, e)},
		tooltip:function (x, tooltipText, tooltipBox, fixedLocation) {c.forDrones(x, "tooltip", tooltipText, tooltipBox, fixedLocation)},
		// Events (event actions are defined by orders and are triggered during run events in zSwarm and axes)
		// onAdd and onRedraw not included as they are only called by addDrone() and frameRedraw respectively
		mouseEvents:function (x) {
			c.clearEvents(x);
			c.forDrones(x, function (D) {
				if (D.O.mouseEvents) D.O.mouseEvents(D);
				else if (D.mouseEvents) D.mouseEvents("all");
			});
		},
		preRedraw:function (x, t, e, b, w) {
			c.forDrones(x, function (D) {
				if (D.O.preRedraw) D.O.preRedraw(D, t, e, b, w);
				else if (D.preRedraw) D.preRedraw("all", t, e, b, w);
			});
		},
		postRedraw:function (x, t, e, b, w) {
			c.forDrones(x, function (D) {
				if (D.O.postRedraw) D.O.postRedraw(D, t, e, b, w);
				else if (D.postRedraw) D.postRedraw("all", t, e, b, w);
			});
		},
		zoom:function (targ, viewPort, t, e, b, w) {
			c.L.zoom(targ, viewPort);
			c.refresh("all", t, e, b, w);
		},
		// Redraw in a new layout
		move:function (newLayout, t, e, b, w) {
			c.L.set(newLayout);
			c.refresh("all", t, e, b, w)
		},
		// Every swarm created runs initialise first - default .initialise() allows customisation of zSwarm class by creating a new .initialise()
		initialise:function (orders, type) {
			var p;
			c.type = type;
			c.class = "zSwarm";
			c.drones = [];
			c.axes = {};
			c.style = {};
			c.plan = {};
			c.layout = {};
			c.highlighted = [];
			for (p in orders) c[p] = orders[p]; // Allocate resources to object - can't use extend() because it'll try to deep extend the big objects, which might have recursive references
			// Parse plans
			for (p in c.plan) {
				if (c.plan[p]) {
					c.plan[p].name = p; // Name plans
					if (c.plan[p].mask != "fixed") c.plan[p].mask = c.dc.parseSpace(c.plan[p].mask); // Parse masks
				} else delete c.plan[p]; // Delete null plans
			};
			// Parse and load layout
			if (c.layout instanceof zLayout) {
				if (c.style.margin != null) c.layout.set({margin:c.style.margin}); // Style override of margins
			} else {
				if (c.style.margin != null) c.layout.margin = c.style.margin; // Style override of margins
				c.layout = new zLayout(c.layout); // Make new layout object if the original is not a zLayout object
			};
			// Create guide, initialise variables
			c.currDec = 1;
			c.guide = new zGuide(true);
			c.guide.parent = c;
			// Set shortcuts
			c.O = orders; // Store raw orders - zSwarm doesn't really parse orders
			c.P = c.plan;
			c.L = c.layout
			c.Y = zo.parseStyle(c.style);
			c.R = c.rSpace;
			c.G = c.guide;
			c.K = c.G.K;
			// Report to all axes
			if (c.axes) for (p in c.axes) if (c.axes[p].swarms) c.axes[p].swarms.push(c);
			if (c.onInit) c.onInit();
		}
	});
	c.initialise(orders, type);
};

function zAxisConstructor (c, o) {
	zSwarmConstructor(c, zo.extend({
		dc:null, d:null, rSpace:null,
		range:[], selected:null,
		swarms:[c], // Initialise
		layout:{rotation:0},
		style:{
			extension:0.5, // How much protudes from each end
			perpendicularSize:1,
			parallelSize:0.6,
			select:{t:500, e:"<>"},
			highlight:{t:200, e:"-"},
			background:null,
			axisLine:{},
			axisTitle:{},
			label:{
				margin:5,
				branch:null
			}
		},
		///////////////////////
		//  Point functions  //
		///////////////////////
		// rPos can be decimals
		pointToRPos:function (x) {
			var dec = c.L.getDec(x).x; // Convert x to dec
			return zt.calcMid(c.range[0] - c.Y.extension, c.range[1] + c.Y.extension, dec); // Then convert dec to rPos
		},
		pointToAPos:function (x) {
			var rPos = Math.round(zt.forceBetween(c.pointToRPos(x), c.range[0], c.range[1])); // Convert address to rPos
			return c.asAPos({d:c.d, r:rPos});
		},
		// Get offset to a point (anchor point + x-offset + y-offset + z-offset == 3D point! == WIN!)
		getOffset:function (x) {
			var rPos = c.asRPos(x),
				dec = zt.calcDec(rPos, c.range[0] - c.Y.extension, c.range[1] + c.Y.extension);
			return c.L.getOffset(dec, (c.L.yAlign == "yCentre") ? 0.5 : 0, true);
		},
		addOffset:function (x, point) {return zo.add(c.getOffset(x), point)},
		getPoint:function (x) {return c.addOffset(x, c.L)},
		getX:function (x) {return c.getPoint(x).x},
		getY:function (x) {return c.getPoint(x).y},
		getLength:function (val) {return c.L.width * val / (c.range[1] - c.range[0] + 2 * (c.Y.extension || 0))},
		/////////////////////
		//  Pos functions  //
		/////////////////////
		setShown:function (newShown) {
			newShown = newShown || c.dc.shown[c.d];
			var i, notchStep;
			if (c.Y.maxNotches) { // maxNotches will limit the number of notches on the axis
				notchStep = Math.ceil(newShown.length / c.Y.maxNotches); // Calculate the size of each step between notches
			} else if (c.Y.notchStep) { // Fix each step
				notchStep = c.Y.notchStep;
			};
			if (notchStep) {
				c.trimmedShown = [];
// 				for (i = za.min(newShown); i <= za.max(newShown); i += notchStep) c.trimmedShown.push(i); // Use first point as reference
				for (i = za.max(newShown); i >= za.min(newShown); i -= notchStep) c.trimmedShown.push(i); // Use last point as reference
				c.trimmedShown.reverse();
			};
			c.dc.setShown(c.d, newShown);
			c.range = [0, Math.max(c.dc.getSize(c.d, true) - 1, 1)];
		},
		///////////////
		//  Actions  //
		///////////////
		// Set a notch as selected and redraw
		axisSelect:function (x, t, e, b, w) {
			if (!x.forced && c.asRPos(x) == c.selected.r) return; // Do nothing if it's already selected
			c.select(x, t, e, b, w);
			c.forOwnedSwarm("setSpace", x); // Set space, but not for itself
			c.forSwarms("refresh", "all", t, e, null, c.K); // Redraw
			if (c.onSelect) c.onSelect(t, e, null, w || c.K); // Specified actions to execute on select
		},
		// Replace existing shown with newShown (Events: onAdd, preRedraw(-1 only), postRedraw(-1 only))
		replace:function (newShown, t, e, b, w) {
			c.setShown(newShown);
			c.forSwarms("updateData", t, e, null, c.K);
			c.forSwarms("add", {a:za.subtract(c.dc.shown[c.d], c.dc.oldShown[c.d])}, t, e, null, c.K);
			c.forSwarms("remove", {a:za.subtract(c.dc.oldShown[c.d], c.dc.shown[c.d])}, t, e, null, c.K);
			c.forSwarms("layer");
			if (!w || b) c.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
		},
		// Aggregate and disaggregate
		disaggregate:function (x, t, e, b, w) {
			if (x.d == null) x.d = c.d;
			var aPos = c.dc.asAPos(x),
				children = c.dc.findChildren(x);
			if (!children || !children.length) return; // Don't disaggregate if there are no children
			c.forSwarms("add", {d:x.d, a:children, mode:{disaggregate:true}}); // Add in place
			c.forSwarms("remove", {d:x.d, a:aPos});
			c.forSwarms("refresh", "all", t, e, null, c.K);
			c.G.redraw(t, e, b, w);
		},
		aggregate:function (x, t, e, b, w) {
			if (x.d == null) x.d = c.d;
			var parent = c.dc.findParent(x),
				siblings = c.dc.findChildren({d:x.d, a:parent});
			if (parent == null) return; // Don't aggregate if there is no parent
			c.forSwarms("refresh", {d:x.d, a:siblings, mode:{aggregate:true}}, t, e, null, c.K);
			c.G.redraw(t, e, function () {
				c.forSwarms("add", {d:x.d, a:parent});
				c.forSwarms("remove", {d:x.d, a:siblings});
				if (b) b();
			}, w);
		},
		plan:{
			axisLine:{
				type:"zLine", mask:"fixed",
				curr:function (S, A, D, Y) {
					return {
						layer:10,
						points:[S.L.getPoint(0,0),S.L.getPoint(1,0)]
					};
				}
			},
			axisTitle:{
				type:"zTextBox", mask:"fixed",
				init:function (S, A, D, Y) {
					var rotation = zt.isBetween(S.L.rotation, 90, 270) ? zp.inverseDeg(S.L.rotation) : S.L.rotation;
					return {
						text:S.title,
						layout:{
							anchor:S.L.getPoint(0.5, 1),
							xAlign:"xCentre", yAlign:"top",
							rotation:rotation
						}
					};
				}
			},
			label:{
				type:"zTextBox", mask:"mask",
				init:function (S, A, D, Y) {
					if (S.trimmedShown && !za.contains(S.trimmedShown, A[S.d])) return {ignore:true};
					return {
						layer:1,
						text:S.dc.getName({d:S.d, a:A[S.d]}),
						layout:(S.L.yAlign == "yCentre") ? {
							xAlign:"xCentre", yAlign:"yCentre"
						} : {
							radial:(S.L.rotation || 0) + ((S.L.yAlign == "top") ? 90 : -90),
							radialEnd:c.notchHeight
						},
						mouseEvents:S.baseMouseEvents
					};
				},
				curr:function (S, A, D, Y) {
					return {layout:S.getPoint({a:A[S.d]})};
				}
			}
		}
	}, o), "zUndefinedAxis");
	// Initialise
	c.R = za.fill("na", c.dc.dLen);
	c.R[c.d] = "all";
	c.maxShown = c.Y.collapsedShown || c.Y.expandedShown;
	c.setShown();
};

// Special, dumb version of axis - does not access data
function zAxis (orders, t, e, b, w) {
	var c = this;
	zAxisConstructor(c, zo.extend({
		type:"zAxis",
		dc:new zDataCube(1).importDumb(), d:0, rSpace:["all"],
		range:[0, 100], // Min/max values for axis
		title:null, // Title for axis, will be displayed by axisTitle
		layout:{rotation:0},
		style:{
			extension:0,
			maxNotches:10,
			clipMargin:20,
			label:{
				format:{dp:10},
				radialStart:0, // Set a negative radialStart to create gridlines
				radialEnd:6,
				margin:10
			}
		},
		// Labels outside of the clip-rect will not be shown
		getClipRect:function () {
			if (c.L.rotation == 0 || c.L.rotation == 180) {
				return [
					c.L.left - c.Y.clipMargin, 0,
					c.L.right - c.L.left + c.Y.clipMargin * 2, PAPER.height
				];
			} else if (c.L.rotation == 90 || c.L.rotation == 270) {
				return [
					0, c.L.top - c.Y.clipMargin,
					PAPER.width, c.L.bottom - c.L.top + c.Y.clipMargin * 2
				];
			};
		},
		// Get offset to a point (anchor point + x-offset + y-offset + z-offset == 3D point! == WIN!)
		getOffset:function (val) {return c.L.getOffset(zt.calcDec(val, c.range[0], c.range[1]), 0, true)},
		// Special setShown for zAxis only
		setShown:function (range, t, e, b, w) {
			var i, notchGap, startVal, toRemove, newShown = [];
			range = range || c.range;
			if (isNaN(range[0]) || isNaN(range[1]) || range[0] == range[1]) return logger("zAxis(): Called with invalid range " + zt.asString(range));
			range = za.sort(range);
			// Calculate notchGap
			notchGap = (range[1] - range[0]) / (c.Y.maxNotches || 10); // Optimal notchGap (divide range evenly by number of notches
			notchGap = zt.getFactorOfTen(notchGap); // Find the first factor of 10 higher than this value
			if (c.label) notchGap = Math.max(notchGap, 1); // If labels exist, then notches must be whole numbers
			if (c.Y.minNotchGap) notchGap = Math.max(notchGap, c.Y.minNotchGap);
			// Create newShown
			startVal = notchGap * Math.ceil(range[0] / notchGap); // First shown notch
			for (i = startVal; i <= range[1]; i += notchGap) newShown.push(i); // All shown notches
			toRemove = za.subtract(c.dc.shown[0], newShown);
			c.dc.setShown(0, newShown);
			// Redraw
			if (c.P["label"] && !c.P["label"].ignore) c.add("label");
			c.remove({a:toRemove});
			c.range = range;
			c.refresh("all", t, e, b, w);
		},
		plan:{
			label:{
				type:"zTextBox", mask:"mask",
				init:function (S, A, D, Y) {
					return {
						text:A[0],
						layout:{
							radial:(S.L.rotation || 0) + ((S.L.yAlign == "top") ? 90 : -90),
							radialStart:Y.radialStart,
							radialEnd:Y.radialEnd
						},
 						"clip-rect":S.getClipRect(),
						branch:(A[0] == 0) ? Y.baseBranch : Y.branch
					};
				},
				curr:function (S, A, D, Y) {
					return {layout:S.getPoint(A[0])};
				}
			}
		}
	}, orders));
	// Create swarm
	if (c.updateData) c.updateData(t, e, null, c.K);
	c.add("fixed", t, e, null, c.K);
	c.add("all", t, e, b, w);
	c.layer();
};

// Axis that interacts with a zDataCube
function zSmartAxis (orders, t, e, b, w) {
	var c = this;
	zAxisConstructor(c, zo.extend({
		type:"zSmartAxis",
		updateData:function () {
			if (c.Y.parallelSize) c.notchWidth = c.Y.parallelSize * c.L.innerWidth / c.dc.getSize(c.d, true);
			if (c.Y.perpendicularSize) c.notchHeight = c.Y.perpendicularSize * c.L.height;
		}
	}, orders));
	// Flesh out selected
	if (c.baseSelected) c.baseSelected = {d:c.d, a:c.asAPos(c.baseSelected), r:c.asRPos(c.baseSelected)};
	if (c.selected) c.selected = {d:c.d, a:c.asAPos(c.selected), r:c.asRPos(c.selected)};
	// Create swarm
	if (c.updateData) c.updateData(t, e, null, c.K);
	c.add("fixed", t, e, null, c.K);
	c.add("all", t, e, b, w);
	c.layer();
	// Move to initial position
	if (c.selected) c.axisSelect({forced:true, a:c.selected.a, r:c.selected.r}, t, e, null, c.K);
};

// List of items, coloured based on dc.meta[S.d].colour (FIXME: BROKEN)
function zLegend (orders, t, e, b, w) {
	return new zSmartAxis(zo.extend({
		type:"zLegend",
		style:{
			notch:{
				rounded:0, // Needed to enable complex
				"stroke-opacity":0.2,
				highlight:{
					"stroke-opacity":1
				},
				select:{
					"stroke-opacity":1
				}
			}
		},
		plan:{
			notch:{
				init:function (S, A, D, Y) {
					return {fill:S.dc.getMeta("colour", {d:S.d, a:A[S.d]})};
				}
			}
		}
	}, orders), t, e, b, w);
};

// List of items which can be selected
function zSelectAxis (orders, t, e, b, w) {
	return new zSmartAxis(zo.extend({
		type:"zSelectAxis",
		baseMouseEvents:function (D) {
			var S = D.parent,
				x = {d:S.d, a:D.A[S.d]},
				ha = S.Y.highlight, sa = S.Y.select;
			D.click(function () {S.axisSelect(x, sa.t, sa.e)});
			D.hover(function () {S.highlight(x, ha.t, ha.e)}, function () {S.reset(x, ha.t, ha.e)});
		}
	}, orders), t, e, b, w);
};

// List of items which can be selected - multiple sections are allowed, activated by clicking on/off
function zMultiSelectAxis (orders, t, e, b, w) {
	return new zSelectAxis(zo.extend({
		type:"zMultiSelectAxis",
		selected:{a:[], r:[]}, // For zMultiSelectAxis, selected must ALWAYS be an array, even when empty
		axisSelect:function (x, t, e, b, w) { // Like normal axisSelect, except allows nothing to be selected
			var S = this;
			S.select(x, t, e, b, w);
			S.forOwnedSwarm("setSpace", x); // Set space, but not for itself
			S.forSwarms("refresh", "all", t, e, null, S.K); // Redraw
			if (S.onSelect) S.onSelect(t, e, null, w || S.K); // Specified actions to execute on select
		},
		select:function (x, t, e, b, w) {
			var i, S = this, rPos = S.asRPos(x); // Select based on rPos
			if (za.isEmpty(rPos)) return; // None are to be selected/deselected
			rPos = za.asArray(rPos);
			for (i = 0; i < rPos.length; i++) {
				if (za.contains(S.selected.r, rPos[i])) {
					za.remove(S.selected.r, rPos[i]);
					S.forDrones({r:rPos[i]}, "deselect", t, e, null, w || S.K);
				} else {
					S.selected.r.push(rPos[i]);
					S.forDrones({r:rPos[i]}, "select", t, e, null, w || S.K);
				};
			};
			S.selected.a = S.asAPos({r:S.selected.r}); // Update selected.a
			if (!w || b) S.G.redraw(t, e, b, w); // Only redraw guide if there is no key, or if a callback has been specified
 		}
	}, orders), t, e, b, w);
};

// List of items which can be selected as a block by dragging
function zDragSelectAxis (orders, t, e, b, w) {
	return new zSmartAxis(zo.extend({
		type:"zDragSelectAxis",
		selected:{a:[], r:[]}, // For zMultiSelectAxis, selected must ALWAYS be an array, even when empty
		baseMouseEvents:function (D) {
			var S = D.parent, x = {d:S.d, a:D.A[S.d]},
				ha = S.Y.highlight, sa = S.Y.select;
			D.drag(null, function () {
				S.dragRange = [x.a, x.a];
				S.deselect({a:"all"}, ha.t, ha.e);
				S.select({a:[x.a]}, ha.t, ha.e);
			}, function () {
				if (!S.dragRange) return;
				S.axisSelect({a:za.fillRange(S.dragRange)}, sa.t, sa.e);
				S.dragRange = null;
			});
			D.hover(function () {
				if (!S.dragRange) return S.highlight({a:D.A[S.d]}, ha.t, ha.e);
				S.dragRange[1] = x.a;
				S.highlight({a:za.fillRange(S.dragRange)}, ha.t, ha.e);
			}, function () {
				if (!S.dragRange) return S.reset({a:D.A[S.d]}, ha.t, ha.e);
			});
		}
	}, orders), t, e, b, w);
};

// List of items which can be scrolled and selected
function zScrollAxis (orders, t, e, b, w) {
	var c = new zSmartAxis(zo.extend({
		type:"zScrollAxis", expanded:true,
		style:{
			collapsedShown:1, // How many should be shown when collapsed
			expandedShown:8, // How many should be shown when expanded
			expand:{t:500, e:"<>"},
			scroll:{t:500, e:"<>"},
			label:{
				"font-size":14,
				"font-weight":"bold",
				fill:"#ccc",
				opacity:0.8,
				highlight:{opacity:1},
				select:{
					opacity:1,
					"font-size":28
				}
			},
			upArrow:{
				xSize:20, ySize:40,
				fill:"#fff",
				opacity:0.3,
				highlight:{opacity:1}
			},
			downArrow:{
				xSize:20, ySize:40,
				fill:"#fff",
				opacity:0.3,
				highlight:{opacity:1}
			}
		},
		baseMouseEvents:function (D) {
			var S = D.parent, x = {d:S.d, a:D.A[S.d]},
				ha = S.Y.highlight, ea = S.Y.expand;
			D.click(function () {
				if (S.expanded) S.collapse(x, ea.t, ea.e);
				else S.expand(ea.t, ea.e);
			});
			D.hoverHighlight(ha.t, ha.e);
		},
		// Scroll to a new part of shown - unlike the other methods, this DOES NOT change .shown, it only moves and hides the notches
		scroll:function (x, t, e, b, w) {
			var S = this, rPos;
			if (S.maxShown >= S.dc.getSize(S.d, true)) S.range = [0, S.maxShown - 1];
			else {
				rPos = zt.forceBetween(S.asRPos(x), 0, S.dc.getSize(S.d, true) - 1);
				S.range = [rPos - (S.maxShown - 1) / 2, rPos + (S.maxShown - 1) / 2];
			};
			S.refresh("all", t, e, b, w);
		},
		// Scroll up/down by val (negative to go up, positive to go down)
		scrollBy:function (val, t, e, b, w) {
			var S = this, rPos;
			if (!S.expanded) S.expand(t, e, function () {S.scrollBy(val, t, e, b, w)}, w); // If not expanded, expand first
			else {
				rPos = za.mean(S.range) + val;
				S.scroll({r:rPos}, t, e, b, w);
			};
		},
		scrollSelect:function (x, t, e, b, w) {
			var S = this;
			S.select(x, t, e, function () {
				S.scroll(x, t, e, function () {
					S.forSwarms("setSpace", x);
					S.forSwarms("refresh", "all", t, e, null, S.K);
					S.show("axisTitle", t, e, null, w);
					if (S.onSelect) S.onSelect(t, e, null, w || S.K); // Specified actions to execute on select
					S.G.redraw(t, e, b, w);
				}, w);
			}, w);
		},
		expand:function (t, e, b, w) {
			var S = this;
			if (S.expanded) return;
			S.expanded = true;
			S.maxShown = S.Y.expandedShown;
			S.L.set({innerWidth:S.L.innerWidth * S.Y.expandedShown / S.Y.collapsedShown});
			S.hide("axisTitle", t, e, null, w);
			S.scroll({r:S.selected.r}, t, e, b, w);
		},
		// Select one and collapse
		collapse:function (x, t, e, b, w) {
			var S = this;
			if (!S.expanded) return;
			S.expanded = false;
			S.maxShown = S.Y.collapsedShown;
			S.L.set({innerWidth:S.L.innerWidth * S.Y.collapsedShown / S.Y.expandedShown});
			S.scrollSelect(x, t, e, b, w);
		},
		plan:{
			axisLine:null,
			axisTitle:{
				type:"zTextBox", mask:"fixed",
				init:function (S, A, D, Y) {
					return {
						layer:0,
						text:S.dc.getMeta("title", {d:S.d}),
						layout:{
							anchor:S.L.getPoint(0, 0),
							xAlign:"xCentre", yAlign:"bottom"
						}
					};
				}
			},
			label:{
				curr:function (S, A, D, Y) {
					var x = {d:S.d, a:A[S.d]},
						rPos = S.asRPos(x),
						dec = (S.range[0] == S.range[1]) ? (rPos == S.range[0]) ? 0.5 : 0 :
							zt.calcDec(rPos, S.range[0], S.range[1]),
						inL = zt.isBetween(rPos, S.range[0], S.range[1]);
					return {
						"clip-rect":zp.boxToArray(S.L),
						layout:S.getPoint(x, true),
						opacity:(inL) ? 1 - Math.abs(dec - 0.5) * 1.3 : 0, // This takes care of all the fading
						preRedraw:function (D) {if (inL) D.invisibleShow()}, // Make sure that it's shown prior pre-redraw
						postRedraw:function (D) {if (!inL) D.hide()} // Make sure that it's hidden post-redraw
					};
				}
			},
			upArrow:{
				type:"zShape", mask:"fixed",
				init:function (S, A, D, Y) {
					var ha = S.Y.highlight, sa = S.Y.scroll;
					return {
						layer:0,
						onAdd:function (D) {D.hide()}, // Start hidden
						preRedraw:function (D) {
							if (!S.expanded || za.min(S.range) <= 0) D.hide(); // Hide upArrow when in collapsed state or when top (NEVER GETS THERE)
							else D.show();
						},
						mouseEvents:function (D) {
							D.hoverHighlight(ha.t, ha.e);
							D.mousedown(function () {
								D.highlight(ha.t, ha.e, null, S.K);
								S.scroll({r:S.range[0]}, sa.t, sa.e, function () {D.reset(ha.t, ha.e)});
							});
						}
					};
				},
				curr:function (S, A, D, Y) {
					var l = S.L;
					return {
						points:[
							{x:l.x, y:l.top - Y.xSize},
							{x:l.x - Y.ySize / 2, y:l.top},
							{x:l.x + Y.ySize / 2, y:l.top}
						]
					};
				}
			},
			downArrow:{
				type:"zShape", mask:"fixed",
				init:function (S, A, D, Y) {
					var ha = S.Y.highlight, sa = S.Y.scroll, ea = S.Y.expand;
					return {
						layer:0,
						preRedraw:function (D) {
							if (S.expanded && za.max(S.range) >= S.dc.getSize(S.d, true) - 1) D.hide(); // Hide downArrow when in collapsed state (NEVER GETS THERE)
							else D.show();
						},
						mouseEvents:function (D) {
							D.hoverHighlight(ha.t, ha.e);
							D.mousedown(function () {
								if (S.maxShown == S.Y.expandedShown) {
									D.highlight(sa.t, sa.e, null, S.K);
									S.scroll({r:S.range[1]}, sa.t, sa.e, function () {D.reset(ha.t, ha.e)});
								} else S.expand(ea.t, ea.e);
							});
						}
					};
				},
				curr:function (S, A, D, Y) {
					var l = S.L;
					return {
						points:[
							{x:l.x, y:l.bottom + Y.xSize},
							{x:l.x - Y.ySize / 2, y:l.bottom},
							{x:l.x + Y.ySize / 2, y:l.bottom}
						]
					};
				}
			}
		}
	}, orders), t, e, b, w);
	if (c.selected) c.scroll(c.selected);
	return c;
};

// Slider bar
function zSlideAxis (orders, t, e, b, w) {
	return new zSmartAxis(zo.extend({
		type:"zSlideAxis",
		selected:{r:0},
		baseSelected:{r:0},
		style:{
			perpendicularSize:1,
			select:{t:200, e:"-"},
			slideBar:{
				fill:"#801c7e",
				background:{
					rounded:8,
					"stroke-width":1,
					"stroke-opacity":1,
					stroke:"#000",
					opacity:0.2
				},
				foreground:{opacity:1}
			},
			label:{
				"font-family":"sans-serif",
				margin:7,
				"font-size":12,
				"font-weight":"bold",
				fill:"#666"
			},
			baseNotch:{
				baseStyle:"currNotch",
				label:{
					"font-size":12
				}
			},
			currNotch:{
				flagWidth:10, flagHeight:20,
				width:48, height:36,
				ring:{
					stroke:"#801c7e",
					"stroke-width":3,
					fill:"#dedede"
				},
				label:{
					"font-family":"sans-serif",
					"font-size":18,
					fill:"#dedede",
					background:null
				},
				background:{
					fill:"#000",
					opacity:0.75
				},
				highlight:{opacity:1}
			},
			playButton:{
				background:{
					rounded:6,
					fill:"white"
				},
				foreground:{
					fill:"#444",
					stroke:null
				}
			}
		},
		setBase:function (x, t, e, b, w) {
			this.baseSelected = {d:this.d, a:this.asAPos(x), r:this.asRPos(x)};
			this.forSwarms("refresh", "all", t, e, b, w); // Redraw all swarms
		},
		axisSelect:function (x, t, e, b, w) {
			var c = this, thread = Math.round(Math.random() * 1000), // Current thread
				ha = (c.dragging) ? {} : c.Y.highlight,
				rPos = zt.forceBetween((zp.isPoint(x)) ? c.pointToRPos(x) : c.asRPos(x), c.range[0], c.range[1]),
				plotSelected = function (rPos, forced) {
					c.G.scripting = true; // Set flag so that..
					c.select({d:c.d, r:rPos}); // Select won't interrupt the guide
					c.G.scripting = false;
					c.forSwarms("setSpace", {d:c.d, r:rPos});
					c.forSwarms("updateData");
					c.forSwarms("plot", "all", forced);
				};
			if (rPos == c.rTargSelected) return; // Do nothing if it's already selected
			c.thread = thread; // Set thread id
			c.rTargSelected = Math.round(rPos); // Set target
			t *= Math.abs(rPos - c.selected.r); // Calculate appropriate time to target
			if (!c.G.animating) { // New animation
				c.G.redrawTo(c.selected.r); // Make sure guide is at the old selected's position
				c.forOwnedSwarm("clearEvents");
				c.forSwarms("preRedraw");
			} else { // Interrupting previous animation
				c.G.stop();
				c.G.onAnimation(); // Cancel onAnimation redraw
			};
			if (rPos > c.selected.r) {
				c.G.onAnimation(function () { // Forwards
					var guidePos = c.G.getVal(); // Check how far progressed the guide is
					if (guidePos > c.selected.r) plotSelected(Math.ceil(guidePos)); // If guide has moved beyond c.selected.r, move c.selected.r to the next position
					c.forSwarms("frameRedraw", "all", guidePos - (c.selected.r - 1)); // Redraw, based on distance to c.selected.r
				})
			} else {
				c.G.onAnimation(function () { // Backwards
					var guidePos = c.G.getVal(); // Check how far progressed the guide is
					if (guidePos < c.selected.r) plotSelected(Math.floor(guidePos)); // If guide has moved beyond c.selected.r, move c.selected.r to the next position
					c.forSwarms("frameRedraw", "all", (c.selected.r + 1) - guidePos); // Redraw, based on distance to the next notch
				});
			};
			c.G.redrawTo(c.rTargSelected, t, e, function () { // Animate, and when complete..
				if (c.thread != thread) return; // If c.thread != thread, this means new threads has started since this one began, abort
				c.G.onAnimation(); // Cancel onAnimation redraw
				plotSelected(c.rTargSelected, true); // Make sure the target notch is selected and the final orders are calculated (force off noChange flag, in case guide has already arrived)
				c.forSwarms("frameRedraw", "all", 1); // Draw final frame
				c.forSwarms("postRedraw");
				c.refresh({role:"playButton", mode:{noUpdateData:true}}, ha.t, ha.e);
				c.forOwnedSwarm("mouseEvents"); // Restart mouseEvents
				if (b) b();
				c.G.animating = false;
			}, w);
		},
		plan:{
			axisLine:null,
			slideBar:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, A, D, Y) {
					var sa = S.Y.select;
					return {
						layer:0,
						mouseEvents:function (D) {
							D.click(function (e) {S.axisSelect(zt.getEventPosition(e), sa.t, sa.e)});
						},
						background:{
							type:"zRectangle",
							layout:{anchor:S.getPoint({r:0}), height:S.notchHeight, width:S.getLength(S.range[1])}
						},
						foreground:{
							type:"zRectangle",
							layout:{height:S.notchHeight}
						}
					};
				},
				curr:function (S, A, D, Y) {
					return {
						foreground:{
							layout:{
								anchor:S.getPoint(S.baseSelected),
								width:S.getLength(S.selected.r - S.baseSelected.r)
							}
						}
					};
				}
			},
			baseNotch:{
				type:"zMultiDrone", mask:"fixed", ignore:false,
				init:function (S, A, D) {
					return {
						ring:{type:"zCircle", layer:0},
						background:{type:"zShape", layer:1},
						label:{type:"zTextBox", layer:2},
						mouseEvents:function (D) {D.drag(function (rx, ry, x) {S.setBase({a:S.pointToAPos({x:x})})})},
					};
				},
				curr:function (S, A, D, Y) {
					var x = {d:S.d, a:S.baseSelected.a},
						anchor = zo.add(S.getPoint(x), {y:S.L.height / 2}),
						flag = zp.flag({anchor:anchor, width:Y.width, height:Y.height, xAlign:"left", yAlign:"bottom"}, Y.flagWidth, Y.flagHeight),
						labelLayout = {anchor:zo.mid(flag[0], flag[2]), xAlign:"xCentre", yAlign:"yCentre"};
					return {
						ring:{circle:{centre:anchor, radius:S.L.height / 2 - Y.ring["stroke-width"] / 2}},
						background:{points:flag},
						label:{text:"From\n" + S.dc.getName(x), layout:labelLayout}
					};
				}
			},
			currNotch:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, A, D, Y) {
					return {
						ring:{type:"zCircle", layer:3},
						background:{type:"zShape", layer:4},
						label:{type:"zTextBox", layer:5},
						mouseEvents:function (D) {
							D.drag(
								function (rx, ry, x, y) {S.axisSelect({x:x, y:0})}, // When dragging, move currNotch
								function () {S.dragging = true}, // On drag, stop animating currNotch
								function () {S.dragging = false} // On drop, complete slide
							);
						}
					};
				},
				curr:function (S, A, D, Y) {
					var x = {d:S.d, r:S.selected.r || 0},
						anchor = zo.add(S.getPoint(x), {y:S.L.height / 2}),
						flag = zp.flag({anchor:anchor, width:Y.width, height:Y.height, xAlign:"right", yAlign:"bottom"}, Y.flagWidth, Y.flagHeight),
						labelLayout = {anchor:zo.mid(flag[0], flag[2]), xAlign:"xCentre", yAlign:"yCentre"};
					return {
						ring:{circle:{centre:anchor, radius:S.L.height / 2 - Y.ring["stroke-width"] / 2}},
						background:{points:flag},
						label:{text:S.dc.getName(x), layout:labelLayout}
					};
				}
			},
			playButton:{
				type:"zMultiDrone", mask:"fixed",
				init:function (S, A, D, Y) {
					var sa = S.Y.select,
						layout = new zLayout({
							anchor:zp.addVector(S.L.rotation, -S.notchHeight, S.L.getPoint(0, 0.5, true)),
							width:S.notchHeight, height:S.notchHeight,
							xAlign:"xCentre", yAlign:"yCentre"
						});
					return {
						layer:0,
						background:{
// 							type:"zRectangle", layout:layout, // Square button
							type:"zCircle", circle:{centre:layout.anchor, radius:S.notchHeight / 2}
						},
						foreground:{type:"zShape"},
						mouseEvents:function (D) {
							D.click(function () {
								if (S.G.animating) S.axisSelect({r:S.selected.r}, sa.t, sa.e); // Stop
								else if (S.selected.r == S.range[1]) S.axisSelect({r:S.range[0]}); // Move to start
								else S.axisSelect({r:S.range[1]}, sa.t, sa.e); // Play till the end
							});
						}
					};
				},
				curr:function (S, A, D, Y) {
					var sa = S.Y.select,
						layout = new zLayout({
							anchor:zp.addVector(S.L.rotation, -S.notchHeight, S.L.getPoint(0, 0.5, true)),
							width:S.notchHeight, height:S.notchHeight,
							xAlign:"xCentre", yAlign:"yCentre"
						});
					return {
						foreground:{
							points:layout.getPoints(
								(!S.G.animating) ? [[0.33,0.2], [0.78,0.5], [0.78,0.5], [0.33,0.8]] :
								[[0.3,0.3], [0.7,0.3], [0.7,0.7], [0.3,0.7]])
						}
					};
				}
			}
		}
	}, orders), t, e, b, w);
};

// Blank slate for creating a swarm - use plans from zPlanLibrary or create your own
function zSwarm (orders, t, e, b, w) {
	zSwarmConstructor(this, zo.extend({rSpace:"all"}, orders), "zSwarm");
	// Initialise
	if (this.updateData) this.updateData(t, e, null, this.K);
	this.add("fixed", t, e, null, this.K);
	this.add("all", t, e, b, w); // Add everything
	this.layer();
	for (var p in this.axes) this.axes[p].layer(); // Relayer axes, in case swarm covered them
};

// Container for drones
var zDrones = {
	make:function (type, orders, t, e, b, w) {
		if (!type) return logger("zDrones.make(): WARNING - No type defined.");
		else if (typeof type == "function") return new type(orders, t, e, b, w);
		else if (typeof type == "string") {
			if (!zDrones[type]) return logger("zDrones.make(): WARNING - " + type + " is not a valid drone type.");
			return new zDrones[type](orders, t, e, b, w);
		};
	},
	zGuide:zGuide,
	zLine:zLine,
	zShape:zShape,
	zArc:zArc,
	zCircle:zCircle,
	zRectangle:zRectangle,
	zText:zText,
	zImage:zImage,
	zSVG:zSVG,
	zHTML:zHTML,
	zMultiDrone:zMultiDrone,
	zTextBox:zTextBox,
	zHTMLTooltipBox:zHTMLTooltipBox
};

var zPlot = zp = {
	///////////////////
	//  Point tools  //
	///////////////////
	isPoint:function (a) {
		return a.x != null && a.y != null;
	},
	// Turns a point into a string, but round it first (dp defaults to 0)
	pointToString:function (point, dp) {
		return zt.round(point.x, dp) + "," + zt.round(point.y, dp);
	},
	///////////////////
	//  Angle tools  //
	///////////////////
	decToDeg:function (dec) {return (dec || 0) * 360 - 90},
	decToRad:function (dec) {return (dec || 0) * 2 * Math.PI},
	degToDec:function (deg) {return (deg || 0) / 360},
	degToRad:function (deg) {return (deg || 0) * Math.PI / 180},
	radToDec:function (rad) {return (rad || 0) / 2 / Math.PI},
	radToDeg:function (rad) {return (rad || 0) * 180 / Math.PI},
	normaliseDeg:function (deg, minDeg, maxDeg) {
		minDeg = minDeg || 0;
		maxDeg = maxDeg || 360;
		while (deg >= maxDeg) deg -= 360;
		while (deg < minDeg) deg += 360;
		return deg;
	},
	// Normalise deg until it is <180 away from targDeg (use for spinning things in the right direction)
	matchDeg:function (deg, targDeg) {
		while (deg > targDeg + 180) deg -= 360;
		while (deg < targDeg - 180) deg += 360;
		return deg;
	},
	inverseDeg:function (a) {return zp.normaliseDeg(a + 180)},
	// Calculates the normalised difference between two deg (i.e. It can tell that 0 and 360 degrees are the same point)
	degDiff:function (a, b) {return zt.round(Math.abs(zp.normaliseDeg(a) - zp.normaliseDeg(b)), 10)},
	sin:function (deg) {return Math.sin(zp.degToRad(deg))},
	cos:function (deg) {return Math.cos(zp.degToRad(deg))},
	tan:function (deg) {return Math.tan(zp.degToRad(deg))},
	asin:function (a) {return zp.radToDeg(Math.asin(a))},
	acos:function (a) {return zp.radToDeg(Math.acos(a))},
	atan:function (a) {return zp.radToDeg(Math.atan2(a))},
	isRightAngle:function (a, b, c) {
		var deg = Math.round(zp.normaliseDeg(zp.deg(a, b) - zp.deg(b, c)));
		return (deg == 90) | (deg == 270);
	},
	////////////////////
	//  Vector tools  //
	////////////////////
	// Return distance between a and b
	dist:function (a, b) {
		var xDist = b.x - a.x, yDist = b.y - a.y;
		if (xDist == 0 && yDist == 0) return 0;
		return Math.sqrt(xDist * xDist + yDist * yDist);
	},
	// Returns angle from a to b (in degrees)
	deg:function (a, b) {
		var xDist = b.x - a.x, yDist = b.y - a.y;
		if (xDist == 0 && yDist == 0) return 0;
		return zp.radToDeg(Math.atan2(yDist, xDist));
	},
	// Returns vector from a to b
	vector:function (a, b) {
		var xDist = b.x - a.x, yDist = b.y - a.y;
		if (xDist == 0 && yDist == 0) return {x:0, y:0, deg:0, dist:0};
		return {x:xDist, y:yDist, deg:zp.radToDeg(Math.atan2(yDist, xDist)), dist:Math.sqrt(xDist * xDist + yDist * yDist)};
	},
	// Returns point + vector
	addVector:function (deg, dist, anchor) {
		if (deg == -90) return {x:anchor.x, y:anchor.y - dist}; // Straight up - special case because a lot will start from -90
		if (dist == 0) return anchor; // If distance is zero, don't bother calculating radians, etc.
		var rad = zp.degToRad(deg);
		return {x:anchor.x + Math.cos(rad) * dist, y:anchor.y + Math.sin(rad) * dist};
	},
	// Get the boundary points on an arc (run pointsToBox to get a box, or concat a series of arcs and run pointsToBox on all of them)
	arcToPoints:function (centre, innerRadius, outerRadius, degStart, degEnd) {
		while (degStart < 0) degStart += 360, degEnd += 360;
		var i, points = [],
			addPoints = function (deg) {
				if (innerRadius) points.push(zp.addVector(deg, innerRadius, centre));
				points.push(zp.addVector(deg, outerRadius, centre));
			};
		if (!innerRadius) points.push(centre);
		addPoints(degStart);
		for (i = 90; i <= 360; i += 90) if (zt.isBetween(i, degStart, degEnd)) addPoints(i);
		addPoints(degEnd);
		return points;
	},
	/////////////////
	//  Alignment  //
	/////////////////
	alignmentToDec:function (alignment) {
		switch (alignment) {
			case "right": case "bottom": return 1;
			case "xCentre": case "yCentre": return 0.5;
			case "left": case "top": return 0;
			default: return logger("zTools.alignmentToDec(): " + alignment + " doesn't look like an alignment."); // Includes left and top
		};
	},
	alignmentToMod:function (alignment) {
		switch (alignment) {
			case "right": case "bottom": return 1;
			case "xCentre": case "yCentre": return 0;
			case "left": case "top": return -1;
			default: return logger("zTools.alignmentToMod(): " + alignment + " doesn't look like an alignment."); // Includes left and top
		};
	},
	inverseAlignment:function (alignment) {
		switch (alignment) {
			case "xCentre": return "xCentre";
			case "left": return "right";
			case "right": return "left";
			case "yCentre": return "yCentre";
			case "top": return "bottom";
			case "bottom": return "top";
		};
	},
	/////////////////
	//  Box tools  //
	/////////////////
	// Expects either {left,right,top,bottom} or {x,y,width,height} input
	completeBox:function (a) {
		if (a instanceof zLayout) return a; // A zLayout object will have all this already
		a = zo.clone(a);
		if (a.anchor) a.x = a.anchor.x, a.y = a.anchor.y;
		else a.anchor = {x:a.x, y:a.y};
		if (a.xAlign) a[a.xAlign] = a.x;
		if (a.yAlign) a[a.yAlign] = a.y;
		a.left =
			(a.left != null) ? a.left :
			(a.right != null && a.width != null) ? a.right - a.width :
			(a.xCentre != null && a.width != null) ? a.xCentre - a.width / 2 :
			a.x || 0;
		a.top =
			(a.top != null) ? a.top :
			(a.bottom != null && a.height != null) ? a.bottom - a.height :
			(a.yCentre != null && a.height != null) ? a.yCentre - a.height / 2 :
			a.y || 0;
		a.width =
			(a.width != null) ? a.width :
			(a.right != null) ? a.right - a.left : 0;
		a.height =
			(a.height != null) ? a.height :
			(a.bottom != null) ? a.bottom - a.top : 0;
		a.right = (a.right != null) ? a.right : a.left + a.width;
		a.bottom = (a.bottom != null) ? a.bottom : a.top + a.height;
		a.xCentre = (a.xCentre != null) ? a.xCentre : zt.calcMid(a.left, a.right);
		a.yCentre = (a.yCentre != null) ? a.yCentre : zt.calcMid(a.top, a.bottom);
		a.centre = {x:a.xCentre, y:a.yCentre};
		return a;
	},
	// Get bounding box from an array of points
	pointsToBox:function (a) {
		var x = za.calcObjects(a, "x", "sort"), y = za.calcObjects(a, "y", "sort");
		return {left:x[0], right:za.last(x), top:y[0], bottom:za.last(y)};
	},
	// Get bounding box from an array of points - use complex flag to draw a rect with 8 points, which can be used to transform into a circle with 8 points
	boxToPoints:function (a) {
		return [{x:a.left, y:a.top}, {x:a.right, y:a.top}, {x:a.right, y:a.bottom}, {x:a.left, y:a.bottom}];
	},
	// Get basic rectangle (includes alignment, but no rotate or other complex transformations) ("clip-rect" uses this)
	boxToArray:function (a) {
		return [a.left, a.top, a.right - a.left, a.bottom - a.top];
	},
	boxToSVG:function (a) {
		return zp.shape(zp.boxToPoints(a));
	},
	////////////////////////
	//  SVG Constructors  //
	////////////////////////
	start:function (startPoint) {
		return "M" + zp.pointToString(startPoint || {x:0, y:0});
	},
	lineTo:function (toPoint) {
		return "L" + zp.pointToString(toPoint);
	},
	quadraticCurveTo:function (controlPoint, toPoint) {
		return "Q" + zp.pointToString(controlPoint) + "," + zp.pointToString(toPoint);
	},
	arcTo:function (radius, toPoint) {
		return "A" + radius + "," + radius + ",0,0,1," + zp.pointToString(toPoint);
	},
	reverseArcTo:function (radius, toPoint) {
		return "A" + radius + "," + radius + ",0,0,0," + zp.pointToString(toPoint);
	},
	close:function (svg) {
		return "Z";
	},
	line:function (points) {
		var svg = zp.start(points[0]);
		for (var i = 1; i < points.length; i++) svg += zp.lineTo(points[i]);
		return svg;
	},
	shape:function (points) {
		return zp.line(points) + "Z";
	},
	arc:function (O) {
		var i, svg,
			deg = O.degEnd - O.degStart,
			segments = O.minSeg || Math.ceil(deg / 90), // Each segment requires an anchor point, and the rounding of that point throws the arc off a little bit; the fewer the segments, the bigger the arcs, which amplifies the rounding errors; fewer segments make for smoother arcs, but they will wobble on animation
			segmentDeg = deg / segments;
		if (O.innerRadius) {
			svg = zp.start(zp.addVector(O.degStart, O.innerRadius, O.centre)); // Draw innerCircle
			for (i = 1; i <= segments; i++) {
				svg += zp.arcTo(O.innerRadius, zp.addVector(O.degStart + i * segmentDeg, O.innerRadius, O.centre)); // Split into segments (Minimum 90 degrees per part, as arcTo can't handle large circles)
			};
		} else svg = zp.start(O.centre); // Or just a start point, if innerCircle has a radius of 0
		if (O.outerRadius > O.innerRadius) {
			svg += zp.lineTo(zp.addVector(O.degEnd, O.outerRadius, O.centre)); // Draw outerCircle backwards
			for (i = segments - 1; i >= 0; i--) {
				svg += zp.reverseArcTo(O.outerRadius, zp.addVector(O.degStart + i * segmentDeg, O.outerRadius, O.centre)); // Split into segments (Minimum 90 degrees per part, as arcTo can't handle large circles)
			};
		};
		return svg + "Z";
	},
	circle:function (centre, radius) {
		var i,
			startDeg = -135, // Equivalent to top-left corner, so it can transition into a rect if required
			points = 4, // Split into 4 parts (i.e. Minimum 90 degrees per part, as arcTo can't handle large circles)
			step = 360 / points,
			svg = zp.start(zp.addVector(startDeg, radius, centre));
		if (radius) for (i = 1; i <= points; i++) {
			svg += zp.arcTo(radius, zp.addVector(startDeg + i * step, radius, centre));
		};
		return svg;
	},
	flag:function (l, handleWidth, handleHeight) {
		l = zp.completeBox(l);
		var xOffset = handleWidth * zp.alignmentToMod(l.xAlign),
			yOffset = handleHeight * zp.alignmentToMod(l.yAlign),
			x = [l[l.xAlign], l[zp.inverseAlignment(l.xAlign)]],
			y = [l[l.yAlign], l[zp.inverseAlignment(l.yAlign)]];
		return [
			{x:x[0], y:y[1] - yOffset},
			{x:x[1], y:y[1] - yOffset},
			{x:x[1], y:y[0] - yOffset},
			{x:x[0] - xOffset, y:y[0] - yOffset},
			{x:x[0], y:y[0]}
		];
	}
};

// Array tools (a is always the target array)
var zArray = za = {
	/////////////
	//  Basic  //
	/////////////
	asArray:function (a) {return (za.isArray(a)) ? a : [a]},
	// When orders are created as arrays, they don't get processed properly by animate, so turn them into a real object first
	asObject:function (a) {
		if (za.isArray(a)) {
			var i, out = {};
			for (i = 0; i < a.length; i++) out[i] = a[i];
			return out;
		} else return a;
	},
	isEmpty:function (a) {return a == null || a.length == 0},
	isArray:function (a) {return $.isArray(a)},
	// Create a filled array
	fill:function (val, length, increment) {
		var i, out = [];
		if (increment) for (i = 0; i < length; i++) out[i] = val + i * increment;
		else for (i = 0; i < length; i++) out[i] = zo.clone(val); // Use clone so that if val is an object, it would get cloned properly
		return out;
	},
	// Fill between a range
	fillRange:function (range) {
		var length = Math.abs(range[0] - range[1]) + 1,
			increment = (range[0] < range[1]) ? 1 : (range[0] > range[1]) ? -1 : 0;
		return za.fill(range[0], length, increment);
	},
	last:function (a) {
		return a[a.length - 1];
	},
	// Insert b (array or element) in a at pos
	insertAt:function (a, val, pos) {
		return a.slice(0, pos).concat(za.asArray(val), a.slice(pos + 1));
	},
	// Remove element a at pos
	removeAt:function (a, pos) {
		if (pos == null) return null;
		return a.splice(pos, 1)[0];
	},
	// Push only if it doesn't already exist
	shyPush:function (a, val) {
		return (za.contains(a, val)) ? a : a.push(val);
	},
	// Concat only elements that don't already exist
	shyConcat:function (a, b) {
		for (var i = 0; i < b.length; i++) za.shyPush(a, b[i]);
		return a;
	},
 	// Insert only if it doesn't already exist
	shyInsert:function (a, val, pos) {
		return (za.contains(a, val)) ? a : za.insertAt(a, val, pos);
	},
	// Creates a list of every unique array which is max.length long, and where each element is between 0 and max[d]
	count:function (max) {
		var i,
			counter = za.fill(0, max.length),
			out = [counter.slice()];
		for (i = counter.length - 1; i >= 0; i--) { // Go backwards
			if (counter[i] < max[i]) { // Find the first value that can be bumped without going bust
				counter[i]++; // Bump
				for (i++; i < counter.length; i++) counter[i] = 0; // Reset all subsequent values to 0
				out.push(counter.slice()); // Push new value to out
				i = counter.length; // Go back to first value
			};
		};
		return out;
	},
	///////////////
	//  Reorder  //
	///////////////
	// Turn a simple array into objects with an index so it can remember its original position, then sort them
	index:function (a) {
		var i, out = [];
		for (i = 0; i < a.length; i++) out[i] = {id:i, val:a[i]};
		return out;
	},
	// FIXME: Is this some kind of dumbass dumb sort? Defaults to ascending sort
	sort:function (a, reverseOrder) {
		a.sort(function (a, b) {return (a > b) ? 1 : (b > a) ? -1 : 0});
		return (reverseOrder) ? a.reverse() : a;
	},
	// Creates a new array from another array using a map (e.g. If a = [0,2,2], and ref = [a,b,c,d,e] -> out = [a,c,c])
	map:function (ref, a) {
		if (typeof a == "number") return ref[a];
		else if (za.isArray(a)) {
			var i, out = [];
			for (i = 0; i < a.length; i++) out[i] = ref[a[i]];
			return out;
		} else return ref;
	},
	// Creates an array of indicies from another array using a map (e.g. If a = [a,c,c], and ref = [a,b,c,d,e] -> out = [0,2,2])
	unmap:function (ref, a) {
		if (typeof a == "number") return za.find(ref, a);
		else if (za.isArray(a)) {
			var i, out = [];
			for (i = 0; i < a.length; i++) out[i] = za.find(ref, a[i]);
			return out;
		} else return ref;
	},
	///////////////////////
	//  Find/get/remove  //
	///////////////////////
	// This powers all the find/get/remove functions
	compareTests:function (mode, a) {
		if (a == null) return logger("za.compareTests(): ERROR - Array to test is null.");
		switch (mode) {
			case "==":
			case null:
			case undefined:
				return function (x, val) {return x == val};
			case "===":
				return function (x, val) {return x === val};
			case "<":
				return function (x, val) {return x < val};
			case "<=":
				return function (x, val) {return x <= val};
			case ">":
				return function (x, val) {return x > val};
			case ">=":
				return function (x, val) {return x >= val};
			case "><": // In range
				return function (x, v1, v2) {return x > v1 && x < v2};
			case ">=<":
				return function (x, v1, v2) {return x >= v1 && x <= v2};
			case "<>": // Outside range
				return function (x, v1, v2) {return x < v1 || x > v2};
			case "<=>":
				return function (x, v1, v2) {return x <= v1 || x >= v2};
			case "!=":
				return function (x, val) {return x != val};
			case "type":
				return function (x, val) {return zt.type(x) == val};
			case "atPos":
				return function (x, val, pos) {return x[pos] == val};
			case "equals": // v2 used as "ordered"
				return function (x, val, ordered) {return zo.equals(x, val, ordered)};
			case "superset": // v2 used as "ordered"
				return function (x, val, ordered) {return za.isSuperset(x, val, ordered)};
			case "subset": // v2 used as "ordered"
				return function (x, val, ordered) {return za.isSubset(x, val, ordered)};
			case "intersects":
				return function (x, val) {return za.intersects(x, val)};
			case "match": // x has one of the values specified in val (val should be an array)
				return function (x, val) {return za.contains(val, x)};
			case "notMatch": // x has none of the values specified in val
				return function (x, val) {return !za.contains(val, x)};
			case "max":
			case "min":
			case "closest":
				return "special";
			default:
				logger("za.compareTests(): ERROR - I don't understand mode " + mode + ".");
		};
	},
	// Returns positions of matching elements
	find:function (a, v1, mode, v2) {
		var i, test = za.compareTests(mode, a);
		if (test == "special") return za.find(a, za[mode](a, v1, v2));
		else if (test) {
			for (i = 0; i < a.length; i++) if (test(a[i], v1, v2)) return i; // Return the first positive match
		};
		return null; // Not found
	},
	findLast:function (a, v1, mode, v2) {
		var i, test = za.compareTests(mode, a);
		if (test == "special") return za.findLast(a, za[mode](a, v1, v2));
		else if (test) {
			for (i = a.length - 1; i >= 0; i--) if (test(a[i], v1, v2)) return i; // Return the last positive match
		};
		return null; // Not found
	},
	findAll:function (a, v1, mode, v2) {
		var i, out = [], test = za.compareTests(mode, a);
		if (test == "special") return za.findAll(a, za[mode](a, v1, v2));
		else if (test) {
			for (i = 0; i < a.length; i++) if (test(a[i], v1, v2)) out.push(i);
			return out;
		};
		return null; // Not found
	},
	// Returns matching element from array
	get:function (a, v1, mode, v2) {
		var pos = za.find(a, v1, mode, v2);
		return (pos == null) ? null : a[pos];
	},
	getLast:function (a, v1, mode, v2) {
		var pos = za.findLast(a, v1, mode, v2);
		return (pos == null) ? null : a[pos];
	},
	getAll:function (a, v1, mode, v2) {
		var pos = za.findAll(a, v1, mode, v2);
		return za.map(a, pos);
	},
	// Removes matching element from the array and returns it
	remove:function (a, v1, mode, v2) {
		var pos = za.find(a, v1, mode, v2);
		return za.removeAt(a, pos);
	},
	removeLast:function (a, v1, mode, v2) {
		var pos = za.findLast(a, v1, mode, v2);
		return za.removeAt(a, pos);
	},
	removeAll:function (a, v1, mode, v2) {
		var i, out = [],
			pos = za.sort(za.findAll(a, v1, mode, v2), true); // Map is reverse sorted
		for (i = 0; i < pos.length; i++) out.push(za.removeAt(a, pos[i]));
		return out;
	},
	// Replace matching element in a with val
	replace:function (a, val, v1, mode, v2) {
		var pos = za.find(a, v1, mode, v2);
		a[pos] = val;
		return pos;
	},
	replaceLast:function (a, val, v1, mode, v2) {
		var pos = za.findLast(a, v1, mode, v2);
		a[pos] = val;
		return pos;
	},
	replaceAll:function (a, val, v1, mode, v2) {
		var i, pos = za.findAll(a, v1, mode, v2);
		for (i = 0; i < pos.length; i++) a[pos[i]] = val;
		return pos;
	},
	// Whether matching elements exist in a
	contains:function (a, v1, mode, v2) {
		return za.find(a, v1, mode, v2) != null;
	},
	/////////////////////
	//  Object arrays  //
	/////////////////////
	// Turn an object array into a simple array so it can be operated on
	extract:function (a, type) {
		for (var out = [], i = 0; i < a.length; i++) out[i] = a[i][type];
		return out;
	},
	// Defaults to ascending sort
	sortObjects:function (a, type, reverseOrder) {
		var out = a.slice();
		out.sort(function (a, b) {return (a[type] > b[type]) ? 1 : (b[type] > a[type]) ? -1 : 0});
		return (reverseOrder) ? out.reverse() : out;
	},
	calcObjects:function (a, type, mode, v1) {
		var out = za.extract(a, type);
		if (!mode) return out; // If no mode defined, just return a simple array of raw numbers
		if (za[mode]) return za[mode](out, v1); // Use za.sum(), etc.
	},
	// Look for object[type] == val
	findObject:function (a, type, v1, mode, v2) {
		return za.find(za.extract(a, type), v1, mode, v2)
	},
	findLastObject:function (a, type, v1, mode, v2) {
		return za.findLast(za.extract(a, type), v1, mode, v2);
	},
	findAllObjects:function (a, type, v1, mode, v2) {
		return za.findAll(za.extract(a, type), v1, mode, v2);
	},
	getObject:function (a, type, v1, mode, v2) {
		var pos = za.findObject(a, type, v1, mode, v2);
		return (pos == null) ? null : a[pos];
	},
	getLastObject:function (a, type, v1, mode, v2) {
		var pos = za.findLastObject(a, type, v1, mode, v2);
		return (pos == null) ? null : a[pos];
	},
	getAllObjects:function (a, type, v1, mode, v2) {
		var pos = za.findAllObjects(a, type, v1, mode, v2);
		return za.map(a, pos);
	},
	removeObject:function (a, type, v1, mode, v2) {
		var pos = za.findObject(a, type, v1, mode, v2);
		return za.removeAt(a, pos);
	},
	removeLastObject:function (a, type, v1, mode, v2) {
		var pos = za.findLastObject(a, type, v1, mode, v2);
		return za.removeAt(a, pos);
	},
	removeAllObjects:function (a, type, v1, mode, v2) {
		var i, out = [], pos = za.sort(za.findAllObjects(a, type, v1, mode, v2), true);
		for (i = 0; i < pos.length; i++) za.add(out, za.removeAt(a, pos[i]));
		return out;
	},
	//////////////////
	//  Operations  //
	//////////////////
	// Returns a plus b (concat)
	add:function (a, b) {
		return $.merge(a, b);
	},
	// Return a minus b (all the members of a that are not in b)
	subtract:function (a, b, ordered) {
		a = za.asArray(a), b = za.asArray(b);
		var i, out = a.slice();
		for (i = 0; i < b.length; i++) za.remove(out, b[i], "equals", ordered); // Remove each element of b from a (NOTE: It's one-to-one, so if it exists twice in a, but once in b, only one will be removed)
		return out;
	},
	// Get elements in either
	union:function (a, b) {
		return za.getUniques(a.concat(b));
	},
	// Get elements in both
	intersection:function (a, b) {
		return za.getAll(a, b, "match");
	},
	// Whether a is a subset/superset of b
	isSubset:function (a, b, strict) {
		if (b.length - a.length < strict) return false; // If strict, b.length must be > a.length, if not strict, will accept b.length >= a.length
		return za.subtract(a, b).length == 0;
	},
	isSuperset:function (a, b, strict) {return za.isSubset(b, a, strict)},
	intersects:function (a, b) {return za.intersection(a, b) != null},
	////////////////////
	//  Calculations  //
	////////////////////
	// Meta function for accessing calculation functions
	calc:function (mode, a, v1, v2, v3) {
		if (za[mode]) return za[mode](a, v1, v2, v3); // Use za.sum(), etc.
		logger("zArray.calc(): I don't know how to calculate " + mode + ".");
	},

	// Simple (returns single number)
	sum:function (a) {
		a = za.getNumbers(a);
		var i, out = 0;
		for (i = 0; i < a.length; i++) out += a[i];
		return out;
	},
	max:function (a) {return Math.max.apply({}, za.getNumbers(a))},
	min:function (a) {return Math.min.apply({}, za.getNumbers(a))},
	range:function (a) {return [za.min(a), za.max(a)]},
	// Mean of valid numbers only - NaN's are not counted
	mean:function (a) {
		a = za.getNumbers(a);
		return za.sum(a) / a.length; // Sum must always be filtered - but if noFilter is off, then a is already filtered, so it doesn't need to be repeated in sum
	},
	median:function (a) {return za.percentile(a, 0.5)},
	// Value at x percentile (in dec) (valid numbers only)
	percentile:function (a, dec) {
		a = za.sort(za.getNumbers(a));
		var n = (a.length - 1) * dec;
		return zt.calcMid(a[Math.floor(n)], a[Math.ceil(n)], n - Math.floor(n));
	},
	// Value in a which is closest to val
	closest:function (a, val) {
		var i, out = {diff:Infinity};
		for (i = 1; i < a.length; i++) {
			curr = {val:a[i], diff:Math.abs(val - a[i])};
			if (curr.diff < out.diff) out = curr;
		};
		return out.val;
	},

	// Complex (returns arrays)
	round:function (a, dp) {
		var i, out = [];
		for (i = 0; i < a.length; i++) out[i] = zt.round(a[i], dp);
		return out;
	},
	// Defaults to ascending order
	rank:function (a, reverseOrder) {
		var i, out = [];
		a = za.sortObjects(za.index(a), "val", reverseOrder); // Create indexes, then sort array
		for (i = 0; i < a.length; i++) out[a[i].id] = i; // Return the positions
		return out;
	},
	// As decimal of the sum of the array
	dec:function (a) {
		var i, out = [], sum = za.sum(a);
		if (sum) for (i = 0; i < a.length; i++) if (!isNaN(a[i])) out[i] = a[i] / sum;
		else for (i = 0; i < a.length; i++) out[i] = 0; // If sum is 0, treat decimal as 0 (it can't be calculated for realz)
		return out;
	},
	// Stack from beginning to end
	stacked:function (a, start) {
		var i, curr, out = [], stacked = start || 0;
		for (i = 0; i < a.length; i++) {
			curr = (isNaN(a[i])) ? 0 : a[i];
			out[i] = {start:stacked, end:stacked += curr};
		};
		return out;
	},
	// Absolute change from one element to the next
	change:function (a) {
		var i, curr, prev = 0, out = [];
		for (i = 0; i < a.length; i++) {
			curr = (isNaN(a[i])) ? 0 : a[i];
			out[i] = curr - prev;
			prev = curr;
		};
		return out;
	},
	// Decimal change from one element to the next
	decChange:function (a) {
		var i, prev = 0, out = [];
		for (i = 0; i < a.length; i++) {
			out[i] = (a[i]) ?
				(prev) ? (a[i] / prev) - 1 : 1 : // curr > 0
				(prev) ? -1 : 0; // curr <= 0
			prev = a[i];
		};
		return out;
	},
	// Absolute change from each element to the first element
	totalChange:function (a) {
		var i, curr, out = [], base = a[0] || 0;
		for (i = 0; i < a.length; i++) {
			curr = (isNaN(a[i])) ? 0 : a[i];
			out[i] = curr - base;
		};
		return out;
	},
	// Decimal change from each element to the first element
	totalDecChange:function (a) {
		var i, out = [];
		for (i = 0; i < a.length; i++) {
			out[i] = (a[i]) ?
				(a[0]) ? (a[i] / a[0]) - 1 : 1 : // curr > 0
				(a[0]) ? -1 : 0; // curr <= 0
		};
		return out;
	},
	///////////////////////////////
	//  Multidimensional access  //
	///////////////////////////////
	// Create an array of fixed dimensions filled with val (e.g. create([5,5,5]) creates a 5x5x5 array)
	createDeep:function (space, val) {
		var out = [], i,
			currSpace = space[0],
			newSpace = space.slice(1);
		if (space.length > 1) for (i = 0; i < currSpace; i++) out[i] = za.createDeep(newSpace, val); // If there are more dimensions, recursively create them
		else for (i = 0; i < currSpace; i++) out[i] = val; // Otherwise insert val
		return out;
	},
	// Get elements/subarrays from an array (e.g. get(a, ["all", 1, 0] returns [a[0][1][0], a[1][1][0], a[2][1][0]... a[n][1][0]])
	getDeep:function (a, space) {
		if (za.isEmpty(space) || a == null) return a;
		var i, out = [],
			currSpace = space[0],
			newSpace = space.slice(1);
		if (za.isArray(currSpace)) for (i = 0; i < currSpace.length; i++) out[i] = za.getDeep(a[currSpace[i]], newSpace);
		else out = za.getDeep(a[currSpace], newSpace);
		return out;
	},
	// Set elements/subarrays from an array
	setDeep:function (a, space, newVal) {
		var i, currSpace = (space[0] == "all") ? za.fill(0, a.length, 1) : za.asArray(space[0]);
		if (space.length > 1) {
			space = space.slice(1);
			for (i = 0; i < currSpace.length; i++) {
				a[currSpace[i]] = za.setDeep(a[currSpace[i]] || [], space, newVal);
			};
		} else for (i = 0; i < currSpace.length; i++) a[currSpace[i]] = zo.clone(newVal);
		return a;
	},
	// See how deep array goes (assumes array is uniform)
	deepLength:function (a) {
		var out = [], curr = a;
		while (za.isArray(curr)) {
			out.push(curr.length);
			curr = curr[0];
		};
		return out;
	},
	flatten:function (a) {
		var i, out = [];
		for (i = 0; i < a.length; i++) {
			if (za.isArray(a[i])) {
				za.add(out, za.flatten(a[i]));
			} else out.push(a[i]);
		};
		return out;
	},
	/////////////////////
	//  Miscellaneous  //
	/////////////////////
	getNumbers:function (a) {return za.getAll(za.asArray(a), "number", "type")},
	getUniques:function (a) {
		var i, prev, out = [];
		a = za.sort(a.slice()); // Sort first
		for (i = 0; i < a.length; i++) {
			if (a[i] != a[i - 1]) out.push(a[i]);
		};
		return out;
	},
	// Randomly select n number of elements from a (the same element can NOT be extracted more than once)
	getRandom:function (a, n, mode) {
		if (n == null || n == 1) {
			if (!a) explode("zArray.getRandom(): Can't get a random element from an undefined array.");
			return a[Math.round(Math.random() * (a.length - 1))];
		};
		var i, tempMap, out = [],
			map = za.fill(0, (a) ? a.length : n, 1);
		if (mode == null || mode == "random") { // Get random elements
			while (out.length < n) {
				out.push(Math.round(Math.random() * (map.length - 1)));
			};
		} else if (mode == "randomNoRepeat") { // Run through elements in random order, then randomise and start again
			while (out.length < n) {
				tempMap = map.slice();
				for (i = 0; i < n; i++) out.push(za.removeAt(tempMap, Math.round(Math.random() * (tempMap.length - 1))));
			};
		} else if (mode == "sequential") { // Run through array sequentially, and loop from start when finished
			while (out.length < n) {
				za.add(out, map);
			};
		};
		if (a) for (i = 0; i < n; i++) out[i] = a[out[i]]; // If a is defined, map to a
		return out;
	},
	// Return a single stacked object from an array of stacked objects
	mergeStacked:function (a) {
		return {start:za.calcObjects(a, "start", "min"), end:za.calcObjects(a, "end", "max")};
	},
// 	///////////////////
// 	//  Combination  //
// 	///////////////////
//  	// Plus one to counter array (initial array needs to be manually set)
// 	combination:function (counter, min, max, mode) {
// 		var i;
// 		switch (mode) {
// 			case "array":
// 			// Count using predefined min/max arrays
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max[i]) { // Find the first value that can be bumped without going bust
// 						counter[i]++; // Bump
// 						for (i++; i < counter.length; i++) counter[i] = min[i]; // Reset all subsequent values to min
// 						return counter;
// 					};
// 				};
// 			case "non-repeat":
// 			// Each value must be greater than the value to its left but less than max (e.g. With a max of 3: 012, 013, 023, 123)
// 			// No value can appear more than once at any given time
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max + i + 1 - counter.length) { // Find the first value that can be bumped without going bust - BUT all subsequent values have to be greater than the one to the left of it
// 						counter[i]++; // Bump
// 						for (i++; i < counter.length; i++) counter[i] = counter[i - 1] + 1; // Reset all subsequent values so that each is greater than the one before it
// 						return counter;
// 					};
// 				};
// 				return null;
// 			case "ordered":
// 			// Each value must be greater than or equal to the value to its left but less than max (e.g. With a max of 3: 000, 001, 002, 003, 011, 012)
// 			// Order does not matter, and only one instance of any combination will be produced (i.e. 011 will exist, 101 and 110 will not)
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max) { // Find the first value that can be bumped without going bust
// 						counter[i]++; // Bump
// 						for (i++; i < counter.length; i++) counter[i] = counter[i - 1]; // Reset all subsequent values to be the same as the value that's just been bumped
// 						return counter;
// 					};
// 				};
// 				return null;
// 			default:
// 			// All whole numbers, using max-min as a base
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max) { // Find the first value that can be bumped without going bust
// 						counter[i]++; // Bump
// 						for (i++; i < counter.length; i++) counter[i] = min; // Reset all subsequent values to min
// 						return counter;
// 					};
// 			};
// 			return null; // Bust!
// 		};
// 	},
// 	// Generate all possible non-repeating (ignores order) pairs from array and convert them to string
// 	getPairs:function (a) {
// 		if (a.length < 2) return [];
// 		var out = [], counter = [0,1];
// 		while (counter != null) {
// 			out.push(a[counter[0]] + "," + a[counter[1]]); // Convert to string for faster comparisons
// 			counter = za.counter(counter, 0, a.length - 1, "non-repeat");
// 		};
// 		return out;
// 	},
// 	// Compare two arrays and return the percentage of matches
// 	calcSimilarity:function (a, b, threshold) {
// 		var i, big, small, both = 0,
// 			thresholdCount = (threshold) ? (a.length + b.length) * threshold / 2 : 0; // This many elements must match to reach threshold
// 		if (a.length >= b.length) big = a, small = b;
// 		else big = b, small = a;
// 		if (small.length < thresholdCount) return null; // Crude check - quit if one of the groups is too small to pass threshold
// 		for (i = 0; i < small.length; i++) {
// 			if (za.get(big, small[i])) both++;
// 			else if (both + small.length - i < thresholdCount) return null; // If there aren't enough elements remaining to get this over the threshold, give up
// 		};
// 		return 2 * both / (a.length + b.length);
//  	},
// 	// Generates a frequency table out of an array, using intervals (generated with zt.getIntervals()) if defined
// 	frequency:function (a, intervals, increments) {
// 		var i = 0, curr, next, out = [];
// 		if (typeof a[0] == "number" && intervals) { // Continuous data
// 			increments = increments || 1;
// 			a = a.slice();
// 			for (i = 0; i < intervals.length - 1; i++) {
// 				curr = intervals[i];
// 				next = intervals[i + 1];
// 				if (next == ">") out.push({
// 					label:"More than " + (curr - increments),
// 					count:za.removeAll(a, (curr - increments), ">").length
// 				});
// 				else if (curr == "<") out.push({
// 					label:"Less than " + next,
// 					count:za.removeAll(a, next, "<").length
// 				});
// 				else out.push({
// 					label:curr + " to " + (next - increments), // First value doesn't have an increment, every other value does
// 					count:za.removeAll(a, next, "<").length
// 				});
// 			};
// 			if (a.length > 0) logger("WARNING: " + a.length + " items could not be were not counted. Maybe they're of the wrong type or out of interval range?");
// 		} else { // Discrete data
// 			for (i = 0; i < a.length; i++) {
// 				curr = za.getObject(out, "item", a[i]); // Check if an item has already been created
// 				if (curr) curr.count++; // If it has, add one to its count
// 				else out.push({item:a[i], count:1}); // Otherwise create a new object
// 			};
// 			out = za.sortObjects(out, "count", true);
// 		};
// 		return out;
// 	}
};

// Object tools
var zObject = zo = {
	/////////////
	//  Basic  //
	/////////////
	// Return a list of keys in the object
	keys:function (obj) {
		var p, out = [];
		for (p in obj) out.push(p);
		return out;
	},
	// Use a path string to get an attribute deep inside an object
	get:function (obj, path) {
		path = path.split(".");
		for (var i = 0; i < path.length && obj; i++) obj = obj[path[i]];
		return obj;
	},
	// Remove a property from a object and return it
	remove:function (obj, propertyName) {
		var out = obj[propertyName];
		delete obj[propertyName];
		return out;
	},
	// Extend a by b
	extend:function (a, b, shallow) {return $.extend(!shallow, a, b)}, // Deep extend by default
	shyExtend:function (a, b) {
		if (typeof a != "object" || typeof b != "object") return; // If either is not an object, return
		for (p in b) { // Check each property in b
			if (a[p] == null) a[p] = zo.clone(b[p]); // If it doesn't exist in a, clone it across
			else zo.shyExtend(a[p], b[p]); // If it does, drill down
		};
		return a;
	},
	clone:function (a, b) {
		var out =
			(za.isArray(a)) ? zo.extend([], a) :
			(typeof a == "object") ? zo.extend({}, a) :
			a; // Primatives don't need cloning
		if (b) out = zo.extend(out, b); // If b is defined, cloneWith
		return out;
	},
	/////////////
	//  Tests  //
	/////////////
	isEmpty:function (obj) {return $.isEmptyObject(obj)},
	// Deep comparison of two objects
	// If ordered flag is on, the two arrays must also be in the same order to be considered equal (flag is only valid for arrays)
	equals:function (a, b, ordered) {
		if (a == b) return true; // Quick check
		var i, p, type = zt.type(a);
		if (type != zt.type(b)) return false; // Different types - instant fail
		if (type == "object") {
			for (p in a) {
				if (!zo.equals(a[p], b[p])) return false; // Check each element pair, any mismatch means fail
			};
			return true; // Every elment checks out
		};
		if (type == "array") {
			if (a.length != b.length) return false; // Different lengths - instant fail
			if (ordered) { // Ordered comparisons of arrays
				for (i = 0; i < a.length; i++) {
					if (!zo.equals(a[i], b[i], true)) return false; // Check each element pair, any mismatch means fail
				};
				return true;
			} else {
				return za.subtract(a, b).length == 0; // Reverse check not required, as a.length == b.length
			};
		};
		if (type == "function") {
			return zt.asString(a) == zt.asString(b); // Convert to string for simple comparison
		};
		return false; // Primatives or unknown type; if it's a primatives this means it failed the quick check at the start, which means it's failed
	},
	//////////////
	//  Styles  //
	//////////////
	// Convert object to CSS string
	asCSSString:function (a) {
		var p, out = "";
		for (p in a) out += p + ":" + a[p] + ";";
		return out;
	},
	// Replaces all the baseStyle properties with the actual style referred to by baseStyle - will NOT change original object
	parseStyle:function (s, topS) {
		var i, p, baseNames, out = {};
		topS = topS || s; // topS should be the original style object, containing all styles - all recursive calls of parseOrders() will have topS defined
		if (s.baseStyle) { // If a baseStyle is defined
			baseNames = s.baseStyle.split(" "); // Check for multiple baseStyles
			for (i = 0; i < baseNames.length; i++) { // For each baseStyle
				zo.extend(out, zo.get(topS, baseNames[i])); // Push all of its attributes to out
			};
			zo.extend(out, s); // Extend by additional attributes defined in s
			delete out.baseStyle; // Don't transmit the baseStyle
		} else out = s;
		for (p in out) if (out[p] && typeof out[p] == "object") out[p] = zo.parseStyle(out[p], topS); // For every element that's an object, check if it needs extending as well
		return out;
	},
	/////////////////
	//  Operators  //
	/////////////////
	round:function (a, dp) {
		var p, out = {};
		for (p in a) out[p] = zt.round(a[p], dp);
		return out;
	},
	add:function (a, b) {
		var p, out = {};
		for (p in a) out[p] = (a[p] || 0) + (b[p] || 0);
		return out;
	},
	subtract:function (a, b) {
		var p, out = {};
		for (p in a) out[p] = (a[p] || 0) - (b[p] || 0);
		return out;
	},
	// Create a new object that's decimal between a and b (VERY IMPORTANT, as it's used for .frameRedraw())
	mid:function (a, b, dec) {
		if (dec == 0 || b == null || a == b) return a;
		if (dec == 1 || a == null) return b;
		var type = zt.type(a);
		if (type != zt.type(b)) return b; // Different type - calculating mid is not possible, jump straight to b
		if (zt.isColour(a)) return zt.getColour(dec, a, b); // Catch colours
		if (type == "object") {
			var p, out = {};
			for (p in b) out[p] = zo.mid(a[p], b[p], dec);
			return out;
		};
		if (type == "array") {
			var i, out = [];
			for (i = 0; i < b.length; i++) out[i] = zo.mid(a[i], b[i], dec);
			return out;
		};
		if (type == "number") return zt.calcMid(a, b, dec);
		return b; // Unknown type - calculating mid is not possible, jump straight to b
	},
	midStack:function (a) {return zt.calcMid(a.start, a.end)}
};

// Other tools
var zTools = zt = {
	// boolean, number, string, function, array, date, error, regex, object, undefined, null
	type:function (a) {return $.type(a)},
	////////////////////
	//  Colour tools  //
	////////////////////
	isColour:function (a) {
		if (a) {
			if (a.r != null && a.g != null && a.b != null) return true; // Colour object
			if (a[0] == "#" && (a.length == 4 || a.length == 7)) return true; // Hex string
		};
		return false;
	},
	// Convert hex/name/RGB to RGB
	getRGB:function (colour) {
		var type = zt.type(colour);
		if (type == "string") return Raphael.getRGB(colour); // Hex and name
		if (type == "object" && colour.r != null && colour.g != null && colour.b != null) return colour; // RGB
		logger("zt.getRGB(): " + colour + " is not a recognised colour.");
	},
	getHex:function (colour) {
		colour = zt.getRGB(colour); // Convert to RGB
		var p, rgb, hex, out = "#";
		for (p in colour) {
			rgb = zt.forceBetween(colour[p], 0, 255);
			hex = Math.round(rgb).toString(16);
			if (hex.length < 2) hex = "0" + hex;
			out += hex;
		};
		return out;
	},
	// Get colour from sequential or divergent colour scheme
	getColour:function (dec, neutralColour, positiveColour, negativeColour) {
		if (dec == 0 || (!negativeColour && dec < 0)) return neutralColour;
		if (dec == 1) return positiveColour;
		if (dec == -1 && negativeColour) return negativeColour;
		var out = [],
			startColour = zt.getRGB(neutralColour),
			endColour = zt.getRGB((negativeColour && dec < 0) ? negativeColour : positiveColour); // endColour is negativeColour only if negativeColour exists and decimal is negative
		dec = Math.min(Math.abs(dec), 1);
		return zt.getHex({
			r:zt.calcMid(startColour.r, endColour.r, dec),
			g:zt.calcMid(startColour.g, endColour.g, dec),
			b:zt.calcMid(startColour.b, endColour.b, dec)});
	},
	// Get random colour
	getRandomColour:function (minVal, maxVal) {
		minVal = minVal || 0;
		maxVal = maxVal || 255;
		var base = maxVal - minVal;
		return zt.getHex({r:minVal + Math.random() * base, g:minVal + Math.random() * base, b:minVal + Math.random() * base});
	},
	getPalette:function (palette, size, mode) {
		palette = palette || ["#8DD3C7","#FFFFB3","#BEBADA","#FB8072","#80B1D3","#FDB462","#B3DE69","#FCCDE5","#D9D9D9","#BC80BD","#CCEBC5","#FFED6F"];
		return za.getRandom(palette, size, mode);
	},
	///////////////////
	//  Format Text  //
	///////////////////
	asString:function (a) {
		var type = zt.type(a);
		if (a == null) return null;
		if (type == "object") {
			var p, out = [];
			for (p in a) out.push(p + ":" + zt.asString(a[p]));
			return "{" + out.join(",") + "}";
		};
		if (type == "array") {
			var i, out = [];
			for (i = 0; i < a.length; i++) out.push(zt.asString(a[i]));
			return "[" + out.join(",") + "]";
		};
		if (type == "string") return '"' + a + '"';
		return a + "";
	},
	camelCase:function (a) {
		var i, out = "" + a[0];
		for (i = 1; i < a.length; i++) {
			out += a[i].substr(0,1).toUpperCase() + a[i].substr(1);
		};
		return out;
	},
	titleCase:function (a) {
		a = (za.isArray(a)) ? a : a.split(" ");
		var i, out = "";
		for (i = 0; i < a.length; i++) {
			out += a[i].substr(0,1).toUpperCase() + a[i].substr(1);
			if (i + 1 < a.length) out += " ";
		};
		return out;
	},
	// Crop text
	shorten:function (s, l) {
		if (s == null) return "";
		if (s.length <= l) return s;
		return s.substr(0, l) + "..";
	},
	// Wrap text
	wrap:function (s, l) {
		if (s == null || typeof s != "string") return s;
		var i, j, out = "", line = "", a = s.split(" "), b;
		for (i = 0; i < a.length; i++) {
			b = a[i].split("\n"); // Check for manual linebreaks
			for (j = 0; j < b.length; j++) {
				if (line == "") {
					line = b[j]; // Line is empty, so add word
				} else if (line.length + b[j].length < l) {
					line += " " + b[j]; // Line can accept one more word
				} else { // Line will overflow if it takes one more word
					out += line + "\n"; // Break current line
					line = b[j]; // Take current word and start a new one
				};
				if (j < b.length - 1) { // Add manual linebreak
					out += (line || " ") + "\n"; // The line needs to have at least one character, or linebreak gets ignored by Javascript
					line = ""; // Reset line
				};
			};
		};
		return out + line; // Don't forget the leftover line!
	},
	//////////////////////
	//  Format numbers  //
	//////////////////////
	/*
		dp: Limits decimal places.
		prefix: Adds this before the value.
		suffix: Adds this after the value.
		forceSign: Forces a +/- sign before the number.
		noSign: Never place a +/- sign before the number (Use case: "The value went down by 30%").
		wordSign: Replaces +/- with "up"/"down".
		noCommas: Do not put in commas.

		o.m or o.modes (modes are mutually exclusive):
			time: 1:32
			hours: 1hr 32min
			hoursLong: 1 hour 32 minutes
			%: 92%
			th: 92nd
			abbreviate: 1.2M
	*/
	format:function (a, o) {
		// Format every element in an array
		if (za.isArray(a)) {
			var i, out = [];
			for (i = 0; i < a.length; i++) out.push(zt.format(a[i], o));
			return out;
		};
		// Functions
		var addCommas = function (num) {
				var i, out = num.split(".");
				for (i = out[0].length - 3; i > 0; i -= 3) {
					out[0] = out[0].slice(0, i) + "," + out[0].slice(i);
				};
				if (out[1]) for (i = 3; i < out[1].length; i += 4) {
					out[1] = out[1].slice(0, i) + "," + out[1].slice(i);
				};
				return out.join(".");
			},
			asTime = function (a) {
				if (isNaN(a)) a = 0;
				return [Math.floor(a / 60), Math.round(a % 60)];
			};
		// Parse o
		o = o || {};
		if (typeof o == "string") o = {mode:o};
		if (o.m) o.mode = o.m;
		// Parse a
		var prefix, suffix = "",
			num = Math.abs(a * (o.multiply || 1));
		// Add +/- prefix
		if (o.noSign) prefix = "";
		else if (o.wordSign) prefix = (a > 0) ? "up " : (a < 0) ? "down " : "";
		else if (o.forceSign) prefix = (a > 0) ? "+" : (a < 0) ? "-" : "";
		else prefix = (a >= 0 || o.noSign) ? "" : "-";
		// Add predefined prefix
		if (o.prefix) prefix += o.prefix;

		// 92 --> 1:32
		if (o.mode == "time") {
			var time = asTime(num);
			if (time[1] < 10) time[1] = "0" + time[1];
			return prefix + time.join(":");
		// 92--> 1hr 32min
		} else if (o.mode == "hours") {
			var time = asTime(num);
			if (time[0]) time[0] += "hr";
			if (time[1]) time[1] += "min";
			return prefix + time.join(" ");
		// 92 --> 1 hour 32 minutes
		} else if (o.mode == "hoursLong") {
			var time = asTime(num);
			if (time[0]) time[0] += (time[0] == 1) ? " hour" : " hours";
			if (time[1]) time[1] += (time[1] == 1) ? " minute" : " minutes";
			return prefix + time.join(" ");
		// 0.25 --> 25% (assumes decimals by default)
		} else if (o.mode == "%") {
			suffix = "%";
			num *= 100;
		// 23 --> 23rd
		} else if (o.mode == "th") {
			num = Math.round(num); // Round numbers only
			var lastChar = za.last(num),
				secondLastChar = num[num.length - 2];
			suffix = (
				(secondLastChar == 1) ? "th" :
				(lastChar == 1) ? "st" :
				(lastChar == 2) ? "nd" :
				(lastChar == 3) ? "rd" :
				"th");
		// 9,399,192 --> 9.4M
		} else if (o.mode == "abbreviate" && !zt.isBetween(a, -1000, 1000)) {
			var units = ["", "k", "M", "B", "T"],
				magnitude = Math.floor(zt.magnitude(num) / 3) * 3;
			num = num / Math.pow(10, magnitude); // Reduce number by magnitude
			suffix = units[magnitude / 3];
		};
		// Complete and return
		num = zt.round(num, (o.dp == null) ? 10 : o.dp); // By default round to 10 places, which should fix the float/int errors
		if (!o.noCommas) num = addCommas(num + ""); // Add commas unless directed to otherwise
		return prefix + num + suffix + (o.suffix || "");
	},
	round:function (val, dp, mode) {
		var roundMethod = (mode == "ceil") ? Math.ceil : (mode == "floor") ? Math.floor : Math.round;
		if (!dp) return roundMethod(val);
		var base = Math.pow(10, Math.abs(dp)); // Force base to be > 1, so that it's an integer and not a float, so IE can't fuck it up
		return (dp >= 0) ? roundMethod(val * base) / base : roundMethod(val / base) * base;
	},
	// e.g. Round to nearest 2, 5 or 10
	roundToNearest:function (val, toNearest, mode) {
		var roundMethod = (mode == "ceil") ? Math.ceil : (mode == "floor") ? Math.floor : Math.round;
		return roundMethod(val / toNearest) * toNearest;
	},
	// Round by significant figures
	roundToSF:function (val, sf) {
		return zt.round(val, -zt.magnitude(val) - 1 + sf);
	},
	///////////////////
	//  Maths tools  //
	///////////////////
	// Check if a val is between a and b
	isBetween:function (val, a, b, exclusive) {
		var min = Math.min(a, b),
			max = Math.max(a, b);
		return (exclusive) ?
			(val > min && val < max) :
			(val >= min && val <= max);
	},
	// Force a val to be between min and max
	forceBetween:function (val, min, max) {return Math.max(min, Math.min(max, val))},
	// Return a decimal representing the position of val relative to a and b
	calcDec:function (val, a, b) {
		if (a == b) return 0;
		return (val - a) / (b - a);
	},
	// Return a value part way between a and b
	calcMid:function (a, b, dec) {
		if (dec == null) dec = 0.5;
		return a + (b - a) * dec;
	},
	// Scale a number so that it's distance betweeen newStart and newEnd is the same as its distance between oldStart and oldEnd (i.e. scale(1, 0, 10, 100, 200) would return 110)
	scale:function (val, oldStart, oldEnd, newStart, newEnd) {
		var dec = zt.calcDec(val, oldStart, oldEnd); // Calculate val's distance between oldStart and oldEnd
		return zt.calcMid(newStart, newEnd, dec); // Map decimal onto newStart and newEnd
	},
	// == n!
	factorial:function (val) {
		for (var out = 1, i = val; i > 0; i--) out *= i;
		return out;
	},
	// Order of magnitude (counts spaces to/from decimal place)
	magnitude:function (val) {
		if (!val) return 0; // Zeros and nulls return 0
		val = Math.abs(val); // Ignore negatives
		if (val >= 1) return (Math.round(val) + "").length - 1; // If >1, round to whole number, convert to string and count length
		else return -za.find((val + "").split(".")[1], 0, "!=") - 1; // If <1, convert to string, get part after decimal point and find the first non-zero digit
	},
	// Gets the next highest factor of 10 (used for getting labels on quantitative axes)
	getFactorOfTen:function (val) {
		if (!val || isNaN(val)) return 0;
		var neg = (val < 0) ? -1 : 1,
			base = Math.pow(10, zt.magnitude(val)), // (val / base) will always be between 1 and 10
			out = Math.ceil(Math.abs(val) / base);
		while (10 % out != 0) out++; // Find the next biggest factor of 10 (e.g. 1, 2, 5, 10)
		return neg * out * base; // Readjust back to the correct base and return
	},
	//////////////////////////
	//  Window/paper tools  //
	//////////////////////////
	// Create paper according to layout
	makePaper:function (layout) {
		var paper = Raphael("Raphael");
		//if ($.browser.msie && parseInt($.browser.version) < 9) PAPER.noAnimation = true; // Disable animation for <IE9
		return zt.setPaperSize(layout, paper);
	},
	// Resize paper to fit layout
	setPaperSize:function (layout, paper) {
		paper = paper || PAPER;
		layout = layout || zt.getMaxLayout();
		paper.setSize(layout.width, layout.height);
		paper.fixedOffset = $(paper.canvas).offset();
		return paper;
	},
	// Maximum allowable size for the window, within constraints
	getMaxLayout:function (minWidth, minHeight, margin) {
		return new zLayout({ // Layout for the whole canvas
			width:Math.max(minWidth, $(window).width() - $("#Raphael").offset().left - 6), // Fit to screen, with minimum size
			height:Math.max(minHeight, $(window).height() - $("#Raphael").offset().top - 12), // Fit to screen, with minimum size
			margin:margin
		});
	},
	getEventPosition:function (e) {
		var offset = PAPER.fixedOffset || PAPER.offset || $(PAPER.canvas).offset();
		return {x:e.pageX - offset.left, y:e.pageY - offset.top};
	},
	getDocumentPosition:function (point) {
		var offset = PAPER.fixedOffset || PAPER.offset || $(PAPER.canvas).offset();
		return {x:Math.round(point.x + offset.left), y:Math.round(point.y + offset.top)};
	}
};