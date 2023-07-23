// credits: (SVG dragging tutorial) https://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/ 

let selected
let palette, chart, view
let offset, transform
let dropped
let activeNode, activePanel, activeLink
let debugBtn, runBtn
let translateX = 0,
	translateY = 0,
	scale = 1,
	movable = false

let structs = new WeakMap()

const getMousePos = (svg, evt) => {
	let CTM = svg.getScreenCTM();
	return {
	  x: ((evt.clientX - CTM.e) / CTM.a) / scale,
	  y: ((evt.clientY - CTM.f) / CTM.d) / scale
	};
  }


window.onload = () => {
	
	palette = document.getElementById("palette")
	chart = document.getElementById("chart")
	debugBtn = document.getElementById("step")
	runBtn = document.getElementById("run")
	out = document.getElementById("console")
	view = document.getElementById("view")

	let begin = document.getElementsByClassName("begin")[0]

	structs.set(begin, new Begin(true, null, begin))

	chart.addEventListener("mousedown", evt => {
		if (selected) selected.unhighlight()

		if (evt.target.classList.contains("port")) {
			if (!activeLink && evt.target.classList.contains("out")) {
				// start linking from outwards port
				let from = evt.target
				let appliedTransforms = from.parentElement.transform.baseVal.getItem(0).matrix
				activeLink = { 
					elements: [],
					from,
					fromCoords: [
						parseFloat(from.getAttributeNS(null, "cx")) + appliedTransforms.e,
						parseFloat(from.getAttributeNS(null, "cy")) + appliedTransforms.f
					]
				}
				return
			} else {
				if (activeLink && evt.target.classList.contains("in")) {
					// link the 2 nodes
					new Link(activeLink.from, evt.target, activeLink.elements, structs).update(view)
					activeLink = null
					return
				}
			}
		} else if (evt.target.parentElement.classList.contains("draggable")) {
			selected = structs.get(evt.target.parentElement)
			selected.highlight()
			return
		}

		// clean up if none of the above
		if (activeLink) {
			for (let elem of activeLink.elements) view.removeChild(elem)
		}
		activeLink = null
		selected = null
	})

	chart.addEventListener("mousemove", evt => {
		if (activeLink) {
			let coords = getMousePos(chart, evt)
			for (let elem of activeLink.elements) view.removeChild(elem)
			activeLink.elements = Link.drawLink(activeLink.fromCoords[0], activeLink.fromCoords[1], coords.x - translateX, coords.y - translateY, view)
		}
		if (evt.shiftKey && movable) {
			translateX += evt.movementX
			translateY += evt.movementY
			view.setAttributeNS(null, "transform", `translate(${translateX} ${translateY}) scale(${scale})`)
		} else {
		}
	})

	chart.addEventListener("mousedown", evt => {
		movable = true
	})

	chart.addEventListener("mouseup", evt => {
		movable = false
	})

	addEventListener("wheel", evt => {
		scale += (evt.deltaY / Math.abs(evt.deltaY)) *  -0.1
		scale = Math.min(Math.max(0.5, scale), 2)
		view.setAttributeNS(null, "transform", `translate(${translateX} ${translateY}) scale(${scale})`)
	})


	addEventListener("keydown", evt => {
		if (evt.code == "Delete") {
			selected.destroy()
			selected = null
		} else if (evt.key == "Shift") {
			document.body.style.cursor = "move"
		}
	})

	addEventListener("keyup", evt => {
		if (evt.key == "Shift") {
			document.body.style.cursor = "default"
		}
	})
}

const makeDraggable = evt => {
	let svg = evt.target
	
	const getMousePosition = evt => {
		return getMousePos(svg, evt)
	  }
	

	const startDrag = evt => {
		activePanel = svg
		dropped = false
		let parent = evt.target.parentElement
		if (parent.classList.contains("draggable")) {
			activeNode = parent
			offset = getMousePosition(evt)
			if (activeNode.classList.contains("template")) {
				let clone = activeNode.cloneNode(true)
				clone.classList.remove("template")
				clone.classList.add("temp")
				palette.appendChild(clone)
				activeNode = clone
			}
			let transforms = activeNode.transform.baseVal;
			// Ensure the first transform is a translate transform
			if (transforms.length === 0 ||
				transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
				  // Create an transform that translates by (0, 0)
				  let translate = svg.createSVGTransform();
				  translate.setTranslate(0, 0)
				  // Add the translation to the front of the transforms list
				  activeNode.transform.baseVal.insertItemBefore(translate, 0)
			}
			// Get initial translation amount
			transform = transforms.getItem(0)
			offset.x -= transform.matrix.e
			offset.y -= transform.matrix.f
		}
	}

	const drag = evt => {
		activePanel = evt.toElement
		if (activeNode) {
			evt.preventDefault()
			let coord = getMousePosition(evt)
			//console.log(evt, evt..ownerSVGElement)
			//let inView = activePanel == chart || activePanel.ownerSVGElement == chart
			let tx = dropped ? translateX : 0
			let ty = dropped ? translateY : 0
			activeNode.setAttributeNS(null, "transform", "translate(" + (coord.x - offset.x - tx) + ", " + (coord.y - offset.y - ty)+ ")")
			if (structs.has(activeNode)) {
				for (let link of structs.get(activeNode).links) link.update(view)
			}
		}
	}

	const endDrag = evt => {
		if (activeNode && activeNode.classList.contains("temp")) {
			if (evt.toElement == chart || evt.toElement == view) {
				dropped = true
				let clone = activeNode.cloneNode(true)
				clone.classList.remove("temp")
				clone.lastElementChild.children[0]?.removeAttribute("disabled")
				view.appendChild(clone)
				clone.setAttributeNS(null, "transform", `translate(${-translateX} ${-translateY})`)
				palette.removeChild(activeNode)
				for (let type of [Begin, Statement, Input, Output, Conditional, Stop]) {
					if (clone.classList.contains(type.name.toLowerCase())) {
						structs.set(clone, new type(null, null, clone))
						break
					}
				}
				activeNode = clone
				if (selected) selected.unhighlight()
				selected = null
			} else {
				palette.removeChild(activeNode)
				activeNode = null
			}
		} else {
			activeNode = null
		}
	}

	svg.addEventListener('mousedown', startDrag)
	svg.addEventListener('mousemove', drag)
	svg.addEventListener('mouseup', endDrag)
	svg.addEventListener('mouseleave', endDrag)
}

const run = dbg => {
	memory = {}
	running = true
	runBtn.innerHTML = '<i class="fas fa-stop" style="color: #f44336;"></i>'
	runBtn.title = "Stop"
	debug = dbg
	let entrypoint = structs.get(document.getElementsByClassName("begin")[0])
	execute(entrypoint)
}

const step = () => {
	if (!running) {
		debugBtn.title = "Step"
		debugBtn.innerHTML = '<i class="fas fa-arrow-right" style="color: #45c9e5;"></i>'
		return run(true)
	}
	dispatchEvent(new Event("onstep"))

}

const stopExecution = () => {
	out.innerHTML += info("Execution stopped")
	running = false
	debugBtn.title = "Debug"
	debugBtn.innerHTML = '<i class="fas fa-bug"></i>'
	runBtn.innerHTML = '<i class="fas fa-play"></i>'
	runBtn.title = "Run"
	if (elem) elem.setAttributeNS(null, "stroke-width", "1px")

}

const runOrStop = () => {
	if (running) return stopExecution()
	run()
}

const debugOrStep = () => {
	if (!running) return step()
	stepFunction()
}