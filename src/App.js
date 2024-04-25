import React, { useState } from 'react';
// import { Canvas } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
// import Globe from './Globe';
import Nodes from './Nodes';
import H3Map from './H3Map';

const App = () => {
  const [nodes, setNodes] = useState([]);

  return (
    <div>
      <H3Map />
      {/* <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Globe />
        <Nodes nodes={nodes} />
        <OrbitControls />
      </Canvas> */}
      {/* Add control panel and simulation statistics */}
    </div>
  );
};

export default App;