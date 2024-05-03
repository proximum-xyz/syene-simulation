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
        <Title>Proximum Simulator</Title>
        <Description>
          The Proximum Simulator is a tool for simulating and analyzing proximity-based networks. It allows you to configure various parameters and observe the behavior of the network under different conditions.
        </Description>
        <h3>Parameter Details</h3>
        <ul>
          <li>H3 Resolution: The resolution level of the H3 hexagonal grid system used for spatial indexing.</li>
          <li>Number of Nodes: The total number of nodes in the network.</li>
          {/* Add descriptions for the remaining parameters */}
        </ul>
        <CloseButton onClick={onClose}>Close</CloseButton>
      </ModalContent>
    </ModalWrapper>
  );
};

export default WelcomeModal;