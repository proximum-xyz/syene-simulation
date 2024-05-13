import React from 'react';
import styled from 'styled-components';
import { COLORS } from '../types';
import { Link } from '../Link';

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
`;

const Title = styled.h2`
  margin-top: 0;
  color: ${COLORS.green}
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  background-color: ${COLORS.pink};
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
        <Title>Proximum Location Oracle</Title>
        Simulate the location oracle provided by Proximum&#39;s Syene Testnet.
        <ul>
          <li>
            <strong>Physical Parameters</strong> define the network of nodes providing location services.
          </li>
          <li>
            <strong>Model Parameters</strong> define Proximum&apos;s internal location estimation algorithm.
          </li>
        </ul>
        <h4>Important: this is an early preview, not the final algorithm.</h4>
        <p>
          Check out the <Link href="https://proximum.xyz/proximum-lightpaper.pdf">Lightpaper</Link> or <Link href="https://github.com/proximum-xyz/syene-simulation">Github</Link> to learn more about the network. Submit a PR with a 10x improvement in simulation speed or location accuracy to get an interview.
        </p>
        <CloseButton onClick={onClose}>Start</CloseButton>
      </ModalContent>
    </ModalWrapper>
  );
};

export default WelcomeModal;