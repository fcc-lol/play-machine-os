import React from "react";
import styled from "styled-components";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${(props) => props.theme.text};
  font-family: ${(props) => props.theme.fontFamily};
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 2rem;
`;

const Text = styled.p`
  font-size: 1.2rem;
  margin: 0.5rem 0;
`;

export default function Credits() {
  return (
    <Root>
      <Title>Credits</Title>
      <Text>Created by Leo</Text>
      <Text>Built with React</Text>
      <Text>Styled with styled-components</Text>
    </Root>
  );
}
