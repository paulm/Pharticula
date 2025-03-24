# Pharticula

A minimalist physics-based particle visualization that explores emergent behavior through simulated forces of attraction and repulsion.

![Pharticula Physics Visualization](screenshot.png)

## Overview

Pharticula creates an interactive physics simulation featuring a central node surrounded by orbiting particles. Unlike traditional orbital systems, these particles don't just revolve - they actively respond to multiple forces:

1. **Attraction to Center**: Each particle is drawn toward the center node
2. **Repulsion from Siblings**: Each particle repels other particles
3. **Connection Forces**: Flexible constraints provide additional structure

These competing forces create a self-organizing system that finds equilibrium in fascinating ways. The result is a dynamic, interactive visualization that demonstrates complex emergent behavior from simple physical rules.

## Interactivity

- **Drag the Center Node**: Move the central node and watch how the system adapts
- **Adjust Parameters**: Fine-tune 10+ physics parameters via the control panel
- **Observe Emergent Patterns**: See how changing one parameter creates ripple effects throughout the system

## Physics Parameters

| Parameter | Description | Effect |
|-----------|-------------|--------|
| Center Mass | Weight of central node | Affects how responsive the center is to movement |
| Center Friction | Drag on central node | Controls how quickly the center stops moving |
| Node Count | Number of orbiting particles | More nodes create more complex interactions |
| Node Size | Diameter of each particle | Affects collision dynamics |
| Orbit Radius | Distance from center | Sets the scale of the overall system |
| Attraction Force | Pull toward center | Higher values create tighter orbits |
| Repulsion Force | Push between nodes | Higher values force nodes apart |
| Node Repulsion Field | Repulsion distance | Extends the range of node-to-node interaction |
| Node Friction | Particle drag | Controls how quickly nodes stabilize |
| Connection Stiffness | Constraint elasticity | Makes connections more rigid or flexible |

## Technical Implementation

Pharticula uses the Matter.js physics engine with several key optimizations:

- **Custom Force Application**: Direct physics force calculation rather than using built-in attractors
- **Spatial Optimization**: Distance-based calculations with early bailout for non-interacting bodies
- **Squared Distance Optimization**: Avoiding unnecessary square root operations
- **Batched Rendering**: Reduced canvas state changes for better performance
- **Debounced Window Resizing**: Prevents performance issues during browser resizing

All simulation code is contained in a single HTML/JS package with no dependencies beyond Matter.js.

## Usage

1. Open `index.html` in any modern browser
2. Drag the center node to move the system
3. Adjust parameters using the control panel
4. Toggle debug visualization to see force fields

## License

MIT