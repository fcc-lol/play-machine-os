import React from "react";
import styled from "styled-components";

const AppContainer = styled.div`
  padding: 20px;
  background-color: #e0f0ff;
  border-radius: 8px;
  margin: 10px;
`;

const Title = styled.h1`
  color: #0066cc;
  font-size: 24px;
  margin-bottom: 20px;
`;

const App2 = () => {
  return (
    <AppContainer>
      <Title>App 2</Title>
      <p>This is App 2 component</p>
    </AppContainer>
  );
};

export default App2;
