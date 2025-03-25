// Matter.js module aliases
const { 
    Engine, 
    Render, 
    Runner, 
    Bodies, 
    Composite, 
    Mouse, 
    MouseConstraint,
    Body,
    Vector,
    Constraint,
    Events
} = Matter;

// Preset configuration values
const presets = {
    preset1: {
        centerMass: 19,            // High mass for very stable center
        centerFriction: 0.21,      // High friction for controlled movement
        centerSize: 60,            // Size of center node
        nodeCount: 36,             // More nodes for richer interaction
        nodeSize: 18,              // Larger nodes
        orbitRadius: 190,          // Same orbit radius
        attractionForce: 0.000017, // Precise attraction value
        repulsionForce: 0.013201,  // Much stronger repulsion between nodes
        repulsionDistance: 2.5,    // Medium repulsion field
        nodeFriction: 0.28,        // Lower friction for smoother node movement
        connectionStiffness: 0.0042, // Specific connection stiffness
        showConnections: false,    // Hide custom connection lines
        showSprings: false         // Hide Matter.js constraint springs
    },
    preset2: {
        centerMass: 20,            // Maximum mass for center
        centerFriction: 0.5,       // Maximum friction 
        centerSize: 40,            // Size of center node (smaller)
        nodeCount: 69,             // Large number of nodes
        nodeSize: 5,               // Very small nodes
        orbitRadius: 350,          // Large orbit radius
        attractionForce: 0.000017, // Same attraction force
        repulsionForce: 0.000007,  // Very low repulsion force
        repulsionDistance: 2.5,    // Same repulsion field
        nodeFriction: 0.28,        // Same node friction
        connectionStiffness: 0.0042, // Same connection stiffness
        showConnections: false,    // Hide custom connection lines
        showSprings: false         // Hide Matter.js constraint springs
    }
};

// Configuration object that will be controlled by UI sliders
const config = {...presets.preset1};

// Variables to store our physics objects
let nodes = [];
let centerNode;
let connections = [];

// Create engine and renderer
const engine = Engine.create();
// Disable gravity - we'll handle forces manually
engine.gravity.scale = 0;

// Create a renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#ffffff', // White background
        pixelRatio: window.devicePixelRatio,
        showDebug: false // Custom debug flag
    }
});

// Cache commonly used values to reduce recalculations
const orbitRadiusInner = () => config.orbitRadius * 0.9;
const orbitRadiusOuter = () => config.orbitRadius * 1.1;
const nodeRepulsionRadius = () => config.nodeSize * config.repulsionDistance;
const nodeTouchDistance = () => config.nodeSize * 2;
const forceStrong = () => config.repulsionForce * 5;

// Add custom physics forces on each engine update with performance optimizations
Events.on(engine, 'beforeUpdate', function() {
    if (!centerNode || nodes.length === 0) return;
    
    const centerX = centerNode.position.x;
    const centerY = centerNode.position.y;
    const innerRadius = orbitRadiusInner();
    const outerRadius = orbitRadiusOuter();
    const repulsionRadius = nodeRepulsionRadius();
    const combinedRepulsionRadius = repulsionRadius * 2;
    const touchDistance = nodeTouchDistance();
    
    // Apply center attraction to all nodes
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodePos = node.position;
        
        // Calculate vector from node to center
        const dx = centerX - nodePos.x;
        const dy = centerY - nodePos.y;
        const distSq = dx * dx + dy * dy;
        const distance = Math.sqrt(distSq);
        
        // Adjust attraction based on desired orbit - use precomputed boundaries
        let attractionMultiplier;
        
        if (distance > outerRadius) {
            // Stronger attraction if too far from orbit
            attractionMultiplier = config.attractionForce * 1.5;
        } else if (distance < innerRadius) {
            // Weaker attraction if too close to orbit
            attractionMultiplier = config.attractionForce * 0.5;
        } else {
            attractionMultiplier = config.attractionForce;
        }
        
        // Apply attraction force
        const forceX = dx * attractionMultiplier;
        const forceY = dy * attractionMultiplier;
        Body.applyForce(node, nodePos, { x: forceX, y: forceY });
    }
    
    // Apply node-to-node repulsion with spatial optimization
    const nodeCount = nodes.length;
    for (let i = 0; i < nodeCount; i++) {
        const nodeA = nodes[i];
        const posA = nodeA.position;
        
        for (let j = i + 1; j < nodeCount; j++) {
            const nodeB = nodes[j];
            const posB = nodeB.position;
            
            // Calculate vectors between nodes
            const dx = posA.x - posB.x;
            const dy = posA.y - posB.y;
            const distSq = dx * dx + dy * dy;
            
            // Early distance check with squared distance (avoid sqrt)
            if (distSq < combinedRepulsionRadius * combinedRepulsionRadius) {
                const distance = Math.sqrt(distSq);
                
                // Calculate penetration depth
                const penetration = 1 - (distance / combinedRepulsionRadius);
                
                // Calculate force magnitude based on penetration with fast math
                const penetrationSq = penetration * penetration;
                const forceMagnitude = distance < touchDistance
                    ? forceStrong() * penetrationSq // Strong repulsion when overlapping
                    : config.repulsionForce * penetrationSq; // Normal repulsion
                
                // Create normalized force vector
                const invDist = 1 / distance; // Inverse distance optimization
                const forceX = dx * invDist * forceMagnitude;
                const forceY = dy * invDist * forceMagnitude;
                
                // Apply forces to both bodies (equal and opposite)
                Body.applyForce(nodeA, posA, { x: forceX, y: forceY });
                Body.applyForce(nodeB, posB, { x: -forceX, y: -forceY });
            }
        }
    }
});

