/*
Possible Parameters: --safe --log

1. Split into lines
2. Parse each line
2.1.Remove comments
2.2.Check Syntax
2.3.Parse
3. Put everything together

Legal lines(without comments):
	Variable declarations: [Type]: [Name][Value]
Type: [
		[TypeName][Range]
	] *
	Name: [A - za - zßöäü]
Value: [String] |: [Name]
String: [A - za - zßöäü0 - 9 - _., ;: + * '']

Loops:
	for i in 0. .5# countup 0 - 5
for i in 5. .0# countdown 5 - 0
for i = 0 to 5# countup 0 - 5 with initialisation, note that i is typed as int automatically
for each b as c# repeats with c being a reference to the current element of b
while cond
do
	while cond

#test = abc #document.getElementById("test").innerHTML="abc"

Arr:x [] //  the empty list
Arr[Int]:x [3,4,5] //  a three element list
Arr[Int]:y [0,1,2,x] //  the list consisting of 0, 1 and 2 on top the list x => [0,1,2,3,4,5]
Arr[String]:z [a,b,c,d]
Arr[String]:zz [z,a,b,c,d] // z is string and not reference to array z
Arr[String]:zzz [Array:z,a,b,c,d] // Giving the type works => [a,b,c,d,a,b,c,d]
*/

//Import the file system handler library
const fs = require('fs');
//Get access to command line options
const yargs = require('yargs').argv;

function split_(code) {
	return code.split("\n");
}

function is_type(what) {
	return ~"int.string.regex.date.bool.boolean.const.private.static.public.".search(what.split(":")[0] + ".");
}

function is_deep(what) {
	return ~"forin.func.".search(what + ".");
}

function requires_quotation(type) {
	return ~"string.regex.date.".search(type.toLowerCase());
}

// Error handling
function e(name, i) {
	console.log(["Error", "Warning", "Notice", "Log"][i] + ": " + name + " in line " + (CURRENT_LINE + 1));
	if (i == 0)
		process.exit(1);
}

/*
 * Scoping
 */

var scope = [{
		"type": "root",
		"sub": []
	}],
	scopepath = [0];

function current_scope() {
	var str = "scope[";
	for (var i = 0; i < scopepath.length - 1; ++i) {
		str += scopepath[i] + "].sub[";
	}
	str += scopepath[scopepath.length - 1] + "].sub";
	if (yargs.log) {
		console.log("	In current_scope:");
		console.log("		Current scopeString:" + str);
	}
	return eval(str);
}

function add(what) {
	what.sub = [];
	if (yargs.log) {
		console.log("");
		console.log("In add:");
		console.log("	Added " + JSON.stringify(what));
		console.log("	at path " + JSON.stringify(scopepath));
		console.log("	Current Scope:")
	}

	current_scope().push(what);
	if (yargs.log) console.log("	" + JSON.stringify(scope));
	if (is_deep(what.type)) {
		scopepath.push(current_scope_index());
		if (yargs.log) console.log("	NEW SCOPEPATH! " + JSON.stringify(scopepath));
	} else {
		current_scope();
	}
	if (yargs.log) console.log("");
}

function current_scope_index() {
	return current_scope().length - 1;
}

/*
 * Parsing
 */
var CURRENT_LINE = 0;

function parse_(code) {
	var i, tabs, l, j;
	for (i = 0; i < code.length - 1; ++i) {
		CURRENT_LINE = i;
		tabs = (code[i].split("\t").length - 1) - (code[i + 1].split("\t").length - 1);
		code[i] = code[i].replace(/^\t+/, "");
		code[i] = parse_line(code[i]);
		for (j = 0; j < tabs; ++j) {
			//code[i] += "}";
			//scopepath.pop();
		}
	}
	totalcode += code.join("\n");
	return code;
}

function uplevel(code) {
	code += "}";
	scopepath.pop();
	return code;
}

function parse_line(code) {
	if (code[0] == "@") {
		//Comment
		console.log("Found a comment line!");
		return "";
	}

	//l is global
	l = code.split(" ");
	if (l[0] == "for") {
		code = parse_for(code);
	} else if (l.length == 1 && l[0] == ")") {
		code = "";
		code = uplevel(code);
	} else if (l.length == 0) {
		code = "";
	} else if (l[0] == "while") {
		code = parse_while(code);
	} else if (is_type(l[0])) {
		code = parse_var_declaration(code);
	} else if (l[0] == "import") {
		code = parse_import(code);
	} else if (l[0] == "func") {
		code = parse_func(code);
	} else {
		code = parse_method_call(code);
	}
	return code;
}

