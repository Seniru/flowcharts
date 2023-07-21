let debug = false
let running = false
let executor
let elem
let stepFunction

let memory = {}
const execute = entrypoint => {
	entrypoint.execute(memory)
	if (running && entrypoint.next) {
		elem = entrypoint.element
		executor = new Promise((resolve, reject) => {
			if (debug) {
				stepFunction = resolve
			} else {
				resolve()
			}
		})
		executor.then(() => {
			entrypoint.unhighlight()
			execute(entrypoint.next)	
		})

	} else {
		entrypoint.unhighlight()
		stopExecution()
	}
}

const error = msg => {
	return `<div class="error">[error] ${msg}</div>`
}

const stdout = msg => {
	return `<div class="stdout">[stdout] ${msg}</div>`
}

const info = msg => {
	return `<div class="info">[info] ${msg}</div>`
}