// Function to create the entire scene
function createScene() {
    // Clear previous world if it exists
    Composite.clear(engine.world);
    nodes = [];
    connections = [];
    
    // Create center node
    centerNode = Bodies.circle(
        window.innerWidth / 2,
        window.innerHeight / 2,
        config.centerSize, // Use configurable center size
        {
            render: {
                fillStyle: '#f5f5f5', // Very light gray fill
                strokeStyle: '#dddddd', // Light gray stroke
                lineWidth: 1
            },
            isStatic: false,
            mass: config.centerMass,
            frictionAir: config.centerFriction,
            restitution: 0.2 // Add some bounce
        }
    );

    // Create surrounding nodes
    for (let i = 0; i < config.nodeCount; i++) {
        // Calculate position in a circle around the center
        const angle = (i / config.nodeCount) * Math.PI * 2;
        const x = window.innerWidth / 2 + config.orbitRadius * Math.cos(angle);
        const y = window.innerHeight / 2 + config.orbitRadius * Math.sin(angle);
        
        // Calculate color for this node in a full spectrum
        const hue = (i / config.nodeCount) * 360;
        const color = `hsl(${hue}, 100%, 50%)`;
        
        // Create node with spectrum color
        const node = Bodies.circle(x, y, config.nodeSize, {
            render: {
                fillStyle: color,
                strokeStyle: color,
                lineWidth: 1
            },
            frictionAir: config.nodeFriction,
            restitution: 0.3 // Add some bounce when nodes collide
        });
        
        nodes.push(node);
    }

    // Create connection lines between center and child nodes
    connections = nodes.map(node => {
        return Constraint.create({
            bodyA: centerNode,
            bodyB: node,
            render: {
                visible: config.showSprings,
                lineWidth: 1,
                strokeStyle: 'rgba(0, 0, 0, 0.1)' // Lighter gray connections
            },
            stiffness: config.connectionStiffness,
            damping: 0.1,
            length: config.orbitRadius
        });
    });

    // Add all bodies and constraints to the world
    Composite.add(engine.world, [centerNode, ...nodes, ...connections]);

    // Add mouse control
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: false
            }
        }
    });

    Composite.add(engine.world, mouseConstraint);

    // Keep the mouse in sync with rendering
    render.mouse = mouse;
}

// Function to update UI values
function updateUIValues() {
    document.getElementById('centerMassValue').textContent = config.centerMass;
    document.getElementById('centerFrictionValue').textContent = config.centerFriction;
    document.getElementById('centerSizeValue').textContent = config.centerSize;
    document.getElementById('nodeCountValue').textContent = config.nodeCount;
    document.getElementById('nodeSizeValue').textContent = config.nodeSize;
    document.getElementById('orbitRadiusValue').textContent = config.orbitRadius;
    document.getElementById('attractionForceValue').textContent = config.attractionForce;
    document.getElementById('repulsionForceValue').textContent = config.repulsionForce;
    document.getElementById('repulsionDistanceValue').textContent = config.repulsionDistance;
    document.getElementById('nodeFrictionValue').textContent = config.nodeFriction;
    document.getElementById('connectionStiffnessValue').textContent = config.connectionStiffness;
}

