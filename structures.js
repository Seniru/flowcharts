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
		if (debug) {
			this.element.setAttributeNS(null, "stroke-width", "4px")
		}
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
		super.execute()
		out.innerHTML = info("Begin execution")
	}

}

class Statement extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute(memory) {
		super.execute()
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
		super.execute()
		let data = /(\w+)\s+(.+)[;\s\n]*$/gmi.exec(this.value)
		if (data) {
			if (["READ", "INPUT"].includes(data[1].toUpperCase())) {
				let temp = data[2]
				try {
					temp = eval(temp)
				} catch {}
				memory[data[2]] = prompt(`Set value for ${data[2]}`)
			} else {
				out.innerHTML += error("Unrecognized instruction")
			}
		} else {
			out.innerHTML += error("Invalid syntax")
		}
	}

}

class Output extends Node {

	constructor(value, next, element) {
		super(value, next, element)
	}

	execute(memory) {
		super.execute()
		let data = /(\w+)\s+(.+)[;\s\n]*$/gmi.exec(this.value)
		if (data) {
			if (["PRINT", "OUTPUT", "WRITE"].includes(data[1].toUpperCase())) {
        		let outstrm = data[2].split(",").map(x => x.trim()).map(x => memory[x] ? memory[x] : x)
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
		this.nxt = []
	}

	execute(memory) {
		super.execute()
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
		super.execute()
	}
}

class Link {

	constructor(from, to, elements, ctx) {
		this.from = ctx.get(from.parentElement)
		this.fromPort = from
		this.to = ctx.get(to.parentElement)
		this.toPort = to
		this.elements = elements
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

	static _createLinkFragment(fromX, fromY, toX, toY, ctx) {
		let path = document.createElementNS('http://www.w3.org/2000/svg',"path")
		path.setAttributeNS(null, "stroke-width", "3")
		path.setAttributeNS(null, "stroke", "#7d949e")
		path.setAttributeNS(null, "d", `M ${fromX} ${fromY} L ${toX} ${toY}`)
		ctx.appendChild(path)
		return path
	}

	static drawLink(fromX, fromY, toX, toY, ctx) {
		let elements = []
		if (fromY < toY) {
			let middleY = (fromY + toY) / 2
			elements.push(Link._createLinkFragment(fromX, fromY, fromX, middleY, ctx))
			elements.push(Link._createLinkFragment(fromX, middleY, toX, middleY, ctx))
			elements.push(Link._createLinkFragment(toX, middleY, toX, toY, ctx))
		} else {
			let middleX = (fromX + toX) / 2
			elements.push(Link._createLinkFragment(fromX, fromY, fromX, fromY + 20, ctx))
			elements.push(Link._createLinkFragment(fromX, fromY + 20, middleX, fromY + 20, ctx))
			elements.push(Link._createLinkFragment(middleX, fromY + 20, middleX, toY - 20, ctx))
			elements.push(Link._createLinkFragment(middleX, toY - 20, toX, toY - 20, ctx))
			elements.push(Link._createLinkFragment(toX, toY - 20, toX, toY, ctx))
		}
		return elements
	}

	update(ctx) {
		let from = this.fromPort
		let appliedTransformsFrom = from.parentElement.transform.baseVal.getItem(0).matrix
		let fromX = parseFloat(from.getAttributeNS(null, "cx")) + appliedTransformsFrom.e
		let fromY = parseFloat(from.getAttributeNS(null, "cy")) + appliedTransformsFrom.f

		let to = this.toPort
		let appliedTransformsTo = to.parentElement.transform.baseVal.getItem(0).matrix
		let toX = parseFloat(to.getAttributeNS(null, "cx")) + appliedTransformsTo.e
		let toY = parseFloat(to.getAttributeNS(null, "cy")) + appliedTransformsTo.f

		for (let elem of this.elements) {
			ctx.removeChild(elem)
		}
		this.elements = Link.drawLink(fromX, fromY, toX, toY, ctx)		

	}

}
