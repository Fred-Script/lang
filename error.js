// Error handling
function e(name, i, line) {
	console.log(["Error", "Warning", "Notice", "Log"][i] + ": " + name + " in line " + (line ? line : (CURRENT_LINE + 1)));
	if (i == 0)
		process.exit(1);
}

module.exports = {
	e: e
};
