// import React, { useRef } from 'react';
// import { useLoader } from '@react-three/fiber';
// import { TextureLoader } from 'three';
// import earthTexture from './assets/earth_texture.jpg';

// const Globe = () => {
//   const earthRef = useRef();
//   const texture = useLoader(TextureLoader, earthTexture);

//   return (
//     <mesh ref={earthRef}>
//       <sphereGeometry args={[2, 64, 64]} />
//       <meshStandardMaterial map={texture} />
//     </mesh>
//   );
// };

// export default Globe;