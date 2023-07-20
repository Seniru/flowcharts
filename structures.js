let out

class Node {

	constructor(value, next, element) {
		this.nxt = next
		//this.value = value
		this.element = element
		// store the results from an input or a conditional
		this.result = null
		this.x = null
		this.y = null
		this.links = []
	}

	// overridable function
	execute(memory) {

	}

	get next() {
		return this instanceof Conditional
			? (this.result ? this.nxt[0]?.item : this.nxt[1]?.item)
			: this.nxt?.item
	}

	set next(value) {
		this.nxt = value
	}

	get value() {
		return this.element.lastElementChild.children[0].value
	}

}

class Begin extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute() {
		out.innerHTML = info("Begin execution")
	}

}

class Statement extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute(memory) {
		let data = (/(set|calculate|calc)\s+(\w+)\s*=\s*(.*)[;\s\n]*/gmi.exec(this.value))
		if (data) {
    		if (["SET", "CALCULATE", "CALC"].includes(data[1].toUpperCase())) {
        		let temp = data[3]
				for (let k of Object.keys(memory)) {
					temp = temp.replace(new RegExp(`\\b${k}\\b`, "g"), memory[k])
				}
				try {
					temp = eval(temp)	
				} catch {}
				memory[data[2]] = temp
      		} else {
				//csl.innerHTML += `<div class='error'>[error] Unrecognized instruction ${data[1]}</div>`
				out.innerHTML += error(`Unrecognized instruction ${data[1]}`)
			}
    	} else {
			out.innerHTML += info(`${this.value}`)
    	}
	}

}

class Input extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute(memory) {
		let data = /(\w+)\s+(.+)[;\s\n]*$/gmi.exec(this.value)
		if (data) {
			if (["READ", "INPUT"].includes(data[1].toUpperCase())) {
				let temp = data[2]
				try {
					temp = eval(temp)
				} catch {}
				memory[data[2]] = prompt(`Set value for ${data[2]}`)
			} else {
				//csl.innerHTML += `<div class='error'>[error] Unrecognized instruction ${data[1]}</div>`
				out.innerHTML += error("Unrecognized instruction")
			}
		} else {
			//csl.innerHTML += `<div class='error'>[error] Invalid syntax`
			out.innerHTML += error("Invalid syntax")
		}
	}

}

class Output extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute(memory) {
		let data = /(\w+)\s+(.+)[;\s\n]*$/gmi.exec(this.value)
		if (data) {
			if (["PRINT", "OUTPUT", "WRITE"].includes(data[1].toUpperCase())) {
        		let outstrm = data[2].split(",").map(x => x.trim()).map(x => memory[x] ? memory[x] : x)
				//csl.innerHTML += `<div class='stdout'>${outstrm.join(" ")}</div>`
				out.innerHTML += stdout(outstrm.join(" "))
			} else {
				out.innerHTML += error("Unrecognized instruction")
			}
		} else {
			out.innerHTML += error("Invalid syntax")
  		}
	}

}

class Conditional extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute(memory) {
		let conditional = this.value
			.replace(/^(is|if|\s+)+/g, "")
			.replace(/(then|\?|\s+)+$/g, "")
			.replace(/and/g, "&&")
			.replace(/or/g, "||")
			.replace(/not/g, "!")
	
		for (let k of Object.entries(memory)) {
			conditional = conditional.replace(new RegExp("\\b" + k[0] + "\\b"), k[1])
		}	
		try {
			this.result = eval(conditional)
		} catch (e) {
			this.result = eval(confirm(this.value))
		}
	}
}

class Stop extends Node {

	constructor(value, next, element) {
		super(value, null, element)
	}

	execute(memory) {
		out.innerHTML += info("Execution stopped")
	}
}

class Link {

	constructor(from, to, element, ctx) {
		this.from = ctx.get(from.parentElement)
		this.fromPort = from
		this.to = ctx.get(to.parentElement)
		this.toPort = to
		this.element = element
		this.from.links.push(this)
		if (this.from instanceof Conditional) {
			if (!this.from.nxt) {
				this.from.nxt = []
			}
			this.from.nxt[Number(this.fromPort.classList.contains("conditional-true"))] = this
		} else {
			this.from.next = this
		}
		this.to.links.push(this)
	}

	get item() {
		return this.to
	}

	update() {
		let from = this.fromPort
		let appliedTransformsFrom = from.parentElement.transform.baseVal.getItem(0).matrix
		let fromX = parseFloat(from.getAttributeNS(null, "cx")) + appliedTransformsFrom.e
		let fromY = parseFloat(from.getAttributeNS(null, "cy")) + appliedTransformsFrom.f

		let to = this.toPort
		let appliedTransformsTo = to.parentElement.transform.baseVal.getItem(0).matrix
		let toX = parseFloat(to.getAttributeNS(null, "cx")) + appliedTransformsTo.e
		let toY = parseFloat(to.getAttributeNS(null, "cy")) + appliedTransformsTo.f

		this.element.setAttributeNS(null, "d", `M ${fromX} ${fromY} L ${toX} ${toY}`)

	}

}
