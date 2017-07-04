/*
Possible Parameters: --safe --log
Compile with:
	node index.js file.fred > compiled.js
	node index.js file.fred --safe
*/

//Import the file system handler library
const fs = require('fs');
//Get access to command line options
const yargs = require('yargs')
	.usage('Usage: $0 [options]')
	.example('$0 file.fred --log', 'compile and log')
	.example('$0 file.fred > compiled.js', 'compile into js file')
	.example('$0 file.fred', 'compile and display result')
	.help('h')
	.alias('h', 'help')
	.alias('l', 'log')
	.describe('l', 'Create a detailed log file')
	.epilog('GPL Licence\nCopyright Fred 2017')
	.argv;

function split_(code) {
	return code.split("\n");
}

function is_type(what) {
	return ~"int.string.regex.date.bool.boolean.const.private.static.public.".search(what.split(":")[0] + ".");
}

function is_deep(what) {
	return ~"forin.forto.while.cond.func.".search(what + ".");
}

function requires_quotation(type) {
	return ~"string.regex.date.".search(type.toLowerCase());
}

var error = require("./error");

function e(a, b, c) {
	error.e(a, b, c)
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
	what.line = CURRENT_LINE;
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

console.log("/*");
console.log("---------------------------------------");
console.log("|     Fred-Script compiler v0.0.1     |");
console.log("---------------------------------------");
console.log("");
console.log("Compiling file " + yargs._[0] + " to JavaScript.");
console.log("*/");
console.log("");

function parse_(code) {
	var i, l, j;
	for (i = 0; i < code.length - 1; ++i) {
		CURRENT_LINE = i;
		code[i] = code[i].replace(/^\t+/, "");
		code[i] = parse_line(code[i]);
	}
	totalcode += code.join("\n");
	return code;
}

function uplevel() {
	scopepath.pop();
}

function parse_line(code) {
	if (code[0] == "@" || code[0] == "#") {
		//Comment
		if (yargs.log) console.log("Found a comment line!");
		return "";
	}

	//l is global
	l = code.split(" ");
	if (l[0] == "for") {
		parse_for(code);
	} else if (l.length == 1 && l[0] == ")") {
		uplevel();
	} else if (l.length == 0) {

	} else if (l[0] == "while") {
		parse_while(code);
	} else if (is_type(l[0])) {
		parse_var_declaration(code);
	} else if (l[0] == "import") {
		parse_import(code);
	} else if (l[0] == "func") {
		parse_func(code);
	} else if (l[0] == "if") {
		parse_if(code);
	} else {
		parse_method_call(code);
	}
	return code;
}

function parse_if(code) {
	if (l[l.length - 1] != "(")
		e("Syntax Error: Missing Token '(' at end of if-condition.", 1);
	add({
		type: "cond",
		kw: "if",
		cond: l[1]
	});
}

function parse_for(code) {
	//For-Loop
	if (l[l.length - 1] != "(")
		e("Syntax Error: Missing Token '(' at end of for-loop.", 1);
	if (l.length < 5)
		e("Syntax error: not enough arguments for for..in or for..to loop; found: " + (l.length - 1) + ", required: 4", 0);

	if (l[2] == "in") {
		//For i in
		if (l[3].split("..").length < 2)
			e("Syntax Error: Range operator not found or incorrectly used", 0)

		add({
			type: "newvar",
			name: l[1],
			stype: "Int"
		});
		add({
			type: "forin",
			var: l[1],
			in: l[3]
		});
	} else if (l[4] == "to") {
		//for i = 0 to 5
		add({
			type: "newvar",
			name: l[1],
			stype: "int",
			value: l[3]
		});
		add({
			type: "forto",
			var: l[1],
			from: l[3],
			to: l[5]
		});
	} else {
		e("Syntax Error: second argument of for may be in or to. Found: " + l[2], 0);
	}
}

function parse_while(code) {
	if (l[l.length - 1] != "(")
		e("Syntax Error: Missing Token '(' at end of while-loop.", 1);

	add({
		type: "while",
		condition: l[1]
	});
}

function parse_var_declaration(code) {
	//Type
	if (l.length == 2) {
		//Type:Name Value
		add({
			type: "newvar",
			name: l[0].split(":")[1],
			stype: l[0].split(":")[0],
			value: l[1]
		});
	} else if (l.length == 1) {
		//Type:Name
		if (l[0] != "") {
			add({
				type: "newvar",
				name: l[0].split(":")[1],
				stype: l[0].split(":")[0]
			});
		}
	} else {
		e("Declaration of a variable must consist of Type:Name and an optional initial value.", 0);
	}
}

function parse_import(code) {
	// Import
	code = "";
	parse_(split_(fs.readFileSync(l[1], 'utf8')));
}

function parse_func(code) {
	//Function
	var args = [];
	code = "function " + l[1] + "(";
	if (l[l.length - 1] != "(" && l[l.length - 1] != "#(")
		e("Syntax Error: Missing Token '(' at end of function declaration.", 1);
	for (i = 2; i < l.length - 1; ++i) {
		code += l[i].split(":")[l[i].split(":").length - 1];
		if (i + 1 < l.length - 1) code += ",";
		args.push({
			type: "newvar",
			name: l[i].split(":")[l[i].split(":").length - 1],
			stype: l[i].split(":")[0]
		});
		add({
			type: "psnewvar",
			stype: l[i].split(":")[0],
			name: l[i].split(":")[l[i].split(":").length - 1]
		});
	}
	code += "){";
	add({
		type: "func",
		name: l[1],
		args: args,
		nocode: l[l.length - 1] == "#("
	});
}

function parse_method_call(code) {
	//Method call
	var args = [];
	for (i = 1; i < l.length; ++i) {
		if (l[i].split(":").length > 1) {
			args.push(l[i].split(":")[1]);
		} else {
			args.push(l[i]);
		}
	}

	add({
		type: "methodcall",
		method: l[0].replace(/\_/g, "."),
		args: args
	});
}

/*
 * Testing and calling
 */

var totalcode = "",
	c = parse_(split_(`
import code/js.fred

import ${yargs._[0]}
`));

//console.log(c.join("\n"));
//console.log(totalcode);
//console.log(JSON.stringify(scope));

/*
 * Adding types and converting to JS
 */

var code = "",
	path = [];

function rec(sc, i) {
	reg_cd(i);
	if (yargs.log) {
		console.log(JSON.stringify(path));
		console.log(sc.type);
	}

	switch (sc.type) {
		case "root":
			reg_sub(sc);
			break;
		case "func":
			convert_function(sc);
			break;
		case "newvar":
			convert_newvar(sc);
			break;
		case "forin":
			convert_forin(sc);
			break;
		case "while":
			convert_while(sc);
			break;
		case "methodcall":
			convert_method_call(sc);
			break;
		case "cond":
			convert_cond(sc);
			break;
		case "psnewvar":
			break;
		case "forto":
			convert_forto(sc);
			break;
		default:
			e("Internal error", 0);
	}

	reg_cd("..");
}

// Call nested functions (in sc.sub)
function reg_sub(sc) {
	for (var i = 0; i < sc.sub.length; ++i) {
		rec(sc.sub[i], i);
	}
}

function reg_cd(i) {
	if (i != "..")
		path.push(i);
	else
		path.pop();
}

function reg_scopeat(path) {
	var str = "scope[";
	for (var i = 0; i < path.length - 1; ++i) {
		str += path[i] + "].sub[";
	}
	str += path[path.length - 1] + "].sub";
	return eval(str);
}

function reg_vartype(path_, varname) {
	var path = JSON.parse(JSON.stringify(path_)),
		sc, i, j;

	for (i = path.length; i > 0; --i) {
		sc = reg_scopeat(path);

		for (j = 0; j < sc.length; ++j) {
			if (sc[j].type == "newvar" || sc[j].type == "psnewvar") {
				if (sc[j].name == varname)
					return sc[j];
			} else if (sc[j].type == "func") {
				if (sc[j].name == varname)
					return {
						stype: "func"
					};
			}
		}

		path.pop();
	}
	return false;
}

function reg_funcsig(path_, varname) {
	var path = JSON.parse(JSON.stringify(path_)),
		sc, i, j;

	for (i = path.length; i > 0; --i) {
		sc = reg_scopeat(path);

		for (j = 0; j < sc.length; ++j) {
			if (sc[j].type == "func") {
				if (sc[j].name == varname)
					return sc[j];
			}
		}

		path.pop();
	}

	return {
		type: "undefined"
	};
}

function convert_cond(sc) {
	code += "if(" + sc.cond + "){";
	reg_sub(sc);
	code += "}";
}

function convert_function(sc) {
	if (sc.nocode) return;
	code += "function " + sc.name + "(";
	for (var i = 0; i < sc.args.length; ++i) {
		code += sc.args[i].name;
	}
	code += "){";
	reg_sub(sc);
	code += "}";
}

function convert_forin(sc) {
	code += "for(" + sc.var+"=0;" + sc.var+"<" + sc.in + ";++" + sc.var+"){";
	if (reg_vartype(path, sc.var).stype != "Int")
		e("Type Mismatch Error: Type of counter var is not 'Int'", 0, sc.line);
	reg_sub(sc);
	code += "}";
}

function convert_while(sc) {
	code += "while(" + sc.condition + "){"
	reg_sub(sc);
	code += "}";
}

function convert_newvar(sc) {
	code += "var " + sc.name + (sc.value ? "=" + sc.value + ";" : ";");
}

function convert_forto(sc) {
	code += "for(" + sc.var+"=" + sc.from + ";" + sc.var+"<" + sc.to + ";++" + sc.var+"){";
	reg_sub(sc);
	code += "}";
}

function convert_method_call(sc) {
	//Method call
	code += sc.method + "(";
	if (reg_funcsig(path, sc.method).type == "func") {
		var args = reg_funcsig(path, sc.method).args;
		for (var i = 0; i < args.length; ++i) {
			if (!reg_vartype(path, sc.args[i]))
				code += requires_quotation(args[i].stype) ? '"' + sc.args[i] + '"' : sc.args[i];
			else {
				var c = reg_vartype(path, sc.args[i]);
				if (c.stype != args[i].stype)
					e("Type mismatch between argument " + i + " of " + sc.method + " and " + c.name + ": " + c.stype + " and " + args[i].stype, 0, sc.line);
				code += sc.args[i];
			}
			if (i != args.length - 1) code += ",";
		}
	} else
		e("Compiler could not find function " + sc.method, 1, sc.line);
	code += ");";
}

rec(scope[0], 0);
console.log(code);
