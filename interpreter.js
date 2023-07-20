let debug = false


let memory = {}
const execute = entrypoint => {
	entrypoint.execute(memory)
	if (entrypoint.next) {
		let promise = new Promise((resolve, reject) => {
			resolve()
		})
		promise.then(() => {
			execute(entrypoint.next)	
		})
		if (!debug) {
			Promise.resolve(promise)
		}
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