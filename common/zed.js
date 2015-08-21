// Zed Data Visualisation Toolkit. Keith Ng, 2014-01-20.
// Depends on jQuery

var DEBUG_MODE = false

// Stick in a placeholder for stupid goddamn browsers which don't support console
window.console = window.console || {
	log:function () {}
}

var startTime = $.now(),
	JSONerror = function (a, b, c) {
		if (a.status == 404) logger("JSONerror(): JSON file not found.")
		else logger("JSONerror(): Cannot parse JSON file. Error type '" + b + "'.")
	},
	logger = function (text) {
		if (window['console'] !== undefined) {
			window.console.log($.now() - startTime + ": " + text)
		}
	},
	error = function (text) {
		if (DEBUG_MODE) throw text
		else logger(text)
	},
	logobj = function (obj) {
		if (window['console'] !== undefined) {
			window.console.log($.now() - startTime + ": " + zt.asString(obj))
		}
	},
	zDebug = {
		startTime:function () {
			this._currTime = $.now()
			console.log("---------------")
		},
		time:function (id) {
			var sinceLast = $.now() - this._currTime
			this._currTime = $.now()
			console.log(id + ":", sinceLast)
		},
		checkIE:function () {
			if (navigator.appName == 'Microsoft Internet Explorer') {
				var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})")
				if (re.exec(navigator.userAgent) != null) {
					return parseFloat(RegExp.$1)
				}
			}
			return -1
		},
		what:function (a, b, c, d, e) {
			console.log("scope:", this)
			console.log("arguments:", a, b, c, d, e)
		},
		hi:function () {
			console.log("Hi there!")
		},
		show:function (a, colour, t) {
			colour = colour || "red"
			var marker
			// Box
			if (a.left != null && a.right != null && a.top != null && a.bottom != null) {
				marker = new zShape({points:zp.boxToPoints(a), stroke:colour, "stroke-width":1, fill:"none"})
			// Line
			} else if (za.isArray(a) && a[0].x != null && a[0].y != null) {
				marker = new zLine({points:a, stroke:colour, "stroke-width":0.5})
			// Point
			} else if (a.x != null && a.y != null) {
				marker = new zCircle({centre:a, radius:3, fill:colour})
			}
			marker.remove(t || 5000)
		},
		mapShow:function (a, utmWindow, layout, colour) {
			zDebug.show(zt.mapPoints(a, utmWindow, layout), colour)
		},
		name:function (dc, s) {
			var i, out = []
			for (i = 0; i < s.length; i++) out[i] = dc.getName({d:i, s:s})
			return out
		},
		button:function (action, point) {
			var button = new zCircle({
				centre:point || {x:20,y:20},
				radius:10,
				stroke:"#666",
				fill:"#888",
				opacity:0.3
			})
			button.click(action)
		}
	}

