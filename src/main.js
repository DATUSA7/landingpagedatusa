import * as THREE from "three";
import { Timer } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

function initCylinderChartScene() {
  const canvas = document.querySelector("#hero-canvas");
  if (!canvas) return;

  const tooltip = document.getElementById("chart-tooltip");
  const tooltipLabel = document.getElementById("tooltip-label");
  const tooltipViews = document.getElementById("tooltip-views");

  // 1. Configuración del Renderizador, Escena y Cámara
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c14);

  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 4, 9);
  camera.lookAt(0, 1, 0);

  // 2. Iluminación profesional
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(6, 10, 6);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0x3b82f6, 3, 20);
  pointLight.position.set(0, 5, 2);
  scene.add(pointLight);

  // 3. PISO REFLECTANTE REAL CON `Reflector`
  const reflectorGeometry = new THREE.PlaneGeometry(30, 30);
  const verticalMirror = new Reflector(reflectorGeometry, {
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    color: 0x111827,
    clipBias: 0.003
  });
  verticalMirror.rotation.x = -Math.PI / 2;
  verticalMirror.position.y = 0;
  scene.add(verticalMirror);

  const gridHelper = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1f293d);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // 4. Datos inspirados en métricas de YouTube
  const youtubeMetrics = [
    { label: "#01", value: 1.9, views: "1.2M", color: 0x3b82f6 },
    { label: "#02", value: 1.7, views: "980K", color: 0x60a5fa },
    { label: "#03", value: 1.5, views: "750K", color: 0x8b5cf6 },
    { label: "#04", value: 1.4, views: "620K", color: 0xa78bfa },
    { label: "#05", value: 1.6, views: "490K", color: 0x3b82f6 },
    { label: "#06", value: 1.8, views: "350K", color: 0x60a5fa },
  ];

  const cylindersGroup = new THREE.Group();
  scene.add(cylindersGroup);

  const cylinderMeshes = [];
  const spacing = 0.9;
  const totalWidth = (youtubeMetrics.length - 1) * spacing;

  youtubeMetrics.forEach((item, index) => {
    const radius = 0.3;
    const height = item.value;

    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    geometry.translate(0, height / 2, 0);

    const material = new THREE.MeshStandardMaterial({
      color: item.color,
      roughness: 0.3,
      metalness: 0.7,
      emissive: item.color,
      emissiveIntensity: 0.2
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.castShadow = true;
    
    const xPos = index * spacing - totalWidth / 2;
    cylinder.position.set(xPos, 0, 0);

    cylinder.scale.y = 0.001; // Inicia colapsado para la animación
    
    // Guardamos los datos de analítica directamente en el objeto 3D
    cylinder.userData = { 
      label: item.label, 
      views: item.views, 
      targetHeight: height 
    };

    cylindersGroup.add(cylinder);
    cylinderMeshes.push(cylinder);
  });

  // 5. Configuración de Raycaster y Mouse para Tooltips y Arrastre
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let isDragging = false;
  let previousPointerPosition = { x: 0, y: 0 };
  let targetRotationY = 0;
  let currentRotationY = 0;

  canvas.style.touchAction = "none";

  canvas.addEventListener("pointerdown", (event) => {
    isDragging = true;
    previousPointerPosition = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointerup", (event) => {
    isDragging = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch {}
  });

  canvas.addEventListener("pointercancel", () => {
    isDragging = false;
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    // Normalizar coordenadas del puntero para Raycaster (-1 a 1)
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const deltaX = event.clientX - previousPointerPosition.x;
      targetRotationY += deltaX * 0.008;
      previousPointerPosition = { x: event.clientX, y: event.clientY };
    }
  });

  function resizeCanvas() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  const timer = new Timer();
  let animationProgress = 0;

  // 6. Bucle de Animación con Detección Raycaster por Frame
  function animate() {
    requestAnimationFrame(animate);

    timer.update();
    const elapsedTime = timer.getElapsed();

    if (animationProgress < 1) {
      animationProgress += 0.02; 
      const easeProgress = 1 - Math.pow(1 - animationProgress, 3);

      cylinderMeshes.forEach((cyl) => {
        cyl.scale.y = Math.max(0.001, easeProgress * cyl.userData.targetHeight);
      });
    }

    // Suavizado de rotación
    currentRotationY += (targetRotationY - currentRotationY) * 0.05;
    cylindersGroup.rotation.y = currentRotationY;

    cylindersGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05;

    // --- DETECCIÓN DE INTERSECCIÓN (RAYCASTER / TOOLTIP) ---
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(cylinderMeshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object;
      const data = intersectedMesh.userData;

      // Actualizar texto del tooltip con los datos del cilindro
      if (tooltipLabel && tooltipViews) {
        tooltipLabel.textContent = `VIDEO ${data.label}`;
        tooltipViews.textContent = `${data.views} vistas`;
        tooltip.classList.add("visible");
      }
    } else {
      if (tooltip) {
        tooltip.classList.remove("visible");
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}

// Inicializar Cloudflare observer
function initCloudflareObserver() {
  const iframe = document.getElementById("cloudflare-iframe");
  const loader = document.getElementById("iframe-loader");

  if (!iframe || !loader) return;

  const observerOptions = {
    root: null,
    rootMargin: "200px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const targetUrl = iframe.getAttribute("data-src");
        if (targetUrl && targetUrl !== "TU_URL_DE_CLOUDFLARE_AQUI") {
          iframe.src = targetUrl;
          iframe.onload = () => {
            loader.classList.add("hidden");
          };
        } else {
          loader.querySelector("span").textContent = "Configura la URL de Cloudflare en el HTML.";
        }
        observerInstance.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const wrapper = document.querySelector(".iframe-wrapper");
  if (wrapper) observer.observe(wrapper);
}

document.addEventListener("DOMContentLoaded", () => {
  initCylinderChartScene();
  initCloudflareObserver();
});