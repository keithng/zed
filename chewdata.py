USAGE = """
Usage: chewdata.py [input CSV] [output JSON] [OPTIONS]...

  Generates a JSON data cube/dictionary from a CSV. -h for help.
"""

HELP = USAGE + """

  For example, an input CSV of:
    "0~name", "1~name", "val"
    "2001", "Location A", 5
    "2001", "Location A", 1
    "2001", "Location B", "hi"
    "2002", "Location A", 3

  ...will result in a JSON of:
    {
      meta : [
        { name : ["2001", "2002] },
        { name : ["Location A", "Location B"] }
      ],
      data : {
        val : [
          [1, "hi"],
          [3, null]
        ]
      }
    }

  -s, --sum-duplicates
    Rows with identical meta values are considered duplicates.
    With the -s option, the value for ["2001", "Location A"] -> 6
    Without the -s option, the value for ["2001", "Location A"] -> 1

  -n, --accept-nonnumeric
    Data values are generally expected to be numeric.
    With the -n option, the value for ["2001", "Location B"] -> "hi"
    Without the -n option, the value for ["2001", "Location B"] -> null

  -d --dict
    Parses CSV into a data dictionary instead of a data cube.

    Data cubes (nested arrays) are generally more space-efficient unless it's full
    of holes (i.e. Where data does not exist for a given combination of meta).

    Data cube : [
      [1, "hi"],
      [3, null]
    ]
    Dictionary : {
      "0,0" : 1,
      "0,1" : "hi",
      "1,0" : 3
    }

    Data cubes are also faster when the read follows the data structure.
    A request for ["2001", "all"] will require one read to return [1, "hi"].
    A request for ["all", "Location A"] will require two reads to return [1, 3].

"""

# Must be tab delimited csv files
import csv, sys, json, time, re

if len(sys.argv) == 1:
	print(USAGE)
	exit()
if any(arg == '--help' or arg == '-h' for arg in sys.argv):
	print(HELP)
	exit()

if any(arg == '--sum-duplicates' or arg == '-s' for arg in sys.argv):
	SUM_DUPLICATES = True
	print("Duplicates will be SUMMED.")
else:
	SUM_DUPLICATES = False
	print("Duplicates will be IGNORED.")

if any(arg == '--accept-nonnumeric' or arg == '-n' for arg in sys.argv):
	ACCEPT_NONNUMERIC = True
	print("Non-numeric data values will be ACCEPTED.")
else:
	ACCEPT_NONNUMERIC = False
	print("Non-numeric data values will be REJECTED.")

if any(arg == '--dict' or arg == '-d' for arg in sys.argv):
	AS_DICTIONARY = True
	print("Data will be stored in DICTIONARIES.")
else:
	AS_DICTIONARY = False
	print("Data will be stored in CUBES.")


def readcsv(path):
	out = []
	with open(path, 'rb') as csvfile:
		csvdata = csvfile.read()
		try: # UTF-8 is the default
			out = csv.reader(csvdata.decode('utf-8-sig').encode('utf-8').splitlines())
		except UnicodeDecodeError: # Try ISO 8859-15
			out = csv.reader(csvdata.decode('iso8859-15').encode('utf-8').splitlines())
		except:
			print("ERROR: I can't read that file. Check that input file is encoded as UTF-8.")
			out = csv.reader(csvdata.decode('utf-8-sig').encode('utf-8').splitlines())
		return out

#def writecsv(path, block):
	#with open(path, 'wb') as csvfile:
		#csvobj = csv.writer(csvfile, delimiter=',', quotechar='"', quoting=csv.QUOTE_NONNUMERIC)
		#for row in block:
			#csvobj.writerow(row)

# Create nested arrays
def createdata(space):
	if AS_DICTIONARY:
		return {}
	else:
		out = []
		pos = range(space[0]) # Use the first space and remove
		if len(space) > 1: # Go deeper
			for i in pos:
				out.append(createdata(space[1:])) # Must slice space
		else: # Fill the final array with nones
			for i in pos:
				out.append(None)
		return out

# Set a value in a nested array
def setdata(a, space, val):
	if AS_DICTIONARY:
		key = re.sub('[ \[\]]', '', str(space))
		a[key] = val
	else:
		pos = space[0] # Use the first space and remove
		if len(space) > 1: # Go deeper
			setdata(a[pos], space[1:], val)
		else: # Target reached
			if a[pos] == None:
				a[pos] = val
			elif SUM_DUPLICATES: # Add instead of replaces
				a[pos] += val
			else: # Replace
				a[pos] = val

