# threejs-example

Hyperbeam virtual computers in Three.js! 🤯
- [x] Spatial audio 🎵
- [x] Handles mouse, keyboard and wheel events 🖱️
- [x] OrbitControls 🚀
- [x] Oh, and the virtual computer is multiplayer 😉

**Try it out here** 👉 https://threejs-example.hyperbeam.com

### Show me the magic! 🪄

Make sure you turn on the audio 😎

https://user-images.githubusercontent.com/18666879/185451405-729c7788-6950-493d-8264-09c7edeadd92.mp4

### Running locally 💻

```bash
npm install
npm run dev
```

### Setting custom embed URL 🤔

1. You'll need to get a Hyperbeam API key — you can generate a **free API key** by signing up at https://hyperbeam.com 🎉
2. Start a virtual computer session using `curl`:
```
curl -X POST -H 'Authorization: Bearer <your-api-key>' https://engine.hyperbeam.com/v0/vm
{
  "session_id": "85a208c0-8fc1-4b27-bcbc-941f6208480b",
  "embed_url": "https://96xljbfypmn3ibra366yqapci.hyperbeam.com/haIIwI_BSye8vJQfYghICw?token=QAWRxLz6exTKbxlFG3MTBxsoPePyDa7_WO3FCxKO73M",
  "admin_token": "OjIulaS-YO4qWHoGap2iK3KqUvAX5qEi9_fDCxESNj0"
}
```
3. Copy the value of the `"embed_url"` key and set the `embedURL` variable in [main.js](https://github.com/hyperbeam/threejs-example/blob/master/main.js#L7).
