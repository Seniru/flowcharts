// credits: (SVG dragging tutorial) https://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/ 

let palette
let chart
let selected
let offset
let transform
let activePanel
let activeLink
let structs = new WeakMap()

const getMousePos = (svg, evt) => {
	let CTM = svg.getScreenCTM();
	return {
	  x: (evt.clientX - CTM.e) / CTM.a,
	  y: (evt.clientY - CTM.f) / CTM.d
	};
  }


window.onload = () => {
	palette = document.getElementById("palette")
	chart = document.getElementById("chart")

	let begin = document.getElementsByClassName("begin")[0]

	out = document.getElementById("console")

	structs.set(begin, new Begin(true, null, begin))

	chart.addEventListener("mousedown", evt => {
		let coords = getMousePos(chart, evt)
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
					new Link(activeLink.from, evt.target, activeLink.elements, structs).update(chart)
					activeLink = null
					return
				}
			}
		}
		if (activeLink) {
			for (let elem of activeLink.elements) chart.removeChild(elem)
		}
		activeLink = null
	})

	chart.addEventListener("mousemove", evt => {
		if (activeLink) {
			let coords = getMousePos(chart, evt)
			for (let elem of activeLink.elements) chart.removeChild(elem)
			activeLink.elements = Link.drawLink(activeLink.fromCoords[0], activeLink.fromCoords[1], coords.x, coords.y, chart)
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
		let parent = evt.target.parentElement
		if (parent.classList.contains("draggable")) {
			selected = parent
			offset = getMousePosition(evt)
			if (selected.classList.contains("template")) {
				let clone = selected.cloneNode(true)
				clone.classList.remove("template")
				clone.classList.add("temp")
				palette.appendChild(clone)
				selected = clone
			}
			let transforms = selected.transform.baseVal;
			// Ensure the first transform is a translate transform
			if (transforms.length === 0 ||
				transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
				  // Create an transform that translates by (0, 0)
				  let translate = svg.createSVGTransform();
				  translate.setTranslate(0, 0)
				  // Add the translation to the front of the transforms list
				  selected.transform.baseVal.insertItemBefore(translate, 0)
			}
			// Get initial translation amount
			transform = transforms.getItem(0)
			offset.x -= transform.matrix.e
			offset.y -= transform.matrix.f
		}
	}

	const drag = evt => {
		activePanel = evt.toElement
		if (selected) {
			evt.preventDefault()
			let coord = getMousePosition(evt)
			selected.setAttributeNS(null, "transform", "translate(" + (coord.x - offset.x) + ", " + (coord.y - offset.y)+ ")")
			if (structs.has(selected)) {
				for (let link of structs.get(selected).links) link.update(chart)
			}
		}
	}

	const endDrag = evt => {
		if (selected && selected.classList.contains("temp")) {
			if (evt.toElement == chart) {
				let clone = selected.cloneNode(true)
				clone.classList.remove("temp")
				clone.lastElementChild.children[0]?.removeAttribute("disabled")
				chart.appendChild(clone)
				palette.removeChild(selected)
				for (let type of [Begin, Statement, Input, Output, Conditional, Stop]) {
					if (clone.classList.contains(type.name.toLowerCase())) {
						structs.set(clone, new type(null, null, clone))
						break
					}
				}
				selected = clone
			} else {
				palette.removeChild(selected)
				selected = null
			}
		} else {
			selected = null
		}
	}

	svg.addEventListener('mousedown', startDrag)
	svg.addEventListener('mousemove', drag)
	svg.addEventListener('mouseup', endDrag)
	svg.addEventListener('mouseleave', endDrag)
}

const run = () => {
	let entrypoint = structs.get(document.getElementsByClassName("begin")[0])
	execute(entrypoint)
}