/*
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

func name param1 param2 param3

Pointer vs.Multiplication:
	Typeof(x): c * x# Pointer
Int: a 1 * 2# Multiplication
Int: b 2 * a# Multiplication, because 2( * a) does not make sense
Int: b 2 ** a# Multiplication with a pointer, 2 * ( * A)
Int: b * b ** b# ptrB * ptrB

# id value# Write value to the innerHTML / value of #id
	.class value# ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^ ^
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

function requires_quotation(type) {
	return ~"string.regex.date.".search(type);
}

function e(name, i) {
	console.log("Error: " + name + " in line " + (i + 1));
}

function parse_(code) {
	var i, tabs, l, j;
	for (i = 0; i < code.length - 1; ++i) {
		tabs = (code[i].split("\t").length - 1) - (code[i + 1].split("\t").length - 1);
		//@TODO lowercase all
		code[i] = code[i].replace(/^\t+/, "");
		code[i] = parse_line(code[i]);
		for (j = 0; j < tabs; ++j)
			code[i] += "}";
	}
	totalcode += code.join("\n");
	return code;
}

function parse_line(code) {
	l = code.split(" ");
	if (l[0] == "for") {
		//For-Loop
		//@TODO for i=0 to 5
		if (l[2] == "in") {
			//For i in
			if (~l[3].search("..")) {
				//For i in 0..5
				code = "for(" + (yargs.safe ? "var " : "") + l[1] + "=" + l[3].split("..")[0] + ";" + l[1] + "<" + l[3].split("..")[1] + ";++" + l[1] + "){";
			} else {
				//For i in 5
				code = l[1] + "=" + l[3] + ";{";
			}
		} else {
			e("Syntax Error: " + l[2] + " should be replaced with in.", i);
		}
	} else if (l[0] == "while") {
		code = "while(" + l[1] + "){";
	} else if (is_type(l[0])) {
		//Type
		if (l.length == 2) {
			//Type:Name Value
			code = "var " + l[0].split(":")[1] + "=" + (requires_quotation(l[0].split(":")[0]) && l[1][0] != ":" ? "'" + l[1] + "'" : l[1]) + ";";
		}
	} else if (l[0] == "import") {
		// Import
		code = "";
		parse_(split_(fs.readFileSync(l[1], 'utf8')));
	} else if (l[0] == "func") {
		//Function
		code = "function " + l[1] + "(";
		for (i = 2; i < l.length; ++i)
			code += l[i].split(":")[l[i].split(":").length - 1] + ","
		code += "){";
	} else {
		//Method call
		code = code.replace(/\_/g, ".") + "();";
	}
	return code;
}

totalcode = "";
//Important: Newline @ end
var c = `
import str
for i in 0..5
	for j in 5
		int:k 0
string:a ente
a_b_c
func a String:b Int:c Boolean:d
	for i in 0..5

`;
c = split_(c);
c = parse_(c);
//console.log(c.join("\n"));
console.log(totalcode);
