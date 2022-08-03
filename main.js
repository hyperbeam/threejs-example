import "./style.css"
import * as THREE from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import Hyperbeam from "@hyperbeam/web"

const scene = new THREE.Scene()
const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .0001, 100)
camera.target = new THREE.Vector3(0, 0, 0)
camera.position.set(0, 0, 1)
camera.lookAt(camera.target)

const listener = new THREE.AudioListener()
const sound = new THREE.PositionalAudio(listener)
camera.add(listener)

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0x000000, 1)
renderer.setSize(window.innerWidth, window.innerHeight)
threejscontainer.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

// The default aspect ratio of the virtual computer is 16:9
const width = 1
const height = width * 9 / 16
const texture = new THREE.Texture()
const geometry = new THREE.PlaneBufferGeometry(width, height)
const material = new THREE.MeshBasicMaterial({ map: texture })
// Need to offset for Three.js left-handed coordinate system
// https://stackoverflow.com/questions/1263072/changing-a-matrix-from-right-handed-to-left-handed-coordinate-system
geometry.rotateZ(Math.PI)
geometry.rotateY(Math.PI)
material.side = THREE.DoubleSide

const plane = new THREE.Mesh(geometry, material)
scene.add(plane)
plane.add(sound)

const embedURL = "https://1aa2bnwfuuv7hod22dmbiqxql.hyperbeam.com/62lhP-IYR_ya0Fxb0474rg?token=NTbSjoEtqSfJJ0iZhzZKWzOwaznvT4MygJA-2Yr1tMk"
const hb = await Hyperbeam(hbcontainer, embedURL, {
	frameCb: (frame) => {
		plane.material.map.image = frame
		plane.material.map.needsUpdate = true
	},
	audioTrackCb: tryAudio
})

window.addEventListener("resize", onWindowResized)
window.addEventListener("wheel", onWheel)
window.addEventListener("contextmenu", onContextMenu)
window.addEventListener("pointermove", onPointerMove)
window.addEventListener("pointerdown", onPointerDown)
window.addEventListener("pointerup", onPointerUp)

onWindowResized()
animate()

function tryAudio(track) {
	sound.setMediaStreamSource(new MediaStream([track]))
	sound.setRefDistance(0.5)
	// The audio context might be waiting on a user gesture
	// In that case, we'll call sound.play() in the pointerdown handler
	if (listener.context.state === "running") {
		sound.play()
	}
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
			deltaY: e.deltaY
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
		await sound.play()
	}
}

function animate() {
	window.requestAnimationFrame(animate)
	controls.update()
	renderer.render(scene, camera)
}