// Setup event listeners for sliders
function setupControlListeners() {
    // Center Mass
    document.getElementById('centerMass').addEventListener('input', (e) => {
        config.centerMass = parseFloat(e.target.value);
        document.getElementById('centerMassValue').textContent = config.centerMass;
        if (centerNode) Body.setMass(centerNode, config.centerMass);
    });

    // Center Friction
    document.getElementById('centerFriction').addEventListener('input', (e) => {
        config.centerFriction = parseFloat(e.target.value);
        document.getElementById('centerFrictionValue').textContent = config.centerFriction;
        if (centerNode) centerNode.frictionAir = config.centerFriction;
    });
    
    // Center Size - requires regenerating the scene
    document.getElementById('centerSize').addEventListener('change', (e) => {
        config.centerSize = parseInt(e.target.value);
        document.getElementById('centerSizeValue').textContent = config.centerSize;
        createScene(); // Recreate since we can't easily resize bodies
    });

    // Node Count - requires regenerating the scene
    document.getElementById('nodeCount').addEventListener('change', (e) => {
        config.nodeCount = parseInt(e.target.value);
        document.getElementById('nodeCountValue').textContent = config.nodeCount;
        createScene();
    });

    // Node Size
    document.getElementById('nodeSize').addEventListener('change', (e) => {
        config.nodeSize = parseInt(e.target.value);
        document.getElementById('nodeSizeValue').textContent = config.nodeSize;
        createScene(); // Recreate since we can't easily resize bodies
    });

    // Orbit Radius
    document.getElementById('orbitRadius').addEventListener('input', (e) => {
        config.orbitRadius = parseInt(e.target.value);
        document.getElementById('orbitRadiusValue').textContent = config.orbitRadius;
        
        // Update constraints
        connections.forEach(constraint => {
            constraint.length = config.orbitRadius;
        });
    });

    // Attraction Force
    document.getElementById('attractionForce').addEventListener('input', (e) => {
        config.attractionForce = parseFloat(e.target.value);
        document.getElementById('attractionForceValue').textContent = config.attractionForce;
    });

    // Repulsion Force
    document.getElementById('repulsionForce').addEventListener('input', (e) => {
        config.repulsionForce = parseFloat(e.target.value);
        document.getElementById('repulsionForceValue').textContent = config.repulsionForce;
        // Apply immediate effect with a small impulse to trigger recalculation
        nodes.forEach(node => {
            Body.applyForce(node, node.position, { 
                x: (Math.random() - 0.5) * 0.00001, 
                y: (Math.random() - 0.5) * 0.00001 
            });
        });
    });
    
    // Repulsion Distance
    document.getElementById('repulsionDistance').addEventListener('input', (e) => {
        config.repulsionDistance = parseFloat(e.target.value);
        document.getElementById('repulsionDistanceValue').textContent = config.repulsionDistance;
        // Apply immediate effect with a small impulse to trigger recalculation
        nodes.forEach(node => {
            Body.applyForce(node, node.position, { 
                x: (Math.random() - 0.5) * 0.00001, 
                y: (Math.random() - 0.5) * 0.00001 
            });
        });
    });

    // Node Friction
    document.getElementById('nodeFriction').addEventListener('input', (e) => {
        config.nodeFriction = parseFloat(e.target.value);
        document.getElementById('nodeFrictionValue').textContent = config.nodeFriction;
        
        // Update all nodes
        nodes.forEach(node => {
            node.frictionAir = config.nodeFriction;
        });
    });

    // Connection Stiffness
    document.getElementById('connectionStiffness').addEventListener('input', (e) => {
        config.connectionStiffness = parseFloat(e.target.value);
        document.getElementById('connectionStiffnessValue').textContent = config.connectionStiffness;
        
        // Update all connections
        connections.forEach(constraint => {
            constraint.stiffness = config.connectionStiffness;
        });
    });

    // Reset Scene button
    document.getElementById('resetScene').addEventListener('click', () => {
        createScene();
    });
    
    // Apply preset function for both preset buttons
    function applyPreset(presetName) {
        // Reset all config values to preset values
        Object.assign(config, presets[presetName]);
        
        // Update all UI sliders
        document.getElementById('centerMass').value = config.centerMass;
        document.getElementById('centerFriction').value = config.centerFriction;
        document.getElementById('centerSize').value = config.centerSize;
        document.getElementById('nodeCount').value = config.nodeCount;
        document.getElementById('nodeSize').value = config.nodeSize;
        document.getElementById('orbitRadius').value = config.orbitRadius;
        document.getElementById('attractionForce').value = config.attractionForce;
        document.getElementById('repulsionForce').value = config.repulsionForce;
        document.getElementById('repulsionDistance').value = config.repulsionDistance;
        document.getElementById('nodeFriction').value = config.nodeFriction;
        document.getElementById('connectionStiffness').value = config.connectionStiffness;
        document.getElementById('showConnections').checked = config.showConnections;
        document.getElementById('showSprings').checked = config.showSprings;
        
        // Update UI display values
        updateUIValues();
        
        // Recreate scene with preset values
        createScene();
    }
    
    // Preset 1 button
    document.getElementById('preset1').addEventListener('click', () => {
        applyPreset('preset1');
    });
    
    // Preset 2 button
    document.getElementById('preset2').addEventListener('click', () => {
        applyPreset('preset2');
    });

    // Controls toggle for mobile
    document.getElementById('toggleControls').addEventListener('click', () => {
        const controls = document.getElementById('controls');
        if (controls.style.display === 'none') {
            controls.style.display = 'block';
        } else {
            controls.style.display = 'none';
        }
    });
    
    // Debug visualization toggle
    document.getElementById('showDebug').addEventListener('change', (e) => {
        render.options.showDebug = e.target.checked;
    });
    
    // Show connections toggle (custom lines)
    document.getElementById('showConnections').addEventListener('change', (e) => {
        config.showConnections = e.target.checked;
    });
    
    // Show springs toggle (Matter.js constraints)
    document.getElementById('showSprings').addEventListener('change', (e) => {
        config.showSprings = e.target.checked;
        
        // Update all existing constraints visibility
        connections.forEach(connection => {
            connection.render.visible = config.showSprings;
        });
    });
}

