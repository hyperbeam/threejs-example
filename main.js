import "./style.css"
import * as THREE from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import Hyperbeam from "@hyperbeam/web"

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .0001, 100)
camera.target = new THREE.Vector3(0, 0, 0)
camera.position.set(0, 0, 1)
camera.lookAt(camera.target)

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0x000000, 1)
renderer.setSize(window.innerWidth, window.innerHeight)
threejscontainer.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

const texture = new THREE.Texture()
const geometry = new THREE.PlaneBufferGeometry(1, 9 / 16)
// geometry.rotateZ(Math.PI*1)
const plane = new THREE.Mesh(
	geometry,
	new THREE.MeshBasicMaterial({ map: texture })
)
scene.add(plane)

window.addEventListener("resize", onWindowResized)
onWindowResized()
animate()

function onWindowResized() {
	const w = window.innerWidth
	const h = window.innerHeight
	renderer.setSize( w, h )
	camera.aspect = w / h
	camera.updateProjectionMatrix()
}

function animate() {
	window.requestAnimationFrame(animate)
	controls.update()
	renderer.render(scene, camera)
}

const embedURL = "https://1aa2bnwfuuv7hod22dmbiqxql.hyperbeam.com/fY0wxooSQ_yQxBQmD3jYHg?token=XOvtBJel4_RvA66MGF8qiyxxMH1LL3e8kdvB48C9pU8"
const hb = await Hyperbeam(hbcontainer, embedURL, {
	frameCb: (frame) => {
		plane.material.map.image = frame
		plane.material.map.needsUpdate = true
	}
})
