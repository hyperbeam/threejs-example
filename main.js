import * as THREE from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import Hyperbeam from "@hyperbeam/web"

(async () => {
	const renderHyperbeam = renderScene()
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
			history.replaceState(null, null, "/" + body.room)
		}
		embedURL = body.url
	}
	setTimeout(renderHyperbeam, 4000, embedURL)
})()

function renderScene() {
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
	bootup.play()
	let texture = new THREE.VideoTexture(bootup)
	texture.flipY = false

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

	function animate() {
		window.requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}
	animate()

	async function renderHyperbeam(embedURL) {
		texture.dispose()
		texture = new THREE.Texture()
		texture.flipY = false // force flipY to false, three.js is inconsistent with this behaviour
		texture.generateMipmaps = false
		material.map = texture

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

		onWindowResized()

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
			if (listener.context.state === "suspended") { // If the audio context was suspended because there were no user gestures,
				await listener.context.resume()             // resume the audio context now since the user interacted with the page
				await sound.play()
			}
		}
	}
	return renderHyperbeam
}

function checkerboardMesh(width, segments) {
	const geometry = new THREE.PlaneGeometry(width, width, segments, segments).toNonIndexed()
	const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide })
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
