import React from 'react';

const Nodes = ({ nodes }) => {
  return (
    <group>
      {nodes.map((node, index) => (
        <mesh key={index} position={node.estimatedLocation}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      ))}
    </group>
  );
};

export default Nodes;