class protocube(object):
	# Look up the column and get return the value for that row at that column
	def getcell(S, row, t, d):
		if d is "data":
			col = S.datacol.get(t)
		else:
			col = S.metacol[d].get(t)
		return row[col]
	def parseheaders(S, headers):
		print("  Raw headers        :", headers)
		metacol = {}
		datacol = {}
		i = 0;
		for curr in headers:
			curr = curr.split("~") # Split header
			if curr[0] == "!": # Ignore columns prefaced with !
				print("  Ignoring column    :", curr)
			elif len(curr) == 2: # If it has two components, it must be metadata, and the first value must be the dimension (e.g. "1~name" means metadata type "name" for dimension 1)
					d = int(curr[0]) # Dimension
					t = curr[1] # Type
					if metacol.get(d) is None: metacol[d] = {} # Create metacol object for that dimension if it doesn't exists
					if metacol.get(d).get(t) is not None: print("  UH OH - " + metacol[d][t] + " already exists.")
					metacol[d][t] = i; # This meta type for this dimension is to be found in this column
			elif len(curr) == 1 and curr[0].strip() != "": # Ignore unnamed columns
				t = curr[0]; # curr[0] is data type
				datacol[t] = i;
			else: print("  ERROR - I don't understand the format of header " + str(curr) + ". MetaData headers should be [dimension]~[type] (e.g. '0~name'), data headers should be [type] (e.g. 'data').")
			i += 1
		# Verify header
		if len(metacol) == 0: print("  UH OH - no metadata columns found.")
		for i in metacol:
			if metacol[i].get("name") == None:
				print("  UH OH - No name column found in dimension " + str(i) + ".")
			else:
				print("  Meta columns (d=" + str(i) + ") :", metacol[i])
		if len(datacol) == 0: print("  UH OH - no data columns found.")
		print("  Data columns       :", datacol)
		S.metacol = metacol
		S.datacol = datacol
	def setmeta(S, block):
		metacol = S.metacol
		meta = []
		dlen = max(metacol.keys()) + 1 # Number of dimensions, based on highest dimension defined
		dimensions = range(dlen)
		# Create meta
		for d in dimensions: # For each dimension
			if metacol.get(d) is not None:
				curr = {} # Create object containing all the types
				for t in metacol.get(d): curr[t] = [] # Create empty arrays for each type
				meta.append(curr) # And put it into the meta object
			else: print("  UH OH - there're supposed to be", len(dimensions), "dimensions (" + str(dimensions) + "), but dimension", d, "is empty.")
		# Read metadata
		for row in block:
			for d in dimensions:
				names = meta[d].get("name")
				try: # Check if it already exists
					cell = S.getcell(row, "name", d) # Get the name for this dimension
					names.index(cell) # Look up that name (will throw up an error if that name doesn't exist)
				except ValueError: # Does not exist - add new
					for t in metacol[d]: # Append values for every type of meta
						cell = S.getcell(row, t, d)
						meta[d].get(t).append(cell)
		# Set size and report
		size = []
		for d in dimensions:
			names = meta[d].get("name")
			size.append(len(names))
			for t in meta[d]:
				print(" ", len(meta[d][t]), "x", t, "in dimension " + str(d) + ".")
		S.meta = meta
		S.dimensions = dimensions
		S.size = size
	def setdata(S, block):
		# Create data structure
		i = 0
		data = {}
		for t in S.datacol:
			data[t] = createdata(S.size)
		# Read data
		for row in block:
			# Get space
			space = []
			for d in S.dimensions:
				names = S.meta[d].get("name")
				try: # Check if it already exists
					cell = S.getcell(row, "name", d) # Get the name for this dimension
					pos = names.index(cell)
					space.append(pos) # Look up that name (will throw up an error if that name doesn't exist)
				except ValueError: print("  ERROR: This shouldn't happen. I did a bad.")
			# Push data
			for t in S.datacol:
				curr = data.get(t)
				cell = S.getcell(row, t, "data").strip()
				try:
					if cell != "": cell = float(cell) # NOTE: Convert all values in datacols to float
					else: cell = None
				except ValueError:
					if not ACCEPT_NONNUMERIC:
						print("ERROR: Numeric value expected for property '" + t + "' in line " + str(i) + ":")
						print(row)
				setdata(curr, space, cell)
			i += 1
		print(" ", len(block), "rows processed.")
		S.data = data
	def __init__ (S, block):
		S.parseheaders(block.pop(0)) # Grab and remove headers
		S.setmeta(block)
		S.setdata(block)

starttime = time.time()

out = [e for e in readcsv(sys.argv[1])] # Read file and convert to list
print(time.time() - starttime, "sec to read,")
out = protocube(out) # Convert to protocube
print(time.time() - starttime, "sec to process.")
out = json.dumps({"meta":out.meta, "data":out.data}) # Convert to JSON
print(time.time() - starttime, "sec to convert.")
f = open(sys.argv[2], "w") # Open output file (argument 3)
f.write(out) # Write
print(time.time() - starttime, "sec to write.")
