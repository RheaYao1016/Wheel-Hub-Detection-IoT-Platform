(function () {
  const container = document.getElementById('twinViewer');
  if (!container || !window.THREE) {
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020b18);

  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(4, 2.5, 4.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add('viewer-canvas');
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.minDistance = 1.2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.95;
  controls.target.set(0, 1, 0);

  const ambient = new THREE.AmbientLight(0xbfd4ff, 0.8);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(5, 6, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x5bbdf7, 0.6);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 0.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x041830, metalness: 0.2, roughness: 0.8 })
  );
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  scene.add(ground);

  const loader = new THREE.GLTFLoader();
  loader.load(
    'public/models/1.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      model.scale.set(1.1, 1.1, 1.1);
      model.position.set(0, 0, 0);
      scene.add(model);
    },
    undefined,
    () => {
      const fallback = document.createElement('div');
      fallback.textContent = '模型加载失败，请稍后重试。';
      fallback.style.position = 'absolute';
      fallback.style.top = '50%';
      fallback.style.left = '50%';
      fallback.style.transform = 'translate(-50%, -50%)';
      fallback.style.color = '#e8f3ff';
      container.appendChild(fallback);
    }
  );

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener('resize', resize);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  resize();
  animate();
})();
