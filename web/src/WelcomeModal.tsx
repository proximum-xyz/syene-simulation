import React from 'react';
import styled from 'styled-components';
import { COLORS, PATHS } from './types';
import { Link } from './Link';
import { useNavigate } from 'react-router-dom';
import Map from './Map';

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100000;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background-color: #1f1f1f;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffffff;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  margin-bottom: 100px;
`;

const Title = styled.h2`
  margin-top: 0;
  color: ${COLORS.green}
`;

const SimulateButton = styled.button`
  padding: 8px 16px;
  background-color: #1f1f1f;;
  color: white;
  border: 1px ${COLORS.pink} solid;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  margin-right: 16px;
`;


const WelcomeModal: React.FC = () => {
  const navigate = useNavigate();

  const handleSimulateClick = () => {
    navigate(PATHS.simulation); // Navigate to the simulation page
  };

  return (
    <>
      <ModalWrapper>
        <ModalContent>
          <Title>Proximum: Syene Testnet</Title>
          Simulate the Proximum location network inside your browser. Adjust the parameters to see how it handles real-world latencies, message speeds, and deceptive nodes in a robust way.
          {/* Register a testnet node to participate in Proximum, the global <Link href="https://proximum.xyz">location network</Link>.
        <p>
          Sign up for early Syene access today or simulate the network and play with network parameters.
        </p> */}
          <p>
            Check out the <Link href="https://proximum.xyz/proximum-lightpaper.pdf">Lightpaper</Link> or <Link href="https://github.com/proximum-xyz/syene-simulation">Github</Link> to learn more.
          </p>
          {/* <RegisterButton onClick={handleRegisterClick}>Register a Node</RegisterButton> */}
          <SimulateButton onClick={handleSimulateClick}>Simulate the Network</SimulateButton>
        </ModalContent>
      </ModalWrapper>
      <Map />
    </>
  );
};

export default WelcomeModal;