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
				//console.log(coords)
				let path = document.createElementNS('http://www.w3.org/2000/svg',"path")
				let appliedTransforms = from.parentElement.transform.baseVal.getItem(0).matrix
				activeLink = { 
					element: path,
					from,
					fromCoords: [
						parseFloat(from.getAttributeNS(null, "cx")) + appliedTransforms.e,
						parseFloat(from.getAttributeNS(null, "cy")) + appliedTransforms.f
					]
				}
				path.setAttributeNS(null, "stroke-width", "3")
				path.setAttributeNS(null, "stroke", "#7d949e")
				path.setAttributeNS(null, "d", `M ${activeLink.fromCoords[0]} ${activeLink.fromCoords[1]} L ${coords.x + 1} ${coords.y + 1}`)
				//path.setAttributeNS(null, "d", `M 100 350 q 150 -300 300 0`)
				chart.appendChild(path)
				return
			} else {
				if (activeLink && evt.target.classList.contains("in")) {
					// link the 2 nodes
					let to = evt.target
					let appliedTransforms = to.parentElement.transform.baseVal.getItem(0).matrix
					let toX = parseFloat(to.getAttributeNS(null, "cx")) + appliedTransforms.e
					let toY = parseFloat(to.getAttributeNS(null, "cy")) + appliedTransforms.f

					//activeLink.element.setAttributeNS(null, "d", `M ${activeLink.fromCoords[0]} ${activeLink.fromCoords[1]} L ${coords.x} ${coords.y}`)
					activeLink.element.setAttributeNS(null, "d", `M ${activeLink.fromCoords[0]} ${activeLink.fromCoords[1]} L ${toX} ${toY}`)
					new Link(activeLink.from, to, activeLink.element, structs)
					activeLink = null
					return
				}
			}
		}
		//console.log("comes here and removes the link?")
		if (activeLink) chart.removeChild(activeLink.element)
		activeLink = null
	})

	chart.addEventListener("mousemove", evt => {
		if (activeLink) {
			//let d = activeLink.getAttributeNS(null, "d")
			let coords = getMousePos(chart, evt)

			activeLink.element.setAttributeNS(null, "d", `M ${activeLink.fromCoords[0]} ${activeLink.fromCoords[1]} L ${coords.x} ${coords.y}`)

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
		//console.log(evt)
		let parent = evt.target.parentElement
		if (parent.classList.contains("draggable")) {
			selected = parent
			offset = getMousePosition(evt);
			//offset.x -= parseFloat(selected.getAttributeNS(null, "x"));
			//offset.y -= parseFloat(selected.getAttributeNS(null, "y"));
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
				  translate.setTranslate(0, 0);
				  // Add the translation to the front of the transforms list
				  selected.transform.baseVal.insertItemBefore(translate, 0);
			}
			// Get initial translation amount
			transform = transforms.getItem(0);
			offset.x -= transform.matrix.e;
			offset.y -= transform.matrix.f;
		}
	}

	const drag = evt => {
		activePanel = evt.toElement
		if (selected) {
			evt.preventDefault()
			let coord = getMousePosition(evt)

			//selected.setAttributeNS(null,"cx", coord.x - offset.x)
			//selected.setAttributeNS(null, "x", coord.x - offset.x)

			//selected.setAttributeNS(null, "cy", coord.y - offset.y)
			//selected.setAttributeNS(null, "y", coord.y - offset.y)
			selected.setAttributeNS(null, "transform", "translate(" + (coord.x - offset.x) + ", " + (coord.y - offset.y)+ ")")
			if (structs.has(selected)) {
				//structs.get(selected).next.update()
				//console.log(structs.get(selected).next)
				//structs.get(selected).next.update()
				for (let link of structs.get(selected).links) {
					link.update()
				}
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