// Optimize custom rendering with batching and caching
Events.on(render, 'afterRender', function() {
    if (!centerNode || nodes.length === 0) return;
    
    const ctx = render.context;
    const centerX = centerNode.position.x;
    const centerY = centerNode.position.y;
    
    // Draw custom connection lines - only if showConnections is true
    if (config.showConnections) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Lighter gray connections
        ctx.lineWidth = 1;
        
        // Batch all line drawing in a single path
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(node.position.x, node.position.y);
        }
        ctx.stroke();
    }
    
    // Draw debug visualizations if enabled - with batching
    if (render.options.showDebug) {
        // Draw orbit radius circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, config.orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Very light black for orbit circle
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Batch repulsion field drawing for better performance
        if (nodes.length > 0) {
            const repulsionRadius = config.nodeSize * config.repulsionDistance;
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Very light black for repulsion fields
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1;
            
            // Draw all circles in a loop without recreating path
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                ctx.beginPath();
                ctx.arc(node.position.x, node.position.y, repulsionRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
        }
    }
});

// Throttled window resize handler for better performance
let resizeTimeout;
const handleResize = () => {
    // Clear any existing timeout to debounce the resize
    clearTimeout(resizeTimeout);
    
    // Set a timeout to execute resize logic after user finishes resizing
    resizeTimeout = setTimeout(() => {
        // Update render dimensions once
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelRatio = window.devicePixelRatio;
        
        render.options.width = width;
        render.options.height = height;
        render.options.pixelRatio = pixelRatio;
        Render.setPixelRatio(render, pixelRatio);
        
        // Only reset positions if the center node exists and is near the edge
        if (centerNode) {
            const centerX = width / 2;
            const centerY = height / 2;
            const edgeThreshold = Math.min(width, height) * 0.4;
            
            // Calculate distance from center using optimized vector math
            const dx = centerX - centerNode.position.x;
            const dy = centerY - centerNode.position.y;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            // Reset if the center is too far from the center of the screen
            if (distanceFromCenter > edgeThreshold) {
                // Cache node count for faster loop execution
                const count = nodes.length;
                
                // Update center node position
                Body.setPosition(centerNode, { x: centerX, y: centerY });
                Body.setVelocity(centerNode, { x: 0, y: 0 });
                
                // Update surrounding nodes positions in one efficient loop
                for (let i = 0; i < count; i++) {
                    const angle = (i / config.nodeCount) * Math.PI * 2;
                    const x = centerX + config.orbitRadius * Math.cos(angle);
                    const y = centerY + config.orbitRadius * Math.sin(angle);
                    
                    Body.setPosition(nodes[i], { x, y });
                    Body.setVelocity(nodes[i], { x: 0, y: 0 });
                }
            }
        }
    }, 250); // 250ms debounce time
};

// Add event listener for resize
window.addEventListener('resize', handleResize);

// Initialize everything when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the initial scene
    createScene();
    
    // Setup control listeners
    setupControlListeners();
    
    // Update UI values
    updateUIValues();
    
    // Run the engine and renderer
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
});