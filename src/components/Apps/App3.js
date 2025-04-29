import React from "react";
import styled from "styled-components";

const AppContainer = styled.div`
  padding: 20px;
  background-color: #fff0e0;
  border-radius: 8px;
  margin: 10px;
`;

const Title = styled.h1`
  color: #cc6600;
  font-size: 24px;
  margin-bottom: 20px;
`;

const App3 = () => {
  return (
    <AppContainer>
      <Title>App 3</Title>
      <p>This is App 3 component</p>
    </AppContainer>
  );
};

export default App3;
