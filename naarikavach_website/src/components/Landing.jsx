import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { STLLoader, OrbitControls } from 'three/examples/jsm/Addons.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link, Element } from 'react-scroll'
import { useNavigate } from 'react-router-dom'
import { LoginModal } from './LoginModal'

export default function Landing() {
  const canvasRef = useRef(null)
  const groupRef = useRef(null)
  const cameraRef = useRef(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true;
    
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe8e8e8);

    // Scroll event listener for header background and bottom detection
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const heroHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      
      setIsScrolled(scrollPosition > heroHeight * 0.3); // Show header after 30% of hero section
      
      // Check if user is near the bottom (within 100px of the bottom)
      const isNearBottom = scrollPosition + windowHeight >= documentHeight - 100;
      setIsAtBottom(isNearBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial scroll position

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000)
    camera.position.set(0, 0, 100)
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // Create cursor-following point light
    const cursorLight = new THREE.PointLight(0xfccf19, 30, 500, 1.2);
    cursorLight.position.set(0, 0, 30);
    scene.add(cursorLight);

    // Mouse position tracking
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (event) => {
      // Normalize mouse coordinates (-1 to +1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update raycaster with camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Calculate a point in 3D space in front of the camera
      const distance = 60; // Distance from camera where light should be positioned
      const lightPosition = new THREE.Vector3();
      lightPosition.copy(raycaster.ray.direction);
      lightPosition.multiplyScalar(distance);
      lightPosition.add(camera.position);

      // Update point light position
      cursorLight.position.copy(lightPosition);
    };

    // Add mouse move event listener
    window.addEventListener('mousemove', handleMouseMove);

    groupRef.current = new THREE.Group();
    groupRef.current.position.set(-27, -18, 0);
    groupRef.current.rotation.set(-0.2, 0.15, 0); // Position group to the left
    scene.add(groupRef.current);

    let modelsLoaded = 0;
    const totalModels = 1;

    const stlLoader2 = new STLLoader();
    stlLoader2.load('/womensafety/womensafety.stl', (geometry) => {
      if (!isMounted) return;
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Change to white
      const mesh = new THREE.Mesh(geometry, material);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const center = new THREE.Vector3();
      box.getCenter(center);
      mesh.position.set(0, 10, -center.z);
      mesh.scale.set(0.04, 0.04, 0.04);
      mesh.rotation.set(THREE.MathUtils.degToRad(270), THREE.MathUtils.degToRad(0), THREE.MathUtils.degToRad(6));
      groupRef.current.add(mesh);
      modelsLoaded++;
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableZoom = false; // Disable zoom to not interfere with page scroll
    controls.enablePan = false;
    controls.minDistance = 80;
    controls.maxDistance = 150;
    controls.minPolarAngle = Math.PI / 2.5;
    controls.maxPolarAngle = Math.PI / 2.5;

    // GSAP ScrollTrigger for camera zoom - simplified approach
    let scrollTriggerInstance = null;
    
    const setupScrollTrigger = () => {
      // Wait for both DOM and 3D scene to be ready
      if (cameraRef.current && groupRef.current) {
        scrollTriggerInstance = ScrollTrigger.create({
          trigger: "#hero-section",
          start: "top top",
          end: "bottom top", // Scroll through the full hero section
          scrub: true,
          pin: false, // Remove pin since we're using fixed positioning
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress;
            
            // 4 Phases with gaps: Hero (0-20%) -> Gap -> About (30-50%) -> Gap -> Features (60-80%) -> Gap -> Contact (90-100%)
            const phase1Progress = Math.min(progress * 5, 1); // Hero fade out (0-20%)
            const phase2Progress = Math.max(0, Math.min((progress - 0.2) * 5, 1)); // About fade in (30-50%)
            const phase3Progress = Math.max(0, Math.min((progress - 0.55) * 5, 1)); // Features fade in (60-80%)
            const phase4Progress = Math.max(0, Math.min((progress - 0.9) * 10, 1)); // Contact fade in (90-100%)
            
            // Zoom camera (happens during phase 1)
            const startZ = 100;
            const endZ = 50;
            const newZ = startZ - (startZ - endZ) * phase1Progress;
            
            if (cameraRef.current) {
              cameraRef.current.position.z = newZ;
            }
            
            // Move model to center (happens during phase 1)
            if (groupRef.current) {
              const startX = -27;
              const startY = -18;
              const endX = 0;
              const endY = -20; // Offset upward to center the face
              
              groupRef.current.position.x = startX + (endX - startX) * phase1Progress;
              groupRef.current.position.y = startY + (endY - startY) * phase1Progress;
              
              // Add slight rotation throughout
              groupRef.current.rotation.y = progress * 0.4;
            }
            
            // Hero text fades out during phase 1
            const heroText = document.querySelector('#hero-text');
            if (heroText) {
              heroText.style.opacity = 1 - phase1Progress;
              heroText.style.transform = `translateY(${-phase1Progress * 30}px)`;
            }
            
            // About text fades in during phase 2, out during phase 3
            const aboutText = document.querySelector('#about-text');
            if (aboutText) {
              let aboutOpacity = 0;
              if (progress >= 0.3 && progress < 0.6) {
                aboutOpacity = phase2Progress;
              } else if (progress >= 0.5 && progress < 0.58) {
                aboutOpacity = 1; // Stay fully opaque much longer
              } else if (progress >= 0.58 && progress < 0.6) {
                aboutOpacity = 1 - ((progress - 0.58) * 50); // Fade out over 2% (0.58-0.6)
              }
              aboutText.style.opacity = aboutOpacity;
              aboutText.style.transform = `translateY(${(1 - phase2Progress) * 30}px)`;
            }
            
            // Features text fades in during phase 3, out during phase 4
            const featuresText = document.querySelector('#features-text');
            if (featuresText) {
              let featuresOpacity = 0;
              if (progress >= 0.6 && progress < 0.8) {
                featuresOpacity = phase3Progress;
              } else if (progress >= 0.8 && progress < 0.97) {
                featuresOpacity = 1; // Stay fully opaque much longer
              } else if (progress >= 0.97) {
                featuresOpacity = 1 - ((progress - 0.97) * 33.33); // Fade out over 3% (0.97-1.0)
              }
              featuresText.style.opacity = featuresOpacity;
              featuresText.style.transform = `translateY(${(1 - phase3Progress) * 30}px)`;
            }
            
            // Contact text fades in during phase 4
            const contactText = document.querySelector('#contact-text');
            if (contactText) {
              contactText.style.opacity = phase4Progress;
              contactText.style.transform = `translateY(${(1 - phase4Progress) * 30}px)`;
            }
          }
        });
      }
    };
    
    // Setup ScrollTrigger after all 3D models are loaded
    const checkAndSetupScrollTrigger = () => {
      if (modelsLoaded === totalModels && cameraRef.current && groupRef.current) {
        setupScrollTrigger();
      } else if (modelsLoaded < totalModels) {
        setTimeout(checkAndSetupScrollTrigger, 200);
      }
    };
    
    // Wait for all models to load before setting up ScrollTrigger
    setTimeout(checkAndSetupScrollTrigger, 100);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Debounce function for resize handling
    let resizeTimeout;
    function handleResize() {
      const canvas = renderer.domElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 && height === 0) return; // a annyoing issue where this can be 0
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      
      // Debounced ScrollTrigger refresh to prevent timing issues with pinned elements
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    let frameId = requestAnimationFrame(animate);

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);

      // Clean up ScrollTrigger properly
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
        scrollTriggerInstance = null;
      }
      // Clear any pending resize timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      // Kill all ScrollTriggers to prevent memory leaks
      ScrollTrigger.killAll();

      // Dispose of scene resources
      scene.traverse(object => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, [])

  // Smooth scroll functions for navigation
  const scrollToAbout = () => {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      // About section starts at 30% of the 300vh scroll area
      const scrollDistance = window.innerHeight * 3 * 0.18; // 30% into the scroll sequence
      window.scrollTo({
        top: scrollDistance,
        behavior: 'smooth'
      });
    }
  };

  const scrollToFeatures = () => {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      // Features section starts at 60% of the 300vh scroll area
      const scrollDistance = window.innerHeight * 3 * 0.3; // 60% into the scroll sequence
      window.scrollTo({
        top: scrollDistance,
        behavior: 'smooth'
      });
    }
  };

  const scrollToContact = () => {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      // Contact section starts at 90% of the 300vh scroll area
      const scrollDistance = window.innerHeight * 3 * 0.9; // 90% into the scroll sequence
      window.scrollTo({
        top: scrollDistance,
        behavior: 'smooth'
      });
    }
  };

  const handleChatRoomClick = () => {
    navigate('/chat');
  };

  const handleScrollIndicatorClick = () => {
    if (isAtBottom) {
      // Scroll to top smoothly
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      // Continue scrolling to features section
      const heroSection = document.getElementById('hero-section');
      if (heroSection) {
        const scrollDistance = window.innerHeight * 3 * 0.3; // 60% into the scroll sequence
        window.scrollTo({
          top: scrollDistance,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <div className="relative w-full max-w-full overflow-x-hidden bg-[#12100E] text-black">
      {/* Fixed Header */}
      <header className={`fixed top-0 left-0 w-full flex justify-between items-center z-30 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/85 backdrop-blur-sm border-b border-gray-200 shadow-lg py-3 px-6' 
          : 'bg-transparent p-8'
      }`}>
        <div className="flex items-center space-x-3">
          <img src="/naarilogo.svg" alt="Logo" className="h-20 w-20" />
          <span className="text-2xl font-bold tracking-wider text-black">NAARIकवच</span>
        </div>
        <nav className="flex items-center space-x-8 text-lg">
          {isScrolled && (
            <Link to="hero" smooth duration={500} className="relative !text-black !bg-transparent !border-none cursor-pointer hover:text-gray-600 transition-all ease-in-out focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 active:!outline-none before:transition-[width] before:ease-in-out before:duration-500 before:absolute before:bg-black before:origin-center before:h-[2px] before:w-0 hover:before:w-[50%] before:bottom-[-8px] before:left-[50%] after:transition-[width] after:ease-in-out after:duration-500 after:absolute after:bg-black after:origin-center after:h-[2px] after:w-0 hover:after:w-[50%] after:bottom-[-8px] after:right-[50%]">Home</Link>
          )}
          <button onClick={() => scrollToAbout()} className="relative !text-black !bg-transparent !border-none cursor-pointer hover:text-gray-600 transition-all ease-in-out focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 active:!outline-none before:transition-[width] before:ease-in-out before:duration-500 before:absolute before:bg-black before:origin-center before:h-[2px] before:w-0 hover:before:w-[50%] before:bottom-1 before:left-[50%] after:transition-[width] after:ease-in-out after:duration-500 after:absolute after:bg-black after:origin-center after:h-[2px] after:w-0 hover:after:w-[50%] after:bottom-1 after:right-[50%]">About</button>
          <button onClick={() => scrollToFeatures()} className="relative !text-black !bg-transparent !border-none cursor-pointer hover:text-gray-600 transition-all ease-in-out focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 active:!outline-none before:transition-[width] before:ease-in-out before:duration-500 before:absolute before:bg-black before:origin-center before:h-[2px] before:w-0 hover:before:w-[50%] before:bottom-1 before:left-[50%] after:transition-[width] after:ease-in-out after:duration-500 after:absolute after:bg-black after:origin-center after:h-[2px] after:w-0 hover:after:w-[50%] after:bottom-1 after:right-[50%]">Features</button>
          <button onClick={() => scrollToContact()} className="relative !text-black !bg-transparent !border-none cursor-pointer hover:text-gray-600 transition-all ease-in-out focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 active:!outline-none before:transition-[width] before:ease-in-out before:duration-500 before:absolute before:bg-black before:origin-center before:h-[2px] before:w-0 hover:before:w-[50%] before:bottom-1 before:left-[50%] after:transition-[width] after:ease-in-out after:duration-500 after:absolute after:bg-black after:origin-center after:h-[2px] after:w-0 hover:after:w-[50%] after:bottom-1 after:right-[50%]">Contact</button>
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-black text-white px-5 py-2 rounded-lg text-base font-semibold hover:bg-gray-800 transition-colors"
          >
            Sign In
          </button>
          {/* <button 
            onClick={handleChatRoomClick}
            className="!bg-transparent text-black px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Chat Room
          </button> */}
            {/* <button 
              onClick={() => navigate('/upload')}
              className="!bg-transparent text-black px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Upload Files
            </button> */}
          {/* <SignInButton /> */}
        </nav>
      </header>
      
      {/* Hero Section with Integrated About */}
      <Element name="hero" id="hero-section" className="relative w-full h-screen bg-[#e8e8e8]">
        {/* Canvas for 3D Model - Fixed Background */}
        <canvas id="mycanvas" ref={canvasRef} className="fixed inset-0 w-full h-full z-10" />

        {/* Hero Text - Initial Content */}
        <div className="fixed inset-0 flex items-center justify-end z-20 pointer-events-none">
          <div id="hero-text" className="w-1/2 pr-16 transition-all duration-700 pointer-events-auto">
            <div className="flex items-center justify-end relative">
              {/* AI-Powered with black background */}
              <div className="diagonal-text-container bg-black text-white px-8 py-4">
                <span className="text-4xl font-bold leading-tight whitespace-nowrap">
                  AI-Powered
                </span>
              </div>
              
              {/* Safety Network with white background */}
              <div className="diagonal-text-container-reverse bg-white text-black px-8 py-4 ">
                <span className="text-4xl font-bold leading-tight whitespace-nowrap">
                  Safety Network
                </span>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <p className="text-2xl text-black ml-64">
                Your Safety. Our Priority.
              </p>
            </div>
          </div>
        </div>

        {/* About Text - Phase 2 */}
        <div className="fixed inset-0 flex items-center justify-start z-20 pointer-events-none">
          <div id="about-text" className="max-w-2xl ml-8 px-8 text-left opacity-0 transition-all duration-700 pointer-events-auto">
            <div className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-10 shadow-2xl">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Where Intelligence Meets Surveillance
              </h2>
              <p className="text-xl text-gray-800 mb-6 leading-relaxed">
                We are revolutionizing women's safety through advanced CCTV-based threat detection, creating an intelligent surveillance ecosystem that identifies potential dangers before they escalate.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Our AI-powered platform analyzes real-time footage to detect suspicious behavior and distress signals, automatically alerting authorities through a centralized dashboard. Through cutting-edge machine learning and coordinated response systems, we're transforming how communities prevent and respond to safety threats.
              </p>
              
              {/* Stats Section
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">10M+</div>
                  <div className="text-gray-700">Cases Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">95%</div>
                  <div className="text-gray-700">Accuracy Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">500+</div>
                  <div className="text-gray-700">Legal Institutions</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">24/7</div>
                  <div className="text-gray-700">System Availability</div>
                </div>
              </div> */}
            </div>
          </div>
        </div>

        {/* Features Text - Phase 3 */}
        <div className="fixed inset-0 flex items-center justify-end z-20 pointer-events-none">
          <div id="features-text" className="max-w-2xl mr-8 px-8 text-left opacity-0 transition-all duration-700 pointer-events-auto">
            <div className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Intelligent Surveillance Features
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Real-Time CCTV Analysis</h3>
                  <p className="text-sm text-gray-800">AI-powered surveillance that continuously monitors CCTV feeds to detect suspicious activities and potential threats using advanced machine learning algorithms.</p>
                </div>
                <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Intelligent Threat Detection</h3>
                  <p className="text-sm text-gray-800">Automated classification of distress signals and suspicious behavior patterns, enabling proactive intervention before incidents escalate.</p>
                </div>
                <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Centralized Police Dashboard</h3>
                  <p className="text-sm text-gray-800">Comprehensive web-based monitoring interface for authorities with real-time alerts, incident mapping, and dispatch coordination capabilities.</p>
                </div>
                <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl p-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Mobile App Integration</h3>
                  <p className="text-sm text-gray-800">Dual-role mobile platform allowing citizens to report distress calls and authorities to receive alerts, view incident maps, and coordinate responses.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Text - Phase 4 */}
        <div className="fixed inset-0 flex items-center justify-start z-20 pointer-events-none">
          <div id="contact-text" className="max-w-2xl ml-8 px-8 text-left opacity-0 transition-all duration-700 pointer-events-auto">
            <div className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl p-10 shadow-2xl">
              <h2 className="text-4xl font-bold mb-8 text-gray-900">
                Ready to Transform Public Safety?
              </h2>
              <p className="text-xl text-gray-800 mb-8 leading-relaxed">
                Join law enforcement agencies and communities who trust NaariKavach as their intelligent surveillance solution. Experience enhanced security through AI-powered threat detection, real-time monitoring, and coordinated emergency response.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mt-8">
                <div className="text-center bg-white/40 backdrop-blur-lg border border-white/30 rounded-xl p-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Contact Us</h3>
                  <p className="text-gray-700">Get in touch for demos and consultations</p>
                  <p className="text-blue-600 font-semibold">dev.basilisk@gmail.com</p>
                </div>
                {/* <div className="text-center bg-white backdrop-blur-md border border-gray-200 rounded-xl p-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule Demo</h3>
                  <p className="text-gray-700">Book a personalized demonstration</p>
                  <p className="text-green-600 font-semibold">Available 24/7</p>
                </div> */}
                {/* <div className="text-center bg-white backdrop-blur-md border border-gray-200 rounded-xl p-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Support</h3>
                  <p className="text-gray-700">Expert support and implementation guidance</p>
                  <p className="text-orange-600 font-semibold">Enterprise Ready</p>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="fixed bottom-10 right-10 flex items-center space-x-2 z-30 animate-pulse pointer-events-auto">
          <button 
            onClick={handleScrollIndicatorClick}
            className="cursor-pointer flex items-center space-x-2 text-black hover:text-gray-600 transition-colors !bg-transparent border-none"
          >
            <span className="text-black">
              {isAtBottom ? 'back to top' : 'continue scrolling'}
            </span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 text-black transition-transform duration-300 ${isAtBottom ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Invisible spacer for scroll trigger - creates space for all 4 phases */}
        <div className="h-[300vh] w-full"></div>
      </Element>

      {/* Additional content sections can be added here after the scroll experience */}
      <div className="relative w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">Experience the future of intelligent surveillance and coordinated emergency response today.</p>
          <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors">
            Request Demo
          </button>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  )
} 