var zPlot = zp = {
	///////////////////
	//  Point tools  //
	///////////////////
	isPoint:function (a) {
		return a.x != null && a.y != null
	},
	// Turns a point into a string, but round it first (dp defaults to 0)
	pointToString:function (point, dp) {
		return d3.round(point.x, dp) + "," + d3.round(point.y, dp)
	},
	// Get the boundary points on an arc (run pointsToBox to get a box, or concat a series of arcs and run pointsToBox on all of them)
	arcToPoints:function (centre, innerRadius, outerRadius, degStart, degEnd) {
		while (degStart < 0) degStart += 360, degEnd += 360
		var i, points = [],
			addPoints = function (deg) {
				if (innerRadius) points.push(zp.addVector(deg, innerRadius, centre))
				points.push(zp.addVector(deg, outerRadius, centre))
			}
		if (!innerRadius) points.push(centre)
		addPoints(degStart) // Check start point
		for (i = 90; i <= 360; i += 90) { // Check edge points (top, bottom, left, right)
			if (zt.isBetween(i, degStart, degEnd)) addPoints(i)
		}
		addPoints(degEnd) // Check end point
		return points
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
	sin:function (deg) {return Math.sin(zp.degToRad(deg))},
	cos:function (deg) {return Math.cos(zp.degToRad(deg))},
	tan:function (deg) {return Math.tan(zp.degToRad(deg))},
	asin:function (a) {return zp.radToDeg(Math.asin(a))},
	acos:function (a) {return zp.radToDeg(Math.acos(a))},
	atan:function (a) {return zp.radToDeg(Math.atan(a))},
	// Normalise deg until it is <180 away from targDeg (use for spinning things in the right direction)
	matchDeg:function (deg, targDeg) {
		if (targDeg == null) targDeg = 180
		while (deg >= targDeg + 180) deg -= 360
		while (deg < targDeg - 180) deg += 360
		return deg
	},
	// Calculates the normalised difference between two deg (i.e. It can tell that 0 and 360 degrees are the same point)
	degDiff:function (a, b) {return d3.round(Math.abs(zp.matchDeg(a) - zp.matchDeg(b)), 10)},
	////////////////////
	//  Vector tools  //
	////////////////////
	// Return distance between a and b
	dist:function (a, b) {
		var xDist = b.x - a.x, yDist = b.y - a.y
		if (xDist == 0 && yDist == 0) return 0
		return Math.sqrt(xDist * xDist + yDist * yDist)
	},
	// Return closest distance between a and a line consisting of two points (use for measuring proximity of cursor to non-cardinal lines)
	distToLine:function (targ, line) {
		var s, area,
			dist = [
				zp.dist(line[0], targ), // Start to targ
				zp.dist(line[1], targ), // End to targ
				zp.dist(line[0], line[1]) // Start to end (base of triangle)
			],
			deg = [
				zp.matchDeg(zp.deg(line[0], line[1]) - zp.deg(line[0], targ)), // Start
				zp.matchDeg(zp.deg(line[1], line[0]) - zp.deg(line[1], targ)) // End
			]
		if (zt.isBetween(deg[0], 90, 270)) return dist[0] // Shortest point is to start
		else if (zt.isBetween(deg[1], 90, 270)) return dist[1] // Shortest point is to end
		else { // Shortest point lies between two end points
			s = za.sum(dist) / 2 // Semiperimeter
			area = Math.sqrt(s * (s - dist[0]) * (s - dist[1]) * (s - dist[2])) // http://en.wikipedia.org/wiki/Heron's_formula
			return 2 * area / dist[2] // Height of triangle
		}
	},
	// Returns angle from a to b (in degrees)
	deg:function (a, b) {
		var xDist = b.x - a.x, yDist = b.y - a.y
		if (xDist == 0 && yDist == 0) return 0
		return zp.radToDeg(Math.atan2(yDist, xDist))
	},
	// Returns vector from a to b
	vector:function (a, b) {
		var xDist = b.x - a.x, yDist = b.y - a.y
		if (xDist == 0 && yDist == 0) return {x:0, y:0, deg:0, dist:0}
		return {
			x:xDist, y:yDist,
			deg:zp.radToDeg(Math.atan2(yDist, xDist)),
			dist:Math.sqrt(xDist * xDist + yDist * yDist)
		}
	},
	// Returns point + vector
	addVector:function (deg, dist, anchor) {
		if (deg == -90) return {x:anchor.x, y:anchor.y - dist} // Straight up - special case because a lot will start from -90
		if (dist == 0) return anchor // If distance is zero, don't bother calculating radians, etc.
		var rad = zp.degToRad(deg)
		return {
			x:anchor.x + Math.cos(rad) * dist,
			y:anchor.y + Math.sin(rad) * dist
		}
	},
	/////////////////
	//  Alignment  //
	/////////////////
	alignmentToDec:function (alignment) {
		switch (alignment) {
			case "right": case "bottom": return 1
			case "xCentre": case "yCentre": return 0.5
			case "left": case "top": return 0
			default: return logger("zTools.alignmentToDec(): " + alignment + " doesn't look like an alignment.") // Includes left and top
		}
	},
	inverseAlignment:function (alignment) {
		switch (alignment) {
			case "xCentre": return "xCentre"
			case "left": return "right"
			case "right": return "left"
			case "yCentre": return "yCentre"
			case "top": return "bottom"
			case "bottom": return "top"
		}
	},
	/////////////////
	//  Box tools  //
	/////////////////
	// Expects either {left,right,top,bottom} or {x,y,width,height} input
	completeBox:function (a) {
		if (a instanceof zLayout) return a // A zLayout object will have all this already
		a = zo.clone(a)
		if (a.anchor) a.x = a.anchor.x, a.y = a.anchor.y
		else a.anchor = {x:a.x, y:a.y}
		if (a.xAlign) a[a.xAlign] = a.x
		if (a.yAlign) a[a.yAlign] = a.y
		a.left =
			(a.left != null) ? a.left :
			(a.right != null && a.width != null) ? a.right - a.width :
			(a.xCentre != null && a.width != null) ? a.xCentre - a.width / 2 :
			a.x || 0
		a.top =
			(a.top != null) ? a.top :
			(a.bottom != null && a.height != null) ? a.bottom - a.height :
			(a.yCentre != null && a.height != null) ? a.yCentre - a.height / 2 :
			a.y || 0
		a.width =
			(a.width != null) ? a.width :
			(a.right != null) ? a.right - a.left : 0
		a.height =
			(a.height != null) ? a.height :
			(a.bottom != null) ? a.bottom - a.top : 0
		a.right = (a.right != null) ? a.right : a.left + a.width
		a.bottom = (a.bottom != null) ? a.bottom : a.top + a.height
		a.xCentre = (a.xCentre != null) ? a.xCentre : zt.calcMid(a.left, a.right)
		a.yCentre = (a.yCentre != null) ? a.yCentre : zt.calcMid(a.top, a.bottom)
		a.centre = {x:a.xCentre, y:a.yCentre}
		return a
	},
	// Get bounding box from an array of points
	pointsToBox:function (a) {
		var x = za.calcObjects(a, "x", "sort"), y = za.calcObjects(a, "y", "sort")
		return {
			left:x[0], right:za.last(x),
			top:y[0], bottom:za.last(y)
		}
	},
	// Get points from bounding box
	boxToPoints:function (a) {
		return [
			{x:a.left, y:a.top}, {x:a.right, y:a.top},
			{x:a.right, y:a.bottom}, {x:a.left, y:a.bottom}
		]
	},
	// Get basic rectangle (includes alignment, but no rotate or other complex transformations) ("clip-rect" uses this)
	boxToArray:function (a) {
		return [a.left, a.top, a.right - a.left, a.bottom - a.top]
	},
// 	boxToSVG:function (a) {
// 		return zp.shape(zp.boxToPoints(a))
// 	},
	////////////////////////
	//  SVG Constructors  //
	////////////////////////
	start:function (startPoint) {
		return "M" + zp.pointToString(startPoint || {x:0, y:0})
	},
	lineTo:function (toPoint) {
		return "L" + zp.pointToString(toPoint)
	},
	quadraticCurveTo:function (controlPoint, toPoint) {
		return "Q" + zp.pointToString(controlPoint) + "," + zp.pointToString(toPoint)
	},
	arcTo:function (radius, toPoint) {
		return "A" + radius + "," + radius + ",0,0,1," + zp.pointToString(toPoint)
	},
	reverseArcTo:function (radius, toPoint) {
		return "A" + radius + "," + radius + ",0,0,0," + zp.pointToString(toPoint)
	},
	close:function (svg) {
		return "Z"
	},
	line:function (points) {
		var svg = zp.start(points[0])
		for (var i = 1; i < points.length; i++) svg += zp.lineTo(points[i])
		return svg
	},
	shape:function (points) {
		return zp.line(points) + "Z"
	},
	arc:function (arc) {
		var i, svg, arcDeg, arcPoint,
			deg = arc.degEnd - arc.degStart,
			segments = arc.minSeg || Math.ceil(deg / 90), // Each segment requires an anchor point, and the rounding of that point throws the arc off a little bit; the fewer the segments, the bigger the arcs, which amplifies the rounding errors; fewer segments make for smoother arcs, but they will wobble on animation
			segmentDeg = deg / segments
		if (arc.innerRadius) {
			arc.innerRadius = d3.round(arc.innerRadius, 2)
			svg = zp.start(zp.addVector(arc.degStart, arc.innerRadius, arc.centre)) // Draw innerCircle
			for (i = 1; i <= segments; i++) { // Split into segments (Minimum 90 degrees per part, as arcTo can't handle large circles)
				arcDeg = arc.degStart + i * segmentDeg // Deg for the end of the segment
				arcPoint = zp.addVector(arcDeg, arc.innerRadius, arc.centre) // Point for the end of the segment
				svg += zp.arcTo(arc.innerRadius, arcPoint) // Arc for the segment
			}
		} else svg = zp.start(arc.centre) // Or just a start point, if innerCircle has a radius of 0
		if (arc.outerRadius > arc.innerRadius) {
			arc.outerRadius = d3.round(arc.outerRadius, 2)
			svg += zp.lineTo(zp.addVector(arc.degEnd, arc.outerRadius, arc.centre)) // Draw outerCircle backwards
			for (i = segments - 1; i >= 0; i--) { // Split into segments (Minimum 90 degrees per part, as arcTo can't handle large circles)
				arcDeg = arc.degStart + i * segmentDeg // Deg for the end of the segment
				arcPoint = zp.addVector(arcDeg, arc.outerRadius, arc.centre) // Point for the end of the segment
				svg += zp.reverseArcTo(arc.outerRadius, arcPoint) // Arc for the segment
			}
		}
		return svg + "Z"
	},
	circle:function (centre, radius) {
		radius = d3.round(radius, 2)
		var i,
			startDeg = -135, // Equivalent to top-left corner, so it can transition into a rect if required
			points = 4, // Split into 4 parts (i.e. Minimum 90 degrees per part, as arcTo can't handle large circles)
			step = 360 / points,
			svg = zp.start(zp.addVector(startDeg, radius, centre))
		if (radius) for (i = 1; i <= points; i++) {
			svg += zp.arcTo(radius, zp.addVector(startDeg + i * step, radius, centre))
		}
		return svg
	},
	// Quadratic curves one way, through the midpoint, then quadratic curves the other way, to the endpoint
	sCurveTo:function (p, smooth, horizontal) {
		smooth = smooth || 4
		var v = zp.vector(p[0], p[1]),
		d = v.dist / zp.cos(90 - v.deg) / smooth, // Secret sauce (it just works, mmmkay?)
		cp = [ // Control points
		zo.add(p[0], (horizontal) ? {x:d} : {y:d}),
		zo.add(p[1], (horizontal) ? {x:-d} : {y:-d})
		]
		return (
			zp.quadraticCurveTo(cp[0], zo.mid(p[0], p[1])) +
			zp.quadraticCurveTo(cp[1], p[1]))
	},
	flag:function (l, handleWidth, handleHeight) {
		if (l.yAlign != "xCentre") return zp.vflag(l, handleWidth, handleHeight)
		return zp.completeBox(l)
	},
	// Vertical flag
	vflag:function (l, handleWidth, handleHeight) {
		l = new zLayout(l)
		var xOffset = handleWidth / l.width,
			yOffset = handleHeight / l.height
		return [
			l.getPoint(0, yOffset),
			l.getPoint(0, 1 + yOffset),
			l.getPoint(1, 1 + yOffset),
			l.getPoint(1, yOffset)
		].concat((l.xAlign == "xCentre") ? [
			l.getPoint(0.5 + xOffset, yOffset),
			l.getPoint(0.5, 0),
			l.getPoint(0.5 - xOffset, yOffset)
		] : [
			l.getPoint(xOffset, yOffset),
			l.getPoint(0, 0)
		])
	}
}

// Array tools (a is always the target array)
var zArray = za = {
	/////////////
	//  Basic  //
	/////////////
	forEach:function (a, f, i) {
		i = i || 0
		if (f(a[i], i)) return // Quit if the function returns true
		i++
		if (i < a.length) za.forEach(a, f, i)
	},
	asArray:function (a) {return (za.isArray(a)) ? a : [a]},
	// When orders are created as arrays, they don't get processed properly by animate, so turn them into a real object first
	asObject:function (a) {
		if (za.isArray(a)) {
			var i, out = {}
			for (i = 0; i < a.length; i++) out[i] = a[i]
			return out
		} else return a
	},
	isEmpty:function (a) {return a == null || a.length == 0},
	isArray:function (a) {return $.isArray(a)},
	// Create a filled array
	fill:function (val, length, increment) {
		var i, out = []
		if (increment) for (i = 0; i < length; i++) out[i] = val + i * increment
		else for (i = 0; i < length; i++) out[i] = zo.clone(val) // Use clone so that if val is an object, it would get cloned properly
		return out
	},
	// Fill between a range
	fillRange:function (range) {
		return za.fill(
			range[0], // Sart
			Math.abs(range[0] - range[1]) + 1, // Length
			(range[0] < range[1]) ? 1 : (range[0] > range[1]) ? -1 : 0 // Increment
		)
	},
	last:function (a) {return a[a.length - 1]},
	// Insert b (array or element) in a at pos
	insertAt:function (a, val, pos) {
		return a.slice(0, pos).concat(za.asArray(val), a.slice(pos + 1))
	},
	// Remove element a at pos
	removeAt:function (a, pos) {
		if (pos == null) return null
		return a.splice(pos, 1)[0]
	},
	// Push only if it doesn't already exist
	shyPush:function (a, val) {
		return (za.contains(a, val)) ? a : a.push(val)
	},
	// Concat only elements that don't already exist
	shyConcat:function (a, b) {
		for (var i = 0; i < b.length; i++) za.shyPush(a, b[i])
		return a
	},
 	// Insert only if it doesn't already exist
	shyInsert:function (a, val, pos) {
		return (za.contains(a, val)) ? a : za.insertAt(a, val, pos)
	},
	///////////////
	//  Reorder  //
	///////////////
	// Turn a simple array into objects with an index so it can remember its original position, then sort them
	index:function (a) {
		var i, out = []
		for (i = 0; i < a.length; i++) out[i] = {id:i, val:a[i]}
		return out
	},
	// FIXME: Is this some kind of dumbass dumb sort? Defaults to ascending sort
	sort:function (a, reverseOrder) {
		a.sort(function (a, b) {return (a > b) ? 1 : (b > a) ? -1 : 0})
		return (reverseOrder) ? a.reverse() : a
	},
	// Creates a new array from another array using a map (e.g. If ref = [a,b,c,d,e] and a = [0,2,2] -> out = [a,c,c])
	map:function (ref, a) {
		if (typeof a == "number") return ref[a]
		else if (za.isArray(a)) {
			var i, out = []
			for (i = 0; i < a.length; i++) out[i] = ref[a[i]]
			return out
		} else return ref
	},
	// Creates an array of indicies from another array using a map (e.g. If ref = [a,b,c,d,e] and a = [a,c,c] -> out = [0,2,2])
	unmap:function (ref, a) {
		if (typeof a == "number") return za.find(ref, a)
		else if (za.isArray(a)) {
			var i, out = []
			for (i = 0; i < a.length; i++) out[i] = za.find(ref, a[i])
			return out
		} else return ref
	},
	///////////////////////
	//  Find/get/remove  //
	///////////////////////
	_compareTests:{
		"==":function (x, val) {return x == val},
		"===":function (x, val) {return x === val},
		"<":function (x, val) {return x < val},
		"<=":function (x, val) {return x <= val},
		">":function (x, val) {return x > val},
		">=":function (x, val) {return x >= val},
		"><":function (x, v1, v2) {return x > v1 && x < v2}, // In range
		">=<":function (x, v1, v2) {return x >= v1 && x <= v2},
		"<>":function (x, v1, v2) {return x < v1 || x > v2}, // Outside range
		"<=>":function (x, v1, v2) {return x <= v1 || x >= v2},
		"!=":function (x, val) {return x != val},
		"type":function (x, val) {return zt.type(x) == val},
		"atPos":function (x, val, pos) {return x[pos] == val},
		"equals":function (x, val, ordered) {return zo.equals(x, val, ordered)},  // v2 used as "ordered"
		"superset":function (x, val, ordered) {return za.isSuperset(x, val, ordered)}, // v2 used as "ordered"
		"subset":function (x, val, ordered) {return za.isSubset(x, val, ordered)}, // v2 used as "ordered"
		"intersects":function (x, val) {return za.intersects(x, val)},
		"match":function (x, val) {return za.contains(val, x)}, // x has one of the values specified in val (val should be an array)
		"notMatch":function (x, val) {return !za.contains(val, x)}, // x has none of the values specified in val
		"max":"special",
		"min":"special",
		"closest":"special"
	},
	// This powers all the find/get/remove functions (running it through this function is faster than a direct za._compareTests[mode] call - I don't know why)
	compareTests:function (mode) {
		return za._compareTests[mode]
	},
	// Returns positions of matching elements
	find:function (a, v1, mode, v2) {
		mode = mode || "=="
		var i, test = za.compareTests(mode)
		if (!a) throw "zArray.find(): Trying to run find, but array is empty."
		if (typeof test == "function") {
			for (i = 0; i < a.length; i++) {
				if (test(a[i], v1, v2)) return i // Return the first positive match
			}
		}
		if (test == "special") return za.find(a, za[mode](a, v1, v2))
		return null // Not found
	},
	findLast:function (a, v1, mode, v2) {
		mode = mode || "=="
		var i, test = za.compareTests(mode)
		if (typeof test == "function") {
			for (i = a.length - 1; i >= 0; i--) {
				if (test(a[i], v1, v2)) return i // Return the last positive match
			}
		}
		if (test == "special") return za.findLast(a, za[mode](a, v1, v2))
		return null // Not found
	},
	findAll:function (a, v1, mode, v2) {
		mode = mode || "=="
		var i, out = [], test = za.compareTests(mode)
		if (typeof test == "function") {
			for (i = 0; i < a.length; i++) {
				if (test(a[i], v1, v2)) out.push(i)
			}
			return out
		}
		if (test == "special") return za.findAll(a, za[mode](a, v1, v2))
		return null // Not found
	},
	// Returns matching element from array
	get:function (a, v1, mode, v2) {
		var pos = za.find(a, v1, mode, v2)
		return (pos == null) ? null : a[pos]
	},
	getLast:function (a, v1, mode, v2) {
		var pos = za.findLast(a, v1, mode, v2)
		return (pos == null) ? null : a[pos]
	},
	getAll:function (a, v1, mode, v2) {
		var pos = za.findAll(a, v1, mode, v2)
		return za.map(a, pos)
	},
	// Removes matching element from the array and returns it
	remove:function (a, v1, mode, v2) {
		var pos = za.find(a, v1, mode, v2)
		return za.removeAt(a, pos)
	},
	removeLast:function (a, v1, mode, v2) {
		var pos = za.findLast(a, v1, mode, v2)
		return za.removeAt(a, pos)
	},
	removeAll:function (a, v1, mode, v2) {
		var i, out = [],
			pos = za.sort(za.findAll(a, v1, mode, v2), true) // Map is reverse sorted
		for (i = 0; i < pos.length; i++) out.push(za.removeAt(a, pos[i]))
		return out
	},
	// Replace matching element in a with val
	replace:function (a, val, v1, mode, v2) {
		var pos = za.find(a, v1, mode, v2)
		a[pos] = val
		return pos
	},
	replaceLast:function (a, val, v1, mode, v2) {
		var pos = za.findLast(a, v1, mode, v2)
		a[pos] = val
		return pos
	},
	replaceAll:function (a, val, v1, mode, v2) {
		var i, pos = za.findAll(a, v1, mode, v2)
		for (i = 0; i < pos.length; i++) a[pos[i]] = val
		return pos
	},
	// Whether matching elements exist in a
	contains:function (a, v1, mode, v2) {
		return za.find(a, v1, mode, v2) != null
	},
	/////////////////////
	//  Object arrays  //
	/////////////////////
	// Turn an object array into a simple array so it can be operated on
	extract:function (a, type) {
		for (var out = [], i = 0; i < a.length; i++) out[i] = a[i][type]
		return out
	},
	// Defaults to ascending sort
	sortObjects:function (a, type, reverseOrder) {
		var out = a.slice()
		out.sort(function (a, b) {return (a[type] > b[type]) ? 1 : (b[type] > a[type]) ? -1 : 0})
		return (reverseOrder) ? out.reverse() : out
	},
	calcObjects:function (a, type, mode, v1) {
		var out = za.extract(a, type)
		if (!mode) return out // If no mode defined, just return a simple array of raw numbers
		if (za[mode]) return za[mode](out, v1) // Use za.sum(), etc.
	},
	// Look for object[type] == val
	findObject:function (a, type, v1, mode, v2) {
		return za.find(za.extract(a, type), v1, mode, v2)
	},
	findLastObject:function (a, type, v1, mode, v2) {
		return za.findLast(za.extract(a, type), v1, mode, v2)
	},
	findAllObjects:function (a, type, v1, mode, v2) {
		return za.findAll(za.extract(a, type), v1, mode, v2)
	},
	getObject:function (a, type, v1, mode, v2) {
		var pos = za.findObject(a, type, v1, mode, v2)
		return (pos == null) ? null : a[pos]
	},
	getLastObject:function (a, type, v1, mode, v2) {
		var pos = za.findLastObject(a, type, v1, mode, v2)
		return (pos == null) ? null : a[pos]
	},
	getAllObjects:function (a, type, v1, mode, v2) {
		var pos = za.findAllObjects(a, type, v1, mode, v2)
		return za.map(a, pos)
	},
	removeObject:function (a, type, v1, mode, v2) {
		var pos = za.findObject(a, type, v1, mode, v2)
		return za.removeAt(a, pos)
	},
	removeLastObject:function (a, type, v1, mode, v2) {
		var pos = za.findLastObject(a, type, v1, mode, v2)
		return za.removeAt(a, pos)
	},
	removeAllObjects:function (a, type, v1, mode, v2) {
		var i, out = [], pos = za.sort(za.findAllObjects(a, type, v1, mode, v2), true)
		for (i = 0; i < pos.length; i++) za.add(out, za.removeAt(a, pos[i]))
		return out
	},
	//////////////////////
	//  Set Operations  //
	//////////////////////
	// Returns a plus b (concat)
	add:function (a, b) {
		return $.merge(a, b)
	},
	// Return a minus b (all the members of a that are not in b)
	subtract:function (a, b, ordered) {
		a = za.asArray(a), b = za.asArray(b)
		var i, out = a.slice()
		for (i = 0; i < b.length; i++) za.remove(out, b[i], "equals", ordered) // Remove each element of b from a (NOTE: It's one-to-one, so if it exists twice in a, but once in b, only one will be removed)
		return out
	},
	// Create an array that's a combination of every element in a and every element in b
	multiply:function (a, b) {
		var out = []
		for (i = 0; i < a.length; i++) for (j = 0; j < b.length; j++) { // For every pairing
			if (a[i] instanceof Array) {
				if (b[i] instanceof Array) {
					out.push(a[i].concat(b[j])) // Element in a & b are both arrays
				} else {
					out.push(a[i].concat([b[j]])) // Element in a is an array, element in b is not
				}
			} else {
				out.push([a[i], b[j]]) // Element in a is not, assume that element in b isn't either
			}
		}
		return out
	},
	// Get elements in either
	union:function (a, b) {
		return za.getUniques(a.concat(b))
	},
	// Get elements in both
	intersection:function (a, b) {
		return za.getAll(a, b, "match")
	},
	// Whether a is a subset/superset of b
	isSubset:function (a, b, strict) {
		if (b.length - a.length < strict) return false // If strict, identical groups are NOT considered subsets
		return za.subtract(a, b).length == 0
	},
	isSuperset:function (a, b, strict) {return za.isSubset(b, a, strict)},
	intersects:function (a, b) {return za.intersection(a, b) != null},
	////////////////////
	//  Calculations  //
	////////////////////
	// Meta function for accessing calculation functions
	calc:function (mode, a, v1, v2, v3) {
		if (za[mode]) return za[mode](a, v1, v2, v3) // Use za.sum(), etc.
		logger("zArray.calc(): I don't know how to calculate " + mode + ".")
	},
	// Simple (returns single number)
	sum:function (a) {
		a = za.getNumbers(a)
		var i, out = 0
		for (i = 0; i < a.length; i++) out += a[i]
		return out
	},
	max:function (a) {return Math.max.apply({}, za.getNumbers(a))},
	min:function (a) {return Math.min.apply({}, za.getNumbers(a))},
	range:function (a) {return [za.min(a), za.max(a)]},
	diff:function (a) {return a[1] - a[0]},
	// Mean of valid numbers only - NaN's are not counted
	mean:function (a) {
		a = za.getNumbers(a)
		return za.sum(a) / a.length // Sum must always be filtered - but if noFilter is off, then a is already filtered, so it doesn't need to be repeated in sum
	},
	median:function (a) {return za.percentile(a, 0.5)},
	// Value at x percentile (in dec) (valid numbers only)
	percentile:function (a, dec) {
		a = za.sort(za.getNumbers(a))
		var n = (a.length - 1) * dec
		return zt.calcMid(a[Math.floor(n)], a[Math.ceil(n)], n - Math.floor(n))
	},
	// Value in a which is closest to val
	closest:function (a, val) {
		var i, out = {diff:Infinity}
		for (i = 0; i < a.length; i++) {
			curr = {val:a[i], diff:Math.abs(val - a[i])}
			if (curr.diff < out.diff) out = curr
		}
		return out.val
	},

	// Defaults to ascending order
	rank:function (a, reverseOrder) {
		var i, out = []
		a = za.sortObjects(za.index(a), "val", reverseOrder) // Create indexes, then sort array
		for (i = 0; i < a.length; i++) out[a[i].id] = i // Return the positions
		return out
	},
	// As decimal of the sum of the array
	dec:function (a) {
		var i, out = [], sum = za.sum(a)
		if (sum) for (i = 0; i < a.length; i++) if (!isNaN(a[i])) out[i] = a[i] / sum
		else for (i = 0; i < a.length; i++) out[i] = 0 // If sum is 0, treat decimal as 0 (it can't be calculated for realz)
		return out
	},
	// Stack from beginning to end
	stacked:function (a, start) {
		var i, curr, out = [], stacked = start || 0
		for (i = 0; i < a.length; i++) {
			curr = (isNaN(a[i])) ? 0 : a[i]
			out[i] = {start:stacked, end:stacked += curr}
		}
		return out
	},
	// Absolute change from one element to the next
	change:function (a) {
		var i, curr, prev = 0, out = []
		for (i = 0; i < a.length; i++) {
			curr = (isNaN(a[i])) ? 0 : a[i]
			out[i] = curr - prev
			prev = curr
		}
		return out
	},
	// Decimal change from one element to the next
	decChange:function (a) {
		var i, prev = 0, out = []
		for (i = 0; i < a.length; i++) {
			out[i] = (a[i]) ?
				(prev) ? (a[i] / prev) - 1 : 1 : // curr > 0
				(prev) ? -1 : 0 // curr <= 0
			prev = a[i]
		}
		return out
	},
	// Absolute change from each element to the first element
	totalChange:function (a) {
		var i, curr, out = [], base = a[0] || 0
		for (i = 0; i < a.length; i++) {
			curr = (isNaN(a[i])) ? 0 : a[i]
			out[i] = curr - base
		}
		return out
	},
	// Decimal change from each element to the first element
	totalDecChange:function (a) {
		var i, out = []
		for (i = 0; i < a.length; i++) {
			out[i] = (a[i]) ?
				(a[0]) ? (a[i] / a[0]) - 1 : 1 : // curr > 0
				(a[0]) ? -1 : 0 // curr <= 0
		}
		return out
	},

	///////////////////////////////
	//  Multidimensional access  //
	///////////////////////////////
	// Create an array of fixed dimensions filled with val (e.g. create([5,5,5]) creates a 5x5x5 array)
	createDeep:function (space, val) {
		var i, out = [],
			currSpace = space[0],
			newSpace = space.slice(1)
		if (space.length > 1) for (i = 0; i < currSpace; i++) out[i] = za.createDeep(newSpace, val) // If there are more dimensions, recursively create them
		else for (i = 0; i < currSpace; i++) out[i] = val // Otherwise insert val
		return out
	},
	// CRITICAL FUNCTION: Get elements/subarrays from an array (e.g. get(a, ["all", 1, 0] returns [a[0][1][0], a[1][1][0], a[2][1][0]... a[n][1][0]])
	getDeep:function (a, space, debug) {
		var i, j, newSpace, out = []
		for (i = 0; i < space.length && a != null; i++) {
			// Sub-array defined, branching is unavoidable
			if (space[i] instanceof Array) {
				newSpace = space.slice(i + 1)
				for (j = 0; j < space[i].length; j++) {
					out[j] = za.getDeep(a, [space[i][j]].concat(newSpace))
				}
				return out
			}
			a = a[space[i]] // Otherwise keep iterating in place (this is much faster than branching)
		}
		return a
	},
	// CRITICAL FUNCTION: Set element in a deep array (can only set one element at a time)
	setDeep:function (a, space, newVal) {
		for (var i = 0; i < space.length - 1; i++) {
			if (a[space[i]] == null) a[space[i]] = []
			a = a[space[i]]
		}
		a[space[i]] = newVal
	},
	// See how deep array goes (assumes array is uniform)
	deepLength:function (a) {
		var out = [], curr = a
		while (za.isArray(curr)) {
			out.push(curr.length)
			curr = curr[0]
		}
		return out
	},
	flatten:function (a) {
		var i, out = []
		for (i = 0; i < a.length; i++) {
			if (za.isArray(a[i])) {
				za.add(out, za.flatten(a[i]))
			} else out.push(a[i])
		}
		return out
	},
	/////////////////////
	//  Miscellaneous  //
	/////////////////////
	getNumbers:function (a) {
		var i, x, out = []
		a = za.flatten(a)
		for (i = 0; i < a.length; i++) {
			x = a[i]
			if (typeof x == "number" && !isNaN(x)) out.push(a[i])
		}
		return out
	},
	getUniques:function (a) {
		var i, curr, prev, out = []
		a = za.sort(a.slice()) // Sort first
		curr = out[0] = a[0]
		for (i = 1; i < a.length; i++) {
			prev = curr
			curr = a[i]
			if (curr != prev) out.push(curr)
		}
		return out
	},
	// Randomly select n number of elements from a (the same element can NOT be extracted more than once)
	getRandom:function (a, n, mode) {
		if (n == null || n == 1) {
			if (!a) throw "zArray.getRandom(): Can't get a random element from an undefined array."
			return a[Math.round(Math.random() * (a.length - 1))]
		}
		var i, tempMap, out = [],
			map = za.fill(0, (a) ? a.length : n, 1)
		if (mode == null || mode == "random") { // Get random elements
			while (out.length < n) {
				out.push(Math.round(Math.random() * (map.length - 1)))
			}
		} else if (mode == "randomNoRepeat") { // Run through elements in random order, then randomise and start again
			while (out.length < n) {
				tempMap = map.slice()
				for (i = 0; i < n; i++) out.push(za.removeAt(tempMap, Math.round(Math.random() * (tempMap.length - 1))))
			}
		} else if (mode == "sequential") { // Run through array sequentially, and loop from start when finished
			while (out.length < n) {
				za.add(out, map)
			}
		}
		if (a) for (i = 0; i < n; i++) out[i] = a[out[i]] // If a is defined, map to a
		return out
	},
	// Return a single stacked object from an array of stacked objects
	mergeStacked:function (a) {
		return {start:za.calcObjects(a, "start", "min"), end:za.calcObjects(a, "end", "max")}
	}
// 	///////////////////
// 	//  Combination  //
// 	///////////////////
// 	// Creates a list of every unique array which is max.length long, and where each element is between 0 and max[d]
// 	// i.e. count([2,2]) will return [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]]
// 	count:function (max) {
// 		var i, out = [],
// 			counter = za.fill(0, max.length)
// 		counter[counter.length - 1]--
// 		for (i = counter.length - 1; i >= 0; i--) { // Go backwards
// 			if (counter[i] < max[i]) { // Find the first value that can be bumped without going bust
// 				counter[i]++ // Bump
// 				for (i++; i < counter.length; i++) counter[i] = 0 // Reset all subsequent values to 0
// 				out.push(counter.slice()) // Push new value to out
// 				i = counter.length // Go back to first value
// 			}
// 		}
// 		return out
// 	},
//  	// Plus one to counter array (initial array needs to be manually set)
// 	combination:function (counter, min, max, mode) {
// 		var i
// 		switch (mode) {
// 			case "array":
// 			// Count using predefined min/max arrays
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max[i]) { // Find the first value that can be bumped without going bust
// 						counter[i]++ // Bump
// 						for (i++; i < counter.length; i++) counter[i] = min[i] // Reset all subsequent values to min
// 						return counter
// 					}
// 				}
// 			case "non-repeat":
// 			// Each value must be greater than the value to its left but less than max (e.g. With a max of 3: 012, 013, 023, 123)
// 			// No value can appear more than once at any given time
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max + i + 1 - counter.length) { // Find the first value that can be bumped without going bust - BUT all subsequent values have to be greater than the one to the left of it
// 						counter[i]++ // Bump
// 						for (i++; i < counter.length; i++) counter[i] = counter[i - 1] + 1 // Reset all subsequent values so that each is greater than the one before it
// 						return counter
// 					}
// 				}
// 				return null
// 			case "ordered":
// 			// Each value must be greater than or equal to the value to its left but less than max (e.g. With a max of 3: 000, 001, 002, 003, 011, 012)
// 			// Order does not matter, and only one instance of any combination will be produced (i.e. 011 will exist, 101 and 110 will not)
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max) { // Find the first value that can be bumped without going bust
// 						counter[i]++ // Bump
// 						for (i++; i < counter.length; i++) counter[i] = counter[i - 1] // Reset all subsequent values to be the same as the value that's just been bumped
// 						return counter
// 					}
// 				}
// 				return null
// 			default:
// 			// All whole numbers, using max-min as a base
// 				for (i = counter.length - 1; i >= 0; i--) {
// 					if (counter[i] < max) { // Find the first value that can be bumped without going bust
// 						counter[i]++ // Bump
// 						for (i++; i < counter.length; i++) counter[i] = min // Reset all subsequent values to min
// 						return counter
// 					}
// 			}
// 			return null // Bust!
// 		}
// 	},
// 	// Generate all possible non-repeating (ignores order) pairs from array and convert them to string
// 	getPairs:function (a) {
// 		if (a.length < 2) return []
// 		var out = [], counter = [0,1]
// 		while (counter != null) {
// 			out.push(a[counter[0]] + "," + a[counter[1]]) // Convert to string for faster comparisons
// 			counter = za.counter(counter, 0, a.length - 1, "non-repeat")
// 		}
// 		return out
// 	},
// 	// Compare two arrays and return the percentage of matches
// 	calcSimilarity:function (a, b, threshold) {
// 		var i, big, small, both = 0,
// 			thresholdCount = (threshold) ? (a.length + b.length) * threshold / 2 : 0 // This many elements must match to reach threshold
// 		if (a.length >= b.length) big = a, small = b
// 		else big = b, small = a
// 		if (small.length < thresholdCount) return null // Crude check - quit if one of the groups is too small to pass threshold
// 		for (i = 0; i < small.length; i++) {
// 			if (za.get(big, small[i])) both++
// 			else if (both + small.length - i < thresholdCount) return null // If there aren't enough elements remaining to get this over the threshold, give up
// 		}
// 		return 2 * both / (a.length + b.length)
//  	},
// 	// Generates a frequency table out of an array, using intervals (generated with zt.getIntervals()) if defined
// 	frequency:function (a, intervals, increments) {
// 		var i = 0, curr, next, out = []
// 		if (typeof a[0] == "number" && intervals) { // Continuous data
// 			increments = increments || 1
// 			a = a.slice()
// 			for (i = 0; i < intervals.length - 1; i++) {
// 				curr = intervals[i]
// 				next = intervals[i + 1]
// 				if (next == ">") out.push({
// 					label:"More than " + (curr - increments),
// 					count:za.removeAll(a, (curr - increments), ">").length
// 				})
// 				else if (curr == "<") out.push({
// 					label:"Less than " + next,
// 					count:za.removeAll(a, next, "<").length
// 				})
// 				else out.push({
// 					label:curr + " to " + (next - increments), // First value doesn't have an increment, every other value does
// 					count:za.removeAll(a, next, "<").length
// 				})
// 			}
// 			if (a.length > 0) logger("WARNING: " + a.length + " items could not be were not counted. Maybe they're of the wrong type or out of interval range?")
// 		} else { // Discrete data
// 			for (i = 0; i < a.length; i++) {
// 				curr = za.getObject(out, "item", a[i]) // Check if an item has already been created
// 				if (curr) curr.count++ // If it has, add one to its count
// 				else out.push({item:a[i], count:1}) // Otherwise create a new object
// 			}
// 			out = za.sortObjects(out, "count", true)
// 		}
// 		return out
// 	}
}

// Object tools
var zObject = zo = {
	/////////////
	//  Basic  //
	/////////////
	// Remove a property from a object and return it
	r:function (obj, propertyName) {
		var out = obj[propertyName]
		delete obj[propertyName]
		return out
	},
	// Use a path string to get an attribute deep inside an object
	get:function (obj, path) {
		path = path.split(".")
		for (var i = 0; i < path.length && obj; i++) obj = obj[path[i]]
		return obj
	},
	// Return a list of keys in the object
	keys:function (obj) {
		var p, out = []
		for (p in obj) out.push(p)
		return out
	},
	_baseSearch:function (f, obj, type, v1, mode, v2) {
		mode = mode || "=="
		var p, test = za.compareTests(mode)
		if (typeof test == "function") {
			for (p in obj) if (obj[p] && test(obj[p].type, v1, v2)) {
				if (f(p)) return // Quit if the function returns true
			}
		} else if (test == "special") throw "zObject.findAll(): Search mode " + mode + " is not implemented for objects."
	},
	findAll:function (obj, type, v1, mode, v2) {
		var out = {}
		zo._baseSearch(function (p) {
			out.push(p)
		}, obj, type, v1, mode, v2)
		return out
	},
	getAll:function (obj, type, v1, mode, v2) {
		var out = {}
		zo._baseSearch(function (p) {
			out[p] = obj[p]
		}, obj, type, v1, mode, v2)
		return out
	},
	removeAll:function (obj, type, v1, mode, v2) {
		var out = {}
		zo._baseSearch(function (p) {
			out[p] = obj[p]
			delete obj[p]
		}, obj, type, v1, mode, v2)
		return out
	},
	// Extend a by b
	extend:function (a, b, shallow) {return $.extend(!shallow, a, b)}, // Deep extend by default
	shyExtend:function (a, b) {
		if (typeof a != "object" || typeof b != "object") return // If either is not an object, return
		for (p in b) { // Check each property in b
			if (a[p] == null) a[p] = zo.clone(b[p]) // If it doesn't exist in a, clone it across
			else zo.shyExtend(a[p], b[p]) // If it does, drill down
		}
		return a
	},
	clone:function (a, b) {
		var out =
			(za.isArray(a)) ? zo.extend([], a) :
			(typeof a == "object") ? zo.extend({}, a) :
			a // Primatives don't need cloning
		if (b) out = zo.extend(out, b) // If b is defined, cloneWith
		return out
	},
	/////////////
	//  Tests  //
	/////////////
	isEmpty:function (obj) {return $.isEmptyObject(obj)},
	// Deep comparison of two objects
	// If ordered flag is on, the two arrays must also be in the same order to be considered equal (flag is only valid for arrays)
	equals:function (a, b, ordered) {
		if (a === b) return true // Quick check
		var i, p, type = zt.type(a)
		if (type != zt.type(b)) return false // Different types - instant fail
		if (type == "object") {
			for (p in a) {
				if (!zo.equals(a[p], b[p])) return false // Check each element pair, any mismatch means fail
			}
			return true // Every elment checks out
		}
		if (type == "array") {
			if (a.length != b.length) return false // Different lengths - instant fail
			if (ordered) { // Ordered comparisons of arrays
				for (i = 0; i < a.length; i++) {
					if (!zo.equals(a[i], b[i], true)) return false // Check each element pair, any mismatch means fail
				}
				return true
			} else {
				return za.subtract(a, b).length == 0 // Reverse check not required, as a.length == b.length
			}
		}
		if (type == "function") {
			return zt.asString(a) == zt.asString(b) // Convert to string for simple comparison
		}
		if (type == "number") {
			return d3.round(a, 10) == d3.round(b, 10) // Floats don't quite add up sometimes - if it's accurate to 10 decimal places, it's close enough
		}
		return false // Primatives or unknown type; if it's a primatives this means it failed the quick check at the start, which means it's failed
	},
	//////////////
	//  Styles  //
	//////////////
	// Replaces all the baseStyle properties with the actual style referred to by baseStyle - will NOT change original object
	// FIXME: Should set a check for infinitely recursive style
	parseStyle:function (s, topS) {
		var i, p,
			base = s.base,
			out = {}
		topS = topS || s // topS should be the original style object, containing all styles - all recursive calls of _parseOrders() will have topS defined
		if (!base) out = s // No baseStyle
		else if (typeof base == "object") out = zo.clone(base, s)
		else if (typeof base == "string") {
			base = base.split(" ") // Check for multiple baseStyles
			for (i = 0; i < base.length; i++) { // For each baseStyle
				zo.extend(out, zo.get(topS, base[i])) // Push all of its attributes to out
			}
			zo.extend(out, s) // Extend by additional attributes defined in s
		}
		for (p in out) if (out[p] && typeof out[p] == "object") {
			out[p] = zo.parseStyle(out[p], topS) // For every element that's an object, check if it needs extending as well
		}
		delete s.base
		return out
	},
	// Parse orders.base and orders.extend
	initOrders:function (O, base) {
		if (base) O = zo.extend(base, O) // Styles hardcoded into the library
		if (O.base) O = zo.extend(zo.r(O, "base"), O)
		if (O.extend) O = zo.extend(O, zo.r(O, "extend")) // .extend can be used to override styles defined by the visualisation
		return O
	},
	/////////////////
	//  Operators  //
	/////////////////
	round:function (a, dp) {
		var p, out = {}
		for (p in a) out[p] = d3.round(a[p], dp)
		return out
	},
	add:function (a, b) {
		var p, out = {}
		for (p in a) out[p] = (a[p] || 0) + (b[p] || 0)
		return out
	},
	subtract:function (a, b) {
		var p, out = {}
		for (p in a) out[p] = (a[p] || 0) - (b[p] || 0)
		return out
	},
	// Create a new object that's decimal between a and b (VERY IMPORTANT, as it's used for .frameRedraw())
	mid:function (a, b, dec) {
		if (dec == 0 || b == null || a == b) return a
		if (dec == 1 || a == null) return b
		var type = zt.type(a)
		if (type != zt.type(b)) return b // Different type - calculating mid is not possible, jump straight to b
		if (zt.isColour(a)) return zt.getColour(dec, a, b) // Catch colours
		if (type == "object") {
			var p, out = {}
			for (p in b) out[p] = zo.mid(a[p], b[p], dec)
			return out
		}
		if (type == "array") {
			var i, out = []
			for (i = 0; i < b.length; i++) out[i] = zo.mid(a[i], b[i], dec)
			return out
		}
		if (type == "number") return zt.calcMid(a, b, dec)
		return b // Unknown type - calculating mid is not possible, jump straight to b
	},
	midStack:function (a) {return zt.calcMid(a.start, a.end)}
}

// Other tools
var zTools = zt = {
	// boolean, number, string, function, array, date, error, regex, object, undefined, null
	type:function (a) {return $.type(a)},
	////////////////////
	//  Colour tools  //
	////////////////////
	isColour:function (a) {
		if (a) {
			if (a.r != null && a.g != null && a.b != null) return true // Colour object
			if (a[0] == "#" && (a.length == 4 || a.length == 7)) return true // Hex string
		}
		return false
	},
	// Get colour from sequential or divergent colour scheme
	getColour:function (dec, neutralColour, positiveColour, negativeColour) {
		if (dec == 0 || (!negativeColour && dec < 0)) return neutralColour
		if (dec == 1) return positiveColour
		if (dec == -1 && negativeColour) return negativeColour
		var out = [],
			startColour = neutralColour,
			endColour = (negativeColour && dec < 0) ? negativeColour : positiveColour // endColour is negativeColour only if negativeColour exists and decimal is negative
		dec = Math.min(Math.abs(dec), 1)
		return d3.interpolate(startColour, endColour)(dec)
	},
	getPalette:function (palette, size, mode) {
		return za.getRandom(palette || [
			"#8DD3C7","#FFFFB3","#BEBADA","#FB8072","#80B1D3","#FDB462",
			"#B3DE69","#FCCDE5","#D9D9D9","#BC80BD","#CCEBC5","#FFED6F"
		], size, mode)
	},
	///////////////////
	//  Format Text  //
	///////////////////
	asString:function (a) {
		var type = zt.type(a)
		if (a == null) return null
		if (type == "object") {
			var p, out = []
			for (p in a) out.push(p + ":" + zt.asString(a[p]))
			return "{" + out.join(",") + "}"
		}
		if (type == "array") {
			var i, out = []
			for (i = 0; i < a.length; i++) out.push(zt.asString(a[i]))
			return "[" + out.join(",") + "]"
		}
		if (type == "string") return '"' + a + '"'
		return a + ""
	},
	camelCase:function (a) {
		var i, out = "" + a[0]
		for (i = 1; i < a.length; i++) {
			out += a[i].substr(0,1).toUpperCase() + a[i].substr(1)
		}
		return out
	},
	titleCase:function (s) {
		s = s.toLowerCase()
		var i, char, out = ""
		for (i = 0; i < s.length; i++) {
			char = s[i - 1]
			if (i == 0 || char == " " || char == "(") {
				out += s[i].toUpperCase()
			} else {
				out += s[i]
			}
		}
		return out
	},
	// Crop text
	shorten:function (s, l) {
		if (s == null) return ""
		if (s.length <= l) return s
		return s.substr(0, l).trim() + "..."
	},
	// Wrap text
	wrap:function (s, l) {
		if (s == null || typeof s != "string") return s
		var i, j, out = "", line = "", a = s.split(" "), b
		for (i = 0; i < a.length; i++) {
			b = a[i].split("\n") // Check for manual linebreaks
			for (j = 0; j < b.length; j++) {
				if (line == "") {
					line = b[j] // Line is empty, so add word
				} else if (line.length + b[j].length < l) {
					line += " " + b[j] // Line can accept one more word
				} else { // Line will overflow if it takes one more word
					out += line + "\n" // Break current line
					line = b[j] // Take current word and start a new one
				}
				if (j < b.length - 1) { // Add manual linebreak
					out += (line || " ") + "\n" // The line needs to have at least one character, or linebreak gets ignored by Javascript
					line = "" // Reset line
				}
			}
		}
		return out + line // Don't forget the leftover line!
	},
	// Styled for d3
	format:function (o) {
		return function (a) {return zt._format(a, o)}
	},
	_format:function (a, o) {
		// Format every element in an array
		if (za.isArray(a)) {
			var i, out = []
			for (i = 0; i < a.length; i++) out.push(zt.format(a[i], o))
			return out
		}
		// Functions
		var addCommas = function (num) {
				var i, out = num.split(".")
				for (i = out[0].length - 3; i > 0; i -= 3) {
					out[0] = out[0].slice(0, i) + "," + out[0].slice(i)
				}
				if (out[1]) for (i = 3; i < out[1].length; i += 4) {
					out[1] = out[1].slice(0, i) + "," + out[1].slice(i)
				}
				return out.join(".")
			},
			asTime = function (a) {
				if (isNaN(a)) a = 0
				return [Math.floor(a / 60), Math.round(a % 60)]
			}
		// Parse o
		o = o || {}
		if (typeof o == "string") o = {mode:o}
		if (o.m) o.mode = o.m
		// Parse a
		var prefix, suffix = "",
			num = Math.abs(a * (o.multiply || 1))
		// Add +/- prefix
		if (o.noSign) prefix = ""
		else if (o.wordSign) prefix = (a > 0) ? "up " : (a < 0) ? "down " : ""
		else if (o.forceSign) prefix = (a > 0) ? "+" : (a < 0) ? "-" : ""
		else prefix = (a >= 0 || o.noSign) ? "" : "-"
		// Add predefined prefix
		if (o.prefix) prefix += o.prefix

		// 92 --> 1:32
		if (o.mode == "time") {
			var time = asTime(num)
			if (time[1] < 10) time[1] = "0" + time[1]
			return prefix + time.join(":")
		// 92--> 1hr 32min
		} else if (o.mode == "hours") {
			var time = asTime(num)
			if (time[0]) time[0] += "hr"
			if (time[1]) time[1] += "min"
			return prefix + time.join(" ")
		// 92 --> 1 hour 32 minutes
		} else if (o.mode == "hoursLong") {
			var time = asTime(num)
			if (time[0]) time[0] += (time[0] == 1) ? " hour" : " hours"
			if (time[1]) time[1] += (time[1] == 1) ? " minute" : " minutes"
			return prefix + time.join(" ")
		// 0.25 --> 25% (assumes decimals by default)
		} else if (o.mode == "%") {
			suffix = "%"
			num *= 100
		// 23 --> 23rd
		} else if (o.mode == "th") {
			num = Math.round(num) // Round numbers only
			var lastChar = za.last(num),
				secondLastChar = num[num.length - 2]
			suffix = (
				(secondLastChar == 1) ? "th" :
				(lastChar == 1) ? "st" :
				(lastChar == 2) ? "nd" :
				(lastChar == 3) ? "rd" :
				"th")
		// 9,399,192 --> 9.4M
		} else if (o.mode == "abbreviate" && !zt.isBetween(num, -1000, 1000)) {
			var units = ["", "k", "M", "B", "T"],
				magnitude = Math.floor(zt.magnitude(num) / 3) * 3
			num = num / Math.pow(10, magnitude) // Reduce number by magnitude
			suffix = units[magnitude / 3]
		}
		// Complete and return
		num = zt.round(num, (o.dp == null) ? 10 : o.dp) // By default round to 10 places, which should fix the float/int errors
		if (!o.noCommas) num = addCommas(num + "") // Add commas unless directed to otherwise
		return prefix + num + suffix + (o.suffix || "")
	},
	///////////////////
	//  Maths tools  //
	///////////////////
	round:function (val, dp, mode) {
		var roundMethod = (mode == "ceil") ? Math.ceil : (mode == "floor") ? Math.floor : Math.round
		if (!dp) return roundMethod(val)
		var base = Math.pow(10, Math.abs(dp)) // Force base to be > 1, so that it's an integer and not a float, so IE can't fuck it up
		return (dp >= 0) ? roundMethod(val * base) / base : roundMethod(val / base) * base
	},
	// Check if a val is between a and b
	isBetween:function (val, a, b, exclusive) {
		var min = Math.min(a, b),
			max = Math.max(a, b)
		return (exclusive) ?
			(val > min && val < max) :
			(val >= min && val <= max)
	},
	// Force a val to be between min and max
	forceBetween:function (val, min, max) {return Math.max(min, Math.min(max, val))},
	// Return a decimal representing the position of val relative to a and b
	calcDec:function (val, a, b) {
		if (a == b) return 0
		return (val - a) / (b - a)
	},
	// Return a value part way between a and b
	calcMid:function (a, b, dec) {
		if (dec == null) dec = 0.5
		return a + (b - a) * dec
	},
	// Scale a number so that it's distance betweeen newStart and newEnd is the same as its distance between oldStart and oldEnd (i.e. scale(1, 0, 10, 100, 200) would return 110)
	scale:function (val, oldStart, oldEnd, newStart, newEnd) {
		var dec = zt.calcDec(val, oldStart, oldEnd) // Calculate val's distance between oldStart and oldEnd
		return zt.calcMid(newStart, newEnd, dec) // Map decimal onto newStart and newEnd
	},
	// == n!
	factorial:function (val) {
		for (var out = 1, i = val; i > 0; i--) out *= i
		return out
	},
	// Order of magnitude (counts spaces to/from decimal place)
	magnitude:function (val) {
		if (!val) return 0 // Zeros and nulls return 0
		val = Math.abs(val) // Ignore negatives
		if (val >= 1) return (Math.round(val) + "").length - 1 // If >1, round to whole number, convert to string and count length
		else return -za.find((val + "").split(".")[1], 0, "!=") - 1 // If <1, convert to string, get part after decimal point and find the first non-zero digit
	},
	// Gets the next highest factor of 10 (used for getting labels on quantitative axes)
	getFactorOfTen:function (val, reverse) {
		if (!val || isNaN(val) || Math.abs(val) == Infinity) return 0 // Don't get trapped by infinity!
		var factors = [1, 2, 2.5, 5, 10],
			mod = (val < 0) ? -1 : 1,
			base = mod * Math.pow(10, zt.magnitude(val)),
			targ = val / base, // (val / base) will always be between 1 and 10
			out =
				(!reverse) ? za.get(factors, targ, ">=") : // Find the next biggest factor of 10
				za.getLast(factors, targ, "<=") // Find the next smallest factor of 10
		return base * out // Readjust back to the correct base and return
	},
	getClosestFactorOfTen:function (val) {
		return za.closest([zt.getFactorOfTen(val), zt.getFactorOfTen(val, true)], val)
	},
	//////////////////////////
	//  Window/canvas tools  //
	//////////////////////////
	// Maximum allowable size for the window, within constraints
	getMaxLayout:function (minWidth, minHeight, padding, id) {
		var canvas = $(id || "#chewy")
		return new zLayout({ // Layout for the whole canvas
			width:Math.max(minWidth, $(window).width() - canvas.offset().left - 8), // Fit to screen, with minimum size
			height:Math.max(minHeight, $(window).height() - canvas.offset().top - 12), // Fit to screen, with minimum size
			padding:padding
		})
	},
	// NOTE: if some drones are layered and some aren't, shit's gonna get cray
	attach:function (P, parent, layer) {
		// Foreignobject is not supported and this is a top-level div (parent not another div)
		if (parent._canvas.nofo && P.$.is("div") && !parent.$.is("div")) {
			parent = parent._canvas.parent // Attach outside of SVG
		}
		// Layer defined - do it properly
		if (layer != null) {
			P.el.layer = layer // Set layer on element, so future attaches can look at elements without having to look at drones
			var i, siblings = parent.$.children() // Sibling elements
			for (i = 0; i < siblings.length; i++) if (siblings[i].layer > P.el.layer) { // Find the first element that's above the current element
				parent.d3.insert(function () {return P.el}, function () {return siblings[i]}) // Insert itself before it (i.e. Under it)
				return
			}
		}
		// No layer defined or no insert target found, just chuck it in
		parent.d3.append(function () {return P.el})
	}
}

/*

zLayout - Smart layout object

Precalculates a rectangular layout based on "vital" inputs, such as anchor (x & y), width, height, alignment, rotate.
	anchor: (point) Reference point for layout
	x/y: (numbers) Equals anchor.x and anchor.y (anchor has priority)
	width/height: (numbers) Outer size for layout - if specified, it takes priority over innerWidth/innerHeight, which will be derived from width/height
	innerWidth/innerHeight: (numbers) Inner size for layout (width/height has priority)
	padding: (number) Distance between innerWidth/Height and width/height (i.e. width = innerWidth + 2 * padding)
	xAlign/yAlign: (strings) Valid alignments: "left", "xCentre", "right", "top", "yCentre", "bottom"
	align: (string) Valid alignments: "centre", "leftTop", "centreTop", "rightTop", "rightCentre", "rightBottom", "centreBottom", "leftBottom", "leftCentre"
	rotate: (deg) Rotation of layout, centred on anchor
	radial: (deg) Angle of offset between trueAnchor and anchor (radialStartPoint and radialEndPoint will be on this angle as well)
	radialStart: (number) radialStartPoint will be this distance from anchor
	radialEnd: (number) radialEndPoint will be this distance from anchor

Derived:
	trueAnchor: (point) Usually same as anchor, except in radialMode, when it be fitted so that radialEnd
	corners: ([point, point, point, point]) Gets the four corners of the layout - affected by rotate, so should always reflect the true position of layout; NOT the same as a bounding box
	left/right/top/bottom: (points) Furtherest point of the layout - IS equal to bounding box
	centre: (point) Centre of layout, affected by rotate
	xCentre/yCentre: (numbers) Equals centre.x and centre.y

*/

function zLayout (layout, parent) {
	var L = this
	L.anchor = {x:0, y:0}
	L.x = 0
	L.y = 0
	L.padding = 0
	L.width = 0
	L.innerWidth = 0
	L.height = 0
	L.innerHeight = 0
	L.parent = parent
	L.set(layout)
  if (!L.innerWidth && layout.autoWidth != false) L.autoWidth = true
  if (!L.innerHeight && layout.autoHeight != false) L.autoHeight = true
}

/////////////////////
//  Set functions  //
/////////////////////

// Sets to a new layout - if the new layout doesn't define it, then it stays the same; if neither exist, default values are used
zLayout.prototype.set = function (layout) {
	var L = this, i, temp
	if (zo.isEmpty(layout)) return L
	L = zo.extend(L, (layout instanceof zLayout) ? layout.getVitals() : layout) // Load whatever is in layout (if it's an object, only load the vitals, not the object itself), then recalculate all derived information
	// Anchor
	if (layout.anchor) { // If anchor is defined (top priority)
		L.x = L.anchor.x // Update (or overwrite) x/y
		L.y = L.anchor.y
	} else { // Otherwise
		if (layout.x != null) L.anchor.x = L.x // Update anchor
		if (layout.y != null) L.anchor.y = L.y // Update anchor
	}
	// Width
	temp = 2 * L.padding
	if (L.autoWidth && L.parent && L.parent.bBox) { // AutoWidth has first priority
		L.innerWidth = L.parent.bBox.width || 0
		L.width = L.innerWidth + temp
	} else if (layout.width == null) { // If width is not defined, calculate width from innerWidth (default = 0 + 2 * padding)
		L.innerWidth = L.innerWidth || 0
		L.width = L.innerWidth + temp
	} else { // If width is defined, then calculate innerWidth from width (i.e. width supercedes innerWidth)
		L.innerWidth = L.width - temp
		if (isNaN(L.innerWidth)) {
			L.innerWidth = 0
			L.width = temp
		}
	}
	if (isNaN(L.width)) throw "zLayout.set(): Invalid width."
	// Height
	if (L.autoHeight && L.parent && L.parent.bBox) { // AutoHeight has first priority
		L.innerHeight = L.parent.bBox.height || 0
		L.height = L.innerHeight + temp
	} else if (layout.height == null) { // If height is not defined, calculate height from innerHeight (default = 0 + 2 * padding)
		L.innerHeight = L.innerHeight || 0
		L.height = L.innerHeight + temp
	} else { // If height is defined, then calculate innerHeight from height (i.e. height supercedes innerHeight)
		L.innerHeight = L.height - temp
		if (isNaN(L.innerHeight)) {
			L.innerHeight = 0
			L.height = temp
		}
	}
	if (isNaN(L.height)) throw "zLayout.set(): Invalid height."
	// Parse alignment
	if (L.align) {
		temp = L.align.substr(0, 3)
		L.xAlign =
			(temp == "cen") ? "xCentre" :
			(temp == "rig") ? "right" :
			(temp == "lef") ? "left" :
			logger("zLayout.set(): ERROR - align '" + L.align + "' is invalid.")
		temp = L.align.substr(L.align.length - 3, 3)
		L.yAlign =
			(temp == "tre" || temp == "ter") ? "yCentre" :
			(temp == "tom") ? "bottom" :
			(temp == "Top") ? "top" :
			logger("zLayout.set(): ERROR - align '" + L.align + "' is invalid.")
	}
	if (L.radial == null) { // Normal alignment
		L.xAlign = L.xAlign || "left"
		L.yAlign = L.yAlign || "top"
		L.trueAnchor = L.anchor
	} else { // Radial alignment (this is NOT radians!)
		var normRadial = zp.matchDeg(L.radial) // Normalise so that quadrants can be calculated, but keep original so spinning works properly
		L.xAlign = L.xAlign || "xCentre"
		L.yAlign = L.yAlign || "yCentre"
		L.radialStartPoint = (L.radialStart != null) ? zp.addVector(normRadial, L.radialStart, L.anchor) : L.anchor // Start of the branch
		L.radialEndPoint = (L.radialEnd != null) ? zp.addVector(normRadial, L.radialEnd, L.anchor) : L.radialStartPoint // End of the branch === radialAnchor
		L.trueAnchor = zo.add(
			(normRadial < 45) ? {x:0.5 * L.width, y:0.5 * L.height * zt.calcDec(normRadial, 0, 45)} : // South-East
			(normRadial < 135) ? {x:0.5 * L.width * zt.calcDec(normRadial, 90, 45), y:0.5 * L.height} : // South
			(normRadial < 225) ? {x:-0.5 * L.width, y:0.5 * L.height * zt.calcDec(normRadial, 180, 135)} : // West
			(normRadial < 315) ? {x:0.5 * L.width * zt.calcDec(normRadial, 270, 315), y:-0.5 * L.height} : // North
			{x:0.5 * L.width, y:-0.5 * L.height * zt.calcDec(normRadial, 360, 315)}, // North-East
			L.radialEndPoint)
	}
	// Derived values (rotated)
	L.centre = L.getPoint(0.5, 0.5)
	L.xCentre = L.centre.x
	L.yCentre = L.centre.y
	L.corners = L.getCorners()
	zo.extend(L, zp.pointsToBox(L.corners)) // Get bounding box for corners, and make them bounding box for layout
	L.changed = true // Set change flag - up to zDrone to clear the flag once parts have been updated to reflect layout changes
	return L
}

// Targ is a section of layout; expand layout so that targ is the size of viewport (or layout, if viewport is not defined)
zLayout.prototype.zoom = function (targ, viewport) {
	var L = this
	L.prevLayout = L.getVitals() // Create undo values
	targ = zp.completeBox(targ)
	viewport = zp.completeBox(viewport || L) // Use current layout if viewport is not defined
	var dec, align,
		scale = {x:viewport.width / targ.width, y:viewport.height / targ.height}
	// Extend targ to so it has the same aspect ratio as viewport
	if (scale.x < scale.y) { // x is the dominant scale (the SMALLER scale is dominant)
		scale = scale.x
		targ.height = viewport.height / scale // Submissive scale is expanded so it has the same ratio to targ as the dominant scale
		align = viewport.yAlign || targ.yAlign || L.yAlign // Use new alignment if it's defined
		targ.top =
			(align == "top") ? targ.top :
			(align == "bottom") ? targ.bottom - targ.height :
			targ.yCentre - targ.height / 2
		targ.bottom = targ.top + targ.height
	} else if (scale.y < scale.x) { // y is the dominant scale (the SMALLER scale is dominant)
		scale = scale.y
		targ.width = viewport.width / scale // Submissive scale is expanded so it has the same ratio to targ as the dominant scale
		align = viewport.xAlign || targ.xAlign || L.xAlign // Use new alignment if it's defined
		targ.left =
			(align == "left") ? targ.left :
			(align == "right") ? targ.right - targ.width :
			targ.xCentre - targ.width / 2
		targ.right = targ.left + targ.width
	} else scale = scale.x // Aspect ratios are the same, do nothing
	// Get relative distance of L.anchor from targ.anchor
	dec = {
		x:(L[L.xAlign] - targ[L.xAlign]) / targ.width,
		y:(L[L.yAlign] - targ[L.yAlign]) / targ.height
	}
	// Relative distance of L.anchor and viewport.anchor should be the same, after this redraw
	return L.set({
		x:viewport.x + viewport.width * dec.x,
		y:viewport.y + viewport.height * dec.y,
		width:L.width * scale,
		height:L.height * scale,
		padding:L.padding * scale // Padding has to be scaled, or inner aspect ratio will fuck up
	})
}
zLayout.prototype.unzoom = function () {
	var L = this
	if (L.prevLayout) {
		L.set(L.prevLayout)
		L.prevLayout = null
	}
}

zLayout.prototype.readOrders = function (O) {
	if (O.L) this.set(zo.r(O, "L"))
	if (O.layout) this.set(zo.r(O, "layout"))
}

/////////////////////
//  Get functions  //
/////////////////////
// Clones itself with additional properties using the set function (optional - set() will ignore if it's empty)
zLayout.prototype.clone = function (layout) {
	return new zLayout(this.getVitals(layout))
}
// Return the minimum set of values required to fully reconstruct this layout
zLayout.prototype.getVitals = function (layout) {
	var L = this, i, out = {},
		vitals = [
			"x", "y", "anchor", "padding", "width", "height", "xAlign", "yAlign",
			"left", "right", "top", "bottom",
			"rotate", "radial", "radialStart", "radialEnd"
		]
	for (i = 0; i < vitals.length; i++) if (L[vitals[i]] != null) {
		out[vitals[i]] = zo.clone(L[vitals[i]])
	}
	return (layout) ? zo.extend(out, layout) : out
}
zLayout.prototype.getCorners = function (innerBox) {
	var L = this
	return [
		L.getPoint(0,0,innerBox), L.getPoint(1,0,innerBox),
		L.getPoint(1,1,innerBox), L.getPoint(0,1,innerBox)
	]
}
// Calculate an unrotated rect (for elements which rely on SVG rotate, and need to know where it's supposed to be prior to rotation)
zLayout.prototype.getRawRect = function () {
	var L = this, out = {centre:{}}
	if (L.xAlign == "left") {
		out.left = L.x
		out.right = L.x + L.width
	} else if (L.xAlign == "right") {
		out.left = L.x - L.width
		out.right = L.x
	} else {
		out.left = L.x - L.width / 2
		out.right = L.x + L.width / 2
	}
	out.centre.x = (out.left + out.right) / 2
	if (L.yAlign == "top") {
		out.top = L.y
		out.bottom = L.y + L.height
	} else if (L.yAlign == "bottom") {
		out.top = L.y - L.height
		out.bottom = L.y
	} else {
		out.top = L.y - L.height / 2
		out.bottom = L.y + L.height / 2
	}
	out.centre.y = (out.top + out.bottom) / 2
	return out
}
zLayout.prototype.getString = function () {
	var L = this
	return L.left + ',' + L.top + ',' + L.width + ',' + L.height
}
// Return a matrix that will scale FROM targ to L
zLayout.prototype.getMatrixFrom = function (targL) {
	var L = this, out = za.fill(0, 6)
	out[0] = L.width / targL.width
	out[3] = L.height / targL.height
	out[4] = L.anchor.x - targL.anchor.x * out[0]
	out[5] = L.anchor.y - targL.anchor.y * out[3]
	return "matrix(" + out.join(",") + ")"
}
// Return a matrix that will scale TO targ from L
zLayout.prototype.getMatrixTo = function (targL) {
	var L = this, out = za.fill(0, 6)
	out[0] = targL.width / L.width
	out[3] = targL.height / L.height
	out[4] = targL.anchor.x - L.anchor.x * out[0]
	out[5] = targL.anchor.y - L.anchor.y * out[3]
	return "matrix(" + out.join(",") + ")"
}
// Get SVG path from layout
zLayout.prototype.getSVG = function (rounded) {
	var L = this
	if (!rounded || !L.width || !L.height) return zp.shape(L.corners) // Can't round if rounded not defined, or if layout is one-dimensional
	var direction = 1 // Have to get direction right or rounded corners will round inside out
	if (L.xAlign == "right") direction *= -1
	if (L.yAlign == "bottom") direction *= -1
	if (L.width < 0) direction *= -1
	if (L.height < 0) direction *= -1
	var start = zp.start, line = zp.lineTo,
		arc = (direction == 1) ? zp.arcTo : zp.reverseArcTo,
		xDec = rounded / Math.abs(L.width),
		yDec = rounded / Math.abs(L.height)
	return (
		start(L.getPoint(xDec, 0)) +
		line(L.getPoint(1 - xDec, 0)) +
		arc(rounded, L.getPoint(1, yDec)) +
		line(L.getPoint(1, 1 - yDec)) +
		arc(rounded, L.getPoint(1 - xDec, 1)) +
		line(L.getPoint(xDec, 1)) +
		arc(rounded, L.getPoint(0, 1 - yDec)) +
		line(L.getPoint(0, yDec)) +
		arc(rounded, L.getPoint(xDec, 0)))
}


///////////////////////
//  Point functions  //
///////////////////////
// CRITICAL FUNCTION - Get a point in layout
zLayout.prototype.getPoint = function (xDec, yDec, innerBox) {
	var L = this
	var out = {x:L.getX(xDec, innerBox), y:L.getY(yDec, innerBox)}
	if (L.rotate) out = L.getRadialPoint(out, L.rotate)
	return out
}
// Caution: Doesn't account for rotate!
zLayout.prototype.getX = function (dec, innerBox) {
	var L = this
	if (!innerBox) return L.trueAnchor.x + (
		(L.xAlign == "left") ? L.width * dec :
		(L.xAlign == "xCentre") ? L.width * (dec - 0.5) :
		L.width * -dec)
	else return L.trueAnchor.x + (
		(L.xAlign == "left") ? L.innerWidth * dec + L.padding :
		(L.xAlign == "xCentre") ? L.innerWidth * (dec - 0.5) :
		L.innerWidth * -dec - L.padding)
}
// Caution: Doesn't account for rotate!
zLayout.prototype.getY = function (dec, innerBox) {
	var L = this
	if (!innerBox) return L.trueAnchor.y + (
		(L.yAlign == "top") ? L.height * dec :
		(L.yAlign == "yCentre") ? L.height * (dec - 0.5) :
		L.height * -dec)
	else return L.trueAnchor.y + (
		(L.yAlign == "top") ? L.innerHeight * dec + L.padding :
		(L.yAlign == "yCentre") ? L.innerHeight * (dec - 0.5) :
		L.innerHeight * -dec - L.padding)
}
// Get offset between point and anchor
zLayout.prototype.getOffset = function (xDec, yDec, innerBox) {
	var L = this
	return zo.subtract(L.getPoint(xDec, yDec, innerBox), L.trueAnchor)
}
// Get the decimal values of a point relative to the anchor (e.g. The centre point would return {x:.5, y:.5}, the anchor would return {x:0, y:0})
zLayout.prototype.getDec = function (point, innerBox) {
	var L = this
	if (L.rotate) point = L.getRadialPoint(point, -L.rotate) // Unrotate point
	return (innerBox) ?
		{x:zt.calcDec(point.x, L.innerLeft, L.innerRight), y:zt.calcDec(point.y, L.innerTop, L.innerBottom)} :
		{x:zt.calcDec(point.x, L.left, L.right), y:zt.calcDec(point.y, L.top, L.bottom)}
}
// Rotates point around trueAnchor
zLayout.prototype.getRadialPoint = function (point, deg) {
	var L = this
	if (!deg) return point
	var v = zp.vector(L.trueAnchor, point)
	return zp.addVector(v.deg + deg, v.dist, L.trueAnchor)
}
// Get an array of points
zLayout.prototype.getPoints = function (a, innerBox) {
	var L = this, i, out = []
	for (i = 0; i < a.length; i++) out.push(L.getPoint(a[i][0], a[i][1], innerBox))
	return out
}


/*

zDataCube - Data/metadata storage and calculation

	----------
	Properties
	----------
	.dLen: Number of dimensions. Each dimension has its own set of metadata, and adds an additional dimension to each data type.
	.domain: Array determining which values on a given dimension is in the domain. Reference only - doesn't do anything on its own/

	.meta[d]: Object containing all the types of metadata for that dimension.
		.name: Array of id extracted from the source data - it doesn't *have* to be unique, but if it's not, .shyPushMeta() and .makeTree() won't work.
		.parentName: Will look for this name in .name and treat the matching element as parent, recording its pos in the corresponding .parent.
		.displayName: Array of names which will overwrite .name *after* .parentName matching is completed. Allows for ugly unique identifiers to be replaced by non-unique ids.
	.data[type]: Every .data[type] is a dLen-dimensional array (e.g. Cube) containing the actual data.

	----------
	Arguments:
	----------
	p (for position): A range on a dimension - needs to be paired with a dimension to be a meaningful.
		Valid values:
			number - refers to a single pos in that dimension.
			array - refers to an array of pos in that dimension.
			"all" - refers to every pos in that dimension.
			null - refer to the whole dimension (subtly different from "all", since "all" will return an array of fixed length based on .getSize(d), whereas null will simply get that metadata type as a whole).

	s (for space): An array which defines a range within the data cube.
		Valid values:
			array - Must be dLen long and contain a pos or "mask" for each dimension (e.g. [0,0,0] or ["all","mask","mask"]).
			"all" --> ["all", "all", "all"]
			"mask" --> ["mask", "mask", "mask"]
			{d:1, p:5} --> ["mask", 5, "mask"]
		Note: null is NOT valid for spaces
		Note: "mask" is a special case for spaces. Not meaningful on their own, but can be used to combine spaces.
			.addSpaces([0, 0, 0], ["mask", "mask", 8]) --> [0, 0, 8]

	x: An object containing a dimension and a position, or a space.
		Valid formats:
			{d:d, p:pos}: Position.
			{d:d, s:[0,0,0]}: Implied position (s[d] will be used as p).
			{s:[0,0,0]}: Space.

*/
function zDataCube (dLen, rawData, isFlat) {
	var C = this
	///////////////
	//  Parsing  //
	///////////////
	// Formats {d:}, {d:, p:}, {d:, s:} into {d:, p:} form
	C.parsePos = function (x) {
		if (x != null && x.d != null) return {
			d:x.d,
			p:(x.p != null) ? x.p :
				(za.isArray(x.s)) ? x.s[x.d] :
				null
		}
		throw "zDataCube.parsePos(): " + zt.asString(x) + " is invalid. (No dimension defined.)"
	}
	// Formats {s:}, "all", "mask", null, into {s:[,,,]} form
	C.parseSpace = function (x) {
		var s = x.s || x // Extract the space
		// Clean space: ["all", 5, "all"] --> ["all", 5, "all"]
		if (za.isArray(s)) {
			return {s:s.slice()}
		// String shortcut: "mask" --> ["mask", "mask", "mask"]
		} else if (typeof s == "string") {
			if (s == "all" || s == "mask" || s == "null") {
				return {s:za.fill(s, C.dLen)}
			}
			throw "zDataCube.parseSpace(): " + zt.asString(x) + " is invalid. (Only 'all'/'mask'/'null' are valid strings shortcuts for spaces.)"
		// Pos shortcut: {d:1, p:5} --> ["mask", 5, "mask"]
		} else {
			var pos = C.parsePos(x)
			if (pos) {
				s = za.fill("mask", C.dLen)
				s[pos.d] = pos.p
				return {s:s}
			}
			throw "zDataCube.parseSpace(): " + zt.asString(x) + " is invalid. (Reason unknown.)"
		}
	}
	C.asPos = function (x) {
		x = C.parsePos(x)
		if (x.p == "all") return za.fill(0, C.getSize(x.d), 1)
		else return x.p
	}
	C.asSpace = function (x) {
		x = C.parseSpace(x)
		var d, out = []
		for (d = 0; d < C.dLen; d++) {
			out[d] = C.asPos({d:d, s:x.s})
		}
		return out
	}
	// For every pos in mask which is "mask", take the value from baseS
	C.addSpaces = function (base, mask) {
		base = C.parseSpace(base).s
		if (!mask) return base
		mask = C.parseSpace(mask).s
		for (var d = 0; d < C.dLen; d++) {
			if (mask[d] == "mask") mask[d] = base[d]
		}
		return mask
	}
	// Gets the next space on the iterating dimension
	C.nextSpace = function (s, d) {
		if (d == null) throw "zDataCube.nextSpace(): No iterating dimension defined."
		return this.addSpaces(s, {d:d, p:s[d] + 1})
	}
	// Gets the prev space on the iterating dimension
	C.prevSpace = function (s, d) {
		if (d == null) throw "zDataCube.prevSpace(): No iterating dimension defined."
		return this.addSpaces(s, {d:d, p:s[d] - 1})
	}
	/////////////////
	//  Iterators  //
	/////////////////
	// Get a list of spaces in x, but extended by x.mask and with no duplication (e.g. If x.s == "all" and x.mask == ["all", "mask", "mask"], then this will return [["all", 0, 0], ["all", 0, 1], ["all", 1, 0]...])
	C.listSpaces = function (x) {
		var d, curr, max = [], out = [],
			counter = za.fill(0, C.dLen),
			base = C.asSpace(x),
			mask = (x.mask) ? C.parseSpace(x.mask).s : null
		// Work out the iteration parameters for each dimension
		if (mask) for (d = 0; d < C.dLen; d++) {
			if (mask[d] != "mask") base[d] = "mask" // If mask[d] has a real value (i.e. Not "mask"), then set s[d] to "mask" - this will stop listSpaces() from generating reference spaces in that dimension
		}
		for (d = 0; d < C.dLen; d++) {
			base[d] = za.asArray(base[d])
			max[d] = base[d].length - 1
			if (max[d] < 0) return out // A dimension is empty, quit
		}
		// Iterate counter, convert to actual space and add to list
		counter[C.dLen - 1]--
		for (d = C.dLen - 1; d >= 0; d--) { // Go backwards
			if (counter[d] < max[d]) { // Find the first value that can be bumped without going bust
				counter[d]++ // Bump
				for (d++; d < C.dLen; d++) counter[d] = 0 // Reset all subsequent values to 0
				curr = []
				for (d = 0; d < C.dLen; d++) curr[d] = base[d][counter[d]] // Converts counter to base val
				out.push(C.addSpaces(curr, mask)) // Add mask
			}
		}
		return out
	}
	C.forPos = function (x, f) {
		var i, p = za.asArray(C.asPos(x))
		for (i = 0; i < p.length; i++) f({d:x.d, p:p[i]})
	}
	C.forSpaces = function (x, f) {
		var i, s = C.listSpaces(x)
		for (i = 0; i < s.length; i++) f({s:s[i]})
	}
	C.forGenerations = function (d, f, reverse, skipFirst, skipLast) {
		var g, tree = C.getMeta("tree", {d:d})
		skipFirst = skipFirst || 0
		skipLast = skipLast || 0
		if (reverse) {
			for (g = tree.length - 1 - skipFirst; g >= skipLast; g--) {
				f({d:d, p:tree[g]})
			}
		} else {
			for (g = skipFirst; g < tree.length - skipLast; g++) {
				f({d:d, p:tree[g]})
			}
		}
	}
	C.forMeta = function (type, x, f) {
		var oldVal, newVal
		C.forPos(x, function (x) {
			oldVal = C.getMeta(type, x)
			newVal = f(oldVal, x)
			C.setMeta(type, x, newVal)
		})
	}
	C.forData = function (type, x, f) {
		var oldVal, newVal
		C.forSpaces(x, function (x) {
			oldVal = C.getData(type, x)
			newVal = f(oldVal, x)
			C.setData(type, x, newVal)
		})
	}
	//////////////
	//  Domain  //
	//////////////
	// Shortcut for getting the size of each dimension
	C.getSize = function (d, isR) {
		if (d != null) {
			if (!C.meta[d].name) throw "zDataCube.getSize(): Dimension " + d + " does not contain name property."
			return (isR) ? C.domain[d].length : C.meta[d].name.length
		} else {
			var out = []
			for (d = 0; d < C.dLen; d++) {
				out[d] = C.getSize(d, isR)
			}
			return out
		}
	}
	// Sets domain[d], and backs up the old one to oldDomain[d]
	C.setDomain = function (d, newDomain) {
		if (d != null) { // Set/reset a specified domain
			C.oldDomain[d] = C.domain[d]
			C.domain[d] = newDomain || za.fill(0, C.getSize(d), 1) // Replace domain with newDomain or a sequential array (i.e. Everything)
		} else { // Reset all
			for (d = 0; d < C.dLen; d++) {
				C.setDomain(d)
			}
		}
	}
// 	// Filter domain by metadata (additive to previous filters)
// 	C.filterDomain = function (type, d, v1, mode, v2) {
// 		var meta = C.getMeta(type, {d:d, p:C.domain[d]}), // Get all domain values of the targeted metadata set
// 			p = za.getAll(meta, v1, mode, v2) // Get the pos of all matching values
// 		C.setDomain(d, p)
// 		return domain
// 	}
	////////////////
	//  Metadata  //
	////////////////
	C.setMeta = function (type, x, val) {
		if (type != null && type != "all") { // Type is specified
			var i, p = C.asPos(x), meta = C.meta[x.d]
			if (p == null) meta[type] = val // Treat x as dimension, and set entire meta[type] to val
			else { // Set a single element of meta
				if (!meta[type]) { // If this meta is empty, create it
					logger("zDataCube.setMeta(): Creating new meta of type " + type + " in dimension " + x.d + ".")
					meta[type] = []
				}
				if (typeof p == "number") meta[type][p] = val
				else if (za.isArray(p)) {
					for (i = 0; i < p.length; i++) {
						meta[type][p[i]] = val
					}
				}
			}
		} else for (type in val) { // Set many types at once
			if (type == "all") {
				throw "zDataCube.setMeta(): 'all' is a reserved type name used to call up all types of metadata at once. Don't use it in your data."
			}
			C.setMeta(type, x, val[type])
		}
	}
	C.getMeta = function (type, x) {
		var p = C.asPos(x), meta = C.meta[x.d]
		if (!meta[type]) {
			throw "zDataCube.getMeta(): Metadata type " + type + " in dimension " + x.d + " does not exist."
		}
		return (p == null) ?
			meta[type] : // Whole dimension
			za.map(meta[type], p) // If it's a partial selection, grab the elements requested in p
	}
	C.getAllMeta = function (x) {
		var i, out, p = C.asPos(x), meta = C.meta[x.d]
		if (p == null) {
			throw "zDataCube.getAllMeta(): Pos not specified. What do you want me to .getAllMeta() of?."
		}
		if (za.isArray(p)) {
			out = []
			for (i = 0; i < p.length; i++) {
				out[i] = C.getAllMeta({d:x.d, p:p[i]})
			}
		} else {
			out = {}
			for (type in meta) {
				out[type] = meta[type][p]
			}
			out.p = p // Give it an pos - this overrides meta[type].p, which shouldn't exist anyway
		}
		return out
	}
	C.getName = function (x) {return C.getMeta("name", x)},
	// Finds the first pos in .meta[d] which matches the arguments
	C.findMeta = function (type, x, v1, mode, v2) {
		var p = C.asPos(x), meta = C.getMeta(type, x), // Get metadata in the search range
			match = za.find(meta, v1, mode, v2) // Find matches within the range (positions returned here are only relative to the search range!)
		return (p == null) ? match : za.map(p, match) // If only part of the dimension was searched, then matches have to mapped against the search range to get the real position
	}
	// Finds all the pos in .meta[d] which matches the arguments
	C.findAllMeta = function (type, x, v1, mode, v2) {
		var p = C.asPos(x), meta = C.getMeta(type, x), // Get metadata in the search range
			matches = za.findAll(meta, v1, mode, v2) // Find matches within the range (positions returned here are only relative to the search range!)
		return (p == null) ? matches : za.map(p, matches) // If only part of the dimension was searched, then matches have to mapped against the search range to get the real position
	}
	// Extend a dimension by adding a set of meta (meta.name is required as the uid) and return its position - if name already exists, it will return position and NOT add
	C.shyPushMeta = function (type, d, meta) {
		var p = C.findMeta(type || "name", {d:d}, meta.name || meta) // Find pos
		if (p != null) return p // If it exist, return it
		p = C.getSize(d)
		C.domain[d].push(p)
		C.setMeta(type, {d:d, p:p}, meta)
		return p
	}
	// Apply za.calc functions (sum, mean, etc.)
	C.calcMeta = function (mode, type, x, v1, v2, v3) {
		var a = za.asArray(C.getMeta(type, x))
		return za.calc(mode, a, v1, v2, v3)
	}
	// Creates a new meta type, calculated using .calcMeta()
	C.addCalcMeta = function (mode, type, x, v1, v2, v3) {
		var i, p = C.asPos(x),
			nameStr = zt.camelCase([type, mode]),
			result = C.calcMeta(mode, type, x, v1, v2, v3)
		for (i = 0; i < p.length; i++) {
			C.setMeta(nameStr, {d:x.d, p:p[i]}, result[i])
		}
	}
	// Algorithms for assigning colours - pain in the balls
	C.setColour = function (x, palette, mode) {
		palette = palette || zt.getPalette(null, 12, "sequential")
		var g, i, j, k, n, out = [], pool = [], prev, isMatch,
			p = C.asPos(x)
		if (mode == "tree" || mode == "randomTree") {
			if (palette.length < 3) throw "zDataCube.setColour(): Can't do a tree assignment with less than 3 colours."
			g = C.meta[x.d].tree
			for (i = 0; i < g.length; i++) for (j = 0; j < g[i].length; j++) {
				if (!pool.length) pool = (mode == "tree") ? palette.slice() : za.getRandom(palette, palette.length)
				n = C.getAllMeta({d:x.d, p:g[i][j]})
				for (k = 0; k < pool.length; k++) {
					isMatch =
						(prev && out[prev.p] == pool[k]) ? false : // Same colour as the previous element - unacceptable
						(n.parent != null && out[n.parent] == pool[k]) ? false : // Same colour as parent - unacceptable
						true
					if (isMatch) {
						out[n.p] = pool.splice(k, 1)[0]
						break
					} else if (k == pool.length - 1) { // Reset (if the palette is only 2 or less, then a match may be impossible, so don't reset)
						k = -1
						za.add(pool, (mode == "tree") ? palette.slice() : za.getRandom(palette, palette.length))
					}
				}
				prev = n
			}
		} else out = zt.getPalette(palette, p.length, mode || "sequential")
		C.setMeta("colour", {d:x.d}, out)
	}
	////////////
	//  Data  //
	////////////
	C.addDataType = function (type, data) {
		C.data[type] = data || []
	}
	// CRITICAL FUNCTION
	C.setData = function (type, s, newData) {
		za.setDeep(C.data[type], C.asSpace(s), newData)
	}
	// CRITICAL FUNCTION
	C.getData = function (type, s) {
		return za.getDeep(C.data[type], C.asSpace(s))
	}
	C.getVal = function (s) {return C.getData("val", s)}
	// Apply za.calc functions (sum, mean, etc.)
	C.calcData = function (mode, type, x, v1, v2, v3) {
		var a = za.flatten(za.asArray(C.getData(type, x)))
		return za.calc(mode, a, v1, v2, v3)
	}
	// Calc data then set it to meta
	C.addCalcData = function (mode, type, x, v1, v2, v3) {
		var i, nameStr = zt.camelCase([type, mode])
		if (!C.data[nameStr]) C.addDataType(nameStr) // Create data object only if it doesn't already exist
		C.forSpaces(x, function (x) {
			var result = C.calcData(mode, type, x, v1, v2, v3),
				cells = C.listSpaces(x)
			for (i = 0; i < cells.length; i++) {
				C.setData(nameStr, {s:cells[i]}, result[i])
			}
		})
		return C.getData(type, x)
	}
	//////////////////
	//  Tree nodes  //
	//////////////////
	C.makeTree = function (d) {
		if (d != null) {
			var i, p, currGen = [], nextGen,
				children = [], leaves = [], generation = [], tree = [],
				parent = C.meta[d].parent, // meta[d].parent is the position of the parent
				parentName = C.meta[d].parentName, // meta[d].parentName is the name of the parent
				origLength = (parentName) ? parentName.length : (parent) ? parent.length : null
			// Use parentName to find parent
			if (parentName) for (parent = [], i = 0; i < C.getSize(d); i++) {
				parent[i] =
					(parentName[i] == "root" || parentName[i] == "" || parentName[i] == null) ? null : // "root" and null mean this is a root node
					C.shyPushMeta("name", d, parentName[i]) // If the name already exists, it will only find rather than extend
			}
			// Create nodes and set parents
			if (parent) for (i = 0; i < C.getSize(d); i++) {
				p = parent[i]
				if (p == i) throw "zDataCube.makeTree(): UH OH - " + C.getName({d:d, p:i}) + " is its own parent. Space-time continuum collapsing."
				parent[i] = (p == -1) ? null : p // -1 or null mean this is a root node
				children[i] = []
				leaves[i] = 0
			} else return // If no meta[d].parentName or meta[d].parent, quit
			// Set children
			for (i = 0; i < C.getSize(d); i++) {
 				p = parent[i]
				if (p != null) children[p].push(i)
			}
			// Set tree
			currGen = za.findAll(parent, null) // Start with root generation
			while (currGen.length > 0) {
				nextGen = [] // Reset next generation
				for (i = 0; i < currGen.length; i++) { // For each member of the current generation
					p = currGen[i]
					generation[p] = tree.length // Give it a generation value...
					za.add(nextGen, children[p]) // ...and add its children to the next generation
				}
				tree.push(currGen) // Put the current generation aside
				currGen = nextGen // And move on to the next generation
			}
			// Put into datacube
			C.setMeta(null, {d:d}, {
				parent:parent,
				children:children,
				leaves:leaves,
				tree:tree,
				generation:generation
			})
			C.showNodes({d:d, p:"all"}) // Set shown values of nodes (show all)
			logger("zDataCube.makeTree(): " + parent.length + " nodes added into " + tree.length + " generations in dimension " + d + ", with " + (parent.length - origLength) + " imputed nodes.")
		} else for (d = 0; d < C.dLen; d++) C.makeTree(d)
	}
	// Create a new root node and move all existing nodes underneath it
	C.addRootNode = function (d, name) {
		var i, meta = C.meta[d],
			p = C.findMeta("name", {d:d}, name || "root")
		if (p == null) p = C.getSize(d)
		// Create tree infrastructure if it doesn't exist
		if (!meta.generation) {
			meta.parentName = za.fill("root", C.getSize(d))
			C.makeTree(d)
		}
		// Bump all existing nodes up by one generation
		for (i = 0; i < meta.generation.length; i++) {
			if (meta.generation[i] == 0) meta.parent[i] = p // Make current root generation its child
			meta.generation[i]++ // Bump
		}
		// Create root node
		C.setMeta(null, {d:d, p:p}, {
			name:name || "root", parent:null, children:meta.tree[0],
			generation:0, leaves:C.calcMeta("sum", "leaves", {d:d, p:meta.tree[0]})
		})
		meta.tree = [[p]].concat(meta.tree) // Add to tree
		return C.getAllMeta({d:d, p:p})
	}
	// showNode() propagates upwards (when a child shows, it gets a leaves++, and ALL of its ancestors get a leaves++)
	C.showNodes = function (x) {
		var i, parent, currLeaves,
			leaves = C.meta[x.d].leaves,
			p = za.asArray(C.asPos(x))
		for (i = 0; i < p.length; i++) {
			x = {d:x.d, p:p[i]}
			parent = C.findParent(x)
			currLeaves = C.calcFamily("children", "sum", "leaves", x)
			C.setMeta("leaves", x, Math.max(1, currLeaves)) // Leaves is the number of leaves on its children, or 1 if it has no children
			za.shyPush(C.domain[x.d], x.p) // Add to domain
			if (parent != null) C.showNodes({d:x.d, p:parent}) // Iterate up the tree
		}
	}
	// hideNode() propagates upwards (all ancestors lose the leaves being hidden) AND downwards (all decendent nodes are hidden as well)
	C.hideNodes = function (x) {
		var i, parent, ancestors, descendants, currLeaves,
			leaves = C.meta[x.d].leaves,
			p = C.asPos(x)
		for (i = 0; i < p.length; i++) {
			x = {d:x.d, p:p[i]}
			parent = {d:x.d, p:C.findParent(x)}
			ancestors = {d:x.d, p:C.findFamily("ancestors", x)}
			descendants = {d:x.d, p:[p[i]].concat(C.findFamily("descendants", x))}
			currLeaves = C.getMeta("leaves", x)
			if (C.getMeta("leaves", parent) > currLeaves) currLeaves-- // If node is parent's only child, then leave one leaf behind (i.e. parent will become a standalone leaf)
			C.forMeta("leaves", ancestors, function (val) {return val - currLeaves}) // Remove from ancestors
			C.setMeta("leaves", descendants, 0) // Hide node
			za.remove(C.domain[x.d], descendants) // Remove from domain
		}
	}
	C.findFamily = function (relationship, x, liveOnly) {
		var out = [], curr
		if (relationship == "all") {
			out = C.asPos(x)
		} else if (relationship == "parent") {
			out = C.getMeta("parent", x)
		} else if (relationship == "children") {
			out = C.getMeta("children", x)
		// Children of node, plus their children, plus their children... (liveOnly excludes all the ones with leaves of 0)
		} else if (relationship == "descendants") {
			curr = za.flatten(C.findChildren(x, liveOnly)) // Flatten, in case multiple targets are selected
			while (curr != null && curr.length > 0) {
				za.add(out, curr)
				curr = za.flatten(C.findChildren({d:x.d, p:curr}, liveOnly)) // Flatten, in case multiple targets are selected
			}
		} else {
			var i, parent, children,
				p = C.asPos(x)
			if (relationship == "siblings") {
				parent = C.findParent(x) // Find its parent
				children = za.flatten(C.findChildren({d:x.d, p:parent})) // Its parents children are its siblings and itself
				out = za.subtract(children, p) // Remove itself from group
			// Parent of node, plus its parent, plus its parent...
			} else if (relationship == "ancestors") {
				for (i = 0; i < C.getMeta("generation", x); i++) {
					p = C.findParent({d:x.d, p:p})
					if (p == null) break
					out.push(p)
				}
			}
		}
		if (liveOnly && za.isArray(out)) return za.asArray(C.findAllMeta("leaves", {d:x.d, p:out}, 0, ">")) // Return the same array structure, but with only live members
		else return out
	}
	// Shortcuts
	C.findParent = function (x) {return C.findFamily("parent", x)}
	C.findChildren = function (x, liveOnly) {return C.findFamily("children", x, liveOnly)}
	// Find a path of nodes between two nodes
	C.findRelationship = function (d, startAPos, endAPos) {
		if (C.asPos({d:d, p:startAPos}) == null) return logger("zDataCube.findRelationship(): startAPos " + zt.asString(startAPos) + " is not valid.")
		if (C.asPos({d:d, p:endAPos}) == null) return logger("zDataCube.findRelationship(): endAPos " + zt.asString(endAPos) + " is not valid.")
		var i, pos,
			startToRoot = za.add([startAPos], C.findFamily("ancestors", {d:d, p:startAPos}))
			endToRoot = za.add([endAPos], C.findFamily("ancestors", {d:d, p:endAPos})).reverse()
		for (i = 0; i < startToRoot.length; i++) {
			pos = za.find(endToRoot, startToRoot[i])
			if (pos != null) return za.add(startToRoot.slice(0, i), endToRoot.slice(pos))
		}
		return []
	}
	C.getFamily = function (relationship, type, x) {
		var p = C.findFamily(relationship, x)
		return C.getMeta(type, {d:x.d, p:p})
	}
	// Calc functions
	C.calcFamily = function (relationship, mode, type, x, liveOnly) {
		var p = C.findFamily(relationship, x, liveOnly),
			vals = C.getMeta(type, {d:x.d, p:p})
		return za.calc(mode, vals)
	}
	// Aggregate all children values and add it to parents
	C.calcTreeMeta = function (mode, type, d) {
		if (mode == "stacked") { // Stack is special because children must all fit within the range of the parent
			var tree = C.meta[d].tree
			C.addCalcMeta("stacked", type, {d:d, p:tree[0]}, 0) // Stack for root generation
			C.forGenerations(d, function (x) {
				C.forPos(x, function (x) {
					var newVal,
						oldVal = C.getMeta(type + "Stacked", x),
						children = {d:d, p:C.findChildren(x)}
					C.addCalcMeta("stacked", type, children, oldVal.start) // Stack for each subsequent generation
					newVal = za.mergeStacked(C.getMeta(type + "Stacked", children))
// 					if (d3.round(newVal.end, 10) != d3.round(oldVal.end, 10)) {
// 						logger("zDataCube.calcTreeMeta(): UH OH - Range for " + C.getName(x) + " is " + zt.asString(oldVal) + ", but its children is " + zt.asString(newVal) + " {d:" + d + ", p:" + x.p + ", type:" + type + "}.")
// 					}
				})
			}, false, 0, 1)
		} else { // For non-stacked, elements just have to be calculated within each generation
			C.forGenerations(d, function (x) {
				C.forMeta(type, x, function (oldVal, x) {
					var newVal = C.calcFamily("children", mode, type, x)
// 					if (oldVal != null && newVal != oldVal) {
// 						logger("zDataCube.calcTreeMeta(): UH OH - Value for " + C.getName(x) + " is " + oldVal + ", but the " + mode + " of its children is " + newVal + " {d:" + d + ", p:" + x.p + ", type:" + type + "}.")
// 					}
					return newVal
				})
			}, true, 1, 0)
		}
	}
	// Aggregate all children values and add it to parents
	C.calcTreeData = function (mode, type, d) {
		C.forSpaces({s:"all", mask:{d:d, p:"na"}}, function (space) { // Iterate through each space NOT in the selected dimension
			if (mode == "stacked") { // For stacked, calculate children based on parent value
				space.s[d] = C.getMeta("tree", {d:d})[0] // Find the root generation
				C.addCalcData("stacked", type, space, 0) // Stack for members of that generation first
				C.forGenerations(d, function (x) { // For each generation in the selected dimension
					C.forData(type + "Stacked", {s:C.addSpaces(space, x)}, function (oldVal, x) { // Go through each member
						// TODO: Does not check if children are valid
						x.mask = {d:d, p:C.findChildren({d:d, s:x.s})} // Find its children
						C.addCalcData("stacked", type, x, oldVal.start) // Stack for those children, starting at oldVal
						return oldVal // .forData() is expecting a value
					})
				}, false, 0, 1) // Top to bottom, skip bottom-most generation
			} else { // For non-stacked, calculate parent based on children values
				C.forGenerations(d, function (x) { // For each generation in the selected dimension
					C.forData(type, {s:C.addSpaces(space, x)}, function (oldVal, x) { // Go through each member
						if (oldVal != null && oldVal != "") return oldVal // Don't update if oldVal is valid
						space.s[d] = C.findChildren({d:d, s:x.s})
						return C.calcData(mode, type, space)
					})
				}, true, 1, 0) // Bottom to top, skip top-most generation
			}
		})
// 		C.verifyTreeData(mode, type, d)
	}
	C.verifyTreeData = function (mode, type, d) {
		C.forSpaces({s:"all", mask:{d:d, p:"na"}}, function (space) { // Iterate through each space NOT in the selected dimension
			if (mode == "stacked") { // For stacked, calculate children based on parent value
				C.forGenerations(d, function (x) { // For each generation in the selected dimension
					C.forData(type + "Stacked", {s:C.addSpaces(space, x)}, function (oldVal, x) { // Go through each member
						space.s[d] = C.findChildren({d:d, s:x.s})
						if (!space.s[d].length) logger("zDataCube.calcTreeData(): Hmm - " + zt.asString(C.getName({d:d, s:x.s})) + " is in generation " + C.getMeta("generation", {d:d, s:x.s}) + " of " + C.meta[d].tree.length + ", but it has no children. Just sayin'.")
						else {
							var newVal = za.mergeStacked(C.getData(type + "Stacked", space))
							if (!zo.equals(newVal, oldVal)) logger("zDataCube.calcTreeData(): UH OH - Range for node " + zt.asString(C.getName({d:d, s:x.s})) + " is " + zt.asString(oldVal) + ", but its children is " + zt.asString(newVal) + " (type:" + type + ").")
						}
						return oldVal // .forData() is expecting a value
					})
				}, false, 0, 1) // Top to bottom, skip bottom-most generation
			} else { // For non-stacked, calculate parent based on children values
				C.forGenerations(d, function (x) { // For each generation in the selected dimension
					C.forData(type, {s:C.addSpaces(space, x)}, function (oldVal, x) { // Go through each member
						space.s[d] = C.findChildren({d:d, s:x.s})
						if (!space.s[d].length) logger("zDataCube.calcTreeData(): Hmm - " + zt.asString(C.getName({d:d, s:x.s})) + " is in generation " + C.getMeta("generation", {d:d, s:x.s}) + " of " + C.meta[d].tree.length + ", but it has no children. Just sayin'.")
						else {
							var newVal = C.calcData(mode, type, space)
							if (!zo.equals(newVal, oldVal)) logger("zDataCube.calcTreeData(): UH OH - Value for node " + zt.asString(x) + " is " + zt.asString(oldVal) + ", but its children is " + zt.asString(newVal) + " (type:" + type + ").")
						}
						return oldVal
					})
				}, true, 1, 0) // Bottom to top, skip top-most generation
			}
		})
	}
	//////////////////////
	//  Push functions  //
	//////////////////////
	// Creates a dumb dc - has nothing in it but a single dimension of names, used for creating a comboBox etc.
	C.importDumb = function (a) {
		C.meta[0]["name"] = a || []
		C.setDomain() // Recalculates dimension sizes, based on the new names
		return C
	}
	// Push a strip into the cube - strips are space-inefficient, but very easy to use
	C.importStrip = function (newStrip, noReset) {
		var i, a, d, p, type, row, s,
			metaCols = [], dataCols = {}
		// Read headers and parse data structure
		for (i = 0; i < newStrip[0].length; i++) { // For each column
			a = newStrip[0][i].split("~") // Read and split header
			if (a.length == 2) { // If it has two components, it must be metadata, and the first value must be the dimension (e.g. "1~name" means metadata type "name" for dimension 1)
				d = a[0] // Dimension
				type = a[1] // Type
				metaCols[d] = metaCols[d] || {} // MetaData is collected for each dimension in metaCols
				if (metaCols[d][type]) logger("zDataCube.importStrip(): UH OH - " + metaCols[d][type] + " already exists.")
				metaCols[d][type] = i
			} else if (a.length == 1) { // data
				type = a[0] // Type
				dataCols[type] = i
			} else logger("zDataCube.importStrip(): UH OH - I don't understand header " + newStrip[0][i] + ". Metadata headers should be [dimension]~[type] (e.g. '0~name'), data headers should be [type] (e.g. 'data').")
		}
		if (zo.isEmpty(dataCols)) logger("zDataCube.importStrip(): UH OH - no data found in strip.")
		if (zo.isEmpty(metaCols)) logger("zDataCube.importStrip(): UH OH - no metadata found in strip.")
		for (d = 0; d < metaCols.length; d++) if (metaCols[d].name == null) logger("zDataCube.importStrip(): UH OH - no name found for dimension " + d +".")
		// Reset cube
		if (!noReset) {
			C.dLen = dLen // How many dimensions
			for (d = 0; d < dLen; d++) {
				C.meta[d] = {name:[]} // At minimum, names are required
				C.domain[d] = []
				C.oldDomain[d] = []
			}
		}
		// Populate cubes with data
		for (p in dataCols) C.addDataType(p) // Add data types
		for (i = 1; i < newStrip.length; i++) { // Go through each row
			row = newStrip[i]
			s = [] // Space is the address for the data cell which corresponds to this row
			for (d = 0; d < C.dLen; d++) { // Check all dimensions to figure out what the correct space should be
				s[d] = C.findMeta("name", {d:d}, row[metaCols[d].name]) // In each dimension, look for name (metaCols[d].name is the column number for name in dimension d, e.g. If the header for the fifth column is 1~name, then metaCols[1].name == 4; rows[metaCols[d].name] is the actual name)
				if (s[d] == null) { // If existing dimension doesn't contain name (NOTE: this only happens when name is not found, so other meta will not be looked at unless the name is new)
					a = {}
					for (p in metaCols[d]) a[p] = row[metaCols[d][p]] // Collate all valid meta in that dimension
					s[d] = C.shyPushMeta(null, d, a) // Extend dimension with meta
				}
			}
			for (p in dataCols) C.setData(p, {s:space}, row[dataCols[p]]) // For every dataType, insert data
		}
		C.setDomain() // Recalculates dimension sizes, based on the new names
		C.makeTree() // Construct trees if required
		return C
	}
	// Set from a protoCube - overwrites all existing data (everything is ready to slot straight in except for trees)
	C.importProtoCube = function (protoCube, flatInput) {
		var p, q, key
		C.dLen = protoCube.meta.length
		C.meta = protoCube.meta
		// Import each data type separately
		for (p in protoCube.data) {
			if (protoCube.data[p] instanceof Array) {
				C.data[p] = protoCube.data[p]
			} else if (typeof protoCube.data[p] == "object") {
				C.addDataType(p)
				for (q in protoCube.data[p]) {
					C.setData(p, q.split(","), protoCube.data[p][q])
				}
			} else {
				throw "zDataCube.importProtoCube: ERROR! Type " + p + " in source data doesn't make sense."
			}
		}
		C.setDomain() // Recalculates dimension sizes, based on the new names
		C.makeTree() // Construct trees if required
		// Override names with displayNames
		for (var d = 0; d < C.dLen; d++) if (C.meta[d].displayName) {
			C.forMeta("name", {d:d, p:"all"}, function (oldVal, x) {
				return C.meta[d].displayName[x.p] || oldVal
			})
		}
		return C
	}
	C.debug = function (x) {
		var p, d
		for (p in C.data) {
			console.log("type = " + p + ":", C.getData(p, x))
		}
		for (d = 0; d < C.dLen; d++) {
			x.d = d
			console.log("d = " + d + ":", C.getName(x))
		}
	}
	// Initialise
	C.init = function (rawData) {
		C.meta = []
		C.domain = [] // Metaaxis used to show/hide parts of the cube
		C.oldDomain = [] // The previous domain, so a comparison can be made when required
		C.data = {} // Filled with actual 3D arrays containing data
		C.dLen = dLen // How many dimensions
		for (var d = 0; d < dLen; d++) {
			C.meta[d] = {name:[]} // At minimum, names are required
			C.domain[d] = []
			C.oldDomain[d] = []
		}
		// Auto import data
		if (!rawData) return
		else if (rawData.meta && rawData.data) C.importProtoCube(rawData) // Protocube
		else if (rawData instanceof Array) {
			if (rawData[0] instanceof Array) C.importStrip(rawData)
			else C.importDumb(rawData) // Dumb
		}
	}
	C.init(rawData)
}

/*

=================
  General notes
=================

Hierarchy (CANVAS -> zSwarm -> zSwarm.roles -> zDrones -> zDrone.parts)

CANVAS
	Control object for main SVG canvas, which is named #chewy by default

	<svg id=chewy>

	.d3 - d3 controller for the node.

zSwarm - handles data, controls zDrones
	Joins (the concept, not real d3 joins)
		.add() determines which drones need to be added.
		.setSpace() keeps drones pointed at the right data.
	Data interpretation
		.plot() turns data into orders for drones.
		.setSpace() keeps drones pointed at the right data.
	Keyframe animation
		.plot() sets start/end states (and stores them with drones).
		.frameRedraw() interpolates and draws.
	Selective actions
		.get() allows selection of a subset of drones.
		Virtually every other action is based on .get().

	<svg id=chewy>
		<g id=swarmName class="zSwarm">

	.parent - Must be CANVAS
	.container
		zDrone for the container element - zSwarm.get("swarm") will return the container (so zSwarm.remove("swarm") will remove the whole container, etc.)
		A swarm's container element ONLY contains the role containers
	.roles
		Containers for each role defined in the plan, they make layering much simpler
		Real drones can ONLY be attached to role containers, not to the main container
	.drones
		Array containing all its zDrones
		Note that removal is done by the drones itself
	.el/.$/.d3 - node/jQuery/d3 handle for the container


zDrone - basic unit, takes orders, passes it to parts
	Part-level actions
		.add() parses orders and creates parts.
		.attr()/.style() can handle part-level and drone-level orders.
	Drone level actions
		Mouse events, show/hide, addClass/removeClass are all applied to the zDrone's container node (not to its parts)

	<svg id=chewy>
		<g id=swarmName class="zSwarm">
			<g id=role class="zDrone">
				<g id=A>

	OR

	<svg id=chewy>
		<g id=role class="zDrone">

	.parent - zSwarm OR CANVAS
	.el/.$/.d3 - node/jQuery/d3 handle for the container element
	.parts - Object containing all its parts
	.isSimple
		If the drone only has one part, that part will be named in .isSimple
		Simple drones do less fussing about with .parseOrders() and ._transition()

parts
	.make() adds initialising variables to orders and creates the parts.
	.plot() *removes* vital arguments (e.g. Arc variables) from orders and replaces them with computed value (e.g. SVG paths)

	<svg id=chewy>
		<g id=swarmName class="zSwarm">
			<g id=role class="zDrone">
				<text id=partName>

	.parent - zDrone
	.el/.$/.d3 - node/jQuery/d3 handle for the container element
	(No jQuery or node handle, is a d3 object so no d3 handle either)


Layering
	Layering is done on via insertion on attachment. So this happens when the element is first attached to the DOM, and can be refresh by reattaching to the DOM.
	For performance's sake, drones with no layer requests are just appended to the end. If layered drones are mixed with unlayered drones, it'll get messy.
	Layering information, once provided, is stored as .el.layer.

	zSwarms:
		Role containers can be layered by setting the .layer property in the plan.
	zSwarm.roles:
		Drones can be layered within a role container by returning a .layer property in orders.
	zDrones:
		zDrone.parts can be layered within a non-simple zDrone by giving it a .layer property in the part-specific orders
		zDrone.attach() can be rerun to reinsert drones if layering has changed.

*/

function zCanvas (layout, id) {
	id = id || "#chewy"
	var C = this
  // Resize canvas to fit layout
	C.setSize = function (layout) {
		layout = layout || zt.getMaxLayout()
		C.d3.attr({
			width:Math.round(layout.width),
			height:Math.round(layout.height)
		})
		return C
	}
  // Check whether the browser is aware of margins when positioning foreignObjects
  C.foMarginCheck = function () {
    CANVAS = C
    var e = new zHTML({
      text:"zCanvas.foMarginCheck()",
      objClass:"_marginCheck", // _marginTest provides a margin of 7px
      layout:{x:0, y:0}
    })
    if (parseInt(e.$.css("margin-top")) == 0) {
      throw "zCanvas(): ._marginTest style not found in CSS. Is chewydata.css loaded?"
    } else {
      var cTop = C.$.offset().top + parseInt(C.$.css("padding-top"))
      var eTop = e.$.offset().top - cTop
      if (eTop == 0) C.foPlacementFail = true
      else C.foPlacementFail = false
    }
    e.remove()
  }

  C._canvas = this
	C.$ = $(id)
	// Check environment
	if (!C.$.is("svg")) {
		throw id + " is not an SVG object."
	}
	// Set up handlers for self
	C.el = C.$.get()[0]
	C.d3 = d3.select(id)
		.style("position", "relative") // foreignObject rendering errors without this - dunno why
	// Set up handlers for parent (i.e. Parent of the SVG canvas, so things can be attached outside the canvas)
	C.parent = {d3:d3.select("body")}
	C.parent.el = C.parent.d3.node()
	C.parent.$ = $(C.parent.el)
	// Check compatibility
  C.isiPad = navigator.userAgent.match(/iPad/i) != null
	C.nofo = !document.implementation.hasFeature("www.http://w3.org/TR/SVG11/feature#Extensibility","1.1")
	if (C.nofo) console.log("SVG foreignObjects are NOT supported.")
  else C.foMarginCheck()
  // Initialise
	C.setSize(layout)
	return C
}

/*

zDrones

Parses orders (received directly or from zSwarm) and creates parts.
Most of the action will occur here, rather than swarms or parts.
zDrone provides interface for "raw" zDrone, which requires instructions for every part to be explicitly written out.
Other drone types (zTextBox, etc.) provide ready-to-eat templates for drones.
zDrones should never deal directly with data, only direct instructions or sets of orders.

Attributes:
	.el (container)
		The container element in the DOM.
		For complex drones with more than one part, the container is a <g> element which holds all the parts.
		For simple drones with one part, the "container" is actually just the part
	.d3
		The d3 object for the container. (i.e. d3.select(.el))
	.$
		The jQuery object for the container. (i.e. $(.el))

	.parts
		Array containing all of a drone's parts.
		Parts are d3 objects whose elements sit inside the container.
	.parent
		The swarm this drone belongs to.
		If this drone doesn't belong to a swarm, its parent will be CANVAS.

	.L (layout, zLayout)
		Any drone can have a layout, but some drone types require a layout to function (see below).
	.O
		Reserved space for drones to save standing orders.
		For example, text parts need to be aware of its textXAlign value every time in redraws, so it saves that value in .O.

	.s
		The space for this drone.
		This is only provided by a swarm, and only used by the swarm.
	.currOrders, .newOrders, .oldOrders
		Provided by swarms for interpolating orders.
		For example, if the animation has progressed 10%:
			.currOrders = zo.mid(.oldOrders, .newOrders, 0.1)

	._hidden
		Flag for when hiding has been completed.


Layout dependent parts (rect, text, html):
	Some parts require a layout to function. If a part-level layout is specified, that is used. Otherwise, the drone-level layout is used. If neither is specified, the part will not plot.
	Note that if a drone-level layout is used, it will be directly referenced as a part-level layout, so it's possible for multiple parts and the drone to share the same layout (cool) and for each of them to make conflicting changes to the layout (not cool).

Style hierarchy:
	Internally predefined .base (lowest priority)
	Externally defined .base
	EITHER (if drawn independent of swarm):
		orders from add()/attr() (highest priority)
	OR:
		orders from curr()
		orders from init() (highest priority)


Valid drone-level orders
	.base
		Everything in .base gets moved back to the root of the order (whatever is in the order takes priority)
		Useful for passing on styles from a style object instead of running zo.extend().
	.role
		For drones in a swarm, .drone is used to determine the role container it attaches to.
	.id
		zDrone.el's id will be set to .id.
	.type
		For drones not belonging to a swarm, zDrone.el's class will be set to .type.
	.s
		For drones belonging to a swarm, zDrone.el's id will be set to .s.
	.parent
		zDrone.parent must be either a zSwarm or CANVAS.
		It is NOT a zSwarm.roles container (zDrone.el is added to zSwarm.roles[r].el, but zDrone.parent == zSwarm).
	.layout/.L
		zDrone.L will be created/set based on .layout/.L.

Valid part-level orders
	.id
		zDrone.part[p].el's id will be set to .id.
	.type
		zDrone.part[p].el's class will be set to .type.
		The .plot/.make functions used will be drawn from zDrone._presetParts[.type].
	.layout/.L
		zDrone.parts[p].L will be created/set based on .layout/.L.
	.plot
		Can be a custom plot function.
	.make
		Can be a custom make function.

*/

function zDrone (O, t, b) {
	this._canvas = CANVAS // Save reference to CANVAS on creation
	this.add(O, t, b) // .add() won't run if order is empty, so this can be used as a blank slate
	return this
}
// Extracts layout from orders (using drone-level layout if O.layout is empty)
// Works for both drones and parts
zDrone.prototype._parseLayout = function (O, required) {
	var layout = zo.r(O, "layout") || zo.r(O, "L") || this.L
	if (!layout) {
		if (!required) return // Layout not required and not received, so die quietly
		console.log(O)
		throw "zDrone.add(): This part requires a layout, but no layout defined at the drone- or part-level."
	} else {
		layout = (layout instanceof zLayout) ? layout : new zLayout(layout, this)
		layout.changed = true // Set flag to true, in case something else has changed it
		return layout
	}
}
// Replacement for .plot() for complex drones
zDrone.prototype._complexPlot = function (O, D) {
	for (var p in D.parts) if (O[p]) {
		O[p] = D.parts[p].plot(O[p], D) // Plot
	}
	return O
}
// Replacement for ._parseOrders() for complex drones
zDrone.prototype._complexParse = function (O) {
	var D = this, p, partsO = {}
	for (p in D.parts) partsO[p] = zo.r(O, p) || {} // Extract part-specific orders
	for (p in D.parts) partsO[p] = zo.clone(O, partsO[p]) // Populate part-specific orders with common orders (partOrders has priority)
	return zo.extend(O, partsO) // Fold part-specific orders back into orders and return
}
// Prepare orders for .add() and .attr()
zDrone.prototype._parseOrders = function (O) {
	var D = this, partsO = zo.r(O, D.isSimple) // Extract part-specific orders
	return (partsO) ? zo.extend(O, partsO) : O // Populate part-specific orders with common orders (partOrders has priority)
}
// Starts the part creation process by parsing the order and running the part-specific make script
zDrone.prototype._initPart = function (O) {
	var D = this, P,
		base = D._presetParts[O.type], // Leave type for ._makePart()
		plot = zo.r(O, "plot") || base.plot // Allow custom plot() to be delivered through orders
		make = zo.r(O, "make") || base.make // Allow custom make() to be delivered through orders
	if (!make) throw "zDrone.add(): " + type + " is not a valid part type."
	P = make(O, D) // Make part
	if (plot) P.plot = plot // Alternatively, plot can be provided by O.plot
	return P
}
// Create a part with .el/.$/.d3 handles - can be parts or container
// Called by make script, then returns the part so it can make changes to it before passing it back to ._initPart()
zDrone.prototype._makePart = function (tag, O) {
	if (this._canvas.nofo && O.type == "zHTML") tag = "div" // If foreignobject is not supported, zHTML *role containers* should be divs
	var D = this, parent, r = D.parent.roles,
		namespace = (tag == "div") ? // zHTML role containers and zHTML objects themselves will both have tag == "div"
			"http://www.w3.org/1999/xhtml" :
			"http://www.w3.org/2000/svg",
		el = document.createElementNS(namespace, tag)
		layer = zo.r(O, "layer"),
		id = zo.r(O, "id"),
		role = zo.r(O, "role"),
		type = zo.r(O, "type"),
		objClass = zo.r(O, "objClass"),
		s = zo.r(O, "s"),
		P = {el:el, $:$(el), d3:d3.select(el)}
	// A drone container already exists, attach part to drone container
	if (D.el) {
		parent = D
	// Parent has a role container, attach part to role container
	} else if (r && r[role]) {
		parent = r[role]
		type = null // Drones within roles just have their space as id (the role container has the role name and type as id and class)
	// No drone or role container identified, attach to parent
	} else {
		parent = D.parent
	}
	zt.attach(P, parent, layer)
	if (id) P.d3.attr("id", id)
	if (type) P.d3.classed(type, true)
	if (objClass) {
		if (objClass instanceof Array) {
			for (i = 0; i < objClass.length; i++) {
				P.d3.classed(objClass[i], true)
			}
		} else P.d3.classed(objClass, true)
	}
	return P
}

////////////////////
//  Add / Remove  //
////////////////////
// Add container and parts to this drone
zDrone.prototype.add = function (O, t, b) {
	if (!O) return
	O = zo.initOrders(O)
	var D = this, keys, tag, o, p
	D.parent = zo.r(O, "parent") || D._canvas
	D.L = D._parseLayout(O) // Parse and save layout
	// Create parts
	D.parts = zo.getAll(O, "type", null, "!=") // Set up .parts - .parseOrders() relies on .parts to work
	keys = zo.keys(D.parts)
	// Simple drones contain only one part and that part serves as the container
	if (keys.length == 1) {
		D.isSimple = p = keys[0]
		o = D._parseOrders(O)
		D.parts[p] = D._initPart(o)
		zo.extend(D, D.parts[p]) // Make the sole part's .el/.d3/.$ handles the drone's
	// Complex drones require a container
	} else { // NOTE: Containers for swarm/canvas have no parts, and are still complex - simple drones must have ONE part
		D.isSimple = false
		D._transition = D._complexTransition
		D._parseOrders = D._complexParse
		D.plot = D._complexPlot // Overwrite container part's plot with complex plot
		zo.extend(D, D._makePart("g", O)) // Create container and make its .el/.d3/.$ handles the drone's
		O = D._parseOrders(O)
		for (p in D.parts) {
			o = O[p]
			o.id = p // Parts should have ids with their part names
			D.parts[p] = D._initPart(o)
		}
	}
	D.attr(O) // Apply parsed init orders
	// NOTE: Sometimes the addClass/removeClass transitions don't work the first time
	// Maybe because of where the nodes are inserted into the DOM or because the first addClass takes place before transitions can be acknowledged?
	// Anyway, this should be run on drone creation to make sure the first addClass/removeClass works
	D.d3.style("transition")
	D.appear(t, b) // Fade in if required
	if (D.L) D.L.changed = false // Reset layout flag
}
// Removes this drone from the DOM and from its parent
zDrone.prototype.remove = function (t, b) {
	var D = this
	D.hide(t, function () { // Fade out
		if (D.parent.drones) za.remove(D.parent.drones, D) // Remove self from swarm - don't rely on swarm to do it
		if (b) b()
	})
}
// Attach this drone to a parent at specified layer
zDrone.prototype.attach = function (layer) {
	var D = this, r = D.parent.roles, // Role containers
		parent = (r && r[D.role]) ? r[D.role] : D.parent // If there's a valid role container, use it, otherwise just use the parent
	zt.attach(D, parent, layer)
}
// Bring to front of its parent container (which could just be a role container)
zDrone.prototype.toFront = function () {
	var D = this, r = D.parent.roles, // Role containers
		parent = (r && r[D.role]) ? r[D.role] : D.parent // If there's a valid role container, use it, otherwise just use the parent
	parent.d3.append(function () {return D.el}) // Put element in DOM
}

/////////////////
//  Show/hide  //
/////////////////
zDrone.prototype.show = function (t, b) {
	var D = this, i, p, listeners
	if (D._hidden) {
		D._hidden = false
		D.attach(D.el.layer) // Reattach element
		if (D.eventListeners) { // Reattach eventListeners as well - otherwise they don't survive hide/show
			for (p in D.eventListeners) {
				listeners = D.eventListeners[p]
				for (i = 0; i < listeners.length; i++) {
					D.$.on(p, listeners[i].handler)
				}
			}
			delete D.eventListeners
		}
	}
	D._fixClass()
	D.removeClass("_hide", t, b) // Fade in
}
// Removes this drone from the DOM and from its parent
zDrone.prototype.hide = function (t, b) {
	var D = this
	D.addClass("_hide", t, function () { // Fade out
		if (!D._hidden) { // Don't save if already hidden, or you'll overwrite saved eventListers with empty object
			D.eventListeners = zo.clone($._data(D.d3.node(), "events")) // Save eventListeners - otherwise they don't survive hide/show
		}
		D._hidden = true
		$(D.el).remove() // Reference D.el explicitly instead of using D.d3/D.$ handle because zHTML objects use the foreignobject container as .el and the div inside as .d3/.$
		if (b) b()
	})
}
zDrone.prototype.appear = function (t, b) {
	if (!t) return
	this._fixClass()
	this.addClass("_hide", 0) // Instant hide
	this.removeClass("_hide", t, b) // Animated show
}
// NOTE: Total hack - sometimes transitioned classes don't work immediately after an element is attached to the DOM
zDrone.prototype._fixClass = function () {
	this.addClass("placeholder")
	this.removeClass("placeholder")
}

///////////////
//  Animate  //
///////////////
// Animated class changes rely on CSS transition properties being manually set
// NOTE: Transition will fail and callback will not be called if adding a class that does not exist
zDrone.prototype._setClass = function (className, mode, t, b) {
	var D = this, obj = D.d3
	if (!className || obj.classed(className) == mode) { // No class name or class is already set to the desired mode
		if (b) b()
		return
	}
	if (typeof t == "number") t = {t:t} // Parse - t can be duration or {t:duration, e:easing}
	obj.classed(className, mode) // Start classed after JS defined transitions but before looking at CSS defined transitions, so that transition values provided by CSS class are captured
	// JS defined transition (don't need to do anything for CSS transitions)
	if (t) {
		obj.style("transition-property", "all")
		obj.style("transition-duration", t.t + "ms")
		obj.style("transition-timing-function", t.e || "ease-in-out") // Bad JS easing value will result in "ease-in"
		obj.style("transition-delay", (t.delay || 0) + "ms")
		obj.style("transition") // Don't know why this is necessary, but it is
	}
	// Check whether callback should be fired immediately
	var property = obj.style("transition-property"),
		duration = obj.style("transition-duration"),
		delay = obj.style("transition-delay")
	// No JS or CSS transition, run callback immediately
	if (t == 0 || (!duration && !delay) || (duration == "0s" && delay == "0s")) {
		if (b) b()
	// Bad transition-property value - transition will fail, run callback immediately
	// CAUTION: Bad easing value in CSS will be parsed as transition-property (but bad JS easing values will be parsed as "ease-in")
	} else if (property != "all" && obj.style(property) == null) {
		console.log("zDrone._classed(): This CSS transition doesn't look right: [" + obj.style("transition") + "].")
		if (b) b()
	// CAUTION: transitionend won't trigger if the transition fails and IE9 does not support this event at all
	} else {
		obj.on("transitionend", function () {
			obj.on("transitionend", "") // Clear transitionend
			if (t) obj.style("transition", "") // Clear JS-defined transition
			if (b) b()
		})
	}
}
zDrone.prototype.addClass = function (className, t, b) {
	this._setClass(className, true, t, b)
}
zDrone.prototype.removeClass = function (className, t, b) {
	this._setClass(className, false, t, b)
}
// Make a transition object (which can be shared)
zDrone.prototype._makeTransition = function (t, b) {
	if (t.namespace == "__transition__") return t // Transition is provided
	else return this.d3.transition() // Make a new transition
		.duration(t.t)
		.ease(t.e || "cubic-in-out") // NOTE: d3 easing
		.each("end", b)
}
// .style() and .attr() use d3 transitions, providing subtransitions for parts if they have a separate set of orders
zDrone.prototype._transition = function (mode, O, t, b) {
	var D = this
	if (typeof t == "number") t = {t:t}
	if (!t || !t.t) { // Instant
		if (O) D.d3[mode](O)
		if (b) b()
	} else { // Animated
		if (O) D._makeTransition(t, b)[mode](O)
	}
}
// .style() and .attr() use d3 transitions, providing subtransitions for parts if they have a separate set of orders
zDrone.prototype._complexTransition = function (mode, O, t, b) {
	var D = this, o, p, P, tr
	if (typeof t == "number") t = {t:t}
	if (!t || !t.t) { // Instant
		if (O) {
			for (p in D.parts) {
				P = D.parts[p], o = zo.r(O, p)
				if (o) P.d3[mode](o)
			}
			D.d3[mode](O)
		}
		if (b) b()
	} else { // Animated
		tr = D._makeTransition(t, b)
		if (O) {
			for (p in D.parts) {
				P = D.parts[p], o = zo.r(O, p)
				if (o) tr.select(function () {return P.el})[mode](o)
			}
			tr[mode](O)
		}
	}
}
zDrone.prototype.style = function (O, t, b) {
	this._transition("style", O, t, b)
}
zDrone.prototype.attr = function (O, t, b) {
	var D = this, p
	if (D.L) D.L.readOrders(O) // Set layout
	O = D._parseOrders(O) // Parse orders for attr
	O = D.plot(O, D) // Plot
	D._transition("attr", O, t, b)
	if (D.L) D.L.changed = false // Reset layout flag
}

//////////////
//  Events  //
//////////////
// Event controllers
zDrone.prototype.mouseEventsOff = function () {
	this.d3.style("pointer-events", "none")
}
zDrone.prototype.mouseEventsOn = function () {
	this.d3.style("pointer-events", null)
}
zDrone.prototype.clearMouseEvents = function (eventType) {
	this.$.unbind(eventType) // Clears all events if eventType is null
}
zDrone.prototype.getEventPos = function (e) {
	var offset = this._canvas.$.offset()
	return {x:e.pageX - offset.left, y:e.pageY - offset.top}
}
// Basic events - use jQuery event control because they can handle multiple listeners for each event
zDrone.prototype.click = function (f) {
	this.d3.classed("_clickable", true)
	this.$.click(f)
}
zDrone.prototype.dblclick = function (f) {this.$.dblclick(f)}
zDrone.prototype.mousedown = function (f) {this.$.mousedown(f)}
zDrone.prototype.mouseup = function (f) {this.$.mouseup(f)}
zDrone.prototype.mousemove = function (f) {this.$.mousemove(f)}
zDrone.prototype.mouseover = function (f) {this.$.mouseover(f)}
zDrone.prototype.mouseout = function (f) {this.$.mouseout(f)}
zDrone.prototype.hover = function (inF, outF) {this.$.mouseover(inF), this.$.mouseout(outF)}
zDrone.prototype.drag = function (onmove, onstart, onend) {
	var D = this // D must be defined so mousemove and mouseup can track which drone is being dragged
	$(window).mousemove(function () { // Mousemove can be anywhere
		if (D._isDragging && onmove) onmove()
	})
	D.mousedown(function () { // Mousedown must be on target element
		D._isDragging = true
		if (onstart) onstart()
	})
	$(window).mouseup(function () { // Mouseup can be anywhere
		D._isDragging = false
		if (onend) onend()
	})
}
// Highlight when hovered, reset when unhovered
zDrone.prototype.hoverHighlight = function (t) {
	var D = this
	D.hover(
		function () {D.addClass("highlight", t)},
		function () {D.removeClass("highlight", t)})
}
// Show at a specific layout or mouseEvent (i.e. Tooltip)
// Layout can override or just complement eventPos (e.g. At mousePos, but centreTop align)
zDrone.prototype.showAt = function (event, layout, t) {
	var D = this, ePos
	D.show(0) // Drone must be attached before position calculation will work properly
	if (!zo.isEmpty(event)) {
		ePos = D.getEventPos(event)
		layout = zo.extend({ // Move into place
			x:Math.max(ePos.x - 8, D.L.width),
			y:Math.max(ePos.y - 8, D.L.height)
		}, layout)
	}
	D.attr({layout:layout}, t)
}
// Show tooltip when hovered, hide tooltip when unhovered
zDrone.prototype.tooltip = function (text, ttBox, layout) {
	var D = this
	D.mousemove(function (e) {ttBox.showAt(e, layout)})
	D.hover(function (e) {
		ttBox.attr({text:text || D.tooltipText})
		ttBox.showAt(e, layout, 100)
	}, function () {
		ttBox.hide(100)
	})
}

/////////////
//  Parts  //
/////////////
// Predefined parts
zDrone.prototype._presetParts = {
	// Arguments: centre.x, centre.y, degStart, degEnd, innerRadius, outerRadius
	arc:{
		plot:function (O, D) { // Note: Always replots, even when no new coordinates are given, because too many things to check!
			var P = this, p, changed = false
			for (p in P.arc) if (O[p] != null) {
				P.arc[p] = zo.r(O, p) // Extract vital arguments
				changed = true // Flag for replot
			}
			if (changed) O.d = zp.arc(P.arc)
			return O
		},
		make:function (O, D) {
			var P = D._makePart("path", O)
			P.arc = {
				minSeg:null, centre:null,
				degStart:null, degEnd:null,
				innerRadius:null, outerRadius:null
			}
			return P
		}
	},
	// Arguments: points
	line:{
		plot:function (O, D) {
			if (O.points) O.d = zp.line(zo.r(O, "points")) // Remove from orders and plot
			return O
		},
		make:function (O, D) {
			return D._makePart("path", O)
		}
	},
	// Arguments: points
	shape:{
		plot:function (O, D) {
			if (O.points) O.d = zp.shape(zo.r(O, "points")) // Remove from orders and plot
			return O
		},
		make:function (O, D) {
			return D._makePart("path", O)
		}
	},
	// Arguments: centre.x or cx, centre.y or cy, radius or r
	circle:{
		plot:function (O, D) {
			 // Remove from orders and replace with real attr names
			if (O.centre) {
				O.cx = O.centre.x
				O.cy = O.centre.y
				delete O.centre
			}
			if (O.radius != null) O.r = zo.r(O, "radius")
			if (O.cx) O.cx = Math.round(O.cx)
			if (O.cy) O.cy = Math.round(O.cy)
			if (O.r) O.r = Math.round(O.r)
			return O
		},
		make:function (O, D) {
			return D._makePart("circle", O)
		}
	},
	// Basic SVG rectangle
	// Arguments: x, y, width, height
	directRect:{
		plot:function (O, D) {
			return O
		},
		make:function (O, D) {
			return D._makePart("rect", O)
		}
	},
	// Path created from zLayout - does all kinds of magical things (rotate, rounded)
	// Arguments: layout (at drone-level), rounded
	rect:{
		plot:function (O, D) {
			var P = this
			P.L.set(O.L || O.layout)
			if (P.L.changed) { // Replot (NOTE: This will pick up if P.L has changed, even if the change was before plot)
				O.d = P.L.getSVG(P.L.rounded)
				if (P.L != D.L) P.L.changed = false // If P.L is independent, reset changed flag
			}
			return O
		},
		make:function (O, D) {
			if (!D.L && !O.L && !O.layout) { // No layout, direct draw based on rect attribute
				var base = D._presetParts.directRect
				return base.make(O, D)
			}
			var P = D._makePart("path", O)
			P.L = D._parseLayout(O, true)
			return P
		}
	},
// 	image:{ // FIXME: Untested, likely broken
// 		plot:function (O, D) {
// 			D.L.set(O.layout)
// 			zo.extend(O, {
// 				x:Math.round(D.L.left + D.L.padding), y:Math.round(D.L.top + D.L.padding),
// 				width:Math.round(D.L.innerWidth), height:Math.round(D.L.innerHeight)
// 			})
// 			return O
// 		},
// 		make:function (O, D) {
// 			var P = D._canvas.image(O.url, D.L.left, D.L.top, D.L.innerWidth, D.L.innerHeight)
// 			P.plot = D._plot.image
// 			D.directRedraw = true
// 			return P
// 		},
// 	},
// 	svg:{ // FIXME: Untested, likely broken
// 		plot:function (O, D) {
// 			D.style(O, t, b)
// 			if (D.L && O.layout) {
// 				var prevAnchor = {x:D.L.x, y:D.L.y}
// 				D.L.set(O.layout)
// 				D.raphObj.translate(D.L.x - prevAnchor.x, D.L.y - prevAnchor.y)
// 			}
// 		},
// 		make:function (O, D) {
// 			var P = D._canvas.path(O.path)
// 			P.plot = D._plot.svg
// 			D.directRedraw = true
// 			return P
// 		},
// 	},
	// zText is an SVG text object, which allows it to play nice with other SVG objects, unlike zHTML. However, it's not HTML which limits formatting, links etc.
	// Arguments: layout (at drone-level), text
	text:{
		plot:function (O, D) {
			if (typeof O == "string") O = {text:O}
			var P = this, p, r, offset, changed = false
			P.L.readOrders(O)
			// Check if vital arguments have changed
			for (p in P.O) if (O[p] != null) {
				changed = true
				break
			}
			// If vital arguments have changed
			if (changed) {
				// Extract vital arguments (except for font-size and fontWeight)
				if (O.format) {
					if (typeof O.format == "string") O.format = d3.format(O.format)
					else if (typeof O.format == "object") O.format = zt.format(O.format)
					if (typeof O.format != "function") throw zt.asString(O.format) + " is not a valid format type."
				}
				za.forEach(["textXAlign", "textYAlign", "format", "text"], function (v) {
					if (O[v] != null) P.O[v] = zo.r(O, v)
				})
				P.d3.text((P.O.format) ? P.O.format(P.O.text) : P.O.text)
				// Recalculate bounding box
				P.d3.attr({ // Temporarily implement text style
					fontSize:O.fontSize,
					fontWeight:O.fontWeight
				})
				// Firefox can't get bounding box for hidden elements
				try {
					P.bBox = P.el.getBBox()
				} catch (error) {
					P.bBox = P.bBox || {width:0, height:0} // Use old or do something stupid
				}
				P.d3.attr({ // Revert text style
					fontSize:P.O.fontSize,
					fontWeight:P.O.fontWeight
				})
				// Save font-size and fontWeight to P.O (don't remove)
				za.forEach(["font-size", "fontWeight"], function (v) {
					if (O[v]) P.O[v] = O[v]
				})
				 // Apply new layout
				var layout = {}
				if (P.L.autoWidth) layout.innerWidth = P.bBox.width
				if (P.L.autoHeight) layout.innerHeight = P.bBox.height
				P.L.set(layout)
			}
			if (P.L.changed) {
				r = { // How far the centre of the text element ought to be from the edge of the inner layout
					x:P.bBox.width / 2 / (P.L.innerWidth || 1), // Watch out for division by zero!
					y:P.bBox.height / 2 / (P.L.innerHeight || 1)
				}
				offset = P.L.getPoint(
					(P.O.textXAlign == "xCentre") ? 0.5 : // If the text is centre-aligned, then 0.5 is right regardless of how the box is aligned
					(P.O.textXAlign == "left") ?
						((P.L.xAlign == "right") ? 1 - r.x : r.x) :
						((P.L.xAlign == "right") ? r.x : 1 - r.x),
					(P.O.textYAlign == "yCentre") ? 0.5 :
					(P.L.yAlign == "yCentre") ?
						((P.O.textYAlign == "top") ? r.y : 1 - r.y) :
						((P.O.textYAlign == P.L.yAlign) ? r.y : 1 - r.y), true)
				O.x = Math.round(offset.x)
				O.y = Math.round(offset.y)
				if (P.L.rotate) O.transform = "rotate(" + P.L.rotate + " " + offset.x + "," + offset.y + ")" // SVG text is the only object that has built-in rotate interpretation because it needs to play nice with zLayout
				if (P.L != D.L) P.L.changed = false // If P.L is independent, reset changed flag
			}
			return O
		},
		make:function (O, D) {
			var P = D._makePart("text", O)
			P.L = D._parseLayout(O, true)
			P.O = {
				text:null,
				format:null,
				"font-size":null,
				"fontWeight":null,
				textXAlign:null,
				textYAlign:null
			}
			P.bBox = {width:0, height:0}
			O.textXAlign = O.textXAlign || P.L.xAlign
			O.textYAlign = O.textYAlign || P.L.yAlign
			// Property "alignment-baseline" defaults to baseline i.e. Hanging parts of letters like g/j/y fall on the other side.
			// Using different "alignment-baseline" values is unreliable, as "text-anchor" interfers with them.
			// So, both of these values have to remain fixed for automatic positioning to work properly.
			if (O["text-anchor"]) console.log("zDrone.add(): HEY - Part type 'text' uses zLayout for automatic placement and does not accept 'text-anchor'. Use 'textXAlign' = 'left'/'right'/'centre' instead.")
			if (O["alignment-baseline"]) console.log("zDrone.add(): HEY - Part type 'text' uses zLayout for automatic placement and does not accept 'alignment-baseline'. Use 'textYAlign' = 'top'/'bottom'/'centre' instead.")
			P.d3.attr({"text-anchor":"middle", "alignment-baseline":"middle"})
			return P
		}
	},
	// Arguments: none
	branch:{
		plot:function (O, D) {
			if (D.L.changed) O.d = zp.line([D.L.radialStartPoint, D.L.radialEndPoint])
			return O
		},
		make:function (O, D) {
			return D._presetParts.line.make(O, D)
		}
	},
	// Like normal text, excecpt placed along the edge (based on align)
	// Arguments: Text
	axisTitle:{
		make:function (O, D) {
			var P, align = D.align, L = D.L,
				offset = L.padding - O.titlePadding,
				layout = {
					x:L.centre.x, y:L.centre.y,
					rotate:0, align:"centre"
				}
			if (align == "left") {
				layout.x = L.left + offset
				layout.rotate = -90
			} else if (align == "right") {
				layout.x = L.right - offset
				layout.rotate = 90
			} else if (align == "top") {
				layout.y = L.top + offset
			} else {
				layout.y = L.bottom - offset
			}
			O.layout = zo.extend(layout, O.layout)
			P = D._presetParts.text.make(O, D)
			P.plot = D._presetParts.text.plot
			return P
		}
	},
	// Ticks for d3 axis
	// Arguments: Layout, domain
	axisTicks:{
		plot:function (O, D) {
			var L = D.L,
				range =
					(D.mode == "ver") ? [L.getY(0, true), L.getY(1, true)] : // Vertical: Map to innerTop and innerBottom
					[L.getX(0, true), L.getX(1, true)] // Horizontal: Map to innerLeft and innerRight
			// Update scale
			if (D.dc) {
				D.scale
					.domain(D.dc.domain[D.d])
					.rangePoints(range, D.extension)
				// Filter the ticks domain based on orders.ticks (i.e. Same as linear scale)
				if (O.ticks) D.ticks = O.ticks
				D.filterTicks(D.ticks)
				// Replace tick label with name from dc
				D.axis.tickFormat(function (p) {
					return D.dc.getName({d:D.d, p:p})
				})
			} else {
				if (O.domain) D.scale.domain(O.domain).nice() // Round - FIXME: Allow customisation of rounding sf
				D.scale.range(range)
			}
			// Update position via transform
			if (L.changed) O.transform = "translate(" + (
				(D.align == "left") ? (L.left + L.padding) + ",0" :
				(D.align == "right") ? (L.right - L.padding) + ",0" :
				(D.align == "top") ? "0," + (L.top + L.padding) :
				"0," + (L.bottom - L.padding)) + ")"
			// Update axis
			D.axis.scale(D.scale) // Update axis with scale
			if (typeof O.tickFormat == "string") O.tickFormat = d3.format(O.tickFormat)
			za.forEach(["ticks", "tickFormat", "innerTickSize", "outerTickSize", "tickPadding"], function (v) {
				if (O[v] != null) D.axis[v](zo.r(O, v)) // Remove from orders and apply to axis
			})
			D.axis(this.d3) // Update ticks with axis
			return O
		},
		make:function (O, D) {
			var P, align = D.align = zo.r(O, "align"),
				mode = D.mode =
					(align == "left" || align == "right") ? "ver" : // Vertical
					(align == "top" || align == "bottom") ? "hor" : // Horizontal
					null
			if (!mode) throw "Axis goes around the inner edge of a layout. orders.align must be defined. Only left/right/top/bottom are valid alignments. orders.align is currently [" + align + "]."
			// Set accessories at drone-level (so that other objects can call on it)
			if (O.dc) { // Categorical mode
				D.dc = zo.r(O, "dc")
				D.d = zo.r(O, "d")
				D.extension = zo.r(O, "extension")
				if (D.extension == null) D.extension = 1
				D.scale = d3.scale.ordinal() // Create scale object
			} else { // Linear mode
				D.scale = d3.scale.linear() // Create scale object
			}
			D.axis = d3.svg.axis().orient(align) // Create axis object
			D.directRedraw = true // frameRedraw won't work for this drone if it contains an axisTicks part
			P = D._makePart("g", O)
			P.plot = D._presetParts.axisTicks.plot
			return P
		}
	}
}

// Container
function zContainer (O) {
	return new zDrone(O)
}
// Complex
function zComplex (O, t, b) {
	O.type = O.type || "zComplex"
	return new zDrone(O, t, b)
}
// Line
function zLine (O, t, b) {
	O.type = O.type || "zLine"
	O._a = {type:"line"}
	return new zDrone(O, t, b)
}
// Shape
function zShape (O, t, b) {
	O.type = O.type || "zLine"
	O._a = {type:"line"}
	return new zDrone(O, t, b)
}
// Arc/slice/ring between degStart and degEnd, or whole circle if deg arguments are null (arc = innerRadius && !outerRadius, slice = !innerRadius && outerRadius, ring = innerRadius && outerRadius)
function zArc (O, t, b) {
	O.type = O.type || "zArc"
	O._a = {type:"arc"}
	return new zDrone(O, t, b)
}
// Circle
function zCircle (O, t, b) {
	O.type = O.type || "zCircle"
	O._a = {type:"circle"}
	return new zDrone(O, t, b)
}
// Rectangle based on layout (remembers attributes in .layout, so can be incrementally changed)
function zRectangle (O, t, b) {
	O.type = O.type || "zRectangle"
	O._a = {type:"rect"}
	return new zDrone(O, t, b)
}
// // Image file with layout attribute
// function zImage (O, t, b) {
// 	O.type = "image"
// 	return new zDrone(O, t, b)
// }
// // SVG object - NOTE: Position/size is controlled using translate, so original SVG string is not changed (UNTESTED)
// function zSVG (O, t, b) {
// 	O.type = "svg"
// 	return new zDrone(O, t, b)
// }
// Text
function zText (O, t, b) {
	O.type = O.type || "zText"
	O._a = {type:"text"}
	return new zDrone(O, t, b)
}
// HTML object, uses jQuery - NOTE: NOT PART OF THE SVG
function zHTML (O, t, b) {
	O.type = O.type || "zHTML"
	// zHTML sits outside of the SVG canvas, which means it's always on top of the SVG
	// Arguments: layout (at drone-level), content
	// NOTE: Fixed sized must be defined at the layout level, NOT the CSS level
	O._a = {
		type:"html",
		plot:function (O, D) {
			if (!O) return // Quit if no orders are defined
			var P = this, padding
			P.L.set(O.layout || O.L)
			if (O.text) O.content = zo.r(O, "text")
			// Calculate text position (must be done in the right sequence)
			if (O.content || P.L.changed) {
				if (O.content) P.d3.html(zo.r(O, "content")) // Don't pass any further - quote marks in orders.content gum up .attr() for unknown reasons
				if (P.L.padding) P.d3.style("padding", P.L.padding + "px") // Padding first - nothing affects padding, and padding affects outerWidth/outerHeight
				// Width is manually defined (do first)
				if (!P.L.autoWidth && P.L.innerWidth) {
					padding =
						parseInt(P.d3.style("padding-left")) +
						parseInt(P.d3.style("padding-right"))
					P.d3.style("width", P.L.width - padding + "px")
				}
				// Height is manually defined (do first)
				if (!P.L.autoHeight && P.L.innerHeight) {
					padding =
						parseInt(P.d3.style("padding-top")) +
						parseInt(P.d3.style("padding-bottom"))
					P.d3.style("height", P.L.height - padding + "px")
				}
				// NOTE: This is a total bullshit workaround because divs inside foreignObjects behave as if width = 0px
				if (P.L.autoWidth || P.L.autoHeight) {
					var fake = P.$.clone() // Fake element that will be placed outside DOM to calculate size
					// Apply calculated CSS styles because the fake element will lose its CSS context
					fake.css({
						position:"absolute",
						"font-size":P.d3.style("font-size"),
						"font-weight":P.d3.style("font-weight")
					})
					// Max out foreignObject so P.$.outerWidth/outerHeight will calculate properly in Firefox
					$(P.el).attr({
						width:20000,
						height:20000
					})
					CANVAS.parent.$.append(fake) // Place element outside foreignObject so it becomes a normal div
					// Set layout by DOM element
					if (P.L.autoWidth) {
						fake.css("width", "auto") // Make sure the fake element hasn't inherited the old width
						P.d3.style("width", fake.outerWidth() + "px") // Set element width
						P.L.set({width:P.$.outerWidth()}) // Put element new width (including padding and borders) into layout
					}
					if (P.L.autoHeight) {
						P.L.set({height:P.$.outerHeight()}) // Change layout to match
					}
					fake.remove() // Remove fake element
				}
				var canvas = D._canvas
        var l = {
          left:P.L.left,
          top:P.L.top,
          width:P.$.outerWidth(),
          height:P.$.outerHeight()
        }
				// Set parent div
				if (canvas.nofo){
					var offset = canvas.$.offset()
          // Add SVG padding to offset
          l.left += parseInt(canvas.$.css("padding-left"))
          l.top += parseInt(canvas.$.css("padding-top"))
          $(P.el).css({
						position:"absolute",
						left:Math.round(offset.left + l.left) + "px",
						top:Math.round(offset.top + l.top) + "px"
					})
				// Fit foreignObjects around div
				} else {
          // foreignObjects need to be expanded to include margins
          l.width += parseInt(P.$.css("margin-left"))
          l.height += parseInt(P.$.css("margin-top"))
          // Chrome foreignObjects don't take SVG padding or element margin-top into account
          if (canvas.foPlacementFail) {
            l.left += parseInt(canvas.$.css("padding-left"))
            l.top += parseInt(canvas.$.css("padding-top"))
            l.top += parseInt(P.$.css("margin-top"))
          }
          $(P.el).attr({
						x:Math.round(l.left),
						y:Math.round(l.top),
						width:Math.round(l.width),
						height:Math.round(l.height)
					})
				}
				if (P.L != D.L) P.L.changed = false // If P.L is independent, reset changed flag
			}
			return O
		},
		make:function (O, D) {
			O.type += " _htmlcontainer" // Special style overrides padding, which would screw up positioning
			if (D._canvas.nofo) { // No foreignObject support
				var P = D._makePart("div", O) // Divs are automatically placed outside the canvas, or in their role containers (which are placed outside the canvas)
				P.d3 = P.d3.append("div") // Append to foreignobject container
			} else {
				// NOTE: .el points to the foreignobject container (because that's what gets attached/detached)
				// ..but the d3 and $ handles point to the HTML object (because that's what gets animated)
				var P = D._makePart("foreignObject", O) // Use a foreignobject container so HTML can live inside a SVG
				P.d3 = P.d3.append("xhtml:div") // Append to foreignobject container
			}
			P.$ = $(P.d3.node())
			P.L = D._parseLayout(O, true)
			return P
		}
	}
	if (O.content) O._a.content = zo.r(O, "content") // Make sure content doesn't get into the div
	var D = new zDrone(O, t, b)
// 	if (!D.isSimple) {
// 		console.log(
// 			"CAUTION: You're trying to use zHTML as a complex object. " +
// 			"SVG objects inside zHTML objects will not appear in browsers which do not support foreignobjects."
// 		)
// 		console.log(D.parts)
// 	}
	return D
}

// Text box (complicated because it deals with both the text and the background)
function zTextBox (O, t, b) {
	O = zo.initOrders(O)
	// Interpret parts
	var background = O.background, branch = O.branch // Parse orders
	O.textObj = O.textObj || {text:""}
	O.textObj.type = "text"
	O.textObj.layer = 2
	if (O.text) {
		O.textObj.text = O.text
		delete O.text
	}
	if (background) {
		if (typeof background != "object") background = {}
		background.type = "rect"
		background.layer = 0
		delete O.background
		O.background = background
	}
	if (branch && (O.layout && O.layout.radial != null) || (O.L && O.L.radial != null)) {
		branch.type = "branch"
		branch.layer = 1
		delete O.branch
		O.branch = branch // Move to last place in order
	}
	O.type = O.type || "zTextBox"
	return new zDrone(O, t, b)
}

// Special instance of zTextBox with some behaviours built in, and starts hidden
function zTooltipBox (O) {
	O = zo.initOrders(O, {
		type:"zTooltipBox", id:"tooltip",
		layout:{align:"rightBottom", padding:10, rounded:8},
		"font-size":14,
		fill:"#eee",
		background:{
			stroke:null,
			fill:"black",
			opacity:0.85
		}
	})
	var D = new zTextBox(O)
	D.hide() // Start hidden
	D.hover(function () {D.show(100)}, function () {D.hide(100)})
	D.click(function () {D.hide(100)})
	return D
}

// Special instance of zHTML with some behaviours built in, and starts hidden
function zHTMLTooltipBox (O) {
	O = zo.initOrders(O, {
		type:"zHTMLTooltipBox", id:"tooltip", // Name tooltip is defined in chewydata.css
		text:"Empty tooltip",
		layout:{align:"rightBottom"}
	})
	var D = new zHTML(O)
	D.hide() // Start hidden
	D.hover(function () {D.show(100)}, function () {D.hide(100)})
	D.click(function () {D.hide(100)})
	return D
}

function zNarrator (O) {
	O = zo.initOrders(O, {
		type:"zNarrator", id:"narrator",
		layout:{padding:20},
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
	})
	var script = zo.r(O, "script"),
		onClose = zo.r(O, "onClose")
	var D = new zHTML(O)
	D.setScene = function (page) {
		var scene = D.script[page - 1]
		D.page = page
		if (page > D.script.length) { // Script is finished..
			D.remove(200) // Remove itself..
			if (D.onClose) D.onClose() // Run onClose actions
		} else {
			if (page == 1) D.elements.prev.hide() // On first page, hide "prev" button
			else if (page == 2) D.elements.prev.show() // On second page, show "prev" button again
			else if (page == D.script.length - 1) D.elements.next.html("Next") // On second to last page, show "next" button if it's been hidden
			else if (page == D.script.length) D.elements.next.html("Close") // On last page, change "next" button to "Close"
			D.elements.content.html(scene.content)
			D.elements.pageCount.html(page + "/" + D.script.length)
			if (scene.action) scene.action() // Execute action
			D.L.changed = true // Force update
			D.attr({layout:scene.layout}) // Redraw layout if required and unlock at the end of it
		}
	}
	D.script = script
	D.onClose = onClose
	D.elements = {
		content:$("#narrator #content"),
		prev:$("#narrator #nav #prev"),
		next:$("#narrator #nav #next"),
		pageCount:$("#narrator #nav #middle #pageCount"),
		close:$("#narrator #nav #middle #close")
	}
	D.elements.close.click(function () {D.setScene(D.script.length + 1)})
	D.elements.prev.click(function () {D.setScene(D.page - 1)})
	D.elements.next.click(function () {D.setScene(D.page + 1)})
	D.setScene(1)
	return D
}

// Special instance of zRectangle which is invisible, and captures mouseevents
function zGladwrap (O) {
	O = zo.initOrders(O, {
		type:"zGladwrap",
		layer:99
	})
	var D = new zRectangle(O)
	D.Y = D.Y || {}
	D.Y.snap = 20 // Default snap-to value
	// Convert a pair of spaces into points
	D._getLine = function (s) {
		var S = D.parent
		return [S.getPoint(s[0]), S.getPoint(s[1])]
	}
	// Search every point in x for the segment closest to event
	// Parent must have .getPoint() to function
	D.getClosestSegment = function (event, x, xAxis, noFilter) {
		var S = D.parent,
			range, domain, p,
			s, line, dist
			dc = S.dc, d = xAxis.d,
			out = {s:null, dist:D.Y.snap}, // If nothing is closer than snap-to, return null
			mousePos = D.getEventPos(event)
		// Filter points - only do the ones near the mouse (faster)
		if (!noFilter) {
			range = xAxis.scale.range()
			domain = xAxis.scale.domain()
			p = za.find(range, mousePos.x, "closest") // Find mouse position relative to range
			p = zt.forceBetween(p, 1, range.length - 1) // Force it at least one notch from the edge
			p = [p - 1, p, p + 1] // Include pair before and pair after (to account for steep slopes)
			p = za.map(domain, p) // Convert to real pos
			x.s = dc.addSpaces(x.s, {d:d, p:p}) // Overwrite on iterating dimension
		}
		// Find the distance from each segment to the mouse position
		dc.forSpaces(x, function (x) {
			s = [x.s, dc.nextSpace(x.s, d)]
			line = D._getLine(s)
			dist = zp.distToLine(mousePos, line) // Find distance between mouse position and segment
			if (dist < out.dist) out = {s:s, dist:dist} // If this segment is closer, make it the new target
		})
		return out
	}
	// Find the closest segment, then get the closest point
	// Parent must have .getPoint() to function
	D.getClosestPoint = function (event, x, xAxis) {
		var line, dist,
			mousePos = D.getEventPos(event),
			s = D.getClosestSegment(event, x, xAxis).s
		// Calculate distance to each end of the segment
		if (s) {
			line = D._getLine(s) // Find position of segment
			dist = [
				zp.dist(line[0], mousePos), // Start to mouse
				zp.dist(line[1], mousePos) // End to mouse
			]
			s = (dist[0] <= dist[1]) ? s[0] : s[1] // Use space of the closer end
		}
		return s
	}
	return D
}

var zAxis = function (O, t, b) {
	O = zo.initOrders(O, {
		type:"zAxis",
		align:"left",
		ticks:5, tickPadding:5,
		extension:1,
		ticksObj:{type:"axisTicks"}
	})
	// Interpret parts
	if (O.title) {
		var titleObj = zo.extend({type:"axisTitle", text:O.title, titlePadding:50}, O.titleObj)
		delete O.titleObj
		O.titleObj = titleObj
	}
	// Flesh out drone
	var D = zo.extend(new zDrone(), {
		dc:O.dc, d:O.d,
		baseSelected:O.baseSelected, selected:O.selected,
		swarms:O.swarms,
		// Set a notch as selected and redraw
		axisSelect:function (p, t, b) {
			var D = this, i,
				domain = D.dc.domain[D.d]
			p = zt.forceBetween(p, za.min(domain), za.max(domain))
			if (D.selected == p) return // Do nothing if it's already selected
			D.selected = p
			D.attr({placeholder:true}, t, b)
			for (i = 0; i < D.swarms.length; i++) {
				D.swarms[i].setSpace({d:D.d, p:p}) // Set space, but not for itself
				D.swarms[i].refresh("all", t) // Redraw
			}
			if (D.onSelect) D.onSelect(t) // Specified actions to execute on select
		},
		// NOTE: t specifies time for each step, so moving two positions take twice as long as moving one position, etc.
		axisMove:function (targPos, t, b) {
			var D = this, mod = (targPos > D.selected) ? 1 : -1
			if (targPos != D.selected) {
				D.axisSelect(D.selected + mod, t, function () {
					D.axisMove(targPos, t, b)
				})
			} else if (b) b()
		},
		// Required for filtering ordinal scales
		filterTicks:function (tickCount) {
			var domain = D.scale.domain(),
				tickGap = Math.ceil(domain.length / tickCount), // tickGap of 1 means every tick is shown, 2 means every 2nd tick is shown, etc.
				tickOffset = Math.floor(((domain.length - 1) % tickGap) / 2) // Transfer half (rounded down) the gap leftover at the end to the start
			D.axis.tickValues(
				domain.filter(
					function (p) {
						return !((p - tickOffset) % tickGap) // If remainer is 0, then return true (i.e. This tick is to be shown)
					}
				)
			)
		},
		setDomain:function (domain, t, b) {
			t = t || 0
			if (typeof t == "number") t = {t:t}
			D.scale.domain(domain)
			if (D.dc) {
				D.dc.domain[D.d] = domain // Updates domain on datacube
				D.filterTicks(D.ticks)
			} else D.scale.nice()
			D.parts.ticksObj.d3.transition()
				.duration(t.t || 0)
				.ease(t.e || "cubic-in-out") // NOTE: d3 easing
				.call(D.axis)
		}
	})
	D.add(O, t, b)
	return D
}

var zSlideAxis = function (O, t, b) {
	O = zo.extend({
		type:"zSlideAxis",
		d:0, swarms:[],
		baseSelected:0, selected:0,
		extension:0
	}, O)
	// Interpret parts
	O.background = {type:"rect"}
	O.foreground = {
		type:"rect",
		layout:{}, // Need a placeholder layout so C.L is NOT used
		plot:function (O, D) {
			var P = this, anchor,
				selected = (D.selected.p != null) ? D.selected.p : D.selected || 0
			if (D.L) {
				anchor = D.L.getPoint(0, 0, true)
				P.L.set((D.mode == "hor") ?
					{
						anchor:anchor, height:D.L.innerHeight,
						width:D.scale(selected) - anchor.x
					} : {
						anchor:anchor, width:D.L.innerWidth,
						height:D.scale(selected) - anchor.y
					}
				)
				O.d = P.L.getSVG(D.L.rounded)
			}
			return O
		}
	}
	var D = new zAxis(O, t, b)
	D.click(function (event) {
		var mousePos = D.getEventPos(event),
			mode = (D.mode == "hor") ? "x" : "y",
			range = D.scale.range(),
			domain = D.scale.domain(),
			p = za.find(range, mousePos[mode], "closest")
		D.axisMove(domain[p], {t:300, e:"linear"})
	})
	return D
}

/*

Swarms - controls drones by giving them orders

Swarms can be controlled by an axes, which are special instances of swarm.

.s
	space for the swarm.
.L or .layout
	Layout for the swarm. Only used as a guide for everyone else.
.Y or .style
	Style for the swarm. Only used to hold style for the drones being drawn.

Style is overriden by plan is overriden by orders

Plan
	Swarm.plan is the basis of any visualisation. A plan specifies the types of drones that should be created (a subplan for each drone).

Role
	Each role consists of these elements:
		type: A zDrone type.
		mask: Swarm combines swarm.s and swarm.plan.[ROLE].mask to create a list, containing the space for every drone of a role which should be created.
		curr(): Function for creating the orders for drones of a role. This is rerun (and reapplied) by plot(), so it refreshes every redraw.
	Optional:
		ignore: Does not get created when this flag is raised. add([ROLE]) will cancel the flag.
		layer: Sets the swarm-level z-index for all drones of a role (can be overriden by orders.layer).
		directRedraw: Forces all drones of a drone to use direct SVG transitions. Useful where zo.mid() would produce nonsense (e.g. Transitioning between a square (shape with 4 points) and a circle (circle with centre and radius)).
		init(): The starting orders of a drones of a role. This is only loaded when a drone is being added, and it overrides any orders created by curr().

Orders
	Orders are generated by init() and curr(). One set of orders is generated for every drone every time plot() or add() is run. The orders they generate are passed directly to drones via drone.attr().

	Orders contain:
		.layer (used by swarm.toFront() to determine layer order)
		.base
		Drone-specific plot information (e.g. orders.arc)
		Events (fired by certain functions. e.g. swarm.add() runs drone.O.onAdd() for every drone it adds)
			.onAdd()
			.preRedraw()
			.postRedraw()
		Any data necessary to construct a state can be put into orders. Only orders from curr() get updated, so for maximum efficiency, move all the static data into init() and have curr() as small as possible.

Filters
	It is possible to filter by role, mask, dimension & position, or a combination thereof.

	x only specifies one dimension
	s is a complete specification - even if it only specificies one dimension, the rest can be imputed
	x can be s, but s cannot be x

	x can be a string or an object. All the rules are defined in .get()
		null, "all"
		"curr", {curr:true}
		role (string), {role:role}

	Role: The top-level name defined in plan. (e.g. "label") If null, it will assume you mean every type of drone that is not ignored.

	Mask: A valid space mask. (e.g. ["mask", 3, "mask"], or "all" or "mask" (== ["mask", "mask", "mask"] == c.space)
		"all" refers to every drone of every type (as defined in plan) for every single space. This is the default.
		"curr" calls the drones grabbed by setCurrDrones()
		"fixed" is a special mask, which does not correspond to a space

	Dimension & position: An alternative to masks. Allows use of pos, but can only specify one dimension at a time. (e.g. {d:1, p:3} == ["mask", 3, "mask"]}
		d must be defined, but pos will default to "all" if null.

	Mask and dimension cannot be used together, but role can be used together with one of them. (e.g. {role:"label", mask:[5, "mask", "mask"]})

*/

// Guide - a timer/scripter for zSwarm
function zGuide () {
	var G = this
	G._canvas = CANVAS // Save reference to CANVAS on creation
	// Run a timer for t duration, running f on each frame
	G.redraw = function (f, t, b) {
		if (G.scripting) return // A scripting redraw is already running - don't change the state of the guide
		var thread = G.thread = $.now()
		if (typeof t == "number") t = {t:t}
		if (!t || !t.t) {
			if (f) f()
			if (b) b()
			return
		} else {
			G.animating = true
			G.dec = 0
			G.easer = d3.ease(t.e || "quad-in-out")
			G.frames = 0
			d3.timer(function (currTime) {
				if (G.thread != thread || !G.animating) return true // Guide has been superceded, die quietly - don't redraw
				var progress = Math.min(currTime / t.t, 1)
				G.dec = G.easer(progress)
				if (f) f()
				G.frames++
				if (progress == 1) {
					G.animating = false
					if (b) b()
// 					console.log("zGuide.redraw(): " + G.frames + " frames.")
					return true
				}
			})
		}
	}
	G.delay = function (t, b) {
		this.redraw(null, t, b)
	}
	G.stop = function () {
		G.animating = false
	}
	// Use zGuide to run a script, which is an array of scenes: [[t, action], [[t], action], etc.]
	// NOTE: Don't use the swarm guide to script, since the swarm needs to use its guide to animate DURING the script
	G.runScript = function (script) {
		if (!script || !script.length) return
		var line = script.shift(), // Remove and read first line from script
			t = line[0] || 1,
			action = line[1] // Action is a function (t) {}
		G.delay(t, function () {G.runScript(script)}) // Run again when finished, but only if there's more script left to run
		G.scripting = true // Scripting flag will stop guide from drawing again - the scripting redraw should be the ONLY redraw
		if (action) action(t) // All the callback actions will be logged first, before the script to run is added
		G.scripting = false
	}
	return G
}


// Blank slate for creating a swarm - use plans from zPlanLibrary or create your own
function zSwarm (O, t, b) {
	var S = this, p, plan, parent
	S._canvas = CANVAS // Save reference to CANVAS on creation
	S.drones = [], S.axes = {}, S.highlighted = []
	// Create and attach container element
	S.container = new zContainer({id:O.id, type:"zSwarm"})
	S.parent = S.container.parent // Parent must be canvas
	S.el = S.container.el
	S.$ = S.container.$
	S.d3 = S.container.d3
	S.attach = S.container.attach
	S.toFront = S.container.toFront
	S._makeTransition = S.container._makeTransition
	// Aliases (so that custom highlight/select functions can be written without overwriting base functions)
	S._highlight = S.highlight
	S._select = S.select
	S._deselect = S.deselect
	S._show = S.show
	S._hide = S.hide
	// Parse orders
	O = zo.initOrders(O)
	for (p in O) S[p] = O[p] // Allocate resources to object - can't use extend() because it'll try to deep extend the big objects, which might have recursive references
	S.s = S.s || "all"
	if (S.dc) S.s = S.dc.asSpace(S.s)
	S.Y = zo.parseStyle(S.Y || S.style || {})
	S.L = S.layout = new zLayout(S.L || S.layout, S) // Make new layout object if the original is not a zLayout object
	// Parse plans
	S.P = S.plan
	S.roles = {}
	for (p in S.plan) {
		plan = S.plan[p]
		if (plan) {
			plan.name = p // Name plans
			if (plan.mask == null) plan.mask = "fixed" // Parse masks
			else if (plan.mask != "fixed") plan.mask = S.dc.parseSpace(plan.mask) // Parse masks
			S.roles[p] = new zContainer({id:p, type:plan.type, parent:S, layer:plan.layer}) // Create container for this role
		} else delete S.plan[p] // Delete null plans
	}
	// Create guide
	S.G = new zGuide()
	S.currDec = 1
	// Report to all axes
	for (p in S.axes) if (S.axes[p].swarms) { // Some axes can control swarms, some cannot
		S.axes[p].swarms.push(S)
	}
	// Initialise
	if (S.onInit) S.onInit()
	if (S.updateData) S.updateData(t)
	S.add("fixed", t)
	S.add("all", t, b) // Add everything
}

//////////////////////
//  Meta functions  //
//////////////////////
zSwarm.prototype.forDrones = function (x, f, v1, v2, v3, v4, v5, v6) {
	var S = this, i, drones = S.get(x)
	if (!drones) return
	if (typeof f == "string") {
		for (i = drones.length - 1; i >= 0; i--) { // Backwards so that remove functions work properly
			if (drones[i][f]) drones[i][f](v1, v2, v3, v4, v5, v6)
		}
	} else if (typeof f == "function") { // Backwards so that remove functions work properly
		for (i = drones.length - 1; i >= 0; i--) {
			f(drones[i])
		}
	}
}
zSwarm.prototype.forRoles = function (f, v1, v2, v3, v4, v5, v6) {
	var S = this, p, role
	for (p in S.P) {
		role = S.P[p]
		if (role && !role.ignore) f(role)
	}
}
zSwarm.prototype.getRole = function (x) {
	var roleName, role,
		RESERVED = ["", "all", "mask", "fixed"] // Reserved strings which cannot be used for roles
	if (x == null || za.contains(RESERVED, x)) return null
	roleName = x.role || x
	if (typeof roleName != "string") return null
	role = this.P[roleName]
	if (!role) throw "zSwarm.getRole(): Cannot find role type " + roleName + "."
	return role
}
zSwarm.prototype.addDimension = function (x) {
	if (x != null && x.d == null && (x.a != null || x.r != null || x.s || x.rs)) x.d = this.d // Adds default dimension
	return x
}
zSwarm.prototype.asPos = function (x) {return this.dc.asPos(this.addDimension(x))}
zSwarm.prototype.asSpace = function (x) {return this.dc.asSpace(this.addDimension(x))}
// Change the space for the swarm and all drones - need to run refresh() afterwards
zSwarm.prototype.setSpace = function (x) {
	var S = this, d = (x.d == null) ? S.d : x.d,
		p = S.asPos(x)
	if (p == null) return logger(S.type + ".setSpace(): No pos specified (" + zt.asString(x) + ").")
	if (S.s == "fixed") return logger(S.type + ".setSpace(): Can't change " + zt.asString(S.s) + " to " + zt.asString(p) + ".")
	if (typeof S.s[d] != typeof p) return //logger(S.type + ".setSpace(): Can't change " + zt.asString(S.s[d]) + " to " + zt.asString(p) + " (different types).")
	S.s[d] = zo.clone(p) // Change space for swarm
	S.forRoles(function (role) {
		if (role.mask.s && role.mask.s[d] == "mask") { // Change space for drones which are valid candidates
			S.forDrones(role.name, function (D) {D.s[d] = zo.clone(p)})
		}
	})
}
// Generates a list of drones - THIS IS A REALLY IMPORTANT FUNCTION (nearly all swarm functions rely on get())
zSwarm.prototype.get = function (x) {
	var S = this
	if (za.isArray(x)) return x // x is an array of drones
	else if (x == "swarm") return [S.container]
	else if (x == null || x == "all") return S.drones // Everything
	else if (x == "curr" || x.curr) return S.currDrones // Whatever was grabbed last time
	else if (x == "fixed") return za.getAllObjects(S.drones, "A", "fixed") // Everything with a mask/A of "fixed"
	else if (typeof x == "string") return za.getAllObjects(S.drones, "role", x) // Role only
	else if (x.role && x.d == null && x.s == null) return za.getAllObjects(S.drones, "role", x.role) // Role only
	var d, i, matches,
		space = S.dc.parseSpace(S.addDimension(x)).s,
		s = S.asSpace(x),
		out = (x.role) ? za.getAllObjects(S.drones, "role", x.role) : S.drones // Filter by role first (i.e. Everything can be filtered by role)
	for (d = 0; d < s.length; d++) { // Use only active parts of the mask as filtering conditions
		if (out.length == 0) break // If there are no more candidates, quit
		if (typeof s[d] == "number") {
			out = za.getAllObjects(out, "s", s[d], "atPos", d) // atPos is much more efficient than matching whole addresses
		} else if (za.isArray(s[d]) && space[d] != "all") {
			matches = []
			for (i = 0; i < out.length; i++) {
				if (za.contains(s[d], out[i].s[d])) matches.push(out[i])
			}
			out = matches
		} // Ignore "all"/"mask"/null since they'll capture everything anyway
	}
	return out
}
// Uses get() to grab drones and stores them in currDrones, so get() doesn't have find them again every time (but get() is still responsible for grabbing them from currDrones)
zSwarm.prototype.setCurrDrones = function (x) {return this.currDrones = this.get(x)}

////////////////////
//  Add / Remove  //
////////////////////
// Add a single drone, based on role and space (only used by .add())
zSwarm.prototype._addDrone = function (role, space, mode, t) {
	var S = this, curr,
		O, newD, plan = S.P[role],
		D = {
			id:zt.asString(space) + " " + role, role:role, // FIXME: These are required to prevent duplicates and for get(role)
			s:space, O:{}, Y:zo.clone(S.Y[role] || {}), // These are passed as a fake D to .curr() and .init()
		},
		curr = (typeof plan.curr == "function") ? plan.curr(S, D, mode) : plan.curr,
		init = (typeof plan.init == "function") ? plan.init(S, D, mode) : plan.init
	if (za.getObject(S.drones, "id", D.id)) return logger(S.type + ".addDrone(): Uh oh - A " + role + " at " + zt.asString(space) + " already exists.") // Check if it already exists
	// Create orders
	D.currOrders = curr || {}
	O = {id:space, type:plan.type, parent:S, role:role} // Any of these values can be overriden at subsequent steps
	O = zo.extend(O, S.Y[role]) // Add style
	O = zo.extend(O, zo.clone(D.currOrders)) // Add currOrders - this will overwrite type and layer if it's provide in orders as well as in plan
	O = zo.extend(O, init || {}) // Add initOrders
	if (O.ignore) return // Checking for ignore flag from orders (plan-level ignore flag is checked by zSwarm.add())
	// Create drone
	if (typeof O.type == "function") {
		newD = new O.type(O, t)
	} else if (S._presetDrones[O.type]) {
		newD = new S._presetDrones[O.type](O, t)
	} else {
		throw "zSwarm.addDrone(): " + O.type + " is not a valid drone type."
	}
	D = zo.extend(newD, D)
	if (plan.directRedraw) D.directRedraw = true
	if (plan.onAdd) plan.onAdd(S, D, mode)
	S.drones.push(D)
	return D
}
// Creates new drones based on filter rules
zSwarm.prototype.add = function (x, t, b) {
	var S = this, i, j, spaces, D,
		roleList = [], newDrones = [],
		role = S.getRole(x),
		mode = zo.extend({initialising:true}, x.mode),
		s = S.dc.addSpaces(S.s, (typeof x == "string") ? null : S.asSpace(x))
	mode.initialising = true
	// Figure out which roles are required
	if (role) { // A role is specified
		role.ignore = false // Cancel ignore flag
		roleList = [role]
	} else {
		if (x == "fixed") { // Fixed
			S.forRoles(function (role) {
				if (role.mask == "fixed") roleList.push(role)
			})
		} else { // No role specified and not fixed (i.e. Normal)
			S.forRoles(function (role) {
				if (role.mask != "fixed") roleList.push(role)
			})
		}
	}
	for (i = 0; i < roleList.length; i++) {
		role = roleList[i]
		//console.log("Adding " + role.name + ".") // Helps with debug cos error catching isn't working properly
		if (role.mask == "fixed") {
			D = S._addDrone(role.name, "fixed", mode)
			if (D) newDrones.push(D)
		} else {
			spaces = S.dc.listSpaces({s:s, mask:role.mask})
			for (j = 0; j < spaces.length; j++) {
				D = S._addDrone(role.name, spaces[j], mode)
				if (D) newDrones.push(D)
			}
		}
	}
	if (t) S.appear(newDrones, t, b)
	else if (b) b()
}
// Remove selected drones or the entire swarm
zSwarm.prototype.remove = function (x, t, b) {
	var S = this, role = S.getRole(x)
	if (role) role.ignore = true // If removing by role, that role gets ignored in future redraws
	S.forDrones(x, "remove", t)
	if (b) S.G.delay(t, b)
}

/////////////////
//  Show/hide  //
/////////////////
zSwarm.prototype.show = function (x, t, b) {
	this.forDrones(x, "show", t)
	if (b) this.G.delay(t, b)
}
zSwarm.prototype.hide = function (x, t, b) {
	this.forDrones(x, "hide", t)
	if (b) this.G.delay(t, b)
}
zSwarm.prototype.appear = function (x, t, b) {
	this.forDrones(x, "appear", t)
	if (b) this.G.delay(t, b)
}

///////////////
//  Animate  //
///////////////
zSwarm.prototype.lock = function () {
	this.locked = $.now()
	this.container.mouseEventsOff()
}
zSwarm.prototype.unlock = function () {
	this.locked = null
	this.container.mouseEventsOn()
}
// Sets new orders for x drones
zSwarm.prototype.plot = function (x, forced) {
	var S = this, i, D, drones = S.get(x),
		mode = (x && x.mode) ? x.mode : {}
	for (i = 0; i < drones.length; i++) { // Can't use forDrones, as it must go forwards not backwards
		D = drones[i]
		D.oldOrders = D.currOrders // Start from where the last animation left off
		D.newOrders = (S.P[D.role].curr) ? S.P[D.role].curr(S, D, mode, D.s, S.Y[D.role]) : {}
		za.forEach(["onAdd", "preRedraw", "postRedraw"], function (v) {
			zo.r(D.newOrders, v)
		})
		// 				D.interpolator = d3.interpolate(D.oldOrders, D.newOrders)
		D.noChange = !forced && !(D.L && D.L.changed) && zo.equals(D.newOrders, D.oldOrders) // If the new orders are same as the old orders, throw up an ignore flag which frameRedraw will pick up
	}
}
// Redraw x drones at a specific frame (defined by dec) between oldOrders and orders
zSwarm.prototype.frameRedraw = function (x, dec) {
	var S = this
	S.currDec = dec
	S.forDrones(x, function (D) {
		if (D.noChange) return
		D.currOrders = zo.mid(D.oldOrders, D.newOrders, dec)
// 		D.currOrders = D.interpolator(dec)
		D.attr(zo.clone(D.currOrders)) // WATCH OUT! If currOrders is changed, oldOrders will be changed, and then it may not match with newOrders and then it'll all fuck the fuck up
	})
	S.frames++ // Count frame
}
// Selective redraw (arguments determine whether to updateData() is run)
zSwarm.prototype.refresh = function (x, t, b) {
	var S = this,
		i, D, frameRedrawDrones = [], directRedrawDrones = [],
		thread = S.thread = $.now(), // Save so callback function can check if it's been superceded
		mode = (x && x.mode) ? x.mode : {},
		curr = S.setCurrDrones(x)
	if (S.currDec < 1) S.frameRedraw(curr, S.currDec) // If previous draw is incomplete, force frameRedraw to last position before plotting
	if (!mode.noUpdateData && S.updateData) S.updateData(t)
	S.plot({curr:true, mode:mode})
	S.preRedraw(curr) // Do pre-draw events
	S.mouseEventsOff("all")
	// Sort drones by method of drawing
	for (i = 0; i < curr.length; i++) {
		D = curr[i]
		if (!D.noChange && !D._hidden) {
			if (D.directRedraw) directRedrawDrones.push(D)
			else frameRedrawDrones.push(D)
		}
	}
	if (t) {
		if (typeof t == "number") t = {t:t} // Parse - t can be duration or {t:duration, e:easing}
		t.e = t.e || "cubic-in-out" // Do it here so that directRedraws can get the same easing
		// Start frameRedraw
		S.G.redraw(function () {
			S.frameRedraw(frameRedrawDrones, S.G.dec) // Frame redraw every step of the way
		}, t, function () {
			if (S.thread != thread) return // If S.thread != thread, this means new threads has started since this one began - don't do any postRedraw activity
			S.frameRedraw(curr, 1) // frameRedraw to last position (this will make D.currOrders = D.newOrders)
			S.postRedraw(curr) // Do post-draw events
			S.mouseEventsOn("all")
			if (b) b()
		})
	} else {
		S.frameRedraw(curr, 1) // frameRedraw to last position (this will make D.currOrders = D.newOrders)
		S.postRedraw(curr) // Do post-draw events
		S.mouseEventsOn("all")
		if (b) b()
	}
	// Start direct redraws
	for (i = 0; i < directRedrawDrones.length; i++) { // Do directRedraw drones separately
		D = directRedrawDrones[i]
		D.attr(D.newOrders, t)
	}
}
zSwarm.prototype.addClass = function (x, className, t, b) {
	this.forDrones(x, "addClass", className, t)
	if (b) this.G.delay(t, b)
}
zSwarm.prototype.removeClass = function (x, className, t, b) {
	this.forDrones(x, "removeClass", className, t)
	if (b) this.G.delay(t, b)
}

//////////////
//  Events  //
//////////////
zSwarm.prototype.mouseEventsOff = function (x) {this.forDrones(x, "mouseEventsOff")}
zSwarm.prototype.mouseEventsOn = function (x) {this.forDrones(x, "mouseEventsOn")}
zSwarm.prototype.clearMouseEvents = function (x) {this.forDrones(x, "clearMouseEvents")}
zSwarm.prototype.click = function (x, f) {this.forDrones(x, "click", f)}
zSwarm.prototype.dblclick = function (x, f) {this.forDrones(x, "dblclick", f)}
zSwarm.prototype.mousedown = function (x, f) {this.forDrones(x, "mousedown", f)}
zSwarm.prototype.mouseup = function (x, f) {this.forDrones(x, "mouseup", f)}
zSwarm.prototype.mousemove = function (x, f) {this.forDrones(x, "mousemove", f)}
zSwarm.prototype.mouseover = function (x, f) {this.forDrones(x, "mouseover", f)}
zSwarm.prototype.mouseout = function (x, f) {this.forDrones(x, "mouseout", f)}
zSwarm.prototype.hover = function (x, inF, outF) {this.forDrones(x, "hover", inF, outF)}
zSwarm.prototype.drag = function (x, onmove, onstart, onend) {this.forDrones(x, "drag", onmove, onstart, onend)}
zSwarm.prototype.hoverHighlight = function (x, t) {this.forDrones(x, "hoverHighlight", t)}
zSwarm.prototype.tooltip = function (x, tooltipText, tooltipBox, fixedLocation) {this.forDrones(x, "tooltip", tooltipText, tooltipBox, fixedLocation)}
// Events (event actions are defined by orders and are triggered during run events in zSwarm and axes)
// onAdd not included as it's only called by addDrone() and frameRedraw respectively
zSwarm.prototype.preRedraw = function (x) {
	var S = this
	S.forRoles(function (r) {
		if (!r.preRedraw) return
		S.forDrones(r.name, function (D) {r.preRedraw(S, D)})
	})
}
zSwarm.prototype.postRedraw = function (x) {
	var S = this
	S.forRoles(function (r) {
		if (!r.postRedraw) return
		S.forDrones(r.name, function (D) {r.postRedraw(S, D)})
	})
}
zSwarm.prototype.zoom = function (targ, viewport, t, b) {
	this.L.zoom(targ, viewport)
	this.refresh("all", t, b)
}
zSwarm.prototype.highlight = function (x, t, b) {
	var S = this
	S.removeClass("all", "highlight", t, b)
	if (!x) {
		S.highlighted = []
	} else {
		S.highlighted = S.asPos(x)
		S.addClass({d:(x.d == null) ? S.d : x.d, p:S.highlighted}, "highlight", t)
	}
}
zSwarm.prototype.select = function (x, t, b) {
	var S = this
	S.oldSelected = S.selected
	S.selected = {d:S.d, p:S.asPos(x)}
	S.removeClass(S.oldSelected, "select", t)
	S.addClass(S.selected, "select", t, b)
}
zSwarm.prototype.deselect = function (x, t, b) {
	this.removeClass(x, "select", t, b)
}
// Removes an element, replaces it with its children
zSwarm.prototype.disaggregate = function (x, t, b) {
	if (x.d == null) x.d = this.d // Add dimension, if it was omitted
	var S = this,
		domain = S.dc.domain,
		parent = S.dc.asPos(x),
		children = S.dc.findChildren(x)
	if (!children.length) return // Don't disaggregate if there are no children
	domain[x.d] = za.subtract(domain[x.d], parent) // Remove parent from datacube
	domain[x.d] = za.insertAt(domain[x.d], children, parent) // Add children to datacube
	S.updateData(t)
	S.remove({d:x.d, p:parent}, t) // Remove from swarm
	S.add({d:x.d, p:children, mode:{asParent:true}}, t, b) // Add in place
}
// Removes an element and all its siblings, replaces it with its parents
zSwarm.prototype.aggregate = function (x, t, b) {
	if (x.d == null) x.d = S.d // Add dimension, if it was omitted
	var S = this,
		domain = S.dc.domain,
		rPos = za.find(domain, x.p),
		parent = S.dc.findParent(x),
		siblings = S.dc.findChildren({d:x.d, p:parent})
	if (parent == null) return // Don't aggregate if there is no parent
	domain[x.d] = za.subtract(domain[x.d], siblings) // Remove siblings from datacube
	domain[x.d] = za.shyInsert(domain[x.d], parent, rPos) // Add parent to datacube it doesn't already exist
	S.updateData(t)
	S.remove({d:x.d, p:siblings, mode:{asParent:true}}, t) // Remove from swarm
	S.add({d:x.d, p:parent}, t, b)
}

//////////////
//  Drones  //
//////////////
zSwarm.prototype._presetDrones = {
	zDrone:zDrone,
	zComplex:zComplex,
	zLine:zLine,
	zShape:zShape,
	zArc:zArc,
	zCircle:zCircle,
	zRectangle:zRectangle,
	zText:zText,
	zHTML:zHTML,
	zTextBox:zTextBox,
	zTooltipBox:zTooltipBox,
	zHTMLTooltipBox:zHTMLTooltipBox,
	zAxis:zAxis,
	zGladwrap:zGladwrap
};