function parse_for(code) {
	//For-Loop
	//@TODO for i=0 to 5
	if (l[l.length - 1] != "(")
		e("Syntax Error: Missing Token '(' at end of for-loop.", 1);
	if (l.length < 5)
		e("Syntax error: not enough arguments for for..in or for..to loop; found: " + (l.length - 1) + ", required: 4", 0);
	if (l[3].split("..").length < 2)
		e("Syntax Error: Range operator not found or incorrectly used", 0)

	if (l[2] == "in") {
		//For i in
		add({
			type: "newvar",
			name: l[1],
			stype: "Int"
		});
		add({
			type: "forin",
			var: l[1]
		});
		if (~l[3].search("..")) {
			//For i in 0..5
			code = "for(" + (yargs.safe ? "var " : "") + l[1] + "=" + l[3].split("..")[0] + ";" + l[1] + "<" + l[3].split("..")[1] + ";++" + l[1] + "){";
		} else {
			//For i in 5
			code = l[1] + "=" + l[3] + ";{";
		}
	} else {
		e("Syntax Error: second argument of for may be in or to. Found: " + l[2], 0);
	}
	return code;
}

function parse_while(code) {
	if (l[l.length - 1] != "(")
		e("Syntax Error: Missing Token '(' at end of while-loop.", 1);

	code = "while(" + l[1] + "){";
	return code;
}

function parse_var_declaration(code) {
	//Type
	if (l.length == 2) {
		//Type:Name Value
		code = "var " + l[0].split(":")[1] + "=" + (requires_quotation(l[0].split(":")[0]) && l[1][0] != ":" ? "'" + l[1] + "'" : l[1]) + ";";
		add({
			type: "newvar",
			name: l[0].split(":")[1],
			stype: l[0].split(":")[0]
		});
	} else if (l.length == 1) {
		//Type:Name
		if (l[0] != "") {
			code = "var " + l[0].split(":")[1] + ";";
			add({
				type: "newvar",
				name: l[0].split(":")[1],
				stype: l[0].split(":")[0]
			});
		}
	} else {
		e("Declaration of a variable must consist of Type:Name and an optional initial value.", 0);
	}
	return code;
}

function parse_import(code) {
	// Import
	code = "";
	parse_(split_(fs.readFileSync(l[1], 'utf8')));
	return code;
}

function parse_func(code) {
	//Function
	var args = [];
	code = "function " + l[1] + "(";
	if (l[l.length - 1] != "(")
		e("Syntax Error: Missing Token '(' at end of function declaration.", 1);
	for (i = 2; i < l.length - 1; ++i) {
		code += l[i].split(":")[l[i].split(":").length - 1];
		if (i + 1 < l.length - 1) code += ",";
		args.push({
			type: "newvar",
			name: l[i].split(":")[l[i].split(":").length - 1],
			stype: l[i].split(":")[0]
		});
	}
	code += "){";
	add({
		type: "func",
		name: l[1],
		args: args
	});
	return code;
}

function parse_method_call(code) {
	//Method call
	code = l[0].replace(/\_/g, ".") + "(";
	for (i = 1; i < l.length; ++i) {
		if (l[i].split(":").length > 1) {
			if (requires_quotation(l[i].split(":")[0]))
				code += '"' + l[i].split(":")[1] + '"';
			else
				code += l[i].split(":")[1];
		} else {
			// Eigentlich lookup für type machen
			code += l[i];
		}

		if (i + 1 < l.length) code += ",";
	}
	code += ");";
	return code;
}

/*
 * Testing and calling
 */

totalcode = "";
//Important: Newline @ end
var c = `
func al String:text (
	alert text
)

al String:Ente

for i in 0..5 (
	for j in 0..5 (
		int:k 0
	)
)
a_b_c
`;
/*`
for i in 0..5 (
	for j in 0..5
		int:k 0
a_b_c

@ Function a
@param b
@param c
@param d
@returns nothing
func a String:b Int:c Boolean:d
	for i in 0..5


`;*/
c = split_(c);
c = parse_(c);
//console.log(c.join("\n"));s
console.log(totalcode);
console.log(JSON.stringify(scope));
