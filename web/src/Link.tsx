import styled from 'styled-components';
import { COLORS } from './types';

export const Link = styled.a`
  color: ${COLORS.green} !important;
  text-decoration: none;
  font-weight: bold;
  cursor: pointer;
  
  &:hover {
    text-decoration: underline;
  }
`;