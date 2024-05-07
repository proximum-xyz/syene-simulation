import React from 'react';
import styled from 'styled-components';

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
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
`;

const Title = styled.h2`
  margin-top: 0;
`;

const Description = styled.p`
  margin-bottom: 20px;
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

interface WelcomeModalProps {
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  return (
    <ModalWrapper>
      <ModalContent>
        <Title>Proximum Simulation</Title>
        <Description>
          This app simulates the Proximum location network -- think GPS, but onchain.
          <h3>How do I use it?</h3>
          <p>Click on the map to drop a user there. Proximum estimates their location by pinging local nodes.</p>
          <ul>
            <li><strong>Blue dot</strong>: real locations</li>
            <li><strong>Orange dot</strong>: estimated locations</li>
            <li><strong>Gray lines</strong>: paths to nearby nodes</li>
          </ul>
          <p>
            Configure network parameters to see how they affect the accuracy of position estimates.</p>
          <ul>
            <li>
              <strong>Physical Parameters</strong> define the real network of nodes.
            </li>
            <li>
              <strong>Model Parameters</strong> define Proximum&apos;s internal simplified network model.
            </li>
          </ul>
        </Description>
        <CloseButton onClick={onClose}>Start</CloseButton>
      </ModalContent>
    </ModalWrapper>
  );
};

export default WelcomeModal;