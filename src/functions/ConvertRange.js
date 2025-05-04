const ConvertRange = (value, minOutput, maxOutput) => {
  return (value / 100) * (maxOutput - minOutput) + minOutput;
};

export default ConvertRange;
