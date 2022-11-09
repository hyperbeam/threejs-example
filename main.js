import "./style.css"
import * as THREE from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {FontLoader} from "three/examples/jsm/loaders/FontLoader"
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry"
import fontURL from "./fonts/helvetiker_regular.typeface.json?url"

import Hyperbeam from "@hyperbeam/web"

(async () => {
	let embedURL = "" // Running locally and you have an embed URL? Set it here
	if (embedURL === "") {
		const room = location.pathname.substring(1)
		const req = await fetch("https://demo-api.tutturu.workers.dev/" + room)
		if (req.status >= 400) {
			alert("We are out of demo servers! Visit hyperbeam.dev to get your own API key")
			return
		}
		const body = await req.json()
		if (body.room !== room) {
			history.replaceState(null, null, "/" + body.room + location.search)
		}
		embedURL = body.url
	}
	main(embedURL)
})()

async function main(embedURL) {
	const scene = new THREE.Scene()
	const pointer = new THREE.Vector2()
	const raycaster = new THREE.Raycaster()
	const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .0001, 100)
	camera.position.set(0, 0.2, 0.5)

	const listener = new THREE.AudioListener()
	const sound = new THREE.PositionalAudio(listener)
	camera.add(listener)

	const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setClearColor(0xFF889B, 1)
	renderer.setSize(window.innerWidth, window.innerHeight)
	threejscontainer.appendChild(renderer.domElement)

	const controls = new OrbitControls(camera, renderer.domElement)
	controls.target.set(0, 0.2, 0)

	// The default aspect ratio of the virtual computer is 16:9
	const width = 0.62
	const height = width * 9 / 16
	const texture = new THREE.Texture()
	// force flipY to false, three.js is inconsistent with this behaviour
	texture.flipY = false
	texture.generateMipmaps = false

	const geometry = new THREE.PlaneBufferGeometry(width, height)
	const material = new THREE.MeshBasicMaterial({ map: texture })
	// Need to offset for Three.js left-handed coordinate system
	// https://stackoverflow.com/questions/1263072/changing-a-matrix-from-right-handed-to-left-handed-coordinate-system
	geometry.rotateZ(Math.PI)
	geometry.rotateY(Math.PI)
	material.side = THREE.DoubleSide

	const plane = new THREE.Mesh(geometry, material)
	plane.translateY(height / 2 + 0.04)
	scene.add(plane)
	scene.add(checkerboardMesh(1, 15))
	plane.add(sound)

	// Start - Text
	let textGroup, textMesh, textGeo, textMaterials;
	let text = `Outside the virtual computer:\n\nLeft-click to rotate\nRight-click to pan\nScroll wheel for zoom`, font = 'helvetiker'
	const textHeight = 0,
		size = 0.015,
		hover = 0.51,
		curveSegments = 4

	textMaterials = [
		new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // front
		new THREE.MeshPhongMaterial( { color: 0xffffff } ) // side
	];

	textGroup = new THREE.Group();
	textGroup.position.y = 0;
	textGroup.position.x = -0.16;

	scene.add( textGroup );
	loadFont();

	function loadFont() {
		const loader = new FontLoader();
		loader.load( fontURL, function ( response ) {
			font = response;
			createText();
		} );
	}

	function createText() {
		textGeo = new TextGeometry( text, {
			font: font,
			size: size,
			height: textHeight,
			curveSegments: curveSegments,
		} );
		textGeo.computeBoundingBox();
		const centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );
		textMesh = new THREE.Mesh( textGeo, textMaterials );
		textMesh.position.x = centerOffset;
		textMesh.position.y = hover;
		textMesh.position.z = 0;
		textMesh.rotation.x = 0;
		textMesh.rotation.y = Math.PI * 2;
		textGroup.add( textMesh );
	}
	// End - Text

	const hb = await Hyperbeam(hbcontainer, embedURL, {
		frameCb: (frame) => {
			if (texture.image === null) {
				if (frame.constructor === HTMLVideoElement) {
					// hack: three.js internal methods check for .width and .height
					// need to set manually for video so that three.js handles it correctly
					frame.width = frame.videoWidth
					frame.height = frame.videoHeight
				}
				texture.image = frame
				texture.needsUpdate = true
			} else {
				renderer.copyTextureToTexture(new THREE.Vector2(0, 0), new THREE.Texture(frame), texture)
			}
		},
		audioTrackCb: tryAudio
	})

	window.addEventListener("resize", onWindowResized)
	window.addEventListener("wheel", onWheel)
	window.addEventListener("contextmenu", onContextMenu)
	window.addEventListener("pointermove", onPointerMove)
	window.addEventListener("pointerdown", onPointerDown)
	window.addEventListener("pointerup", onPointerUp)

	setStartURL()
	onWindowResized()
	animate()

	function tryAudio(track) {
		// sound.play() does not need to be called when calling setMediaStreamSource
		// See https://threejs.org/docs/#api/en/audio/Audio.setMediaStreamSource
		sound.setMediaStreamSource(new MediaStream([track]))
		sound.setRefDistance(0.5)
	}

	function onWindowResized() {
		const w = window.innerWidth
		const h = window.innerHeight
		renderer.setSize(w, h)
		camera.aspect = w / h
		camera.updateProjectionMatrix()
	}

	function getPlaneIntersects() {
		raycaster.setFromCamera(pointer, camera)
		return raycaster.intersectObject(plane, false)
	}

	function onWheel(e) {
		if (getPlaneIntersects().length > 0) {
			hb.sendEvent({
				type: "wheel",
				deltaY: e.deltaY,
			})
		}
	}

	function onContextMenu(e) {
		if (getPlaneIntersects().length > 0) {
			e.preventDefault()
		}
	}

	function handlePointer(e, type) {
		pointer.x = (e.clientX / window.innerWidth) * 2 - 1
		pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
		const intersects = getPlaneIntersects()
		if (intersects.length > 0) {
			// We disable the OrbitControls when the user's pointer is on the virtual computer
			controls.enabled = false
			const vector = new THREE.Vector3().copy(intersects[0].point)
			plane.worldToLocal(vector)
			hb.sendEvent({
				type,
				x: vector.x / width + 0.5,
				y: -vector.y / height + 0.5,
				button: e.button
			})
		} else {
			controls.enabled = true
		}
	}

	function onPointerMove(e) {
		handlePointer(e, "mousemove")
	}

	function onPointerDown(e) {
		handlePointer(e, "mousedown")
	}

	async function onPointerUp(e) {
		handlePointer(e, "mouseup")
		// If the audio context was suspended because there were no user gestures,
		// resume the audio context now since the user interacted with the page
		if (listener.context.state === "suspended") {
			await listener.context.resume()
		}
	}

	function animate() {
		window.requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}

	function setStartURL() {
		const params = new URLSearchParams(location.search)
		const startURL = params.get('url')
		if (startURL) {
			hb.tabs.update({url: startURL})
		}
	}
}

function checkerboardMesh(width, segments) {
	const geometry = new THREE.PlaneGeometry(width, width, segments, segments).toNonIndexed()
	const material = new THREE.MeshBasicMaterial({
		vertexColors: true,
		transparent: true,
		side: THREE.DoubleSide
	})
	const positionAttribute = geometry.getAttribute("position")
	const colors = []
	for (let i = 0; i < positionAttribute.count; i++) {
		colors.push(0, 0, 0, i % 6 === i % 12 ? 1 : 0)
	}
	geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
	const mesh = new THREE.Mesh(geometry, material)
	mesh.rotateX(Math.PI / 2)
	mesh.translateY(width / 2)
	return mesh
}
