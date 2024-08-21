import React, { useEffect, useState } from 'react';
import { Polygon, useMapEvents } from 'react-leaflet';
import { latLngToCell, cellToBoundary } from 'h3-js';
import { COLORS } from '../types';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { LatLngExpression } from 'leaflet';

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000000;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background-color: #1f1f1f88;
  fillOpacity: 50%;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  color: #ffffff;
  max-width: 600px;
  z-index: 10000000;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  margin-bottom: 100px;
`;

const Title = styled.h2`
  margin-top: 0;
  color: ${COLORS.green}
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: ${COLORS.pink};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
  margin-right: 16px;
`;

const ConnectedAddressWrapper = styled.div`
  color: white;
  position: absolute;
  top: 0;
  right: 10px;
  padding: 5px;
  z-index: 10000000;
`

export const TestnetMapContent = () => {
  const [polygon, setPolygon] = useState<number[][]>();
  const [outerPolygon, setOuterPolygon] = useState<number[][]>();
  const [registeringCell, setRegisteringCell] = useState<string | undefined>();
  const [provider, setProvider] = useState<ethers.Provider | undefined>();
  const [signer, setSigner] = useState<ethers.Signer | undefined>();
  const [address, setAddress] = useState<string | undefined>();

  const signCell = async () => {
    // Implementation for opening a signing dialog
    console.log(`Open signing dialog for H3 Index: ${registeringCell}`);
    if (!provider || !address || !signer) {
      alert("Connect to a wallet first.");
      return;
    }

    const domain = {
      name: 'Proximum',
      version: '1',
      chainId: 1
    };

    const types = {
      ProximumNodeAssertion: [
        { name: 'cell', type: 'string' },
        { name: 'hotWallet', type: 'address' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    const value = {
      cell: registeringCell,
      hotWallet: address,
      nonce: 0
    };

    const signature = await signer.signTypedData(domain, types, value);
    console.log('Signature:', signature);

  };

  const setupListeners = (provider: ethers.Provider) => {
    if (!provider) return;

    (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        console.log('Please connect to MetaMask.');
        setAddress(undefined);
      } else {
        const newAddress = accounts[0];
        setAddress(newAddress);
        console.log('Connected to account:', newAddress);
      }
    });

    // (window as any).ethereum.on('chainChanged', (_chainId) => {
    //   window.location.reload();
    // });

    (window as any).ethereum.on('disconnect', () => {
      console.log('Disconnected');
      setAddress(undefined);
    });
  };

  const connectWallet = async () => {
    let provider;
    if ((window as any).ethereum == null) {

      // If MetaMask is not installed, we use the default provider,
      // which is backed by a variety of third-party services (such
      // as INFURA). They do not have private keys installed,
      // so they only have read-only access
      alert("Please install Metamask or another web3 provider.")
      // provider = ethers.getDefaultProvider()
    } else {

      // Connect to the MetaMask EIP-1193 object. This is a standard
      // protocol that allows Ethers access to make all read-only
      // requests through MetaMask.
      provider = new ethers.BrowserProvider((window as any).ethereum)
      setProvider(provider);
      setupListeners(provider);

      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner();
      const address = await signer?.getAddress();

      // It also provides an opportunity to request access to write
      // operations, which will be performed by the private key
      // that MetaMask manages for the user.
      setSigner(signer);
      setAddress(address);

      console.log('***', { signer, address });
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup listeners on component unmount
      if ((window as any).ethereum) {
        try {
          (window as any).ethereum.removeListener('accountsChanged');
          // (window as any).ethereum.removeListener('chainChanged');
          (window as any).ethereum.removeListener('disconnect');
        } catch (e) {
          console.error(e)
        }
      }
    };
  }, []);

  const MapEvents = () => {
    const map = useMapEvents({
      mousemove: (e) => {
        if (signer && !registeringCell) {
          const h3Index = latLngToCell(e.latlng.lat, e.latlng.lng, 8);
          const coordinates = cellToBoundary(h3Index).map(coord => [coord[0], coord[1]]);
          setPolygon(coordinates);

          const outerH3Index = latLngToCell(e.latlng.lat, e.latlng.lng, 2);
          const outerCoordinates = cellToBoundary(outerH3Index).map(coord => [coord[0], coord[1]]);
          setOuterPolygon(outerCoordinates);
        }
      },
      click: (e) => {
        // TODO: prevent modal clicks from propagating to map
        if (signer) {
          const h3Index = latLngToCell(e.latlng.lat, e.latlng.lng, 8);
          // const coordinates = cellToBoundary(h3Index).map(coord => [coord[0], coord[1]]);
          // console.log('***', { coordinates });

          map.setZoomAround(e.latlng, 14);
          setRegisteringCell(h3Index);
        }
      }
    });
    return null; // Component does not render anything itself
  };

  return (
    <>
      {outerPolygon && <Polygon positions={outerPolygon as LatLngExpression[]} pathOptions={{ color: COLORS.blue }} />}
      {polygon && <Polygon positions={polygon as LatLngExpression[]} pathOptions={{ color: COLORS.pink }} />}
      <MapEvents />
      {signer &&
        <ConnectedAddressWrapper>
          <h3>{address?.slice(0, 5)}...{address?.slice(-3)}</h3>
        </ConnectedAddressWrapper>
      }

      {!provider &&
        <ModalWrapper>
          <ModalContent>
            <Title>
              Register Proximum Nodes
            </Title>
            <h3>The address you choose will own your Proximum nodes: use a new address stored in a hardware wallet. Node locations and owner addresses are public.</h3>
            <Button onClick={connectWallet}>Connect Wallet</Button>
          </ModalContent>
        </ModalWrapper>
      }
      {registeringCell && <ModalWrapper onClick={() => setRegisteringCell(undefined)}>
        <ModalContent>
          <Title>
            Register node
          </Title>
          <h3>Sign a message with your web3 wallet to register a new Syene testnet node at this H3 location: {registeringCell}.</h3>
          <Button onClick={() => { signCell() }}>Sign Message</Button>
        </ModalContent>
      </ModalWrapper>

      }
    </>
  )
}