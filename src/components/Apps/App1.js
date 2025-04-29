import React from "react";
import styled from "styled-components";

const AppContainer = styled.div`
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 8px;
  margin: 10px;
`;

const Title = styled.h1`
  color: #333;
  font-size: 24px;
  margin-bottom: 20px;
`;

const App1 = () => {
  return (
    <AppContainer>
      <Title>App 1</Title>
      <p>This is App 1 component</p>
    </AppContainer>
  );
};

export default App1;
