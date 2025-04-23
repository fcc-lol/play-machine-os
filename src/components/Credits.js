import React, { useEffect } from "react";

const Credits = ({ onBack }) => {
  return (
    <div className="screen">
      <h1>Credits</h1>
      <div className="credits-content">
        <h2>Development Team</h2>
        <p>Lead Developer: Play Machine Team</p>
        <p>UI/UX Design: Play Machine Design Team</p>

        <h2>Special Thanks</h2>
        <p>To all our users and contributors</p>
        <p>For making Play Machine OS possible</p>
      </div>
    </div>
  );
};

export default Credits;
