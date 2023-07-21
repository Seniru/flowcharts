let debug = false
let running = false
let executor
let elem
let stepFunction

let memory = {}
const execute = entrypoint => {
	running = true
	entrypoint.execute(memory)
	if (entrypoint.next) {
		elem = entrypoint.element
		executor = new Promise((resolve, reject) => {
			if (debug) {
				stepFunction = resolve
			} else {
				resolve()
			}
		})
		executor.then(() => {
			entrypoint.element.setAttributeNS(null, "stroke-width", "1px")
			execute(entrypoint.next)	
		})

	} else {
		entrypoint.element.setAttributeNS(null, "stroke-width", "1px")
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
