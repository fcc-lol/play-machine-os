import styled from "styled-components";

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.menuText};
  font-size: ${(props) => props.theme.fontSize};
  text-transform: ${(props) => props.theme.textTransform};
  text-align: center;
  z-index: 10;
  background-color: ${(props) => props.theme.background};
`;

export default function Loading() {
  return <Root>Loading...</Root>;
}
